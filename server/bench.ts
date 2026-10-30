// The server requires a tool call on round 1 for BOTH variants, so both answer from the same tool data.
// Sends the same queries to both variants against a running API (npm run dev) and logs metrics to logs/requests.jsonl.
// Usage: npm run bench [-- <repeats> [openui|grounded-sdui]]   (ONLY=rich limits it to the data-heavy templates)
const API = process.env.API ?? "http://localhost:3001";

export const QUERIES: { label: string; q: string; rich?: boolean }[] = [
  { label: "no_tool", q: "Hi, what can you help me with?" },
  { label: "fare_calendar", q: "Show fares from Delhi to Bangalore for November" },
  { label: "date_strip", q: "Fares around 24 Nov from Delhi to Singapore" },
  { label: "destinations", q: "Cheapest flights from Delhi to Australia in December" },
  { label: "price_history", q: "Should I book Delhi to Singapore on 20 Nov now or wait?" },
  { label: "time_of_day", q: "Which time of day is cheapest for Delhi to Singapore on 24 Nov?" },
  { label: "flight_search", q: "Find flights from Bangalore to Singapore on 25 Nov" },
  { label: "hotel", q: "Tell me about Taj Exotica in Goa" },
  { label: "calendar_holidays", q: "Show fares from Delhi to Bangalore for November, mark the holidays and festivals", rich: true },
  { label: "carousel", q: "Suggest cheap weekend getaways from Bangalore for December", rich: true },
  { label: "composite", q: "Plan a Goa trip from Delhi: flights on 10 Dec and a good beachfront hotel" },
];

const repeats = Number(process.argv[2] ?? 1);
const only = process.argv[3];
for (let r = 0; r < repeats; r++) {
  for (const { label, q, rich } of QUERIES) {
    if (process.env.ONLY === "rich" && !rich) continue;
    for (const variant of ["openui", "grounded-sdui"] as const) {
      if (only && only !== variant) continue;
      const t0 = performance.now();
      const res = await fetch(`${API}/api/chat?variant=${variant}&label=${label}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
      });
      await res.text();
      console.log(`${variant.padEnd(6)} ${label.padEnd(14)} HTTP ${res.status} ${Math.round(performance.now() - t0)}ms`);
    }
  }
}
