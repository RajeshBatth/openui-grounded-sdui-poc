import OpenAI from "openai";
import type { Metrics } from "./metrics";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface AgentOptions {
  client: OpenAI;
  model: string;
  system: string;
  history: Msg[];
  tools: OpenAI.Chat.Completions.ChatCompletionFunctionTool[];
  execTool: (name: string, args: string) => string;
  onText: (delta: string) => void;
  m: Metrics;
  t0: number;
  /** Require a tool call on round 1 so the answer is grounded in tool data. */
  forceFirstTool?: boolean;
  maxRounds?: number;
}

/** Shared tool loop for both variants: stream each round, run requested tools, feed results back. */
export async function runAgent(o: AgentOptions) {
  const convo: Msg[] = [{ role: "system", content: o.system }, ...o.history];
  for (let round = 0; round < (o.maxRounds ?? 5); round++) {
    const tRound = performance.now();
    o.m.rounds++;
    const stream = await o.client.chat.completions.create({
      model: o.model,
      stream: true,
      stream_options: { include_usage: true },
      // Reasoning tokens are billed as output; template selection needs none.
      reasoning_effort: "minimal",
      messages: convo,
      tools: o.tools,
      tool_choice: round === 0 && o.forceFirstTool ? "required" : "auto",
    });
    let text = "";
    const calls: { id: string; name: string; args: string }[] = [];
    for await (const chunk of stream) {
      const u = chunk.usage;
      if (u) {
        o.m.tokensIn += u.prompt_tokens;
        o.m.cachedIn += u.prompt_tokens_details?.cached_tokens ?? 0;
        o.m.tokensOut += u.completion_tokens;
        o.m.reasoning += u.completion_tokens_details?.reasoning_tokens ?? 0;
      }
      const d = chunk.choices[0]?.delta;
      if (d?.content) { text += d.content; o.m.outChars += d.content.length; o.onText(d.content); }
      for (const tc of d?.tool_calls ?? []) {
        const c = (calls[tc.index] ??= { id: "", name: "", args: "" });
        c.id ||= tc.id ?? ""; c.name ||= tc.function?.name ?? ""; c.args += tc.function?.arguments ?? "";
      }
    }
    o.m.llmMs += performance.now() - tRound;
    if (!calls.length) return text;
    convo.push({ role: "assistant", content: text || null, tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })) });
    for (const c of calls) {
      const tTool = performance.now();
      const result = o.execTool(c.name, c.args);
      o.m.toolMs += performance.now() - tTool;
      o.m.toolCalls.push(c.name);
      convo.push({ role: "tool", tool_call_id: c.id, content: result });
    }
  }
  return "";
}
