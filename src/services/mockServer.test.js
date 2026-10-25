import { describe, it, expect } from "vitest";
import { mockRequest } from "./mockServer.js";

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("static mock API (GitHub Pages build)", () => {
  it("runs the whole flow: login, pay, book, block date, cancel", async () => {
    const login = await mockRequest("POST", "/auth/login", { email: "demo@x.com", password: "1" });
    expect(login.status).toBe(200);
    const t = login.data.token;

    const intent = await mockRequest("POST", "/payments/intent", { venueId: 1 }, t);
    const body = {
      venueId: 1, date: future(30), guests: 50, eventType: "Wedding", name: "Demo", email: "demo@x.com", phone: "9",
      paymentId: intent.data.paymentId, signature: intent.data.signature,
    };
    const booked = await mockRequest("POST", "/bookings", body, t);
    expect(booked.status).toBe(201);
    expect((await mockRequest("GET", "/venues/1/availability")).data.booked).toContain(future(30));
    expect((await mockRequest("POST", "/bookings", { ...body, paymentId: "pay_other" }, t)).status).toBe(409);

    const cancelled = await mockRequest("POST", `/bookings/${booked.data.id}/cancel`, {}, t);
    expect(cancelled.data.refund).toBe(booked.data.paid);
  });

  it("keeps the admin protected and others out of admin pages", async () => {
    expect((await mockRequest("POST", "/auth/login", { email: "admin@bmv.com", password: "nope" })).status).toBe(401);
    const user = await mockRequest("POST", "/auth/login", { email: "someone", password: "1" });
    expect((await mockRequest("GET", "/admin/stats", {}, user.data.token)).status).toBe(403);
    const admin = await mockRequest("POST", "/auth/login", { email: "admin@bmv.com", password: "admin123" });
    expect((await mockRequest("GET", "/admin/stats", {}, admin.data.token)).status).toBe(200);
  });
});
