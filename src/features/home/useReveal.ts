import { useEffect, useRef, useState } from 'react';

/** Nothing to animate: reduced motion, or no IntersectionObserver to tell when to start. */
const showAtOnce = () =>
  typeof IntersectionObserver === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Fade-up on first scroll into view, once. Spread the result onto the element and give it the `reveal` (or
 * `reveal-group`) class from globals.css: it starts slightly lower and transparent and settles when `data-shown` is set.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(showAtOnce);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      // Starts once its top edge is 10% up the screen; threshold 0 so tall lists on phones still trigger.
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return { ref, 'data-shown': shown || undefined } as const;
}
