/** KpiNumber — tabular numerals that ease between values (180 ms, state change only). */
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

export default function KpiNumber({ value, digits = 2, className, prefixSign = false }: {
  value: number | null; digits?: number; className?: string; prefixSign?: boolean;
}) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);
  useEffect(() => {
    if (value === null) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 180);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (value === null) return <span className={clsx('num', className)}>—</span>;
  const abs = Math.abs(shown).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = prefixSign ? (shown > 0.5 * 10 ** -digits ? '+' : shown < -0.5 * 10 ** -digits ? '−' : '') : shown < 0 ? '−' : '';
  return <span className={clsx('num', className)}>{sign}{abs}</span>;
}
