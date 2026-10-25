export const SERVICE_FEE_RATE = 0.05;
export const ADVANCE_RATE = 0.5;

export const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export const capacityOf = (v) => parseInt(String(v?.capacity), 10) || 0;

export function quote(price) {
  const fee = Math.round(price * SERVICE_FEE_RATE);
  const total = price + fee;
  return { price, fee, total, advance: Math.round(total * ADVANCE_RATE) };
}

// Local YYYY-MM-DD (toISOString would shift the day in IST)
export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const todayStr = () => toDateStr(new Date());

export function prettyDate(s) {
  if (!s) return "TBD";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

export function daysUntil(s) {
  const d = new Date(s + "T00:00:00");
  const t = new Date();
  return Math.round((d - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
}

// onError handler: swap a dead photo for a neutral placeholder instead of a broken-image icon
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B1A2E"/><stop offset="1" stop-color="#C9952A"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><text x="300" y="215" font-size="64" text-anchor="middle">🏛️</text></svg>'
  );
export function fallbackImg(e) {
  if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER;
}
