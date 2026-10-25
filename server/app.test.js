import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createDb } from "./db.js";
import { createApp } from "./app.js";
import { quote, refundFor, daysUntil } from "./pricing.js";

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let api;
beforeEach(() => {
  api = request(createApp(createDb(":memory:"), { jwtSecret: "test", demoLogin: false }));
});

async function signup(email = "a@test.com") {
  const r = await api.post("/api/auth/register").send({ name: "Asha", email, phone: "99", password: "secret1" });
  return r.body.token;
}

async function book(token, over = {}) {
  const intent = await api.post("/api/payments/intent").set("Authorization", `Bearer ${token}`).send({ venueId: 1 });
  return api.post("/api/bookings").set("Authorization", `Bearer ${token}`).send({
    venueId: 1, date: future(30), guests: 100, eventType: "Wedding",
    name: "Asha", email: "a@test.com", phone: "99",
    paymentId: intent.body.paymentId, signature: intent.body.signature, ...over,
  });
}

describe("pricing", () => {
  it("adds 5% fee and 50% advance", () => {
    expect(quote(100000)).toEqual({ price: 100000, fee: 5000, total: 105000, advance: 52500 });
  });
  it("refunds fully 15+ days out, half otherwise", () => {
    expect(refundFor(1000, future(20))).toBe(1000);
    expect(refundFor(1000, future(3))).toBe(500);
    expect(daysUntil(future(7))).toBe(7);
  });
});

describe("auth", () => {
  it("registers, logs in and rejects bad passwords", async () => {
    await signup();
    expect((await api.post("/api/auth/login").send({ email: "a@test.com", password: "secret1" })).status).toBe(200);
    expect((await api.post("/api/auth/login").send({ email: "a@test.com", password: "nope" })).status).toBe(401);
  });
  it("blocks duplicate emails", async () => {
    await signup();
    expect((await api.post("/api/auth/register").send({ name: "B", email: "A@test.com", password: "secret1" })).status).toBe(409);
  });
  it("requires a token for protected routes", async () => {
    expect((await api.get("/api/bookings/mine")).status).toBe(401);
  });
});

describe("demo login", () => {
  const demo = () => request(createApp(createDb(":memory:"), { jwtSecret: "test", demoLogin: true }));
  it("signs in any email and creates the account", async () => {
    const a = demo();
    const r = await a.post("/api/auth/login").send({ email: "asha.rao@gmail.com", password: "x" });
    expect(r.status).toBe(200);
    expect(r.body.user.name).toBe("Asha Rao");
    expect((await a.get("/api/auth/me").set("Authorization", `Bearer ${r.body.token}`)).status).toBe(200);
  });
  it("accepts a plain word as the email", async () => {
    const r = await demo().post("/api/auth/login").send({ email: "guest", password: "1" });
    expect(r.body.user.email).toBe("guest@demo.local");
  });
  it("still protects the admin account", async () => {
    const a = demo();
    expect((await a.post("/api/auth/login").send({ email: "admin@bmv.com", password: "wrong" })).status).toBe(401);
    expect((await a.post("/api/auth/login").send({ email: "admin@bmv.com", password: "admin123" })).status).toBe(200);
  });
  it("rejects empty fields", async () => {
    expect((await demo().post("/api/auth/login").send({ email: "", password: "" })).status).toBe(400);
  });
});

describe("venues", () => {
  it("lists seeded venues", async () => {
    const r = await api.get("/api/venues");
    expect(r.body.length).toBeGreaterThan(20);
  });
  it("only lets admins create venues", async () => {
    const token = await signup();
    expect((await api.post("/api/venues").set("Authorization", `Bearer ${token}`).send({})).status).toBe(403);
  });
});

describe("bookings", () => {
  it("books a venue and blocks the same date", async () => {
    const token = await signup();
    const ok = await book(token);
    expect(ok.status).toBe(201);
    expect(ok.body.paid).toBe(ok.body.advance);

    const avail = await api.get("/api/venues/1/availability");
    expect(avail.body.booked).toContain(future(30));

    const other = await signup("b@test.com");
    expect((await book(other)).status).toBe(409);
  });
  it("rejects forged payments", async () => {
    const token = await signup();
    const r = await book(token, { signature: "forged" });
    expect(r.status).toBe(402);
  });
  it("rejects too many guests and past dates", async () => {
    const token = await signup();
    expect((await book(token, { guests: 99999 })).status).toBe(400);
    expect((await book(token, { date: "2020-01-01" })).status).toBe(400);
  });
  it("cancels with a refund and frees the date", async () => {
    const token = await signup();
    const b = (await book(token)).body;
    const c = await api.post(`/api/bookings/${b.id}/cancel`).set("Authorization", `Bearer ${token}`);
    expect(c.body.status).toBe("cancelled");
    expect(c.body.refund).toBe(b.paid);
    expect((await api.get("/api/venues/1/availability")).body.booked).not.toContain(future(30));
  });
});

describe("reviews & favourites", () => {
  it("updates the venue rating once per user", async () => {
    const token = await signup();
    const h = { Authorization: `Bearer ${token}` };
    const before = (await api.get("/api/venues/1")).body.reviews;
    expect((await api.post("/api/venues/1/reviews").set(h).send({ rating: 5, comment: "Loved it" })).status).toBe(201);
    expect((await api.get("/api/venues/1")).body.reviews).toBe(before + 1);
    expect((await api.post("/api/venues/1/reviews").set(h).send({ rating: 4, comment: "Again" })).status).toBe(409);
  });
  it("toggles favourites", async () => {
    const token = await signup();
    const h = { Authorization: `Bearer ${token}` };
    expect((await api.post("/api/favorites/1").set(h)).body).toEqual([1]);
    expect((await api.post("/api/favorites/1").set(h)).body).toEqual([]);
  });
});

describe("admin", () => {
  it("rejects non-admins and serves stats to admins", async () => {
    const token = await signup();
    expect((await api.get("/api/admin/stats").set("Authorization", `Bearer ${token}`)).status).toBe(403);
    const login = await api.post("/api/auth/login").send({ email: "admin@bmv.com", password: "admin123" });
    const stats = await api.get("/api/admin/stats").set("Authorization", `Bearer ${login.body.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.monthly).toHaveLength(6);
  });
});
