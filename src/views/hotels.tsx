import { ViewAll } from "./common";

export const HotelCardView = (props: { name: string; category: string; location: string; rating: number; reviewCount: string; tags: string[]; imageUrl?: string }) => (
  <div className="card hotel">
    <div className="hotel-name"><b>{props.name}</b><small>{props.category} · {props.location}</small></div>
    <div className="hotel-img" style={props.imageUrl ? { backgroundImage: `url(${props.imageUrl})` } : undefined}>
      <span className="hotel-rating">★ <b>{props.rating}</b> ({props.reviewCount})</span>
      <div className="hotel-tags">{props.tags.map((t) => <span key={t}>{t}</span>)}</div>
    </div>
  </div>
);

export const PriceBarView = (props: { perNight: string; dates: string; occupancy: string; ctaLabel: string }) => (
  <div className="card price-bar">
    <div><b>{props.perNight} / night</b><small>{props.dates}</small><small>{props.occupancy}</small></div>
    <ViewAll label={`${props.ctaLabel} ›`} message={props.ctaLabel} />
  </div>
);

export const ReviewSummaryView = (props: { rating: number; count: string; summary: string }) => (
  <div className="card">
    <div className="rev-head"><b>Reviews</b><span className="link">View all reviews ›</span></div>
    <div className="rev-rating"><b>{props.rating}</b><span className="stars">{"★".repeat(Math.round(props.rating))}</span><small>({props.count})</small></div>
    <p className="small">{props.summary}</p>
    <small className="ai">✦ Summarised by AI</small>
  </div>
);

export const HighlightsView = (props: { title: string; items: { icon: string; title: string; body: string }[] }) => (
  <div className="card">
    <h4 className="card-title">{props.title}</h4>
    {props.items.map((it) => (
      <div key={it.title} className="hl-item"><span>{it.icon}</span><div><b>{it.title}</b><small>{it.body}</small></div></div>
    ))}
  </div>
);

export const MapPanel = (props: { pinLabel: string; chips: string[] }) => (
  <div className="card">
    <h4 className="card-title">📍 Map View</h4>
    <div className="map"><span className="pin">★ {props.pinLabel}</span></div>
    <div className="chips">{props.chips.map((c) => <span key={c}>{c}</span>)}</div>
  </div>
);
