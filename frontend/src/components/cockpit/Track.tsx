/** Track — one vertical log track: a paper-log style header (curve names + scale bars) and a body on the shared depth axis.
 * The body draws the depth grid and shades the undrilled part below the bit; children draw the curves. */
import clsx from 'clsx';
import { useCallback, type ReactNode } from 'react';
import CanvasLayer from './CanvasLayer';
import { TRACK_HEADER_PX, useDepth, type DepthScale } from './depth';
import { usePalette, type Palette } from './palette';

export interface TrackScale {
  label: string;
  min: number | string;
  max: number | string;
  unit?: string;
  color: string;
  dash?: boolean;
}

/** Depth grid spacing in metres (display only). */
const MINOR_M = 5; // facts-ok display grid
const MAJOR_M = 25; // facts-ok display grid

export function drawDepthGrid(ctx: CanvasRenderingContext2D, s: DepthScale, w: number, p: Palette) {
  const first = Math.ceil(s.topMd / MINOR_M) * MINOR_M;
  for (let md = first; md <= s.baseMd; md += MINOR_M) {
    const y = Math.round(s.y(md)) + 0.5;
    ctx.strokeStyle = md % MAJOR_M === 0 ? p.gridMajor : p.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

export function drawUndrilled(ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number, p: Palette) {
  const yb = s.y(s.bitMd);
  if (yb >= h) return;
  ctx.fillStyle = p.undrilled;
  ctx.fillRect(0, Math.max(0, yb), w, h - Math.max(0, yb));
}

function ScaleRow({ s }: { s: TrackScale }) {
  return (
    <div className="flex h-[14px] items-center gap-1 leading-none">
      <span className="num w-[30px] shrink-0 text-left text-[10.5px] text-muted">{s.min}</span>
      <span className="relative flex flex-1 items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-0 border-t-2" style={{ borderColor: s.color, borderStyle: s.dash ? 'dashed' : 'solid' }} />
        <span className="relative truncate bg-panel px-1 text-[11px] font-semibold" style={{ color: s.color }}>
          {s.label}{s.unit ? <span className="font-normal text-faint"> {s.unit}</span> : null}
        </span>
      </span>
      <span className="num w-[30px] shrink-0 text-right text-[10.5px] text-muted">{s.max}</span>
    </div>
  );
}

export default function Track({
  title, scales = [], width, children, className, grid = true, lastMd, shadeUndrilled = true,
}: {
  title: string;
  scales?: TrackScale[];
  width?: number | string;
  children?: ReactNode;
  className?: string;
  grid?: boolean;
  /** Dim the body below the bit (off for tracks that draw a labelled forecast there). */
  shadeUndrilled?: boolean;
  /** Deepest depth actually drawn (for verify scripts: must be ≤ bit). */
  lastMd?: number;
}) {
  const s = useDepth();
  const p = usePalette();
  const bg = useCallback((ctx: CanvasRenderingContext2D, sc: DepthScale, w: number) => { if (grid) drawDepthGrid(ctx, sc, w, p); }, [grid, p]);
  const fg = useCallback((ctx: CanvasRenderingContext2D, sc: DepthScale, w: number, h: number) => drawUndrilled(ctx, sc, w, h, p), [p]);
  return (
    <div className={clsx('flex min-w-0 flex-col border-r border-line last:border-r-0', className)} style={{ width, flex: width ? '0 0 auto' : '1 1 0' }}
      data-track={title} data-last-md={lastMd}>
      <div className="flex shrink-0 flex-col justify-between border-b border-line px-1.5 pb-1.5 pt-1.5" style={{ height: TRACK_HEADER_PX }}>
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</div>
        <div className="flex flex-col gap-[2px]">
          {scales.slice(0, 3).map((sc) => <ScaleRow key={sc.label} s={sc} />)}
        </div>
      </div>
      <div className="relative shrink-0 overflow-hidden" style={{ height: s.heightPx }}>
        <CanvasLayer draw={bg} />
        {children}
        {shadeUndrilled && <CanvasLayer draw={fg} />}
      </div>
    </div>
  );
}
