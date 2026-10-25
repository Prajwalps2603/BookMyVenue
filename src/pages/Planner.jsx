import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useVenues } from "../hooks/useVenues";
import { quote, inr, capacityOf } from "../services/format";

const EVENT_TYPES = ["Wedding", "Party", "Corporate", "Outdoor", "Birthday", "Reception"];

// Rough per-event cost model (₹) used for the "what will it all cost" estimate
const EXTRAS = [
  { key: "catering", label: "🍽️ Catering", perGuest: 650, help: "per guest" },
  { key: "decor", label: "💐 Decor & flowers", flat: 40000 },
  { key: "photo", label: "📸 Photography", flat: 35000 },
  { key: "music", label: "🎧 DJ / Music", flat: 25000 },
];

export default function Planner() {
  const { venues, loading } = useVenues();
  const [type, setType] = useState("Wedding");
  const [guests, setGuests] = useState(150);
  const [budget, setBudget] = useState(500000);
  const [on, setOn] = useState({ catering: true, decor: true, photo: true, music: false });
  const [city, setCity] = useState("");

  const cities = useMemo(() => [...new Set(venues.map(v => v.city))].sort(), [venues]);

  const extras = EXTRAS.filter(e => on[e.key]).map(e => ({ ...e, cost: e.perGuest ? e.perGuest * guests : e.flat }));
  const extrasTotal = extras.reduce((s, e) => s + e.cost, 0);
  const venueBudget = Math.max(budget - extrasTotal, 0);

  const matches = useMemo(
    () =>
      venues
        .filter(v =>
          v.type === type && (!city || v.city === city) &&
          capacityOf(v) >= guests && quote(v.price).total <= venueBudget)
        .sort((a, b) => b.rating - a.rating),
    [venues, type, city, guests, venueBudget]
  );

  return (
    <div className="page-wrap">
      <h1 className="page-title">🧮 Event Budget Planner</h1>
      <p className="muted planner-sub">Tell us your plan and budget. We'll estimate the extras and show venues that fit what's left.</p>

      <div className="planner-layout">
        <div className="panel">
          <h2>Your event</h2>
          <div className="form-group">
            <label>Event type</label>
            <div className="chip-row">
              {EVENT_TYPES.map(t => (
                <button key={t} type="button" className={`type-pill ${type === t ? "active" : ""}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>City</label>
            <select className="form-input" value={city} onChange={e => setCity(e.target.value)}>
              <option value="">Anywhere</option>
              {cities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Guests: <strong>{guests}</strong></label>
            <input type="range" className="range-input" min={20} max={1000} step={10} value={guests} onChange={e => setGuests(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Total budget: <strong>{inr(budget)}</strong></label>
            <input type="range" className="range-input" min={50000} max={2000000} step={10000} value={budget} onChange={e => setBudget(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Include in estimate</label>
            {EXTRAS.map(e => (
              <label key={e.key} className="checkbox-label planner-extra">
                <input type="checkbox" checked={on[e.key]} onChange={() => setOn({ ...on, [e.key]: !on[e.key] })} />
                {e.label} <span className="muted">{e.perGuest ? `~${inr(e.perGuest)} ${e.help}` : `~${inr(e.flat)}`}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Budget split</h2>
            <div className="split-bar">
              <div className="split-venue" style={{ width: `${Math.min(100, (venueBudget / budget) * 100)}%` }} title="Left for venue" />
              <div className="split-extras" style={{ width: `${Math.min(100, (extrasTotal / budget) * 100)}%` }} title="Extras" />
            </div>
            <div className="split-legend">
              <span><i className="dot sel" /> Venue budget <strong>{inr(venueBudget)}</strong></span>
              <span><i className="dot gold" /> Extras <strong>{inr(extrasTotal)}</strong></span>
            </div>
            {extrasTotal > budget && <p className="auth-error">⚠️ The extras alone exceed your budget. Raise the budget or drop some extras.</p>}
          </div>

          <h2 className="planner-results-title">{loading ? "Searching…" : `${matches.length} venue${matches.length === 1 ? "" : "s"} fit`}</h2>
          <div className="planner-matches">
            {matches.slice(0, 6).map(v => (
              <Link key={v.id} to={`/venues/${v.id}`} className="planner-match">
                <img src={v.image} alt="" />
                <div>
                  <strong>{v.name}</strong>
                  <span className="muted">{v.city} · up to {v.capacity} · ⭐ {v.rating}</span>
                </div>
                <div className="planner-price">
                  {inr(quote(v.price).total)}
                  <small>{inr(venueBudget - quote(v.price).total)} left</small>
                </div>
              </Link>
            ))}
            {!loading && matches.length === 0 && (
              <div className="no-results"><span>🤔</span><p>No venue fits. Try a smaller guest list, a bigger budget, or another city.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
