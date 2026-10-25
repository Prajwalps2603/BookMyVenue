import { useState } from "react";

// Read-only when `onChange` is omitted, interactive otherwise.
export default function StarRating({ value = 0, onChange, size = 20 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="stars" style={{ fontSize: size }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${n <= Math.round(shown) ? "on" : ""} ${onChange ? "clickable" : ""}`}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(n)}
          role={onChange ? "button" : undefined}
          aria-label={onChange ? `${n} star${n > 1 ? "s" : ""}` : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
}
