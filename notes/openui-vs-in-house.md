# Open-UI

> Draft. Scope: how data becomes presentation. Upstream retrieval (which tool or agent is called) is out of scope; both designs receive the data the same way. Lines marked **Added** are enrichment.

## Open-UI's internals

At the client side it has pre-built atomic components at client side -- these things range from simple Text, Markdown, all the way to complex ones like calendars/charts etc.
For each of the components the data requirement is also defined as a schema

At the server side it sends entire catalog of UI components inside system prompt to model-provider(open-ai/gemini/others).
The system instructions include expected DSL format, catalog and schema for each component.

Thesys gateway adds few additional logic for error corrections

FYI:
Client SDK size
- `@openuidev/react-lang@1.0.2` -> 110kb (minified)
- `@openuidev/react-ui@0.18.1` -> 1.80 MB (minified)

*(Size figures as provided; not independently verified.)*

**Added (indicative flow):** question + data go into the prompt with the catalog; the model writes the UI as OpenUI Lang, typing the data into component arguments; a streaming parser checks each statement against its schema and renders what is valid.
```
cal = FareCalendar("Delhi to Bangalore", "Nov 2026", 0, [11500, 8500, 10400, ... 30 prices])
```
The model recomposes catalog components into new layouts but cannot invent a component outside the catalog. The prebuilt calendar is a date picker, not a price calendar.

## How does our solution work ?

- Essentially same -- build catalog that matches our design system to full precision and do same stuff in backend like system prompt, but we can drop few things like custom DSL and atom-level streaming, for us block level streaming is good enough
- Key difference is, we won't be generating the ui, rather pick existing one in our catalog, as of now we built ~15-20 types of blocks(or layouts)

Client side change is already done and shipped in oct app release, can support all components proposed in Figma

**Added:**
- The model writes one JSON line per block, e.g. `{"t":"tpl","name":"FareCalendar","ref":"r1"}`; code fills in the block's data from the referenced payload.
- The prompt is a short catalog (block names and what data feeds each).
- Each block is validated before it reaches the client; a bad one is dropped or swapped for a fallback.

## Challenges in Generative UI

Both solutions will share common problems
- Additional latency, tokens/cost
- Accuracy drop w/ more input-context
- Prompt tuning will be required to get the best behavior match -- pick right components for right intent

**Added: failure modes from input to component**

| Failure mode | What goes wrong | Applies to | Seen in our tests |
|---|---|---|---|
| Wrong component for the intent | Picks a component that does not fit the question | Both | Not tested |
| Wrong composition | Redundant or missing components, wrong order | Both; wider in OpenUI (free composition) | Yes (in-house: an unrelated extra block was added and dropped) |
| Values do not match the data | Numbers, dates, labels mistyped, dropped or invented | OpenUI in arguments; in-house only in prose | No (all typed URLs were correct) |
| Wrong argument shape | Wrong count, order or type of arguments | OpenUI | Yes (extra arguments, a text value where a number belongs) |
| Broken structure or references | Undefined names (OpenUI); unknown template, bad ref or JSON (in-house) | Both, different forms | Yes (both) |
| Truncated output | Long output hits the token limit, leaving a partial UI | Both; likelier in OpenUI | Not tested (expected) |
| Text and component disagree | Prose says one thing, the component shows another | Both | Not tested |
| Design drift | Layouts or styles depart from the design system | OpenUI | Not tested (expected) |

Shared mitigations: evals and golden tests (recorded inputs, failure injection), prompt tuning (descriptions and examples per component), schema validation, fallbacks, output size limits.

## Where in-house solution shines

1. Design Consistency -- since everything is pre-built matching our Figma
2. Tokens/Cost optimisations

Scenario 1: Calendar w/ 30 days of data w/ rich markers like icons, custom colors, prompt to fire on date click
Scenario 2: Card Carousel of 5 items w/ icon urls(bookmark/tags), card images, card deep-links, menu options and some metadata

Both solutions will incur too much output tokens, but in-house solution gives us control to optimize

**Added: optimisations, and why OpenUI cannot do them.** In OpenUI the model's output is the UI; in-house it is a selection, so what the model sees, writes and what is drawn are ours to optimise.

1. **References, not data.** The model cites a ref and code expands it. Scenario 1: colors from rules or design tokens, icons from the data, click prompts built per date (or resolved from a date id). Scenario 2: image/icon URLs and deep links copied by code (allow-listed), menu options defined per block. *OpenUI:* in its standard flow the renderer draws what the model writes, so the data has to be inside the model's output (its `Query()` bindings fetch data on the client, a different mechanism; see the verify list).
2. **A digest, not the data.** The model sees a headline and key facts plus the ref; full data stays server-side. *OpenUI:* the model must see every value to type it.
3. **Validate and recover per block.** Check schema, template and ref per block; fall back or drop one block without touching the rest. *OpenUI:* the output is one program with references between statements, so an error can leave holes and there is no natural unit to swap.
4. **Control what is drawn.** Allow-listed links and media, only reviewed templates. *OpenUI:* URLs are typed by the model and can only be checked afterwards; the model composes any tree.

**Added: benchmark results for the two scenarios.** Same input data and same model for both designs (a small, fast model), each design with its own prompt; 5 runs per cell, medians with the range in brackets. Output tokens are what the model wrote; input tokens are what it read.

| | Scenario 1: calendar + markers | | Scenario 2: card carousel | |
|---|---|---|---|---|
| | OpenUI | In-house | OpenUI | In-house |
| Output tokens | 410 [338-446] | 153 [91-194] | 731 [587-889] | 186 [155-231] |
| Total time | 4.2 s [3.4-5.6] | 2.5 s [2.2-2.7] | 5.6 s [4.9-6.2] | 3.2 s [2.5-3.8] |
| Input tokens | 5,652 | 2,681 | 6,115 | 3,291 |
| Runs with errors | 2 of 5 | 0 of 5 | 4 of 5 | 0 of 5 |

- Output tokens fall by about 63% (calendar) and 75% (carousel); total time by about 40%.
- OpenUI errors were extra or mistyped arguments (for example a text value where a number belongs). In-house had none in these runs.
- The model copied every URL correctly in OpenUI (about 25 typed in the calendar runs, 45 in the carousel runs, none wrong). So the gain here is tokens, time and syntax errors, not invented links.
- Input stays high in both because the full data payload goes into the prompt; a digest would reduce it for in-house only.
- Total time includes the model's earlier data-selection step, which is the same in both, so the gap comes from the composing step.

How close this is to the scenarios (the measured versions are simpler):
- Scenario 1 measured: 30 daily prices plus about 5 holiday marks (day, label, icon URL). It did not include per-day custom colors or a click prompt per date; colors are derived in the view.
- Scenario 2 measured: 8 cards with image, icon, link, click prompt and price. It did not include menu options or extra metadata, and used 8 cards, not 5.
- The real scenarios carry more fields per item, so the gap may well be larger, but that is not measured.
- Caveats: 5 runs per cell, one model, one session, prompts written once per design and not tuned further, and requests went through a gateway whose own overhead is not isolated. Treat the numbers as indicative.

**Costs of in-house:** we build and test the error-correction layer and own the parser; builders are maintained per block; no free-form layouts (a new layout needs a new block).

## To verify before presenting

- OpenUI's `Query()` tool binding: it fetches data on the client, which differs from substituting data server-side into the model's output.
- Whether newer OpenUI versions add a calendar with markers and click actions in the model-facing schema.
- Native rendering: OpenUI ships a React Native build; I found no native iOS or Android renderer, but did not check the official docs.
- How much the Thesys gateway's error correction reduces errors in practice.
