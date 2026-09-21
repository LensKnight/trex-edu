import { useEffect, useRef, useState } from "react";

// Animates from the currently shown value to `target`.
// First run starts at 0; later changes (realtime updates) continue from
// whatever is on screen. Waits until `ready` is true.
export function useCountUp(target: number, ready = true, duration = 1200) {
  const [value, setValue] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (!ready) return;

    const from = currentRef.current;
    if (from === target) return;

    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      const next = Math.round(from + (target - from) * eased);

      currentRef.current = next;
      setValue(next);

      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ready, duration]);

  return value;
}