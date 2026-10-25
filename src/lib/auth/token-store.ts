/**
 * The short-lived access token lives only in memory (never localStorage), so XSS can't
 * lift a long-lived credential. It's restored on page load from the httpOnly refresh cookie.
 */
let accessToken: string | null = null;

type Listener = () => void;
const expiredListeners = new Set<Listener>();

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};

/** Fired when a refresh attempt proves the session is gone (so the UI can redirect to login). */
export const sessionEvents = {
  onExpired(listener: Listener) {
    expiredListeners.add(listener);
    return () => {
      expiredListeners.delete(listener);
    };
  },
  emitExpired() {
    expiredListeners.forEach((l) => l());
  },
};
