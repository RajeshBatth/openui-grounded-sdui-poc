import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { FlightListView, FlightOptionView, SectorInsightsView } from "../views/flights";

export const FlightOption = defineComponent({
  name: "FlightOption",
  description: "One flight. `summary` like 'Non-stop · 4h 10m' or '1 stop · 7h 10m'. `price` pre-formatted (₹16,869). `badge` e.g. 'Cheapest'.",
  props: z.object({
    airline: z.string(),
    code: z.string(),
    depart: z.string(),
    arrive: z.string(),
    from: z.string(),
    to: z.string(),
    summary: z.string(),
    price: z.string(),
    badge: z.string().optional(),
    note: z.string().optional().describe("e.g. 'Friday departure · 30 kg check-in'"),
    offer: z.string().optional().describe("Promo line, e.g. '%FLYSIN · ₹800 OFF'"),
  }),
  component: ({ props }) => <FlightOptionView {...props} />,
});

export const FlightList = defineComponent({
  name: "FlightList",
  description: "A list of FlightOption cards. `recommended` marks the first as Myra's recommendation.",
  props: z.object({
    items: z.array(FlightOption.ref),
    recommended: z.boolean().optional(),
    ctaLabel: z.string().optional(),
  }),
  component: ({ props, renderNode }) => (
    <FlightListView recommended={props.recommended} ctaLabel={props.ctaLabel}>{renderNode(props.items)}</FlightListView>
  ),
});

export const SectorInsights = defineComponent({
  name: "SectorInsights",
  description: "Summary table comparing non-stop vs 1-stop fares and duration for a route.",
  props: z.object({
    route: z.string(),
    meta: z.string().describe("e.g. 'Fri, 25 Sep · One-way · 1 adult'"),
    rows: z.array(z.object({ type: z.string(), options: z.number(), fareRange: z.string(), avgTime: z.string() })),
  }),
  component: ({ props }) => <SectorInsightsView {...props} />,
});
