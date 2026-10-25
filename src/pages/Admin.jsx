import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { inr, prettyDate } from "../services/format";
import { useToast } from "../context/ToastContext";
import { useVenues, invalidateVenues } from "../hooks/useVenues";

const TYPES = ["Wedding", "Party", "Corporate", "Outdoor", "Birthday", "Reception"];
const PALETTE = ["#8B1A2E", "#C9952A", "#4caf7d", "#3b82c4", "#a05cc4", "#e0703a"];

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <svg viewBox="0 0 360 180" className="chart" role="img" aria-label="Revenue by month">
      {data.map((d, i) => {
        const h = (d.revenue / max) * 120;
        const x = 20 + i * 56;
        return (
          <g key={d.month + i}>
            <rect x={x} y={140 - h} width={36} height={h} rx={6} fill="var(--primary)" opacity={d.revenue ? 1 : 0.15}>
              <title>{`${d.month}: ${inr(d.revenue)} · ${d.bookings} bookings`}</title>
            </rect>
            <text x={x + 18} y={160} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{d.month}</text>
            {d.revenue > 0 && <text x={x + 18} y={134 - h} textAnchor="middle" fontSize="10" fill="var(--text)">{inr(d.revenue / 1000).replace("₹", "")}k</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return <p className="muted">No bookings yet</p>;
  const R = 52, C = 2 * Math.PI * R;
  const segments = data.map((d, i) => ({
    ...d,
    len: (d.count / total) * C,
    offset: data.slice(0, i).reduce((s, x) => s + (x.count / total) * C, 0),
  }));
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Bookings by event type">
        <g transform="rotate(-90 70 70)">
          {segments.map((d, i) => (
            <circle key={d.type} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]}
              strokeWidth="22" strokeDasharray={`${d.len} ${C - d.len}`} strokeDashoffset={-d.offset}>
              <title>{`${d.type}: ${d.count}`}</title>
            </circle>
          ))}
        </g>
        <text x="70" y="75" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{total}</text>
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.type}><i style={{ background: PALETTE[i % PALETTE.length] }} /> {d.type} <strong>{d.count}</strong></li>
        ))}
      </ul>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.adminStats().then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="auth-error">{err}</p>;
  if (!s) return <div className="page-loading"><div className="spinner" /></div>;

  const cards = [
    ["💰", "Revenue collected", inr(s.revenue)],
    ["📅", "Confirmed bookings", s.confirmed],
    ["🏛️", "Venues", s.venues],
    ["👥", "Customers", s.users],
    ["❌", "Cancelled", s.cancelled],
  ];
  return (
    <>
      <div className="stat-cards">
        {cards.map(([icon, label, value]) => (
          <div key={label} className="stat-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
        ))}
      </div>
      <div className="admin-grid">
        <div className="panel"><h2>Revenue, last 6 months</h2><BarChart data={s.monthly} /></div>
        <div className="panel"><h2>Bookings by event type</h2><Donut data={s.byType} /></div>
        <div className="panel">
          <h2>Most booked venues</h2>
          {s.topVenues.length === 0 ? <p className="muted">No bookings yet</p> : (
            <ol className="top-list">
              {s.topVenues.map((v) => <li key={v.name}>{v.name} <strong>{v.count}</strong></li>)}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}

const EMPTY = { name: "", type: "Wedding", city: "", location: "", capacity: 100, price: 50000, image: "", description: "", amenities: "", featured: false };

function VenueForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial ? { ...initial, capacity: parseInt(initial.capacity), amenities: (initial.amenities || []).join(", ") } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await (initial ? api.updateVenue(initial.id, f) : api.createVenue(f));
      onSave();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal venue-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? "Edit venue" : "Add venue"}</h2>
        {err && <div className="auth-error">⚠️ {err}</div>}
        <div className="form-group"><label>Name</label><input className="form-input" value={f.name} onChange={set("name")} required /></div>
        <div className="form-row">
          <div className="form-group"><label>Type</label>
            <select className="form-input" value={f.type} onChange={set("type")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div className="form-group"><label>City</label><input className="form-input" value={f.city} onChange={set("city")} required /></div>
        </div>
        <div className="form-group"><label>Area / locality</label><input className="form-input" value={f.location} onChange={set("location")} required /></div>
        <div className="form-row">
          <div className="form-group"><label>Capacity (guests)</label><input type="number" min="1" className="form-input" value={f.capacity} onChange={set("capacity")} required /></div>
          <div className="form-group"><label>Price per day (₹)</label><input type="number" min="1" className="form-input" value={f.price} onChange={set("price")} required /></div>
        </div>
        <div className="form-group"><label>Image URL</label><input type="url" className="form-input" value={f.image} onChange={set("image")} required placeholder="https://…" /></div>
        <div className="form-group"><label>Amenities (comma separated)</label><input className="form-input" value={f.amenities} onChange={set("amenities")} placeholder="AC, Parking, Catering" /></div>
        <div className="form-group"><label>Description</label><textarea className="form-input form-textarea" value={f.description} onChange={set("description")} /></div>
        <label className="checkbox-label"><input type="checkbox" checked={!!f.featured} onChange={set("featured")} /> Featured venue</label>
        <div className="step-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="auth-submit-btn" disabled={busy}>{busy ? "Saving…" : "Save venue"}</button>
        </div>
      </form>
    </div>
  );
}

function VenuesTab() {
  const { venues, loading } = useVenues();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | "new" | venue
  const [search, setSearch] = useState("");

  const remove = async (v) => {
    if (!window.confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteVenue(v.id);
      invalidateVenues();
      toast("Venue deleted", "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const shown = venues.filter((v) => `${v.name} ${v.city} ${v.type}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="admin-toolbar">
        <input className="form-input" placeholder="Search venues…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-primary" onClick={() => setEditing("new")}>+ Add venue</button>
      </div>
      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Venue</th><th>Type</th><th>City</th><th>Capacity</th><th>Price</th><th>Rating</th><th /></tr></thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id}>
                  <td><img src={v.image} alt="" className="thumb-sm" /> {v.name} {v.featured && "⭐"}</td>
                  <td>{v.type}</td><td>{v.city}</td><td>{v.capacity}</td><td>{inr(v.price)}</td><td>{v.rating} ({v.reviews})</td>
                  <td className="row-actions">
                    <button className="btn-secondary" onClick={() => setEditing(v)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(v)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <VenueForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); invalidateVenues(); toast("Venue saved", "success"); }}
        />
      )}
    </>
  );
}

function BookingsTab() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const load = useCallback(() => api.adminBookings().then(setRows).catch((e) => toast(e.message, "error")), [toast]);
  useEffect(() => { load(); }, [load]);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.id}?`)) return;
    try { await api.cancelBooking(b.id); toast("Booking cancelled", "success"); load(); } catch (e) { toast(e.message, "error"); }
  };
  if (!rows) return <div className="page-loading"><div className="spinner" /></div>;
  if (!rows.length) return <div className="no-results"><span>📭</span><p>No bookings yet</p></div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>ID</th><th>Venue</th><th>Customer</th><th>Date</th><th>Guests</th><th>Paid / Total</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><code>{b.id}</code></td><td>{b.venueName}</td>
              <td>{b.contact.name}<br /><small className="muted">{b.contact.email}</small></td>
              <td>{prettyDate(b.date)}</td><td>{b.guests}</td><td>{inr(b.paid)} / {inr(b.total)}</td>
              <td><span className={`status-pill ${b.status}`}>{b.status}</span></td>
              <td>{b.status === "confirmed" && <button className="btn-danger" onClick={() => cancel(b)}>Cancel</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.adminUsers().then(setRows).catch(() => setRows([])); }, []);
  if (!rows) return <div className="page-loading"><div className="spinner" /></div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.phone || "–"}</td><td>{u.role}</td><td>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = { Overview, Venues: VenuesTab, Bookings: BookingsTab, Users: UsersTab };

export default function Admin() {
  const [tab, setTab] = useState("Overview");
  const Active = TABS[tab];
  return (
    <div className="page-wrap wide">
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="tabs">
        {Object.keys(TABS).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <Active />
    </div>
  );
}
