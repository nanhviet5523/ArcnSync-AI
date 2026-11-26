import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A number that counts up to `value` (ease-out, ~0.7s) when it first shows and glides to each new value after.
 * Screen readers get the final value only. Reduced motion: shows the value as is.
 */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const reduce = prefersReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const next = Math.round(origin + (value - origin) * (1 - (1 - p) ** 3));
      from.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return (
    <>
      <span aria-hidden>{reduce ? value : shown}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
