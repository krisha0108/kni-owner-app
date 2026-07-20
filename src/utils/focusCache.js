// Lightweight in-memory staleness cache used to avoid re-fetching data every
// time a screen regains focus. Keyed by caller-supplied strings that must
// include every param that affects what's fetched (e.g. restaurantId).
const lastFetched = new Map();

export function isStale(key, ttlMs = 60000) {
  const last = lastFetched.get(key);
  return !last || Date.now() - last > ttlMs;
}

export function markFetched(key) {
  lastFetched.set(key, Date.now());
}

// Force the next isStale(key) check to return true, e.g. after a mutation
// (create/update/delete) that a list screen's cached fetch wouldn't know about.
export function invalidate(key) {
  lastFetched.delete(key);
}
