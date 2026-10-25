export const SERVICE_FEE_RATE = 0.05;
export const ADVANCE_RATE = 0.5;
export const FULL_REFUND_DAYS = 15;

export function quote(price) {
  const fee = Math.round(price * SERVICE_FEE_RATE);
  const total = price + fee;
  return { price, fee, total, advance: Math.round(total * ADVANCE_RATE) };
}

export function daysUntil(dateStr, now = new Date()) {
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - t) / 86400000);
}

// Policy shown on the venue page: full refund of the advance when cancelled
// 15+ days before the event, otherwise 50% of it.
export function refundFor(advance, dateStr, now = new Date()) {
  return daysUntil(dateStr, now) >= FULL_REFUND_DAYS ? advance : Math.round(advance * 0.5);
}

export const parseCapacity = (c) => parseInt(String(c), 10) || 0;
