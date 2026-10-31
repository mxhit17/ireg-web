/**
 * The short-lived access token lives only in memory (never localStorage), so XSS can't
 * lift a long-lived credential. It's restored on page load from the httpOnly refresh cookie.
 */
let accessToken: string | null = null;
/** True once a refresh proved there's no session — signed-out visitors skip further refresh attempts. */
let knownSignedOut = false;

type Listener = () => void;
const expiredListeners = new Set<Listener>();

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
    if (token) knownSignedOut = false;
  },
  clear: () => {
    accessToken = null;
  },
  /** Remember that this visitor isn't signed in (until a login sets a token). */
  markSignedOut: () => {
    accessToken = null;
    knownSignedOut = true;
  },
  isKnownSignedOut: () => knownSignedOut,
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
