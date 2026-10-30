import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { BookOrWaitView, DateCellView, DateStripView, DestinationListView, FareCalendarView, PriceTrendView, TimeOfDayView } from "../views/fares";

export const FareCalendar = defineComponent({
  name: "FareCalendar",
  description:
    "Month calendar of lowest daily fares. `prices[i]` is the fare for day i+1 (0 = no flights). `firstWeekday` is 0=Sun..6=Sat for day 1. Cheapest days are highlighted automatically.",
  props: z.object({
    route: z.string(),
    month: z.string().describe("e.g. 'Oct 2026'"),
    firstWeekday: z.number(),
    prices: z.array(z.number()),
    marks: z.array(z.object({ day: z.number(), label: z.string(), iconUrl: z.string() })).optional().describe("Holiday/event marks: day of month, label, and the icon URL copied exactly from the tool result"),
  }),
  component: ({ props }) => <FareCalendarView {...props} />,
});

export const DateCell = defineComponent({
  name: "DateCell",
  description: "One day in a DateStrip. `price` is pre-formatted like '₹20.1K'.",
  props: z.object({
    weekday: z.string(),
    date: z.string(),
    price: z.string(),
    cheapest: z.boolean().optional(),
    selected: z.boolean().optional().describe("The date the user asked about"),
  }),
  component: ({ props }) => <DateCellView {...props} />,
});

export const DateStrip = defineComponent({
  name: "DateStrip",
  description: "Row of ~5 DateCells: a few days either side of a target date.",
  props: z.object({ items: z.array(DateCell.ref) }),
  component: ({ props, renderNode }) => <DateStripView>{renderNode(props.items)}</DateStripView>,
});

export const DestinationList = defineComponent({
  name: "DestinationList",
  description: "Cheapest destinations in a country. `fare` is a pre-formatted one-way from-price; `trend` is an array of ~12 prices for the sparkline.",
  props: z.object({
    items: z.array(z.object({ city: z.string(), code: z.string(), fare: z.string(), trend: z.array(z.number()) })),
    ctaLabel: z.string().optional(),
  }),
  component: ({ props }) => <DestinationListView {...props} />,
});

export const PriceTrend = defineComponent({
  name: "PriceTrend",
  description: "30-day fare history line chart with lowest/today/change summary. `fares` oldest->newest.",
  props: z.object({
    title: z.string(),
    fares: z.array(z.number()),
    startLabel: z.string(),
    endLabel: z.string(),
    lowestLabel: z.string().describe("e.g. '18 Sep'"),
  }),
  component: ({ props }) => <PriceTrendView {...props} />,
});

export const BookOrWait = defineComponent({
  name: "BookOrWait",
  description: "Forward-looking price signal. `signal` is 'rise' (book now), 'fall' (wait) or 'stable'.",
  props: z.object({
    signal: z.enum(["rise", "fall", "stable"]),
    headline: z.string().describe("e.g. 'Prices likely to rise'"),
    reason: z.string(),
    low30: z.string(),
    today: z.string(),
    forecast: z.string().describe("e.g. '₹26K – ₹30K'"),
    forecastHint: z.string().describe("e.g. 'Likely in 2–3 weeks'"),
  }),
  component: ({ props }) => <BookOrWaitView {...props} />,
});

export const TimeOfDay = defineComponent({
  name: "TimeOfDay",
  description: "Fare comparison across 4 time-of-day slots. Cheapest slot is highlighted automatically.",
  props: z.object({
    slots: z.array(z.object({ label: z.string(), hours: z.string(), fare: z.number() })),
    ctaLabel: z.string().optional(),
  }),
  component: ({ props }) => <TimeOfDayView {...props} />,
});
