// Own variant: code (not the model) turns tool results into template props.
// The model only picks a template, a `ref` to a tool result, and small options.
import { runToolData } from "../tools";

export interface ToolResult { tool: string; data: any }
export type Refs = Map<string, ToolResult>;
export interface TplBlock { t: "tpl"; name: string; ref?: string; [opt: string]: unknown }

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const compact = (n: number) => `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const minutes = (d: string) => { const m = /(\d+)h (\d+)m/.exec(d); return m ? +m[1] * 60 + +m[2] : 0; };
const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;

// Resolve the cited ref; if it is missing or from the wrong tool, fall back to the latest result of the needed tool.
// Small models often cite "r1" regardless of which tool produced it.
const need = (refs: Refs, ref: string | undefined, ...tools: string[]) => {
  let r = ref ? refs.get(ref) : undefined;
  if (!r || !tools.includes(r.tool)) {
    r = [...refs.values()].reverse().find((x) => tools.includes(x.tool) && !x.data.error);
    // Hotel templates need full details; enrich from a hotel search result if the model skipped get_hotel.
    if (!r && tools.includes("get_hotel")) {
      const found = [...refs.values()].reverse().find((x) => x.tool === "search_hotels")?.data.hotels?.[0];
      if (found) r = { tool: "get_hotel", data: runToolData("get_hotel", JSON.stringify({ name: found.name })) };
    }
  }
  if (!r) throw new Error(`no ${tools.join("/")} result available (ref "${ref}")`);
  if (r.data.error) throw new Error(`ref "${ref}" is an error result`);
  return r.data;
};

const flightProps = (f: any, i: number, o: TplBlock) => ({
  airline: f.airline, code: f.code, depart: f.depart, arrive: f.arrive, from: f.from, to: f.to,
  summary: `${f.stops ? `${f.stops} stop` : "Non-stop"} · ${f.duration}`,
  price: inr(f.fare), badge: i === 0 && o.badge !== false ? "Cheapest" : undefined, note: f.baggage,
});

const SLOT_HOURS: Record<string, string> = { Morning: "6am – 12pm", Afternoon: "12pm – 6pm", Evening: "6pm – 12am", "Late night": "12am – 6am" };

type Builder = (refs: Refs, o: TplBlock) => Record<string, unknown>;

export const builders: Record<string, Builder> = {
  FareCalendar(refs, o) {
    const d = need(refs, o.ref, "get_fare_calendar");
    return { route: d.route, month: monthLabel(d.month), firstWeekday: d.firstWeekday, prices: d.dailyLowestFare, marks: d.marks };
  },
  DateStrip(refs, o) {
    const d = need(refs, o.ref, "get_date_fares");
    const min = Math.min(...d.fares.map((f: any) => f.fare));
    return { items: d.fares.map((f: any) => ({ weekday: f.weekday, date: day(f.date), price: compact(f.fare), cheapest: f.fare === min, selected: f.isTarget && f.fare !== min })) };
  },
  DestinationList(refs, o) {
    const d = need(refs, o.ref, "search_destinations");
    return { items: d.destinations.map((x: any) => ({ city: x.city, code: x.code, fare: inr(x.fromFare), trend: x.typicalRangeThisMonth })), ctaLabel: o.cta };
  },
  PriceTrend(refs, o) {
    const d = need(refs, o.ref, "get_price_history");
    return { title: "Price trend (last 30 days)", fares: d.fares, startLabel: day(d.startDate), endLabel: day(d.endDate), lowestLabel: day(d.lowest.date) };
  },
  BookOrWait(refs, o) {
    const d = need(refs, o.ref, "get_price_history");
    const f = d.forecast, dir = f.direction as "rise" | "fall" | "stable";
    return {
      signal: dir,
      headline: dir === "rise" ? "Prices likely to rise" : dir === "fall" ? "Prices likely to fall" : "Prices likely stable",
      reason: `Based on historical data and ${f.reason}.`,
      low30: inr(d.lowest.fare), today: inr(d.fares.at(-1)), forecast: `${compact(f.expectedRange[0])} – ${compact(f.expectedRange[1])}`, forecastHint: `Likely in ${f.window.replace("next ", "")}`,
    };
  },
  TimeOfDay(refs, o) {
    const d = need(refs, o.ref, "search_flights");
    const slots = Object.keys(SLOT_HOURS).map((label) => {
      const fares = d.flights.filter((f: any) => f.slot === label).map((f: any) => f.fare);
      return fares.length ? { label, hours: SLOT_HOURS[label], fare: Math.min(...fares) } : null;
    }).filter(Boolean);
    return { slots, ctaLabel: o.cta };
  },
  FlightList(refs, o) {
    const d = need(refs, o.ref, "search_flights");
    const codes = Array.isArray(o.codes) ? (o.codes as string[]) : null;
    const list = (codes ? d.flights.filter((f: any) => codes.includes(f.code)) : d.flights).slice(0, Number(o.limit ?? 3));
    if (!list.length) throw new Error("no matching flights");
    return { items: list.map((f: any, i: number) => flightProps(f, i, o)), recommended: o.recommended === true, ctaLabel: o.cta };
  },
  SectorInsights(refs, o) {
    const d = need(refs, o.ref, "search_flights");
    const groups = [["Non-stop", (f: any) => f.stops === 0], ["1+ stop", (f: any) => f.stops > 0]] as const;
    const rows = groups.map(([type, pred]) => {
      const fs = d.flights.filter(pred);
      return fs.length ? { type, options: fs.length, fareRange: `${compact(Math.min(...fs.map((f: any) => f.fare)))} – ${compact(Math.max(...fs.map((f: any) => f.fare)))}`, avgTime: fmtMin(avg(fs.map((f: any) => minutes(f.duration)))) } : null;
    }).filter(Boolean);
    return { route: d.route, meta: `${day(d.date)} · One-way · 1 adult`, rows };
  },
  HotelCard(refs, o) {
    const h = need(refs, o.ref, "get_hotel");
    return { name: h.name, category: h.category, location: h.location, rating: h.rating, reviewCount: `${(h.reviewCount / 1000).toFixed(1)}k reviews`, tags: h.tags };
  },
  PriceBar(refs, o) {
    const h = need(refs, o.ref, "get_hotel");
    return { perNight: inr(h.perNight), dates: String(o.dates ?? "Select dates"), occupancy: String(o.occupancy ?? "1 room · 2 guests"), ctaLabel: "View rooms & prices" };
  },
  ReviewSummary(refs, o) {
    const h = need(refs, o.ref, "get_hotel");
    return { rating: h.rating, count: `${(h.reviewCount / 1000).toFixed(1)}k`, summary: h.reviewSummary };
  },
  Highlights(refs, o) {
    const h = need(refs, o.ref, "get_hotel");
    return { title: "Why you might like it", items: h.highlights };
  },
  MapView(refs, o) {
    const h = need(refs, o.ref, "get_hotel");
    return { pinLabel: String(h.rating), chips: ["Hotel", ...h.nearby] };
  },
  CardCarousel(refs, o) {
    const d = need(refs, o.ref, "suggest_getaways");
    const limit = Number(o.limit ?? d.cards.length);
    return {
      title: typeof o.title === "string" ? o.title : undefined,
      // Links, image/icon URLs and click prompts are copied by code from tool data; the model never types them.
      items: d.cards.slice(0, limit).map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, price: inr(c.price), imageUrl: c.imageUrl, iconUrl: c.iconUrl, linkUrl: c.linkUrl, clickPrompt: c.promptMetadata.prompt })),
    };
  },
  // No data ref: the model supplies the text.
  ThingsToConsider(_refs, o) {
    if (typeof o.text !== "string") throw new Error("text required");
    return { text: o.text };
  },
  FollowUps(_refs, o) {
    if (!Array.isArray(o.questions)) throw new Error("questions required");
    return { title: "What would you like to explore?", questions: (o.questions as string[]).slice(0, 4) };
  },
};

