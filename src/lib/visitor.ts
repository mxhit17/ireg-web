const KEY = "ireg_visitor_id";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC 4122 v4 fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Persistent anonymous visitor id for POST projects/:id/view (the backend de-duplicates views per
 * visitor for 30 minutes). Kept across logins/logouts, as the backend's comment describes.
 */
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = uuid();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return uuid(); // storage blocked: still count the view, just not de-duplicated across reloads
  }
}
