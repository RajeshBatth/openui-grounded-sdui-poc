// No-LLM check of the Grounded-SDUI variant: real tool data + hand-written model output -> hydrated blocks.
import { SduiStream } from "./stream";
import type { Refs } from "./build";
import { runToolData } from "../tools";

const refs: Refs = new Map();
const call = (tool: string, args: object) => { const ref = `r${refs.size + 1}`; refs.set(ref, { tool, data: runToolData(tool, JSON.stringify(args)) }); return ref; };
const cal = call("get_fare_calendar", { from: "DEL", to: "BLR", month: "2026-11" });
const strip = call("get_date_fares", { from: "DEL", to: "SIN", date: "2026-11-24" });
const fl = call("search_flights", { from: "BLR", to: "SIN", date: "2026-11-25" });
const dest = call("search_destinations", { from: "DEL", country: "Australia", month: "2026-12" });
const hist = call("get_price_history", { from: "DEL", to: "SIN", date: "2026-11-20" });
const gw = call("suggest_getaways", { from: "BLR", month: "2026-12" });
const hotel = call("get_hotel", { name: "Taj Exotica" });

const model = [
  `{"t":"md","text":"Here you go **₹4,200** saved."}`,
  `{"t":"tpl","name":"FareCalendar","ref":"${cal}"}`,
  `{"t":"tpl","name":"DateStrip","ref":"${strip}"}`,
  `{"t":"tpl","name":"FlightList","ref":"${fl}","limit":2,"recommended":true,"cta":"View all flights"}`,
  `{"t":"tpl","name":"SectorInsights","ref":"${fl}"}`,
  `{"t":"tpl","name":"TimeOfDay","ref":"${fl}","cta":"View flights"}`,
  `{"t":"tpl","name":"DestinationList","ref":"${dest}"}`,
  `{"t":"tpl","name":"PriceTrend","ref":"${hist}"}`,
  `{"t":"tpl","name":"BookOrWait","ref":"${hist}"}`,
  ...["HotelCard", "PriceBar", "ReviewSummary", "Highlights", "MapView"].map((n) => `{"t":"tpl","name":"${n}","ref":"${hotel}"}`),
  `{"t":"tpl","name":"CardCarousel","ref":"${gw}","limit":3,"title":"Getaways"}`,
  `{"t":"tpl","name":"ThingsToConsider","text":"Carry your SG Arrival Card."}`,
  `{"t":"tpl","name":"FollowUps","questions":["a","b"]}`,
  // expected failures:
  `{"t":"tpl","name":"FareCalendar","ref":"${fl}"}`,
  `{"t":"tpl","name":"Nope","ref":"r1"}`,
  `not json`,
].join("\n");

const out: string[] = [];
const s = new SduiStream(refs, (l) => out.push(l), performance.now());
for (let i = 0; i < model.length; i += 7) s.push(model.slice(i, i + 7)); // tiny chunks: exercises line splitting
s.end();
for (const l of out) console.log(l.slice(0, 110).trim());
console.log("\nblocks:", s.stats.blocks, "| templates:", s.stats.templates.length, "| expected 2 errors (wrong ref now falls back to the right tool), got", s.stats.errors.length);
console.log(s.stats.errors);
