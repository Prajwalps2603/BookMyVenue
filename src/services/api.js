const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "bmv_token";
// Static build (GitHub Pages): no server, so an in-browser mock API answers instead
const STATIC = import.meta.env.VITE_STATIC === "true";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  if (STATIC) {
    const { mockRequest } = await import("./mockServer.js");
    const { status, data } = await mockRequest(method, path, body, token);
    if (status >= 400) {
      if (status === 401 && token) window.dispatchEvent(new Event("bmv:unauthorized"));
      const err = new Error(data.error || `Request failed (${status})`);
      err.status = status;
      throw err;
    }
    return data;
  }
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Is it running? (npm run dev starts both)");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("bmv:unauthorized"));
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me"),
  updateMe: (b) => request("/auth/me", { method: "PUT", body: b }),
  changePassword: (b) => request("/auth/password", { method: "PUT", body: b }),

  venues: () => request("/venues"),
  venue: (id) => request(`/venues/${id}`),
  availability: (id) => request(`/venues/${id}/availability`),
  reviews: (id) => request(`/venues/${id}/reviews`),
  addReview: (id, b) => request(`/venues/${id}/reviews`, { method: "POST", body: b }),
  createVenue: (b) => request("/venues", { method: "POST", body: b }),
  updateVenue: (id, b) => request(`/venues/${id}`, { method: "PUT", body: b }),
  deleteVenue: (id) => request(`/venues/${id}`, { method: "DELETE" }),

  favorites: () => request("/favorites"),
  toggleFavorite: (id) => request(`/favorites/${id}`, { method: "POST" }),

  paymentIntent: (venueId) => request("/payments/intent", { method: "POST", body: { venueId } }),
  book: (b) => request("/bookings", { method: "POST", body: b }),
  myBookings: () => request("/bookings/mine"),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: "POST" }),

  adminStats: () => request("/admin/stats"),
  adminBookings: () => request("/admin/bookings"),
  adminUsers: () => request("/admin/users"),
};
