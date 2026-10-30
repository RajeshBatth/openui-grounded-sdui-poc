import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ViewAll } from "./common";
import { safeUrl } from "./cards";

export interface CalendarMarkProps { day: number; label: string; iconUrl: string }

const compact = (n: number) => `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function FareCalendarView(props: { route: string; month: string; firstWeekday: number; prices: number[]; marks?: CalendarMarkProps[] }) {
  const markFor = (day: number) => props.marks?.find((m) => m.day === day);
  const valid = props.prices.filter((p) => p > 0);
  const sorted = [...valid].sort((a, b) => a - b);
  const min = sorted[0], q = (f: number) => sorted[Math.floor(sorted.length * f)];
  const tier = (p: number) => (p === min ? "best" : p <= q(0.25) ? "low" : p >= q(0.9) ? "high" : p >= q(0.75) ? "mid-high" : "");
  const cheapestDay = props.prices.indexOf(min) + 1;
  const mon = props.month.split(" ")[0];
  return (
    <div className="card">
      <div className="cal-head"><b>{props.route}</b><small>{props.month}</small></div>
      <div className="cal-grid">
        {"SMTWTFS".split("").map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
        {Array.from({ length: props.firstWeekday }, (_, i) => <div key={`b${i}`} />)}
        {props.prices.map((p, i) => (
          <div key={i} className={`cal-cell ${p ? tier(p) : "off"}`} title={markFor(i + 1)?.label}>
            <span>{i + 1}</span>{p > 0 && <em>{compact(p)}</em>}
            {markFor(i + 1) && safeUrl(markFor(i + 1)!.iconUrl) && <img className="cal-mark" src={safeUrl(markFor(i + 1)!.iconUrl)} alt="" />}
          </div>
        ))}
      </div>
      {!!props.marks?.length && (
        <div className="cal-legend">
          {props.marks.map((m) => (
            <span key={m.day}>{safeUrl(m.iconUrl) && <img src={safeUrl(m.iconUrl)} alt="" />}{m.day} {mon} · {m.label}</span>
          ))}
        </div>
      )}
      <div className="cal-foot">
        <span className="dot" />
        <div><small>Cheapest day</small><b className="hl">{cheapestDay} {mon}</b></div>
        <div><small>Price on {cheapestDay} {mon}</small><b className="hl">{inr(min)}</b></div>
      </div>
    </div>
  );
}

export const DateCellView = (props: { weekday: string; date: string; price: string; cheapest?: boolean; selected?: boolean }) => (
  <div className={`date-cell ${props.cheapest ? "cheapest" : props.selected ? "selected" : ""}`}>
    <small>{props.weekday}</small><span>{props.date}</span><b>{props.price}</b>
  </div>
);

export const DateStripView = ({ children }: { children: ReactNode }) => <div className="card date-strip">{children}</div>;

export interface Destination { city: string; code: string; fare: string; trend: number[] }
export const DestinationListView = (props: { items: Destination[]; ctaLabel?: string }) => (
  <div className="card dest-list">
    {props.items.map((d) => {
      const max = Math.max(...d.trend, 1);
      return (
        <div key={d.code} className="dest">
          <div className="dest-img">{d.code}</div>
          <div className="dest-main"><b>{d.city} ({d.code})</b><small>from</small><span className="hl">{d.fare}</span></div>
          <div className="spark-bars">
            {d.trend.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} className={i === 5 ? "on" : ""} />)}
            <small>Typical range this month</small>
          </div>
          <span className="chev">›</span>
        </div>
      );
    })}
    {props.ctaLabel && <ViewAll label={props.ctaLabel} message={props.ctaLabel} />}
  </div>
);

export function PriceTrendView(props: { title: string; fares: number[]; startLabel: string; endLabel: string; lowestLabel: string }) {
  const data = props.fares.map((v, i) => ({ i, v }));
  const low = Math.min(...props.fares), today = props.fares[props.fares.length - 1], first = props.fares[0];
  const pct = Math.round(((today - first) / first) * 100);
  return (
    <div className="card">
      <h4 className="card-title">{props.title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="1" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={compact} width={48} axisLine={false} tickLine={false} domain={["dataMin - 1000", "dataMax + 1000"]} />
          <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={() => ""} />
          <Area type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} fill="url(#g)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="trend-axis"><span>{props.startLabel}</span><span>{props.endLabel}</span></div>
      <div className="stat-row">
        <div><b className="hl">{inr(low)}</b><small>Lowest ({props.lowestLabel})</small></div>
        <div><b>{inr(today)}</b><small>Today</small></div>
        <div><b className={pct > 0 ? "bad" : "hl"}>{pct > 0 ? "↑" : "↓"} {Math.abs(pct)}%</b><small>vs. 30 days ago</small></div>
      </div>
    </div>
  );
}

export const BookOrWaitView = (props: { signal: "rise" | "fall" | "stable"; headline: string; reason: string; low30: string; today: string; forecast: string; forecastHint: string }) => (
  <div className="card">
    <div className={`signal ${props.signal}`}>
      <span className="signal-ico">{props.signal === "rise" ? "↗" : props.signal === "fall" ? "↘" : "→"}</span>
      <div><b>{props.headline}</b><small>{props.reason}</small></div>
    </div>
    <div className="stat-row">
      <div><b>{props.low30}</b><small>30-day low</small></div>
      <div><b>{props.today}</b><small>Today</small></div>
      <div><b>{props.forecast}</b><small>{props.forecastHint}</small></div>
    </div>
    <div className="alert-row"><span>🔔</span><div><b>Get price alerts</b><small>We'll notify you if the price drops.</small></div><i className="toggle" /></div>
  </div>
);

export function TimeOfDayView(props: { slots: { label: string; hours: string; fare: number }[]; ctaLabel?: string }) {
  const min = Math.min(...props.slots.map((s) => s.fare)), max = Math.max(...props.slots.map((s) => s.fare));
  return (
    <div className="card">
      <h4 className="card-title">Prices by time of day</h4>
      <div className="tod">
        {props.slots.map((s) => (
          <div key={s.label} className={`tod-col ${s.fare === min ? "best" : ""}`}>
            {s.fare === min && <em>Cheapest</em>}
            <b>{inr(s.fare)}</b>
            <div className="tod-bar"><i style={{ height: `${40 + ((s.fare - min) / (max - min || 1)) * 60}%` }} /></div>
            <span>{s.label}</span><small>{s.hours}</small>
          </div>
        ))}
      </div>
      {props.ctaLabel && <ViewAll label={props.ctaLabel} message={props.ctaLabel} />}
    </div>
  );
}
