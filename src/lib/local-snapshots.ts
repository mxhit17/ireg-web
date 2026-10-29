/**
 * A tiny localStorage-backed list of API objects, keyed by `id`, with change notifications.
 *
 * Used for admin drafts: the backend has no endpoint that lists DRAFT knowledge topics or blogs
 * (public reads return PUBLISHED only), so drafts saved from this browser are remembered here to
 * let them be found, edited and published later. Remove once admin "list drafts" APIs exist.
 */
export function createSnapshotStore<T extends { id: string }>(key: string, keep: (item: T) => boolean) {
  const event = `${key}:change`;

  function read(): T[] {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as T[]) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function write(list: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event(event));
    } catch {
      /* storage unavailable — drafts just won't be listed */
    }
  }

  return {
    list: read,
    get: (id: string) => read().find((t) => t.id === id) ?? null,
    /** Store the item while `keep(item)` holds (e.g. still a draft); otherwise drop it. */
    remember(item: T) {
      const others = read().filter((t) => t.id !== item.id);
      write(keep(item) ? [item, ...others] : others);
    },
    forget(id: string) {
      write(read().filter((t) => t.id !== id));
    },
    subscribe(cb: () => void) {
      const handler = () => cb();
      window.addEventListener(event, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(event, handler);
        window.removeEventListener("storage", handler);
      };
    },
  };
}
