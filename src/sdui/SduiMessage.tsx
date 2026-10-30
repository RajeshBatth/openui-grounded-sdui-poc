import type { ReactNode } from "react";
import { FollowUpsView, MarkdownView, ThingsToConsiderView } from "../views/common";
import { BookOrWaitView, DateCellView, DateStripView, DestinationListView, FareCalendarView, PriceTrendView, TimeOfDayView } from "../views/fares";
import { FlightListView, FlightOptionView, SectorInsightsView } from "../views/flights";
import { CardCarouselView } from "../views/cards";
import { HighlightsView, HotelCardView, MapPanel, PriceBarView, ReviewSummaryView } from "../views/hotels";
import type { Block } from "./blocks";

// Template registry. Props are produced by server/sdui/build.ts, so no client-side validation is needed beyond name lookup.
const templates: Record<string, (p: any) => ReactNode> = {
  FareCalendar: (p) => <FareCalendarView {...p} />,
  DateStrip: (p) => <DateStripView>{p.items.map((c: any, i: number) => <DateCellView key={i} {...c} />)}</DateStripView>,
  DestinationList: (p) => <DestinationListView {...p} />,
  PriceTrend: (p) => <PriceTrendView {...p} />,
  BookOrWait: (p) => <BookOrWaitView {...p} />,
  TimeOfDay: (p) => <TimeOfDayView {...p} />,
  FlightList: (p) => (
    <FlightListView recommended={p.recommended} ctaLabel={p.ctaLabel}>
      {p.items.map((f: any, i: number) => <FlightOptionView key={i} {...f} />)}
    </FlightListView>
  ),
  SectorInsights: (p) => <SectorInsightsView {...p} />,
  HotelCard: (p) => <HotelCardView {...p} />,
  PriceBar: (p) => <PriceBarView {...p} />,
  ReviewSummary: (p) => <ReviewSummaryView {...p} />,
  Highlights: (p) => <HighlightsView {...p} />,
  MapView: (p) => <MapPanel {...p} />,
  CardCarousel: (p) => <CardCarouselView {...p} />,
  ThingsToConsider: (p) => <ThingsToConsiderView {...p} />,
  FollowUps: (p) => <FollowUpsView {...p} />,
};

export function SduiMessage({ blocks }: { blocks: Block[] }) {
  return (
    <div className="stack">
      {blocks.map((b, i) => {
        if (b.t === "md") return <MarkdownView key={i} text={b.text} header={i === 0} />;
        const render = templates[b.name];
        return render ? <div key={i}>{render(b.props)}</div> : null;
      })}
    </div>
  );
}
