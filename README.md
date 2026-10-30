# OpenUI vs Grounded-SDUI: POC

A travel-assistant chat ("Myra") that renders model-chosen UI two ways, side by side, on the same shell, tools, mock inventory and React views:

- **OpenUI**: the model writes OpenUI Lang (components plus the data) and `<Renderer>` draws it.
- **Grounded-SDUI**: the model picks template blocks and cites tool results by `ref`; code fills in the data and the client draws complete blocks.

See `COMPARISON.md` for how each works, benchmark results and trade-offs.

## Run

```bash
npm install
echo 'THESYS_API_KEY=...' > .env      # OpenAI-compatible endpoint; see .env.example (LLM_BASE_URL / LLM_MODEL optional)
npm run dev                            # web on :5173, API on :3001
```

Open `http://localhost:5173/?variant=openui` or `?variant=grounded-sdui`. `?gallery` renders sample UIs without a model.

## Scripts

| | |
|---|---|
| `npm run bench -- 5` | run the benchmark queries against both variants (`ONLY=rich` for the data-heavy ones) |
| `npm run report` | latency, tokens and errors per variant and query kind, from `logs/requests.jsonl` |
| `npm run selftest:sdui` | Grounded-SDUI builders and parser, no LLM |
| `npm run validate` | gallery fixtures against the OpenUI library, no LLM |
| `npm run prompt:tokens` | token cost of each variant's fixed prompt |

All inventory, fares, holidays and hotel data are mock. Raw benchmark rows from each run are kept in `logs/`.
