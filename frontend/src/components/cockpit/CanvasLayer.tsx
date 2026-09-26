/** CanvasLayer — a DPR-aware canvas that fills its parent and redraws when the depth scale, size or `deps` change.
 * Flicker-free: the backing store is resized only when the size changes, and each redraw clears + draws in the same
 * synchronous layout effect (no blank frame between clear and draw during playback). */
import { useLayoutEffect, useRef } from 'react';
import { useSize } from '../../lib/useSize';
import { useDepth, type DepthScale } from './depth';

export type DrawFn = (ctx: CanvasRenderingContext2D, scale: DepthScale, w: number, h: number) => void;

export default function CanvasLayer({ draw, deps = [], className }: { draw: DrawFn; deps?: unknown[]; className?: string }) {
  const scale = useDepth();
  const [ref, size] = useSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const dims = useRef({ w: 0, h: 0, dpr: 0 });

  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (dims.current.w !== size.w || dims.current.h !== size.h || dims.current.dpr !== dpr) {
      c.width = Math.round(size.w * dpr);
      c.height = Math.round(size.h * dpr);
      dims.current = { w: size.w, h: size.h, dpr };
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    draw(ctx, scale, size.w, size.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, scale.topMd, scale.baseMd, scale.bitMd, scale.heightPx, draw, ...deps]);

  return (
    <div ref={ref} className={className ?? 'absolute inset-0'}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
