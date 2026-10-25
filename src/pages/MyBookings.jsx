import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { inr, prettyDate, daysUntil, fallbackImg } from "../services/format";
import { useToast } from "../context/ToastContext";
import BMV from "../assets/BMV.png";

const refundEstimate = (b) => (daysUntil(b.date) >= 15 ? b.paid : Math.round(b.paid * 0.5));

function downloadIcs(b) {
  const d = b.date.replace(/-/g, "");
  const next = new Date(b.date + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const end = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BookMyVenue//EN", "BEGIN:VEVENT",
    `UID:${b.id}@bookmyvenue`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${b.eventType} at ${b.venueName}`,
    `LOCATION:${b.location}\\, ${b.city}`,
    `DESCRIPTION:Booking ${b.id} - ${b.guests} guests`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${b.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function Ticket({ b, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ticket-print" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-top">
          <span className="ticket-brand"><img src={BMV} alt="" /> BookMyVenue</span>
          <span className={`status-pill ${b.status}`}>{b.status}</span>
        </div>
        <h2>{b.venueName}</h2>
        <p className="muted">📍 {b.location}, {b.city}</p>
        <div className="ticket-grid">
          <div><span>Date</span><strong>{prettyDate(b.date)}</strong></div>
          <div><span>Event</span><strong>{b.eventType}</strong></div>
          <div><span>Guests</span><strong>{b.guests}</strong></div>
          <div><span>Booked by</span><strong>{b.contact.name}</strong></div>
          <div><span>Total</span><strong>{inr(b.total)}</strong></div>
          <div><span>Paid</span><strong>{inr(b.paid)}</strong></div>
        </div>
        <div className="ticket-stub">
          <div className="barcode" aria-hidden="true">
            {[...b.id].flatMap((c, i) => [c.charCodeAt(0) % 4 + 1, (c.charCodeAt(0) * (i + 3)) % 3 + 1]).map((w, i) => (
              <i key={i} style={{ width: w * 2, marginRight: 2 }} />
            ))}
          </div>
          <code>{b.id}</code>
        </div>
        <div className="ticket-actions no-print">
          <button className="btn-primary" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    api.myBookings().then(setBookings).catch((e) => setError(e.message));
  }, []);

  const cancel = async (b) => {
    const refund = refundEstimate(b);
    const msg = b.paid
      ? `Cancel this booking? You'll be refunded ${inr(refund)} of the ${inr(b.paid)} paid.`
      : "Cancel this booking?";
    if (!window.confirm(msg)) return;
    try {
      const updated = await api.cancelBooking(b.id);
      setBookings((list) => list.map((x) => (x.id === b.id ? updated : x)));
      toast("Booking cancelled", "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  if (error) return <div className="not-found">{error}</div>;
  if (!bookings) return <div className="page-loading"><div className="spinner" /></div>;

  const groups = {
    upcoming: bookings.filter((b) => b.status === "confirmed" && daysUntil(b.date) >= 0),
    past: bookings.filter((b) => b.status === "confirmed" && daysUntil(b.date) < 0),
    cancelled: bookings.filter((b) => b.status === "cancelled"),
  };
  const list = groups[tab];

  return (
    <div className="page-wrap">
      <h1 className="page-title">My Bookings</h1>
      <div className="tabs">
        {Object.entries(groups).map(([k, v]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {k[0].toUpperCase() + k.slice(1)} <span className="tab-count">{v.length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="no-results">
          <span>📭</span>
          <h3>No {tab} bookings</h3>
          {tab === "upcoming" && <Link to="/venues" className="clear-filters-btn">Find a venue</Link>}
        </div>
      ) : (
        <div className="booking-list">
          {list.map((b) => {
            const left = daysUntil(b.date);
            return (
              <div key={b.id} className="booking-row">
                <img src={b.venueImage} alt="" onError={fallbackImg} />
                <div className="booking-row-info">
                  <div className="booking-row-top">
                    <h3>{b.venueName}</h3>
                    <span className={`status-pill ${b.status}`}>{b.status}</span>
                  </div>
                  <p className="muted">📍 {b.location}, {b.city} · {b.eventType} · {b.guests} guests</p>
                  <p><strong>{prettyDate(b.date)}</strong>
                    {tab === "upcoming" && <span className="countdown"> · {left === 0 ? "Today! 🎉" : `in ${left} day${left > 1 ? "s" : ""}`}</span>}
                  </p>
                  <p className="muted">
                    ID {b.id} · Total {inr(b.total)} · Paid {inr(b.paid)}
                    {b.status === "cancelled" && ` · Refund ${inr(b.refund)}`}
                  </p>
                </div>
                <div className="booking-row-actions">
                  <button className="btn-secondary" onClick={() => setTicket(b)}>Ticket</button>
                  {b.status === "confirmed" && <button className="btn-secondary" onClick={() => downloadIcs(b)}>📅 Add to calendar</button>}
                  {tab === "upcoming" && <button className="btn-danger" onClick={() => cancel(b)}>Cancel</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ticket && <Ticket b={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
