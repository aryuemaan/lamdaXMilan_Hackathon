/* Local cache so the app still opens (read-only) when offline,
   plus autosaved comment drafts. */
const mem = {};
export function cacheGet(key) {
  try { const raw = localStorage.getItem(key); if (raw != null) return JSON.parse(raw); } catch (e) { /* ignore */ }
  return mem[key] !== undefined ? mem[key] : null;
}
export function cacheSet(key, value) {
  mem[key] = value;
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
export function draftGet(key) {
  try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
}
export function draftSet(key, value) {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch (e) { /* ignore */ }
}
