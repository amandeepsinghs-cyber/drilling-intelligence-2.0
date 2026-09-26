/** Shared canvas helpers for log tracks. Everything here clips at the bit: nothing is drawn deeper than scale.bitMd. */
import type { Columnar } from '../../../api/types';
import { indexAt } from '../../../lib/frames';
import type { DepthScale } from '../depth';

export type XFn = (v: number) => number;

/** Index range inside the visible window, cut at the bit. Returns null if nothing is drilled in the window. */
export function drilledRange(data: Columnar, s: DepthScale): [number, number] | null {
  const lo = s.topMd;
  const hi = Math.min(s.baseMd, s.bitMd);
  if (hi <= lo) return null;
  return [indexAt(data, lo), indexAt(data, hi)];
}

/** Linear x-mapping; min may be greater than max for reversed scales (e.g. NPHI, SW). */
export function linX(min: number, max: number, w: number, pad = 2): XFn {
  const k = (w - 2 * pad) / (max - min);
  return (v) => pad + (v - min) * k;
}

/** Log10 x-mapping (resistivity). */
export function logX(min: number, max: number, w: number, pad = 2): XFn {
  const a = Math.log10(min), b = Math.log10(max);
  const k = (w - 2 * pad) / (b - a);
  return (v) => pad + (Math.log10(Math.max(v, min * 1e-3)) - a) * k;
}

export function col(data: Columnar, name: string): (number | null)[] {
  return (data.columns[name] ?? []) as (number | null)[];
}

/** Stroke one curve from i0..i1 (both inclusive). Gaps (null) break the line. Returns the deepest md drawn. */
export function strokeCurve(
  ctx: CanvasRenderingContext2D, data: Columnar, s: DepthScale, name: string, i0: number, i1: number, x: XFn,
  style: { color: string; width?: number; dash?: number[]; alpha?: number },
): number | undefined {
  const v = col(data, name);
  const md = data.md_m;
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width ?? 1.4; // facts-ok line width px
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.setLineDash(style.dash ?? []);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let pen = false;
  let last: number | undefined;
  for (let i = i0; i <= i1; i++) {
    const val = v[i];
    if (val === null || val === undefined || Number.isNaN(val) || md[i] > s.bitMd) { pen = false; continue; }
    const X = x(val), Y = s.y(md[i]);
    if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; }
    last = md[i];
  }
  ctx.stroke();
  ctx.restore();
  return last;
}

/** Fill per pixel row from the top of the window to the bit. `row(i)` returns [xStart, xEnd, colour] or null. */
export function fillRows(
  ctx: CanvasRenderingContext2D, data: Columnar, s: DepthScale, h: number,
  row: (i: number) => [number, number, string] | null,
) {
  const yEnd = Math.min(h, s.y(Math.min(s.baseMd, s.bitMd)));
  for (let y = 0; y < yEnd; y++) {
    const i = indexAt(data, s.md(y + 0.5));
    const r = row(i);
    if (!r) continue;
    const [a, b, c] = r;
    ctx.fillStyle = c;
    ctx.fillRect(Math.min(a, b), y, Math.abs(b - a), 1);
  }
}

/** Mix two hex colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const f = (u: number, v: number) => Math.round(u + (v - u) * Math.max(0, Math.min(1, t)));
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}
