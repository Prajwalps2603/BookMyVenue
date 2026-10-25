import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { quote, daysUntil, refundFor, parseCapacity } from "./pricing.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_TYPES = ["Wedding", "Engagement", "Birthday Party", "Corporate Event", "Reception"];

export function createApp(
  db,
  {
    jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me",
    // Demo login: any email/password signs in (new emails get an account). Admin accounts always need their real password.
    demoLogin = process.env.DEMO_LOGIN !== "false",
  } = {}
) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  const { data } = db;
  const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
  const publicUser = ({ passwordHash: _hash, ...u }) => u;
  const sign = (u) => jwt.sign({ id: u.id, role: u.role }, jwtSecret, { expiresIn: "7d" });
  const payHmac = (id, amount, userId) =>
    crypto.createHmac("sha256", jwtSecret).update(`${id}|${amount}|${userId}`).digest("hex");

  const auth = (req, res, next) => {
    const h = req.headers.authorization || "";
    try {
      const p = jwt.verify(h.replace(/^Bearer /, ""), jwtSecret);
      const user = data.users.find((u) => u.id === p.id);
      if (!user) return bad(res, "Account no longer exists", 401);
      req.user = user;
      next();
    } catch {
      bad(res, "Please log in", 401);
    }
  };
  const admin = (req, res, next) =>
    req.user.role === "admin" ? next() : bad(res, "Admin access only", 403);

  const bookedDates = (venueId) =>
    data.bookings
      .filter((b) => b.venueId === venueId && b.status !== "cancelled")
      .map((b) => b.date);

  // ───────── Auth ─────────
  app.post("/api/auth/register", (req, res) => {
    const { name = "", email = "", phone = "", password = "" } = req.body;
    if (!name.trim() || !email || !password) return bad(res, "Name, email and password are required");
    if (!EMAIL_RE.test(email)) return bad(res, "Enter a valid email address");
    if (password.length < 6) return bad(res, "Password must be at least 6 characters");
    if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return bad(res, "An account with this email already exists", 409);
    const user = {
      id: db.nextId(data.users),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: "user",
      passwordHash: bcrypt.hashSync(password, 8),
      favorites: [],
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    db.save();
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email = "", password = "" } = req.body;
    const typed = String(email).trim();
    if (!typed || !password) return bad(res, "Enter an email and a password");
    const norm = typed.includes("@") ? typed : `${typed}@demo.local`;
    let user = data.users.find((u) => u.email.toLowerCase() === norm.toLowerCase());
    const passwordOk = !!user && bcrypt.compareSync(password, user.passwordHash);

    if (demoLogin && (!user || (!passwordOk && user.role !== "admin"))) {
      if (!user) {
        const local = norm.split("@")[0].replace(/[._-]+/g, " ").trim() || "Guest";
        user = {
          id: db.nextId(data.users),
          name: local.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          email: norm,
          phone: "",
          role: "user",
          passwordHash: bcrypt.hashSync(password, 8),
          favorites: [],
          createdAt: new Date().toISOString(),
        };
        data.users.push(user);
        db.save();
      }
      return res.json({ token: sign(user), user: publicUser(user) });
    }
    if (!passwordOk) return bad(res, "Incorrect email or password", 401);
    res.json({ token: sign(user), user: publicUser(user) });
  });

  app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

  app.put("/api/auth/me", auth, (req, res) => {
    const { name, phone } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) return bad(res, "Name cannot be empty");
      req.user.name = String(name).trim();
    }
    if (phone !== undefined) req.user.phone = String(phone).trim();
    db.save();
    res.json({ user: publicUser(req.user) });
  });

  app.put("/api/auth/password", auth, (req, res) => {
    const { current = "", next = "" } = req.body;
    if (!bcrypt.compareSync(current, req.user.passwordHash)) return bad(res, "Current password is wrong", 401);
    if (next.length < 6) return bad(res, "New password must be at least 6 characters");
    req.user.passwordHash = bcrypt.hashSync(next, 8);
    db.save();
    res.json({ ok: true });
  });

  // ───────── Venues ─────────
  app.get("/api/venues", (_req, res) => res.json(data.venues));

  app.get("/api/venues/:id", (req, res) => {
    const v = data.venues.find((x) => x.id === Number(req.params.id));
    v ? res.json(v) : bad(res, "Venue not found", 404);
  });

  app.get("/api/venues/:id/availability", (req, res) =>
    res.json({ booked: bookedDates(Number(req.params.id)) })
  );

  const venueFields = (b, existing = {}) => {
    const out = { ...existing };
    for (const k of ["name", "type", "city", "location", "description", "image"]) {
      if (b[k] !== undefined) out[k] = String(b[k]).trim();
    }
    if (b.capacity !== undefined) out.capacity = `${parseCapacity(b.capacity)} guests`;
    if (b.price !== undefined) out.price = Number(b.price);
    if (b.featured !== undefined) out.featured = !!b.featured;
    if (b.amenities !== undefined)
      out.amenities = (Array.isArray(b.amenities) ? b.amenities : String(b.amenities).split(","))
        .map((a) => a.trim())
        .filter(Boolean);
    if (out.image) out.images = existing.images?.length ? [out.image, ...existing.images.slice(1)] : [out.image];
    return out;
  };
  const venueValid = (v) =>
    v.name && v.type && v.city && v.location && v.image && v.price > 0 && parseCapacity(v.capacity) > 0;

  app.post("/api/venues", auth, admin, (req, res) => {
    const v = venueFields(req.body, { rating: 4.5, reviews: 0, featured: false, description: "", amenities: [] });
    if (!venueValid(v)) return bad(res, "Name, type, city, location, image, price and capacity are required");
    v.id = db.nextId(data.venues);
    data.venues.push(v);
    db.save();
    res.status(201).json(v);
  });

  app.put("/api/venues/:id", auth, admin, (req, res) => {
    const i = data.venues.findIndex((x) => x.id === Number(req.params.id));
    if (i < 0) return bad(res, "Venue not found", 404);
    const v = venueFields(req.body, data.venues[i]);
    if (!venueValid(v)) return bad(res, "Missing or invalid venue fields");
    data.venues[i] = v;
    db.save();
    res.json(v);
  });

  app.delete("/api/venues/:id", auth, admin, (req, res) => {
    const id = Number(req.params.id);
    if (data.bookings.some((b) => b.venueId === id && b.status === "confirmed" && daysUntil(b.date) >= 0))
      return bad(res, "Venue has upcoming bookings; cancel them first", 409);
    // mutate in place: `data` is shared by reference with the db module
    const keep = (list, fn) => {
      const k = list.filter(fn);
      list.length = 0;
      list.push(...k);
    };
    keep(data.venues, (v) => v.id !== id);
    keep(data.reviews, (r) => r.venueId !== id);
    db.save();
    res.json({ ok: true });
  });

  // ───────── Reviews ─────────
  app.get("/api/venues/:id/reviews", (req, res) =>
    res.json(data.reviews.filter((r) => r.venueId === Number(req.params.id)).sort((a, b) => b.id - a.id))
  );

  app.post("/api/venues/:id/reviews", auth, (req, res) => {
    const venue = data.venues.find((v) => v.id === Number(req.params.id));
    if (!venue) return bad(res, "Venue not found", 404);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!(rating >= 1 && rating <= 5)) return bad(res, "Rating must be 1 to 5");
    if (comment.length < 3) return bad(res, "Please write a short comment");
    if (data.reviews.some((r) => r.venueId === venue.id && r.userId === req.user.id))
      return bad(res, "You have already reviewed this venue", 409);
    const review = {
      id: db.nextId(data.reviews),
      venueId: venue.id,
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    data.reviews.push(review);
    venue.rating = Math.round(((venue.rating * venue.reviews + rating) / (venue.reviews + 1)) * 10) / 10;
    venue.reviews += 1;
    db.save();
    res.status(201).json(review);
  });

  // ───────── Favourites ─────────
  app.get("/api/favorites", auth, (req, res) => res.json(req.user.favorites));

  app.post("/api/favorites/:venueId", auth, (req, res) => {
    const id = Number(req.params.venueId);
    if (!data.venues.some((v) => v.id === id)) return bad(res, "Venue not found", 404);
    const f = req.user.favorites;
    req.user.favorites = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
    db.save();
    res.json(req.user.favorites);
  });

  // ───────── Payments (demo gateway, test mode: no real money moves) ─────────
  app.post("/api/payments/intent", auth, (req, res) => {
    const venue = data.venues.find((v) => v.id === Number(req.body.venueId));
    if (!venue) return bad(res, "Venue not found", 404);
    const amount = quote(venue.price).advance;
    const id = "pay_" + crypto.randomBytes(7).toString("hex");
    res.json({ paymentId: id, amount, signature: payHmac(id, amount, req.user.id) });
  });

  // ───────── Bookings ─────────
  app.post("/api/bookings", auth, (req, res) => {
    const {
      venueId, date, guests, eventType, name, email, phone,
      notes = "", paymentMethod = "UPI", paymentId, signature,
    } = req.body;
    const venue = data.venues.find((v) => v.id === Number(venueId));
    if (!venue) return bad(res, "Venue not found", 404);
    if (!DATE_RE.test(date || "")) return bad(res, "Choose an event date");
    if (daysUntil(date) < 0) return bad(res, "Event date cannot be in the past");
    if (!EVENT_TYPES.includes(eventType)) return bad(res, "Invalid event type");
    const g = Number(guests);
    if (!(g > 0)) return bad(res, "Enter the number of guests");
    const cap = parseCapacity(venue.capacity);
    if (g > cap) return bad(res, `This venue holds at most ${cap} guests`);
    if (!String(name || "").trim() || !EMAIL_RE.test(email || "") || !String(phone || "").trim())
      return bad(res, "Name, a valid email and phone are required");
    if (bookedDates(venue.id).includes(date))
      return bad(res, "Sorry, this date was just booked. Pick another date.", 409);

    const q = quote(venue.price);
    const payAtVenue = paymentMethod === "Pay at Venue";
    if (!payAtVenue) {
      if (!paymentId || signature !== payHmac(paymentId, q.advance, req.user.id))
        return bad(res, "Payment could not be verified", 402);
      if (data.bookings.some((b) => b.paymentId === paymentId)) return bad(res, "Payment already used", 409);
    }
    const booking = {
      id: "BMV" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      userId: req.user.id,
      venueId: venue.id,
      venueName: venue.name,
      venueImage: venue.image,
      city: venue.city,
      location: venue.location,
      date,
      guests: g,
      eventType,
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      notes,
      ...q,
      paymentMethod,
      paymentId: payAtVenue ? null : paymentId,
      paid: payAtVenue ? 0 : q.advance,
      status: "confirmed",
      refund: 0,
      createdAt: new Date().toISOString(),
    };
    data.bookings.push(booking);
    db.save();
    res.status(201).json(booking);
  });

  app.get("/api/bookings/mine", auth, (req, res) =>
    res.json(
      data.bookings
        .filter((b) => b.userId === req.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  );

  app.post("/api/bookings/:id/cancel", auth, (req, res) => {
    const b = data.bookings.find((x) => x.id === req.params.id);
    if (!b || (b.userId !== req.user.id && req.user.role !== "admin")) return bad(res, "Booking not found", 404);
    if (b.status === "cancelled") return bad(res, "Already cancelled", 409);
    if (daysUntil(b.date) < 0) return bad(res, "Past events cannot be cancelled", 409);
    b.status = "cancelled";
    b.refund = refundFor(b.paid, b.date);
    b.cancelledAt = new Date().toISOString();
    db.save();
    res.json(b);
  });

  // ───────── Admin ─────────
  app.get("/api/admin/bookings", auth, admin, (_req, res) =>
    res.json([...data.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  );

  app.get("/api/admin/users", auth, admin, (_req, res) => res.json(data.users.map(publicUser)));

  app.get("/api/admin/stats", auth, admin, (_req, res) => {
    const live = data.bookings.filter((b) => b.status !== "cancelled");
    const revenue = live.reduce((s, b) => s + b.paid, 0);
    const monthly = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inMonth = live.filter((b) => b.createdAt.startsWith(key));
      monthly.push({
        month: d.toLocaleString("en", { month: "short" }),
        bookings: inMonth.length,
        revenue: inMonth.reduce((s, b) => s + b.paid, 0),
      });
    }
    const byType = {};
    const byVenue = {};
    live.forEach((b) => {
      const v = data.venues.find((x) => x.id === b.venueId);
      if (v) byType[v.type] = (byType[v.type] || 0) + 1;
      byVenue[b.venueName] = (byVenue[b.venueName] || 0) + 1;
    });
    res.json({
      venues: data.venues.length,
      users: data.users.filter((u) => u.role === "user").length,
      bookings: data.bookings.length,
      confirmed: live.length,
      cancelled: data.bookings.length - live.length,
      revenue,
      monthly,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      topVenues: Object.entries(byVenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    });
  });

  app.use("/api", (_req, res) => bad(res, "Not found", 404));
  app.use((err, _req, res, _next) => {
    console.error(err);
    bad(res, "Something went wrong on the server", 500);
  });
  return app;
}
