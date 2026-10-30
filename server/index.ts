import { createParser } from "@openuidev/react-lang";
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import express from "express";
import OpenAI from "openai";
import { library } from "../src/library";
import { runAgent } from "./agent";
import { logMetrics, newMetrics, type Variant } from "./metrics";
import { sduiSystemPrompt } from "./sdui/prompt";
import { SduiStream } from "./sdui/stream";
import type { Refs } from "./sdui/build";
import { systemPrompt as openuiSystemPrompt } from "./prompt";
import { runToolData, runTool, tools } from "./tools";

// OpenUI AI Gateway: OpenAI-compatible, so the same SDK and tool loop work unchanged.
const client = new OpenAI({
  apiKey: process.env.THESYS_API_KEY,
  baseURL: process.env.LLM_BASE_URL ?? "https://api.thesys.dev/v1/embed",
});
// Gateway model ids are provider-prefixed. gpt-5-nano is OpenAI's cheapest. Override via LLM_MODEL.
const MODEL = process.env.LLM_MODEL ?? "openai/gpt-5-nano";

const app = express();
app.use(express.json());

type Msg = { role: "user" | "assistant"; content: string };
const openuiParser = createParser(library.toJSONSchema(), library.root);
const toolDefs = tools.map((t) => t.def);

// POST /api/chat?variant=openui|grounded-sdui
//  openui -> streams raw OpenUI Lang text (client feeds <Renderer>)
//  sdui    -> streams NDJSON blocks, already hydrated from tool results
app.post("/api/chat", async (req, res) => {
  const variant: Variant = ["grounded-sdui", "sdui", "sdui"].includes(String(req.query.variant)) ? "grounded-sdui" : "openui";
  const messages: Msg[] = req.body.messages;
  const query = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  // Round 1 must call a tool (data tools, or answer_directly for smalltalk) so answers are always grounded. ?force=0 disables it.
  const forced = req.query.force !== "0";
  const t0 = performance.now();
  const m = newMetrics(variant, query, MODEL);
  m.forced = forced;
  m.label = typeof req.query.label === "string" ? req.query.label : undefined;
  res.setHeader("Content-Type", variant === "grounded-sdui" ? "application/x-ndjson; charset=utf-8" : "text/plain; charset=utf-8");

  const write = (s: string) => { m.firstOutputMs ||= performance.now() - t0; res.write(s); };
  const refs: Refs = new Map();
  let toolText = ""; // everything tools returned, used to check URLs the model typed
  const sdui = new SduiStream(refs, write, t0);

  try {
    const final = await runAgent({
      client, model: MODEL, m, t0, tools: toolDefs, history: messages, forceFirstTool: forced,
      system: variant === "grounded-sdui" ? sduiSystemPrompt : openuiSystemPrompt,
      // sdui: tool results carry a ref the model cites; openui: the model must copy data into component args
      execTool: variant === "grounded-sdui"
        ? (name, args) => {
            const ref = `r${refs.size + 1}`;
            const data = runToolData(name, args);
            refs.set(ref, { tool: name, data });
            const out = JSON.stringify({ ref, ...data });
            toolText += out;
            return out;
          }
        : (name, args) => { const out = runTool(name, args); toolText += out; return out; },
      onText: variant === "grounded-sdui" ? (d) => sdui.push(d) : write,
    });
    if (variant === "grounded-sdui") {
      sdui.end();
      m.templates = sdui.stats.templates;
      m.firstTemplateMs = sdui.stats.firstTemplateMs;
      m.errorDetail = sdui.stats.errors;
    } else {
      const { meta } = openuiParser.parse(final);
      m.templates = [...final.matchAll(/\b([A-Z][A-Za-z]+)\(/g)].map((x) => x[1]);
      m.errorDetail = [...meta.errors.map((e: any) => `${e.code}: ${e.message ?? e.path ?? ""}`), ...meta.unresolved.map((u: string) => `unresolved: ${u}`)];
    }
    // Grounding check for URLs: every URL the model wrote must already exist in a tool result.
    const urlRe = /(?:https?:\/\/|\/mock\/)[^\s"'\\)\]},]+/g;
    const known = new Set(toolText.match(urlRe) ?? []);
    const typed = final.match(urlRe) ?? [];
    m.urlsTyped = typed.length;
    m.urlsUngrounded = typed.filter((u) => !known.has(u)).length;
    if (m.urlsUngrounded) m.errorDetail.push(`${m.urlsUngrounded} URL(s) not found in tool results`);
    m.errors = m.errorDetail.length;
  } catch (e) {
    console.error(e);
    m.errorDetail.push(`exception: ${e instanceof Error ? e.message : e}`);
    m.errors = m.errorDetail.length;
    res.status(500);
  }
  m.kind = m.toolCalls[0] ?? "no_tool";
  m.grounded = m.toolCalls.length > 0;
  m.totalMs = performance.now() - t0;
  logMetrics(m);
  res.end();
});

app.listen(3001, () =>
  console.log(
    `api on :3001 (${MODEL}) | fixed prompt tokens: openui ~${countTokens(openuiSystemPrompt)}, sdui ~${countTokens(sduiSystemPrompt)}, tool defs ~${countTokens(JSON.stringify(toolDefs))}`,
  ),
);
