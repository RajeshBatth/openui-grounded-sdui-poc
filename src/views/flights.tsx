import type { ReactNode } from "react";
import { useAsk } from "../ask";
import { ViewAll } from "./common";

export interface FlightOptionProps {
  airline: string; code: string; depart: string; arrive: string; from: string; to: string;
  summary: string; price: string; badge?: string; note?: string; offer?: string;
}

export function FlightOptionView(props: FlightOptionProps) {
  const ask = useAsk();
  return (
    <div className="flight" onClick={() => ask(`Tell me more about ${props.code}`)}>
      <div className="flight-top">
        <span className="logo">{props.airline[0]}</span>
        <div><b>{props.airline}</b><small>{props.code}</small></div>
        {props.badge && <span className="badge">{props.badge}</span>}
      </div>
      <div className="flight-times">
        <div><b>{props.depart}</b><small>{props.from}</small></div>
        <div className="flight-mid"><span>{props.summary}</span></div>
        <div className="r"><b>{props.arrive}</b><small>{props.to}</small></div>
      </div>
      <div className="flight-price"><b>{props.price}</b>{props.note && <small>{props.note}</small>}<i>›</i></div>
      {props.offer && <div className="offer">% {props.offer}</div>}
    </div>
  );
}

export const FlightListView = (props: { children: ReactNode; recommended?: boolean; ctaLabel?: string }) => (
  <div className="card flight-list">
    {props.recommended && <div className="reco">✦ Myra's Recommendation</div>}
    {props.children}
    {props.ctaLabel && <ViewAll label={props.ctaLabel} message={props.ctaLabel} />}
  </div>
);

export const SectorInsightsView = (props: { route: string; meta: string; rows: { type: string; options: number; fareRange: string; avgTime: string }[] }) => (
  <div className="card">
    <div className="insight-head"><span className="spark">✈</span><div><b>Sector Insights</b><small>{props.route} · {props.meta}</small></div></div>
    <table className="insight">
      <thead><tr><th>Flight Type</th><th>Fare Range</th><th>Avg Time</th></tr></thead>
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.type}><td><b>{r.type}</b><small>{r.options} Flight Options</small></td><td><b>{r.fareRange}</b></td><td className="hl">{r.avgTime}</td></tr>
        ))}
      </tbody>
    </table>
  </div>
);
