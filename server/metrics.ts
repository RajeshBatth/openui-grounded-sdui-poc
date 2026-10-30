import { appendFileSync, mkdirSync } from "node:fs";

export type Variant = "openui" | "grounded-sdui";

export interface Metrics {
  ts: string;
  variant: Variant;
  query: string;
  kind: string; // first tool called, or "no_tool"
  forced: boolean; // first round required a tool call
  grounded: boolean; // at least one tool result was available to the answer
  label?: string; // benchmark query category, if provided
  model: string;
  rounds: number;
  toolCalls: string[];
  tokensIn: number;
  cachedIn: number;
  tokensOut: number;
  reasoning: number;
  firstOutputMs: number; // request start -> first byte/block the client can render
  firstTemplateMs?: number; // Grounded-SDUI variant: request start -> first template block
  llmMs: number;
  toolMs: number;
  totalMs: number;
  templates: string[];
  urlsTyped: number; // URLs/paths the model wrote itself
  urlsUngrounded: number; // of those, not present in any tool result (hallucinated or altered)
  errors: number;
  errorDetail: string[];
  outChars: number;
}

export const newMetrics = (variant: Variant, query: string, model: string): Metrics => ({
  ts: new Date().toISOString(), variant, query, kind: "no_tool", model, forced: false, grounded: false, rounds: 0, toolCalls: [],
  tokensIn: 0, cachedIn: 0, tokensOut: 0, reasoning: 0, firstOutputMs: 0, llmMs: 0, toolMs: 0, totalMs: 0,
  templates: [], urlsTyped: 0, urlsUngrounded: 0, errors: 0, errorDetail: [], outChars: 0,
});

export const LOG_FILE = "logs/requests.jsonl";

export function logMetrics(m: Metrics) {
  mkdirSync("logs", { recursive: true });
  appendFileSync(LOG_FILE, JSON.stringify(m) + "\n");
  console.log(
    `[${m.variant}] ${m.kind} | first=${Math.round(m.firstOutputMs)}ms total=${Math.round(m.totalMs)}ms (llm ${Math.round(m.llmMs)} tools ${Math.round(m.toolMs)}) | ` +
      `rounds=${m.rounds} in=${m.tokensIn} (cached ${m.cachedIn}) out=${m.tokensOut} (reasoning ${m.reasoning}) | templates=${m.templates.length} errors=${m.errors} urls=${m.urlsTyped}/${m.urlsUngrounded} bad`,
  );
  if (m.errorDetail.length) console.log("  errors:", m.errorDetail.slice(0, 5));
}
