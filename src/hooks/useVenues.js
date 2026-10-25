import { useState, useEffect } from "react";
import { api } from "../services/api";

// Shared, cached venue list so every page reuses a single request.
let cache = null;
let inflight = null;
let lastError = "";
const subs = new Set();
const notify = () => subs.forEach((f) => f());

function load() {
  if (cache || inflight || lastError) return;
  inflight = api.venues()
    .then((v) => { cache = v; })
    .catch((e) => { lastError = e.message; })
    .finally(() => { inflight = null; notify(); });
}

export function invalidateVenues() {
  cache = null;
  lastError = "";
  notify();
}

export function useVenues() {
  const [, tick] = useState(0);

  useEffect(() => {
    const f = () => tick((n) => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);

  useEffect(() => { load(); });

  return {
    venues: cache || [],
    loading: !cache && !lastError,
    error: lastError,
    reload: invalidateVenues,
  };
}

const RECENT_KEY = "bmv_recent";
export function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
export function pushRecent(id) {
  try {
    const next = [id, ...getRecent().filter((x) => x !== id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage blocked */ }
}
