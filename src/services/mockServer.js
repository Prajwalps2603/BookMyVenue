// In-browser stand-in for the Express API, used by the static GitHub Pages build
// (VITE_STATIC=true). It mirrors server/app.js endpoint by endpoint and keeps
// everything in the visitor's own localStorage, so each visitor has a private demo.
// It is NOT secure (plain-text passwords, no real tokens): demo use only.
import { venues as seedVenues } from "./Data.js";
import { quote, daysUntil, refundFor, parseCapacity } from "../../server/pricing.js";

const KEY = "bmv_static_db_v1"; // bump when the seed data changes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_TYPES = ["Wedding", "Engagement", "Birthday Party", "Corporate Event", "Reception"];

let memory = null; // fallback when localStorage is blocked
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return memory; } },
  set(v) { memory = v; try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } },
};

const fresh = () => ({
  users: [{ id: 1, name: "BMV Admin", email: "admin@bmv.com", phone: "", role: "admin", password: "admin123", favorites: [], createdAt: new Date().toISOString() }],
  venues: seedVenues.map((v) => ({ ...v })),
  bookings: [],
  reviews: [],
});

function load() {
  const raw = store.get();
  if (raw) { try { return JSON.parse(raw); } catch { /* corrupted: start over */ } }
  return fresh();
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
const publicUser = ({ password: _p, ...u }) => u;
const token = (u) => btoa(JSON.stringify({ id: u.id }));
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");

function venueFields(b, existing = {}) {
  const out = { ...existing };
  for (const k of ["name", "type", "city", "location", "description", "image"]) {
    if (b[k] !== undefined) out[k] = String(b[k]).trim();
  }
  if (b.capacity !== undefined) out.capacity = `${parseCapacity(b.capacity)} guests`;
  if (b.price !== undefined) out.price = Number(b.price);
  if (b.featured !== undefined) out.featured = !!b.featured;
  if (b.amenities !== undefined) {
    out.amenities = (Array.isArray(b.amenities) ? b.amenities : String(b.amenities).split(","))
      .map((a) => a.trim()).filter(Boolean);
  }
  if (out.image) out.images = existing.images?.length ? [out.image, ...existing.images.slice(1)] : [out.image];
  return out;
}
const venueValid = (v) => v.name && v.type && v.city && v.location && v.image && v.price > 0 && parseCapacity(v.capacity) > 0;

function route(db, method, path, body, authToken) {
  const { users, venues, bookings, reviews } = db;
  const booked = (venueId) => bookings.filter((b) => b.venueId === venueId && b.status !== "cancelled").map((b) => b.date);

  let me = null;
  const auth = () => {
    if (me) return me;
    try { me = users.find((u) => u.id === JSON.parse(atob(authToken)).id); } catch { /* bad token */ }
    if (!me) bad("Please log in", 401);
    return me;
  };
  const admin = () => { if (auth().role !== "admin") bad("Admin access only", 403); };
  let m;

  // ───────── Auth ─────────
  if (method === "POST" && path === "/auth/register") {
    const { name = "", email = "", phone = "", password = "" } = body;
    if (!name.trim() || !email || !password) bad("Name, email and password are required");
    if (!EMAIL_RE.test(email)) bad("Enter a valid email address");
    if (password.length < 6) bad("Password must be at least 6 characters");
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) bad("An account with this email already exists", 409);
    const user = { id: nextId(users), name: name.trim(), email: email.trim(), phone: phone.trim(), role: "user", password, favorites: [], createdAt: new Date().toISOString() };
    users.push(user);
    return [201, { token: token(user), user: publicUser(user) }];
  }
  if (method === "POST" && path === "/auth/login") {
    const typed = String(body.email || "").trim();
    const password = body.password || "";
    if (!typed || !password) bad("Enter an email and a password");
    const norm = typed.includes("@") ? typed : `${typed}@demo.local`;
    let user = users.find((u) => u.email.toLowerCase() === norm.toLowerCase());
    // demo login: anything signs in, except the admin account which needs its real password
    if (user?.role === "admin" && user.password !== password) bad("Incorrect email or password", 401);
    if (!user) {
      const local = norm.split("@")[0].replace(/[._-]+/g, " ").trim() || "Guest";
      user = { id: nextId(users), name: local.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "), email: norm, phone: "", role: "user", password, favorites: [], createdAt: new Date().toISOString() };
      users.push(user);
    }
    return [200, { token: token(user), user: publicUser(user) }];
  }
  if (method === "GET" && path === "/auth/me") return [200, { user: publicUser(auth()) }];
  if (method === "PUT" && path === "/auth/me") {
    const u = auth();
    if (body.name !== undefined) {
      if (!String(body.name).trim()) bad("Name cannot be empty");
      u.name = String(body.name).trim();
    }
    if (body.phone !== undefined) u.phone = String(body.phone).trim();
    return [200, { user: publicUser(u) }];
  }
  if (method === "PUT" && path === "/auth/password") {
    const u = auth();
    if (u.password !== (body.current || "")) bad("Current password is wrong", 401);
    if ((body.next || "").length < 6) bad("New password must be at least 6 characters");
    u.password = body.next;
    return [200, { ok: true }];
  }

  // ───────── Venues ─────────
  if (method === "GET" && path === "/venues") return [200, venues];
  if (method === "POST" && path === "/venues") {
    admin();
    const v = venueFields(body, { rating: 4.5, reviews: 0, featured: false, description: "", amenities: [] });
    if (!venueValid(v)) bad("Name, type, city, location, image, price and capacity are required");
    v.id = nextId(venues);
    venues.push(v);
    return [201, v];
  }
  if ((m = path.match(/^\/venues\/(\d+)$/))) {
    const id = Number(m[1]);
    const i = venues.findIndex((v) => v.id === id);
    if (method === "GET") return i < 0 ? bad("Venue not found", 404) : [200, venues[i]];
    if (method === "PUT") {
      admin();
      if (i < 0) bad("Venue not found", 404);
      const v = venueFields(body, venues[i]);
      if (!venueValid(v)) bad("Missing or invalid venue fields");
      venues[i] = v;
      return [200, v];
    }
    if (method === "DELETE") {
      admin();
      if (bookings.some((b) => b.venueId === id && b.status === "confirmed" && daysUntil(b.date) >= 0)) bad("Venue has upcoming bookings; cancel them first", 409);
      db.venues = venues.filter((v) => v.id !== id);
      db.reviews = reviews.filter((r) => r.venueId !== id);
      return [200, { ok: true }];
    }
  }
  if (method === "GET" && (m = path.match(/^\/venues\/(\d+)\/availability$/))) return [200, { booked: booked(Number(m[1])) }];
  if ((m = path.match(/^\/venues\/(\d+)\/reviews$/))) {
    const id = Number(m[1]);
    if (method === "GET") return [200, reviews.filter((r) => r.venueId === id).sort((a, b) => b.id - a.id)];
    if (method === "POST") {
      const u = auth();
      const venue = venues.find((v) => v.id === id);
      if (!venue) bad("Venue not found", 404);
      const rating = Number(body.rating);
      const comment = String(body.comment || "").trim();
      if (!(rating >= 1 && rating <= 5)) bad("Rating must be 1 to 5");
      if (comment.length < 3) bad("Please write a short comment");
      if (reviews.some((r) => r.venueId === id && r.userId === u.id)) bad("You have already reviewed this venue", 409);
      const review = { id: nextId(reviews), venueId: id, userId: u.id, userName: u.name, rating, comment, createdAt: new Date().toISOString() };
      reviews.push(review);
      venue.rating = Math.round(((venue.rating * venue.reviews + rating) / (venue.reviews + 1)) * 10) / 10;
      venue.reviews += 1;
      return [201, review];
    }
  }

  // ───────── Favourites ─────────
  if (method === "GET" && path === "/favorites") return [200, auth().favorites];
  if (method === "POST" && (m = path.match(/^\/favorites\/(\d+)$/))) {
    const u = auth();
    const id = Number(m[1]);
    if (!venues.some((v) => v.id === id)) bad("Venue not found", 404);
    u.favorites = u.favorites.includes(id) ? u.favorites.filter((x) => x !== id) : [...u.favorites, id];
    return [200, u.favorites];
  }

  // ───────── Payments (simulation) ─────────
  if (method === "POST" && path === "/payments/intent") {
    auth();
    const venue = venues.find((v) => v.id === Number(body.venueId));
    if (!venue) bad("Venue not found", 404);
    return [200, { paymentId: "pay_" + hex(7), amount: quote(venue.price).advance, signature: "static-demo" }];
  }

  // ───────── Bookings ─────────
  if (method === "POST" && path === "/bookings") {
    const u = auth();
    const { venueId, date, guests, eventType, name, email, phone, notes = "", paymentMethod = "UPI", paymentId, signature } = body;
    const venue = venues.find((v) => v.id === Number(venueId));
    if (!venue) bad("Venue not found", 404);
    if (!DATE_RE.test(date || "")) bad("Choose an event date");
    if (daysUntil(date) < 0) bad("Event date cannot be in the past");
    if (!EVENT_TYPES.includes(eventType)) bad("Invalid event type");
    const g = Number(guests);
    if (!(g > 0)) bad("Enter the number of guests");
    const cap = parseCapacity(venue.capacity);
    if (g > cap) bad(`This venue holds at most ${cap} guests`);
    if (!String(name || "").trim() || !EMAIL_RE.test(email || "") || !String(phone || "").trim()) bad("Name, a valid email and phone are required");
    if (booked(venue.id).includes(date)) bad("Sorry, this date was just booked. Pick another date.", 409);
    const q = quote(venue.price);
    const payAtVenue = paymentMethod === "Pay at Venue";
    if (!payAtVenue) {
      if (!paymentId || signature !== "static-demo") bad("Payment could not be verified", 402);
      if (bookings.some((b) => b.paymentId === paymentId)) bad("Payment already used", 409);
    }
    const booking = {
      id: "BMV" + hex(4).toUpperCase(), userId: u.id, venueId: venue.id, venueName: venue.name, venueImage: venue.image,
      city: venue.city, location: venue.location, date, guests: g, eventType,
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() }, notes, ...q,
      paymentMethod, paymentId: payAtVenue ? null : paymentId, paid: payAtVenue ? 0 : q.advance,
      status: "confirmed", refund: 0, createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    return [201, booking];
  }
  if (method === "GET" && path === "/bookings/mine") {
    const u = auth();
    return [200, bookings.filter((b) => b.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
  }
  if (method === "POST" && (m = path.match(/^\/bookings\/([A-Za-z0-9]+)\/cancel$/))) {
    const u = auth();
    const b = bookings.find((x) => x.id === m[1]);
    if (!b || (b.userId !== u.id && u.role !== "admin")) bad("Booking not found", 404);
    if (b.status === "cancelled") bad("Already cancelled", 409);
    if (daysUntil(b.date) < 0) bad("Past events cannot be cancelled", 409);
    b.status = "cancelled";
    b.refund = refundFor(b.paid, b.date);
    b.cancelledAt = new Date().toISOString();
    return [200, b];
  }

  // ───────── Admin ─────────
  if (method === "GET" && path === "/admin/bookings") {
    admin();
    return [200, [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
  }
  if (method === "GET" && path === "/admin/users") { admin(); return [200, users.map(publicUser)]; }
  if (method === "GET" && path === "/admin/stats") {
    admin();
    const live = bookings.filter((b) => b.status !== "cancelled");
    const monthly = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inMonth = live.filter((b) => b.createdAt.startsWith(key));
      monthly.push({ month: d.toLocaleString("en", { month: "short" }), bookings: inMonth.length, revenue: inMonth.reduce((s, b) => s + b.paid, 0) });
    }
    const byType = {};
    const byVenue = {};
    live.forEach((b) => {
      const v = venues.find((x) => x.id === b.venueId);
      if (v) byType[v.type] = (byType[v.type] || 0) + 1;
      byVenue[b.venueName] = (byVenue[b.venueName] || 0) + 1;
    });
    return [200, {
      venues: venues.length,
      users: users.filter((u) => u.role === "user").length,
      bookings: bookings.length,
      confirmed: live.length,
      cancelled: bookings.length - live.length,
      revenue: live.reduce((s, b) => s + b.paid, 0),
      monthly,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      topVenues: Object.entries(byVenue).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    }];
  }

  return bad("Not found", 404);
}

// Same contract as the real API: resolves to { status, data } (data = { error } on failure)
export async function mockRequest(method, path, body, authToken) {
  const db = load();
  try {
    const [status, data] = route(db, method, path.split("?")[0], body || {}, authToken);
    store.set(JSON.stringify(db));
    return { status, data };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, data: { error: e.message } };
    throw e;
  }
}
