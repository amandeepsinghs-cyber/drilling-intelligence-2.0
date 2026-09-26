/** CockpitGrid — the depth area: columns that share one DepthScale and one bit line (build.md §2).
 * It measures its own height, builds the scale from the bit depth and the act's window, and draws the bit line across. */
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useSize } from '../../lib/useSize';
import { useScenario } from '../../state/scenarioStore';
import { BODY_TOP_PX, COLUMN_TOP_PX, DepthProvider, makeScale, windowFor } from './depth';

export interface WindowCfg { spanM: number; bitFrac: number }

export function Column({ label, tone = 'text-muted', width, children, right }: {
  label?: string; tone?: string; width?: number; children: ReactNode; right?: ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-col border-r border-line last:border-r-0" style={{ width, flex: width ? '0 0 auto' : '1 1 0', paddingTop: COLUMN_TOP_PX }}>
      {label && (
        <div className="absolute inset-x-2 top-0 flex items-center justify-between" style={{ height: COLUMN_TOP_PX }}>
          <span className={`text-[10.5px] font-bold uppercase tracking-[0.2em] ${tone}`}>{label}</span>{right}
        </div>
      )}
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}

function BitLine({ y, width }: { y: number; width?: number }) {
  const md = useScenario((s) => s.md);
  return (
    <div className="pointer-events-none absolute left-0 z-10" style={{ top: y, right: width ? undefined : 0, width }}>
      <div className="h-0 border-t-2 border-accent/90 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
      <div className={`num absolute -top-[11px] whitespace-nowrap rounded-full bg-accent px-2 py-[1px] text-[11.5px] font-bold text-app ${width && width < 260 ? 'right-1' : 'left-[226px]'}`}>
        BIT {md.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
      </div>
    </div>
  );
}

export default function CockpitGrid({ window: win, children, bitLineWidth }: { window: WindowCfg; children: ReactNode; bitLineWidth?: number }) {
  const data = useScenario((s) => s.data);
  const md = useScenario((s) => s.md);
  const [ref, size] = useSize<HTMLDivElement>();
  const heightPx = Math.max(0, size.h - BODY_TOP_PX);
  const scale = useMemo(() => {
    const g = data?.meta.grid;
    const [top, base] = g ? windowFor(md, g.top_m, g.base_m, win.spanM, win.bitFrac) : [0, 1];
    return makeScale(top, base, md, heightPx);
  }, [data, md, win.spanM, win.bitFrac, heightPx]);
  const bitY = BODY_TOP_PX + scale.y(md);
  return (
    <DepthProvider value={scale}>
      <div ref={ref} className="panel relative flex h-full min-h-0 min-w-0 overflow-hidden" data-cockpit-grid data-bit-y={bitY.toFixed(1)}>
        {size.h > 0 && <div className="absolute inset-0 flex">{children}</div>}
        {size.h > 0 && bitY >= BODY_TOP_PX && bitY <= size.h && <BitLine y={bitY} width={bitLineWidth} />}
      </div>
    </DepthProvider>
  );
}
