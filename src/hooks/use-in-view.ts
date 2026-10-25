"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * True once the element has come within `rootMargin` of the viewport (stays true when `once`).
 * Used to defer per-card requests and to trigger infinite-scroll loading.
 *
 * Returns a callback ref, so it also works for elements that mount later (e.g. after a loading state).
 */
export function useInView<T extends Element>({
  rootMargin = "300px",
  once = true,
}: { rootMargin?: string; once?: boolean } = {}) {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, rootMargin, once]);

  return { ref, inView };
}
