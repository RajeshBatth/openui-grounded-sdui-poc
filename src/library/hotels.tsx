import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { HighlightsView, HotelCardView, MapPanel, PriceBarView, ReviewSummaryView } from "../views/hotels";

export const HotelCard = defineComponent({
  name: "HotelCard",
  description: "Hero card for one hotel: name, category, location, rating and highlight tags.",
  props: z.object({
    name: z.string(),
    category: z.string(),
    location: z.string(),
    rating: z.number(),
    reviewCount: z.string().describe("e.g. '12.66k reviews'"),
    tags: z.array(z.string()),
    imageUrl: z.string().optional(),
  }),
  component: ({ props }) => <HotelCardView {...props} />,
});

export const PriceBar = defineComponent({
  name: "PriceBar",
  description: "Per-night price with stay details and a link to rooms & prices.",
  props: z.object({ perNight: z.string(), dates: z.string(), occupancy: z.string(), ctaLabel: z.string() }),
  component: ({ props }) => <PriceBarView {...props} />,
});

export const ReviewSummary = defineComponent({
  name: "ReviewSummary",
  description: "AI-summarised guest reviews with overall rating.",
  props: z.object({ rating: z.number(), count: z.string(), summary: z.string() }),
  component: ({ props }) => <ReviewSummaryView {...props} />,
});

export const Highlights = defineComponent({
  name: "Highlights",
  description: "'Why you might like it' list of 2-4 highlights, each with an emoji icon.",
  props: z.object({
    title: z.string(),
    items: z.array(z.object({ icon: z.string(), title: z.string(), body: z.string() })),
  }),
  component: ({ props }) => <HighlightsView {...props} />,
});

export const MapView = defineComponent({
  name: "MapView",
  description: "Map with the hotel pin and nearby-place chips (placeholder map in this POC).",
  props: z.object({ pinLabel: z.string().describe("e.g. '4.2'"), chips: z.array(z.string()) }),
  component: ({ props }) => <MapPanel {...props} />,
});
