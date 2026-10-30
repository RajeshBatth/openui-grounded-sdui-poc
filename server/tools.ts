import type OpenAI from "openai";
import * as inv from "./inventory";

type Args = Record<string, string | number | undefined>;
interface Tool {
  def: OpenAI.Chat.Completions.ChatCompletionFunctionTool;
  run: (a: Args) => unknown;
}

const str = (description: string) => ({ type: "string", description });
const tool = (name: string, description: string, properties: Record<string, unknown>, required: string[], run: Tool["run"]): Tool => ({
  def: { type: "function", function: { name, description, parameters: { type: "object", properties, required } } },
  run,
});

const route = (a: Args) => {
  const from = inv.findAirport(String(a.from)), to = inv.findAirport(String(a.to));
  if (!from) throw new Error(`Unknown origin "${a.from}". Known: ${inv.airports.map((x) => x.code).join(", ")}`);
  if (!to) throw new Error(`Unknown destination "${a.to}". Known: ${inv.airports.map((x) => x.code).join(", ")}`);
  return { from, to };
};
const FROM = str("Origin city or IATA code"), TO = str("Destination city or IATA code"), DATE = str("Travel date YYYY-MM-DD");

export const tools: Tool[] = [
  // Lets us require a tool call on round 1 (so data answers are always grounded) without forcing a data lookup for smalltalk.
  tool("answer_directly", "Call this ONLY when the message needs no travel data: greetings, thanks, or questions about what you can do. Never use it for fares, flights, hotels or destinations.",
    {}, [],
    () => ({ ok: true, note: "No data needed. Answer briefly and end with follow-up suggestions." })),
  tool("search_flights", "List flights (6 options across the day, cheapest first) for a route and date, with fare, times, stops, baggage.",
    { from: FROM, to: TO, date: DATE }, ["from", "to", "date"],
    (a) => { const r = route(a); return { route: `${r.from.city} (${r.from.code}) -> ${r.to.city} (${r.to.code})`, date: a.date, currency: "INR", flights: inv.searchFlights(r.from, r.to, String(a.date)) }; }),
  tool("get_fare_calendar", "Lowest fare for every day of a month on a route, plus holiday/event marks with icon URLs (for a month-view calendar).",
    { from: FROM, to: TO, month: str("YYYY-MM") }, ["from", "to", "month"],
    (a) => { const r = route(a); return { route: `${r.from.city} (${r.from.code}) -> ${r.to.city} (${r.to.code})`, currency: "INR", ...inv.fareCalendar(r.from, r.to, String(a.month)) }; }),
  tool("suggest_getaways", "Getaway ideas from an origin for a month, cheapest first, as cards with image, icon, link and click-prompt metadata.",
    { from: FROM, month: str("YYYY-MM"), limit: { type: "number", description: "max cards, default 8" } }, ["from", "month"],
    (a) => { const f = inv.findAirport(String(a.from)); if (!f) throw new Error(`Unknown origin "${a.from}"`); return { currency: "INR", origin: f.code, month: a.month, cards: inv.suggestGetaways(f, String(a.month), Number(a.limit ?? 8)) }; }),
  tool("get_date_fares", "Lowest fare for each of the 5 days centred on a target date (for a date strip).",
    { from: FROM, to: TO, date: DATE }, ["from", "to", "date"],
    (a) => { const r = route(a); return { currency: "INR", fares: [-2, -1, 0, 1, 2].map((o) => { const d = inv.addDays(String(a.date), o); return { date: d, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(d + "T00:00:00Z").getUTCDay()], fare: inv.dailyFare(r.from, r.to, d), isTarget: o === 0 }; }) }; }),
  tool("get_price_history", "30-day fare history for a route/travel date, plus lowest point and a book-or-wait forecast.",
    { from: FROM, to: TO, date: DATE }, ["from", "to", "date"],
    (a) => { const r = route(a); return { currency: "INR", ...inv.priceHistory(r.from, r.to, String(a.date)) }; }),
  tool("search_destinations", "Cheapest one-way destinations in a country from an origin, for a month.",
    { from: FROM, country: str("Country name, e.g. Australia"), month: str("YYYY-MM") }, ["from", "country", "month"],
    (a) => { const f = inv.findAirport(String(a.from)); if (!f) throw new Error(`Unknown origin "${a.from}"`); const d = inv.destinationsIn(String(a.country), f, String(a.month)); if (!d.length) throw new Error(`No destinations in "${a.country}"`); return { currency: "INR", oneWay: true, destinations: d }; }),
  tool("search_hotels", "Hotels in a city with price per night, rating and tags.",
    { city: str("City, e.g. Goa"), checkIn: DATE, checkOut: DATE, guests: { type: "number" } }, ["city"],
    (a) => ({ currency: "INR", stay: { checkIn: a.checkIn, checkOut: a.checkOut, guests: a.guests ?? 2 }, hotels: inv.searchHotels(String(a.city)).map(({ name, category, location, rating, reviewCount, perNight, tags }) => ({ name, category, location, rating, reviewCount, perNight, tags })) }) ),
  tool("get_hotel", "Full details for one hotel: reviews summary, highlights, nearby places.",
    { name: str("Hotel name (partial ok)") }, ["name"],
    (a) => inv.findHotel(String(a.name)) ?? (() => { throw new Error(`No hotel matching "${a.name}"`); })()),
];

/** Runs a tool and returns its data object (or {error}). */
export function runToolData(name: string, rawArgs: string): Record<string, unknown> {
  try {
    const t = tools.find((x) => x.def.function.name === name);
    if (!t) throw new Error(`Unknown tool ${name}`);
    return t.run(JSON.parse(rawArgs || "{}")) as Record<string, unknown>;
  } catch (e) {
    return { error: String(e instanceof Error ? e.message : e) };
  }
}

export const runTool = (name: string, rawArgs: string) => JSON.stringify(runToolData(name, rawArgs));
