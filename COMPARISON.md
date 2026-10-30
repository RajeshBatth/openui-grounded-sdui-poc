# OpenUI vs Grounded-SDUI

Same chat shell, same tools (`server/tools.ts`), same React views (`src/views/`), same model call loop (`server/agent.ts`).
Only the **model output format** and its **parser** differ. Toggle with `?variant=openui` (default) or `?variant=grounded-sdui`.

|  | OpenUI | Grounded-SDUI |
|---|---|---|
| Model writes | OpenUI Lang: `root = Stack([...])`, components with positional args and **copies of the data** | NDJSON blocks: markdown, or `{"t":"tpl","name":"FareCalendar","ref":"r1"}` + small options |
| Who fills template props | the model | code (`server/sdui/build.ts`) from the tool result the `ref` points to |
| Schemas / prompt | Zod `defineComponent` → `library.prompt()` | hand-written catalog (`server/sdui/prompt.ts`) |
| Parser / renderer | `@openuidev/react-lang` `<Renderer>` | 40-line line splitter (`server/sdui/stream.ts`) + registry (`src/sdui/SduiMessage.tsx`) |
| Streaming granularity | statement (finer than we need) | block (one template) |

## How to measure

```bash
npm run dev                 # needs THESYS_API_KEY in .env
npm run bench -- 5          # 9 query kinds x 2 variants x 5 repeats -> logs/requests.jsonl
npm run report              # median latency / mean tokens / error rate per variant and per query kind
```

Every chat request (UI or bench) also prints one line in the API terminal and appends to `logs/requests.jsonl`:
first-output latency, total, LLM vs tool time, rounds, tokens in/cached/out/reasoning, templates emitted, error count.
The UI footer shows client-observed `first` and `total` per message.
`npm run selftest:sdui` and `npm run validate` check the Grounded-SDUI builders and OpenUI fixtures without an LLM.

## Measured

Fixed prompt size (o200k tokens): OpenUI ~1,850, Grounded-SDUI ~520. Tool definitions ~650 in both.

**Fair run** (`gpt-5-nano` via the Thesys gateway; 9 query kinds x 5 repeats x 2 variants = 90 requests; one machine). Both variants use the same tools and the same data, and data queries force a tool call on round 1 (`tool_choice: required`; this is now the server default for both variants, `?force=0` turns it off, and an `answer_directly` tool covers smalltalk), so every row is answered from tool data. Raw rows: `logs/requests.jsonl`. Earlier runs where OpenUI skipped tools on 9 of 24 data questions (not comparable) are kept in `logs/run2-unforced-tools.jsonl` and `logs/run1-before-ref-fallback.jsonl`.

Data queries only (no_tool smalltalk excluded), n=40 per variant:

| | OpenUI | Grounded-SDUI |
|---|---|---|
| Total latency, median | 3.6 s | 2.6 s (-28%) |
| Total latency, p90 | 5.4 s | 3.7 s (-31%) |
| Input tokens, median | 5,020 | 2,353 (-53%) |
| Output tokens, median | 399 | 199 (-50%) |
| LLM rounds | 2.0 (4 of 35 had 3) | 2.0 (4 of 35 had 3) |
| Requests with a parse/validation error | 8 of 40 | 8 of 40 |
| Worst case | 5.9 s | 42 s (one request produced ~9,400 completion tokens for 468 visible characters) |

Grounded-SDUI was faster in 7 of 8 data query kinds and tied on price_history; the biggest gaps were destinations, date_strip and fare_calendar (about 1 s each).

Why the gap is smaller than the token difference suggests:

- **Rounds are identical.** Both variants need a tool-selection call and an answer call (2 rounds). Each call has a fixed cost of about 1.5-1.9 s that neither format changes.
- **Tokens are cheap on this model.** About 2-3 ms per output token, so halving output saves roughly 0.5-1 s, not seconds. On a slower model the gap would be larger.
- **Tool selection is equally unreliable.** The first tool was correct only 25 of 35 times in both variants; a wrong first tool costs a round.

Error types differ: OpenUI's were excess positional args, undefined variable names and a string where a number was expected. Grounded-SDUI's were mostly the model citing a template whose tool it never called (7 of 8), which our validation dropped, and one malformed JSON line.

Not measured: UI correctness by eye, dollar cost, other models, direct-to-OpenAI (no gateway), variance across days. The 42 s outlier is a model/gateway tail event, not a format effect.

### Data-heavy templates (calendar with holiday marks, card carousel)

`FareCalendar` now carries holiday/festival marks with icon URLs, and `CardCarousel` shows getaway cards with image URL, icon URL, link and click prompt (about 475 characters per card). The data is necessary, so it cannot be trimmed at the tool layer. 5 requests per cell, medians, same setup as above (`ONLY=rich npm run bench -- 5`; raw rows in `logs/requests.jsonl`, an earlier pass in `logs/run4-rich-first-pass.jsonl`).

| | OpenUI | Grounded-SDUI | Gap |
|---|---|---|---|
| Calendar + holidays: output tokens | 410 | 153 | -63% |
| Carousel: output tokens | 731 | 186 | -75% |
| Calendar + holidays: total latency | 4.2 s | 2.5 s | -40% |
| Carousel: total latency | 5.6 s | 3.2 s | -43% |
| Calendar + holidays: requests with errors | 2 of 5 | 0 of 5 | |
| Carousel: requests with errors | 4 of 5 | 0 of 5 | |

- OpenUI errors were extra or mistyped arguments (a string where `firstWeekday` needs a number, extra args on `CardCarousel`/`DestinationList`).
- Every URL OpenUI typed existed in the tool results (0 wrong in 10 runs), so invented links did not show up. The benefit here is tokens, time and fewer syntax errors, plus the ability to allow-list links in code.
- Input tokens stay high in both variants (OpenUI 5.7K/6.1K, Grounded-SDUI 2.7K/3.3K) because the full tool result is still sent to the model; the digest idea is not built.
- Not measured: model-written copy per card, which costs tokens in both variants. Links and images are only rendered if they are http(s) or same-origin paths (`safeUrl` in `src/views/cards.tsx`).

## Where OpenUI may hit limits for our requirements

Marked **observed** (seen in this POC) or **expected** (reasoned, not yet measured).

1. **The model copies data into component args** (expected, largest effect). A month calendar is 31 numbers and a 30-day history is 30. That is output tokens (latency, cost) plus a chance of transcription errors. The Grounded-SDUI variant sends ~20 tokens for the same block. OpenUI has `Query()`/`toolProvider` to bind data at render time, but it moves tool execution to the client and needs the model to write binding syntax. We did not test it.
2. **Positional arguments are fragile on small models** (observed). A wrong argument order (`FlightList([a], true)` with a string expected) produced parser errors, and the same layout was in our prompt example. Reordering optional props silently changes the contract.
3. **Prompt weight grows with the library** (measured: 1,850 vs 520 tokens). It is resent on every tool round, so a two-round request pays it twice.
4. **"Templates only" is not enforced** (expected). The parser is permissive and renders what it can, and `Stack` can nest anything. Staying within approved layouts relies on the prompt. The Grounded-SDUI variant can only emit known template names.
5. **Errors surface late** (observed). Parse problems appear in the client inspector/console. We re-parse the final text on the server to count them. The Grounded-SDUI variant validates per block before sending, and bad blocks are dropped.
6. **Conversation history** (expected). Replaying earlier assistant turns means sending full OpenUI Lang, data included. The Grounded-SDUI variant replays markdown plus `[shown FareCalendar]`.
7. **Docs and gateway gaps** (observed). The gateway docs do not say whether tool calls, `stream_options` or `reasoning_effort` are supported. Library 1.0 shipped Oct 2026, so the ecosystem is young.
8. **Extra hop and lock-in** (expected). Gateway dependency, provider-prefixed model ids, and a language we do not control.

## Where the Grounded-SDUI variant is weaker

1. **A builder per template** (about 150 lines for 15 templates). Tool result shape and builder can drift; a missing field becomes a dropped block.
2. **Less flexible.** A template can only show data that came from a tool result. A new layout needs code, not a prompt change. Derived numbers appear only in prose.
3. **Hand-maintained prompt catalog.** It could be generated from Zod, but that is more code.
4. **Wrong-template risk is ours to evaluate.** No built-in validation of "did the model choose the right template"; both variants need an eval set.
5. **We own the parser, versioning and edge cases** (partial lines, fenced output, stored-message format).

## Trade-offs

| Dimension | OpenUI | Grounded-SDUI | Expected winner |
|---|---|---|---|
| Output tokens / latency | data copied by model | refs only | Grounded-SDUI |
| Numeric accuracy | transcription risk | exact (code-filled) | Grounded-SDUI |
| Input tokens | larger prompt | smaller prompt | Grounded-SDUI |
| Flexibility / free composition | high | fixed templates | OpenUI |
| Time to first template | statement-level streaming | block-level | OpenUI slightly; irrelevant at our granularity |
| Setup effort | low | builders + parser | OpenUI |
| Maintenance as templates grow | schema only | schema + builder + prompt line | OpenUI |
| Observability / control | via inspector | full (our metrics, per-block validation) | Grounded-SDUI |
| Vendor / language risk | gateway + young library | none | Grounded-SDUI |

Recommendation (to confirm with `npm run report`): keep the Grounded-SDUI variant for the fixed-template product, keep OpenUI where free-form composition or interactive forms are needed.
