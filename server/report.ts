// Aggregates logs/requests.jsonl: latency / tokens / errors per variant and query kind.
import { existsSync, readFileSync } from "node:fs";
import { LOG_FILE, type Metrics } from "./metrics";

if (!existsSync(LOG_FILE)) { console.log(`No ${LOG_FILE} yet. Send chats or run npm run bench.`); process.exit(0); }
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const groupBy = <T,>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, T[]>>((a, x) => ((a[key(x)] ??= []).push(x), a), {});
const all: Metrics[] = readFileSync(LOG_FILE, "utf8").trim().split("\n").map((l) => JSON.parse(l))
  // Older rows were logged as "own" before the variant was renamed.
  .map((r) => ({ ...r, variant: (r.variant as string) === "own" ? "grounded-sdui" : r.variant }) as Metrics);
// Fair comparison: only rows answered from tool data (the no_tool smalltalk query is shown separately).
const rows = all.filter((r) => r.label === "no_tool" || r.grounded);
const dropped = all.filter((r) => !rows.includes(r));
if (dropped.length) {
  const by = groupBy(dropped, (r) => r.variant);
  console.log(`\nExcluded ${dropped.length} ungrounded rows (no tool call): ${Object.entries(by).map(([v, x]) => `${v}=${x.length}`).join(", ")}`);
}


function summarize(rs: Metrics[]) {
  return {
    n: rs.length,
    firstMs: Math.round(median(rs.map((r) => r.firstOutputMs))),
    totalMs: Math.round(median(rs.map((r) => r.totalMs))),
    rounds: +mean(rs.map((r) => r.rounds)).toFixed(1),
    in: Math.round(mean(rs.map((r) => r.tokensIn))),
    out: Math.round(mean(rs.map((r) => r.tokensOut))),
    templates: +mean(rs.map((r) => r.templates.length)).toFixed(1),
    urlsTyped: +mean(rs.map((r) => r.urlsTyped ?? 0)).toFixed(1),
    urlsBad: rs.reduce((a, r) => a + (r.urlsUngrounded ?? 0), 0),
    errRate: `${Math.round((rs.filter((r) => r.errors > 0).length / rs.length) * 100)}%`,
  };
}

console.log("\n== By variant (median latency, mean tokens) ==");
console.table(Object.fromEntries(Object.entries(groupBy(rows, (r) => r.variant)).map(([k, v]) => [k, summarize(v)])));

console.log("== By query kind x variant ==");
const byKind = groupBy(rows, (r) => `${r.label ?? r.kind} | ${r.variant}`);
console.table(Object.fromEntries(Object.entries(byKind).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, summarize(v)])));

const errs = rows.filter((r) => r.errors);
if (errs.length) {
  console.log(`== ${errs.length} requests with errors (first 8) ==`);
  for (const r of errs.slice(0, 8)) console.log(`[${r.variant}] ${r.label ?? r.kind}: ${r.errorDetail.slice(0, 2).join(" | ")}`);
}
