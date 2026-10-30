import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { CardCarousel } from "./cards";
import { FollowUps, Intro, ThingsToConsider } from "./common";
import { BookOrWait, DateCell, DateStrip, DestinationList, FareCalendar, PriceTrend, TimeOfDay } from "./fares";
import { FlightList, FlightOption, SectorInsights } from "./flights";
import { HotelCard, Highlights, MapView, PriceBar, ReviewSummary } from "./hotels";

const Stack = defineComponent({
  name: "Stack",
  description: "Root vertical layout for one assistant message. Always `root = Stack([...])`.",
  props: z.object({
    children: z.array(
      z.union([
        Intro.ref, ThingsToConsider.ref, FollowUps.ref,
        FareCalendar.ref, DateStrip.ref, DestinationList.ref, PriceTrend.ref, BookOrWait.ref, TimeOfDay.ref,
        FlightList.ref, SectorInsights.ref,
        HotelCard.ref, PriceBar.ref, ReviewSummary.ref, Highlights.ref, MapView.ref, CardCarousel.ref,
      ]),
    ),
  }),
  component: ({ props, renderNode }) => <div className="stack">{renderNode(props.children)}</div>,
});

export const library = createLibrary({
  root: "Stack",
  components: [
    Stack, Intro, ThingsToConsider, FollowUps,
    FareCalendar, DateStrip, DateCell, DestinationList, PriceTrend, BookOrWait, TimeOfDay,
    FlightList, FlightOption, SectorInsights,
    HotelCard, PriceBar, ReviewSummary, Highlights, MapView, CardCarousel,
  ],
});
