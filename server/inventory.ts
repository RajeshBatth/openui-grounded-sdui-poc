// Mock inventory: deterministic (seeded by route/date) so the same query always returns the same result.

export interface Airport { code: string; city: string; country: string; lat: number; lon: number }

export const airports: Airport[] = [
  { code: "DEL", city: "Delhi", country: "India", lat: 28.56, lon: 77.1 },
  { code: "BOM", city: "Mumbai", country: "India", lat: 19.09, lon: 72.87 },
  { code: "BLR", city: "Bangalore", country: "India", lat: 13.2, lon: 77.7 },
  { code: "GOI", city: "Goa", country: "India", lat: 15.38, lon: 73.83 },
  { code: "SIN", city: "Singapore", country: "Singapore", lat: 1.36, lon: 103.99 },
  { code: "BKK", city: "Bangkok", country: "Thailand", lat: 13.69, lon: 100.75 },
  { code: "DXB", city: "Dubai", country: "UAE", lat: 25.25, lon: 55.36 },
  { code: "LHR", city: "London", country: "UK", lat: 51.47, lon: -0.45 },
  { code: "NRT", city: "Tokyo", country: "Japan", lat: 35.77, lon: 140.39 },
  { code: "SYD", city: "Sydney", country: "Australia", lat: -33.94, lon: 151.18 },
  { code: "MEL", city: "Melbourne", country: "Australia", lat: -37.67, lon: 144.84 },
  { code: "BNE", city: "Brisbane", country: "Australia", lat: -27.38, lon: 153.12 },
  { code: "PER", city: "Perth", country: "Australia", lat: -31.94, lon: 115.97 },
  { code: "ADL", city: "Adelaide", country: "Australia", lat: -34.94, lon: 138.53 },
];

export const findAirport = (q: string) => {
  const s = q.trim().toLowerCase();
  return airports.find((a) => a.code.toLowerCase() === s || a.city.toLowerCase() === s);
};

const airlines = [
  { name: "IndiGo", code: "6E", mult: 0.92 },
  { name: "Air India", code: "AI", mult: 1.05 },
  { name: "Air India Express", code: "IX", mult: 0.95 },
  { name: "Vistara", code: "UK", mult: 1.1 },
  { name: "Singapore Airlines", code: "SQ", mult: 1.3 },
  { name: "Scoot", code: "TR", mult: 0.88 },
];

// --- seeded randomness ---
function hash(str: string) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; // avalanche
  return (h >>> 0) / 4294967296; // [0,1)
}
const round100 = (n: number) => Math.round(n / 100) * 100;

function km(a: Airport, b: Airport) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

export const today = () => new Date().toISOString().slice(0, 10);
const dayOfWeek = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

/** Lowest fare (INR) on a route for a travel date. */
export function dailyFare(from: Airport, to: Airport, date: string) {
  const base = 2800 + km(from, to) * 3.4;
  const weekend = [5, 6, 0].includes(dayOfWeek(date)) ? 1.12 : 1;
  return round100(base * weekend * (0.8 + 0.5 * hash(`${from.code}${to.code}${date}`)));
}

export interface Flight {
  airline: string; code: string; depart: string; arrive: string; from: string; to: string;
  stops: number; duration: string; fare: number; baggage: string; slot: string;
}

const SLOTS = [
  { name: "Late night", dep: [2, 30] }, { name: "Morning", dep: [8, 20] },
  { name: "Morning", dep: [11, 50] }, { name: "Afternoon", dep: [15, 40] },
  { name: "Evening", dep: [19, 10] }, { name: "Evening", dep: [22, 45] },
];
const pad = (n: number) => String(n).padStart(2, "0");

export function searchFlights(from: Airport, to: Airport, date: string): Flight[] {
  const dist = km(from, to), floor = dailyFare(from, to, date);
  return SLOTS.map((s, i) => {
    const seed = `${from.code}${to.code}${date}${i}`;
    const al = airlines[Math.floor(hash(seed + "a") * airlines.length)];
    const stops = dist > 5000 && hash(seed + "s") > 0.4 ? 1 : dist < 1500 ? 0 : hash(seed + "s") > 0.7 ? 1 : 0;
    const mins = Math.round((dist / 800) * 60 + 30 + stops * 150 + hash(seed + "d") * 20);
    const depMin = s.dep[0] * 60 + s.dep[1];
    const arrMin = (depMin + mins) % 1440;
    return {
      airline: al.name,
      code: `${al.code}-${100 + Math.floor(hash(seed + "n") * 900)}`,
      depart: `${pad(s.dep[0])}:${pad(s.dep[1])}`,
      arrive: `${pad(Math.floor(arrMin / 60))}:${pad(arrMin % 60)}${depMin + mins >= 1440 ? " (+1)" : ""}`,
      from: from.code, to: to.code, stops,
      duration: `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`,
      fare: round100(floor * al.mult * (1 + stops * -0.08) * (1 + hash(seed + "f") * 0.25)),
      baggage: hash(seed + "b") > 0.5 ? "30 kg check-in" : "15 kg check-in",
      slot: s.name,
    };
  }).sort((a, b) => a.fare - b.fare);
}

export interface CalendarMark { day: number; kind: "holiday" | "festival" | "long-weekend"; label: string; iconUrl: string }

// Mock holiday/event data (illustrative, not an authoritative calendar).
const MARKS: Record<string, [number, CalendarMark["kind"], string][]> = {
  "2026-10": [[2, "holiday", "Gandhi Jayanti"], [20, "festival", "Dussehra"]],
  "2026-11": [[7, "long-weekend", "Long weekend (Sat to Mon)"], [8, "festival", "Diwali"], [9, "holiday", "Govardhan Puja"], [11, "festival", "Bhai Dooj"], [24, "holiday", "Guru Nanak Jayanti"]],
  "2026-12": [[24, "festival", "Christmas Eve"], [25, "holiday", "Christmas Day"], [26, "long-weekend", "Long weekend (Fri to Sun)"], [31, "festival", "New Year's Eve"]],
};
export const calendarMarks = (month: string): CalendarMark[] =>
  (MARKS[month] ?? []).map(([day, kind, label]) => ({ day, kind, label, iconUrl: `/mock/icons/${kind}-48.svg` }));

export function fareCalendar(from: Airport, to: Airport, month: string) {
  const first = `${month}-01`, d = new Date(first + "T00:00:00Z");
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return {
    month, firstWeekday: d.getUTCDay(), marks: calendarMarks(month),
    dailyLowestFare: Array.from({ length: days }, (_, i) => dailyFare(from, to, addDays(first, i))),
  };
}

export function priceHistory(from: Airport, to: Airport, date: string) {
  const end = today(), dayFares = Array.from({ length: 30 }, (_, i) => {
    const asOf = addDays(end, i - 29);
    return round100(dailyFare(from, to, date) * (0.9 + 0.25 * hash(`${from.code}${to.code}${date}${asOf}`)));
  });
  const todayFare = dayFares[29], daysOut = Math.round((Date.parse(date) - Date.parse(end)) / 864e5);
  const dir = daysOut < 21 ? "rise" : hash(`${from.code}${to.code}dir`) > 0.5 ? "fall" : "stable";
  const f = dir === "rise" ? [1.12, 1.3] : dir === "fall" ? [0.8, 0.95] : [0.97, 1.03];
  return {
    travelDate: date, startDate: addDays(end, -29), endDate: end, fares: dayFares,
    lowest: { fare: Math.min(...dayFares), date: addDays(end, dayFares.indexOf(Math.min(...dayFares)) - 29) },
    forecast: { direction: dir, window: "next 2-3 weeks", expectedRange: [round100(todayFare * f[0]), round100(todayFare * f[1])], reason: dir === "rise" ? "departure is close and holiday demand is building" : "no demand spike expected" },
  };
}

export function destinationsIn(country: string, from: Airport, month: string) {
  return airports.filter((a) => a.country.toLowerCase() === country.toLowerCase()).map((a) => {
    const fare = dailyFare(from, a, `${month}-15`);
    return { city: a.city, code: a.code, fromFare: fare, typicalRangeThisMonth: Array.from({ length: 12 }, (_, i) => round100(fare * (1 + hash(a.code + month + i) * 0.45))) };
  }).sort((a, b) => a.fromFare - b.fromFare);
}

export interface Hotel {
  name: string; category: string; city: string; location: string; rating: number; reviewCount: number;
  perNight: number; tags: string[]; reviewSummary: string; highlights: { icon: string; title: string; body: string }[]; nearby: string[];
}

export const hotels: Hotel[] = [
  { name: "Taj Exotica Resort & Spa, Goa", category: "Luxury Resort", city: "Goa", location: "Benaulim, South Goa", rating: 4.2, reviewCount: 12660, perNight: 21828, tags: ["Beachfront", "Family-friendly", "5-star"],
    reviewSummary: "Guests love the lush surroundings, spacious rooms and clean private beach, along with attentive staff. Varied food options and family-friendly activities are frequently appreciated.",
    highlights: [{ icon: "🏖️", title: "Direct beach access", body: "Step straight from the resort onto Benaulim Beach." }, { icon: "🌴", title: "Spacious 56-acre property", body: "Lots of greenery and open spaces." }, { icon: "👨‍👩‍👧", title: "Good for families", body: "Kids' club, shallow pool and family rooms." }],
    nearby: ["Benaulim Beach 2 min walk", "Varca Beach 5.3 km", "Margao 9 km"] },
  { name: "Kays Cadenza Resort", category: "Resort", city: "Goa", location: "Benaulim, South Goa", rating: 4.4, reviewCount: 3120, perNight: 15200, tags: ["Pool", "Breakfast included"],
    reviewSummary: "Guests praise the quiet setting and large pool; a few note the walk to the beach.",
    highlights: [{ icon: "🏊", title: "Large pool", body: "Lagoon-style pool with swim-up bar." }, { icon: "🍳", title: "Breakfast included", body: "Buffet breakfast on all rates." }],
    nearby: ["Benaulim Beach 10 min walk", "Margao 8 km"] },
  { name: "W Goa", category: "Luxury Hotel", city: "Goa", location: "Vagator, North Goa", rating: 4.5, reviewCount: 5400, perNight: 28900, tags: ["Beach club", "Nightlife", "Spa"],
    reviewSummary: "Stylish rooms, great pool scene and views of Vagator beach; priced at a premium.",
    highlights: [{ icon: "🎉", title: "Lively scene", body: "Beach club and bars on site." }], nearby: ["Vagator Beach 3 min walk", "Anjuna 4 km"] },
  { name: "Marina Bay Sands", category: "Luxury Hotel", city: "Singapore", location: "Marina Bay", rating: 4.6, reviewCount: 48000, perNight: 38500, tags: ["Infinity pool", "City views", "5-star"],
    reviewSummary: "The rooftop infinity pool and skyline views stand out; rooms are comfortable, queues at peak times.",
    highlights: [{ icon: "🏊", title: "Rooftop infinity pool", body: "Hotel guests only." }], nearby: ["Gardens by the Bay 5 min walk", "MRT Bayfront 2 min walk"] },
  { name: "The Oberoi, Bengaluru", category: "Luxury Hotel", city: "Bangalore", location: "MG Road", rating: 4.5, reviewCount: 4100, perNight: 17500, tags: ["Central", "Business", "Spa"],
    reviewSummary: "Impeccable service and a calm garden oasis in the city centre.",
    highlights: [{ icon: "🌿", title: "Garden setting", body: "Quiet courtyards despite central location." }], nearby: ["MG Road Metro 4 min walk", "Cubbon Park 8 min walk"] },
];

export const searchHotels = (city: string) => hotels.filter((h) => h.city.toLowerCase() === city.trim().toLowerCase());
export const findHotel = (name: string) => hotels.find((h) => h.name.toLowerCase().includes(name.trim().toLowerCase()));

// --- Getaway ideas (carousel cards): lots of per-card data that the UI needs (image, icon, link, click prompt) ---
export interface GetawayCard {
  id: string; title: string; subtitle: string; price: number; imageUrl: string; iconUrl: string; linkUrl: string;
  promptMetadata: { action: string; prompt: string; origin: string; destination: string; month: string };
}

export function suggestGetaways(from: Airport, month: string, limit = 8): GetawayCard[] {
  return airports
    .filter((a) => a.code !== from.code)
    .map((a) => ({ a, fare: dailyFare(from, a, `${month}-15`), d: km(from, a) }))
    .sort((x, y) => x.fare - y.fare)
    .slice(0, limit)
    .map(({ a, fare, d }) => {
      const slug = a.city.toLowerCase(), hours = (d / 800 + 0.5).toFixed(1);
      return {
        id: `getaway-${a.code.toLowerCase()}-${month}`,
        title: a.city,
        subtitle: `${a.country} · about ${hours} h flight`,
        price: fare,
        imageUrl: `/mock/cards/destinations/${slug}-hero-640x360.svg`,
        iconUrl: `/mock/icons/${d < 2500 ? "city" : "beach"}-48.svg`,
        linkUrl: `https://www.myra-travel.example/destinations/${slug}?origin=${from.code}&month=${month}&utm_source=chat&utm_medium=carousel`,
        promptMetadata: { action: "explore_destination", prompt: `Show me flights from ${from.city} to ${a.city} in ${month}`, origin: from.code, destination: a.code, month },
      };
    });
}
