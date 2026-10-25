import { useState } from "react";
import { toDateStr, todayStr } from "../services/format";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

// Month grid: booked dates are crossed out and cannot be picked.
export default function AvailabilityCalendar({ booked = [], value, onChange }) {
  const [cursor, setCursor] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = todayStr();
  const first = cursor.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isCurrentMonth = cursor.getFullYear() === new Date().getFullYear() && cursor.getMonth() === new Date().getMonth();

  const step = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" onClick={() => step(-1)} disabled={isCurrentMonth} aria-label="Previous month">‹</button>
        <strong>{cursor.toLocaleString("en", { month: "long", year: "numeric" })}</strong>
        <button type="button" onClick={() => step(1)} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid cal-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const s = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth(), d));
          const isBooked = booked.includes(s);
          const past = s < today;
          return (
            <button
              type="button"
              key={i}
              disabled={isBooked || past}
              className={`cal-day ${s === value ? "sel" : ""} ${isBooked ? "booked" : ""} ${s === today ? "today" : ""}`}
              onClick={() => onChange(s)}
              title={isBooked ? "Already booked" : ""}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="cal-legend">
        <span><i className="dot sel" /> Selected</span>
        <span><i className="dot booked" /> Booked</span>
      </div>
    </div>
  );
}
