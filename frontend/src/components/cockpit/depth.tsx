/** Shared depth axis for the cockpit (build.md §2). Every depth track, the wellbore and the bit line use the
 * same DepthScale, so one metre is the same pixel row in every column. */
import { createContext, useContext } from 'react';

/** Height of every track header. Bodies start exactly this far below the top of each column. */
export const TRACK_HEADER_PX = 84;
/** Group-label strip above the headers ("INPUT · LWD", "PRESSURE", "WELLBORE"). Same in every column. */
export const COLUMN_TOP_PX = 26;
/** Body top relative to the column top. The bit line is drawn at BODY_TOP_PX + y(bit). */
export const BODY_TOP_PX = COLUMN_TOP_PX + TRACK_HEADER_PX;

export interface DepthScale {
  topMd: number;
  baseMd: number;
  bitMd: number;
  heightPx: number;
  y(md: number): number;
  md(y: number): number;
}

export function makeScale(topMd: number, baseMd: number, bitMd: number, heightPx: number): DepthScale {
  const span = Math.max(1e-6, baseMd - topMd);
  const k = heightPx / span;
  return {
    topMd, baseMd, bitMd, heightPx,
    y: (md) => (md - topMd) * k,
    md: (y) => topMd + y / k,
  };
}

/** Visible window that follows the bit: the bit sits at `bitFrac` of the height so the next zone is visible below it.
 * Clamped to the grid. */
export function windowFor(bitMd: number, gridTop: number, gridBase: number, spanM: number, bitFrac: number): [number, number] {
  const span = Math.min(spanM, gridBase - gridTop);
  let top = bitMd - span * bitFrac;
  top = Math.max(gridTop, Math.min(gridBase - span, top));
  return [top, top + span];
}

const DepthCtx = createContext<DepthScale | null>(null);
export const DepthProvider = DepthCtx.Provider;

export function useDepth(): DepthScale {
  const s = useContext(DepthCtx);
  if (!s) throw new Error('useDepth() must be used inside <CockpitGrid>');
  return s;
}
