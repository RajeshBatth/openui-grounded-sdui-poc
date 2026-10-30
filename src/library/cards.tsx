import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { CardCarouselView } from "../views/cards";

export const CardCarousel = defineComponent({
  name: "CardCarousel",
  description:
    "Horizontal carousel of cards (e.g. getaway ideas). Every field must be copied exactly from the tool result: id, imageUrl, iconUrl and linkUrl are URLs/ids and must not be altered. `clickPrompt` is the text sent when a card is tapped. `price` is pre-formatted (e.g. '₹12,400').",
  props: z.object({
    items: z.array(
      z.object({
        id: z.string(), title: z.string(), subtitle: z.string(),
        imageUrl: z.string(), iconUrl: z.string(), linkUrl: z.string(), clickPrompt: z.string(),
        price: z.string().optional(),
      }),
    ),
    title: z.string().optional(),
  }),
  component: ({ props }) => <CardCarouselView {...props} />,
});
