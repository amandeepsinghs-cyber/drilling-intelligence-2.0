/** WellboreColumn — overview + zoom schematic (WP-03).
 * Left strip: the whole well to scale (sea → seabed → casing strings → open hole → bit) with a bracket on the visible window.
 * Right: the visible window on the SHARED depth axis — hole wall from the caliper (drilled part only), drill string,
 * bit, unit bands, and offset-well kick / loss depths. All depths come from YAML (casing.program, stratigraphy, offsets). */
import { useSize } from '../../../lib/useSize';
import { indexAt } from '../../../lib/frames';
import { useScenario } from '../../../state/scenarioStore';
import { BODY_TOP_PX, COLUMN_TOP_PX, TRACK_HEADER_PX, useDepth } from '../depth';
import { usePalette } from '../palette';

const MINI_W = 58;

const sizeIn = (s: string) => {
  // "13-3/8 in" → 13.375, "36 in" → 36
  const m = s.match(/(\d+)(?:-(\d+)\/(\d+))?/);
  return m ? +m[1] + (m[2] ? +m[2] / +m[3] : 0) : 0;
};
const prettySize = (s: string) => s.replace('-3/8', '⅜').replace(' in', '″');

export default function WellboreColumn() {
  const sc = useDepth();
  const p = usePalette();
  const bundle = useScenario((s) => s.bundle);
  const data = useScenario((s) => s.data);
  const [ref, size] = useSize<HTMLDivElement>();
  if (!bundle || !data) return null;
  const f = bundle.facts;
  const H = size.h, W = size.w;
  const zoomW = Math.max(0, W - MINI_W);
  const td = f.well.live_interval_m.td;
  const wd = f.well.water_depth_m;
  const casing = (f.casing.program ?? [{ size: f.casing.last_shoe.size, md_m: f.casing.last_shoe.md_m, role: 'intermediate' }]);
  const shoe = f.casing.last_shoe;
  const holeIn = f.well.current_section.hole_size_in;

  // --- Mini overview scale (whole well) ---
  const mTop = COLUMN_TOP_PX + 2, mBot = H - 14;
  const my = (md: number) => mTop + (md / td) * (mBot - mTop);
  const maxIn = Math.max(...casing.map((c) => sizeIn(c.size)), holeIn);
  const mhw = (inch: number) => 4 + (inch / maxIn) * (MINI_W / 2 - 10); // half width
  const mcx = MINI_W / 2;

  // --- Zoom (shared axis) ---
  const bodyTop = BODY_TOP_PX;
  const zy = (md: number) => bodyTop + sc.y(md);
  const zcx = MINI_W + zoomW / 2;
  const kIn = (zoomW * 0.30) / holeIn; // 12¼″ hole ≈ 60 % of the zoom width
  const cali = data.columns['curves.CALI'] as (number | null)[];
  const bitY = zy(sc.bitMd);
  const offsets = bundle.offsets.offsets.filter((o) => o.incident?.md_m != null);

  // Hole wall polygon from caliper, top of window → bit.
  const wallPts: string[] = [], wallPtsR: string[] = [];
  const step = Math.max(1, Math.floor(2 / (sc.heightPx / (sc.baseMd - sc.topMd)) / data.meta.grid.step_m));
  for (let i = indexAt(data, sc.topMd); i <= indexAt(data, Math.min(sc.bitMd, sc.baseMd)); i += step) {
    const hw = ((cali[i] ?? holeIn) * kIn);
    const y = zy(data.md_m[i]);
    wallPts.push(`${zcx - hw},${y}`); wallPtsR.unshift(`${zcx + hw},${y}`);
  }
  const holePoly = wallPts.length ? [...wallPts, `${zcx + holeIn * kIn},${bitY}`, `${zcx - holeIn * kIn},${bitY}`, ...wallPtsR].join(' ') : '';

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden border-r border-line" data-wellbore>
      <div className="absolute left-2 flex items-center text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted" style={{ top: 0, height: COLUMN_TOP_PX }}>Wellbore</div>
      {/* Header of the zoom part: casing summary */}
      <div className="absolute border-b border-line px-2 py-1.5 text-[11px] leading-[1.35]" style={{ left: MINI_W, right: 0, top: COLUMN_TOP_PX, height: TRACK_HEADER_PX }}>
        <div className="font-semibold text-fg">{prettySize(shoe.size)} shoe <span className="num">{shoe.md_m.toLocaleString('en-IN')}</span> m</div>
        <div className="text-warn">FIT <span className="num">{shoe.fit_ppg.toFixed(2)}</span> ppg</div>
        <div className="text-muted">{holeIn}″ open hole · {f.well.current_section.mud_type}</div>
      </div>
      {H > 0 && (
        <svg width={W} height={H} className="absolute inset-0">
          <defs>
            <linearGradient id="wb-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E4A6B" /><stop offset="1" stopColor="#0A2A40" /></linearGradient>
            <linearGradient id="wb-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#64748B" /><stop offset="0.5" stopColor="#CBD5E1" /><stop offset="1" stopColor="#64748B" /></linearGradient>
            <pattern id="wb-rock" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#2A2419" /><circle cx="1.5" cy="1.5" r="0.6" fill="#4A3F2C" /><circle cx="4.5" cy="4.5" r="0.6" fill="#4A3F2C" /></pattern>
          </defs>

          {/* ===== Mini overview ===== */}
          <rect x={4} y={mTop} width={MINI_W - 8} height={my(wd) - mTop} fill="url(#wb-sea)" rx={2} />
          <rect x={4} y={my(wd)} width={MINI_W - 8} height={mBot - my(wd)} fill="url(#wb-rock)" />
          <line x1={4} x2={MINI_W - 4} y1={my(wd)} y2={my(wd)} stroke="#A16207" strokeWidth={1.2} />
          <text x={6} y={mTop + 10} fontSize={9} fill="#7DD3FC">sea</text>
          {casing.map((c) => {
            const hw = mhw(sizeIn(c.size));
            return (
              <g key={c.size}>
                <line x1={mcx - hw} x2={mcx - hw} y1={my(wd)} y2={my(c.md_m)} stroke="url(#wb-steel)" strokeWidth={1.6} />
                <line x1={mcx + hw} x2={mcx + hw} y1={my(wd)} y2={my(c.md_m)} stroke="url(#wb-steel)" strokeWidth={1.6} />
                <path d={`M${mcx - hw},${my(c.md_m)} l-3,0 l3,-4z M${mcx + hw},${my(c.md_m)} l3,0 l-3,-4z`} fill="#CBD5E1" />
              </g>
            );
          })}
          <line x1={mcx} x2={mcx} y1={my(wd)} y2={my(sc.bitMd)} stroke="#94A3B8" strokeWidth={1} />
          <rect x={mcx - mhw(holeIn)} y={my(shoe.md_m)} width={mhw(holeIn) * 2} height={Math.max(0, my(sc.bitMd) - my(shoe.md_m))} fill="rgba(34,211,238,0.10)" stroke="rgba(34,211,238,0.5)" strokeWidth={0.8} />
          <circle cx={mcx} cy={my(sc.bitMd)} r={2.6} fill={p.accent} />
          {/* bracket for the visible window + zoom lines */}
          <rect x={3} y={my(sc.topMd)} width={MINI_W - 6} height={Math.max(2, my(sc.baseMd) - my(sc.topMd))} fill="rgba(34,211,238,0.10)" stroke={p.accent} strokeWidth={1} rx={2} />
          <path d={`M${MINI_W - 3},${my(sc.topMd)} L${MINI_W + 2},${bodyTop} M${MINI_W - 3},${my(sc.baseMd)} L${MINI_W + 2},${bodyTop + sc.heightPx}`} stroke={p.accent} strokeOpacity={0.5} strokeDasharray="3 3" />
          <text x={MINI_W / 2} y={H - 2} fontSize={9} fill={p.faint} textAnchor="middle">TD {td.toLocaleString('en-IN')}</text>

          {/* ===== Zoom on the shared axis ===== */}
          <g>
            <rect x={MINI_W} y={bodyTop} width={zoomW} height={sc.heightPx} fill="url(#wb-rock)" opacity={0.55} />
            {f.stratigraphy.map((u) => {
              const y0 = Math.max(bodyTop, zy(u.top_m)), y1 = Math.min(bodyTop + sc.heightPx, zy(u.base_m));
              if (y1 <= y0) return null;
              return (
                <g key={u.id}>
                  <rect x={MINI_W} y={y0} width={zoomW} height={y1 - y0} fill={p.litho[u.litho_class]} opacity={0.45} />
                  <text x={W - 4} y={y0 + 13} fontSize={11} fontWeight={700} fill={p.text} textAnchor="end" opacity={0.85}>{u.id}</text>
                </g>
              );
            })}
            {/* planned hole ahead of the bit (outline only) */}
            <rect x={zcx - holeIn * kIn} y={bitY} width={holeIn * kIn * 2} height={Math.max(0, bodyTop + sc.heightPx - bitY)} fill="none" stroke={p.faint} strokeDasharray="3 4" />
            {holePoly && <polygon points={holePoly} fill="#0B1620" stroke="#7DD3FC" strokeOpacity={0.55} strokeWidth={1} />}
            {/* drill string + bit */}
            <rect x={zcx - 3.5} y={bodyTop} width={7} height={Math.max(0, bitY - bodyTop - 10)} fill="url(#wb-steel)" />
            <path d={`M${zcx - holeIn * kIn * 0.8},${bitY - 10} L${zcx + holeIn * kIn * 0.8},${bitY - 10} L${zcx + 4},${bitY} L${zcx - 4},${bitY} Z`} fill={p.accent} />
            {/* offset events */}
            {offsets.map((o) => {
              const md = o.incident!.md_m as number;
              const y = zy(md);
              if (y < bodyTop || y > bodyTop + sc.heightPx) return null;
              const kick = o.incident!.type === 'KICK';
              const col = kick ? p.risk : p.warn;
              return (
                <g key={o.id}>
                  <line x1={MINI_W} x2={W} y1={y} y2={y} stroke={col} strokeWidth={1.4} strokeDasharray="6 3" />
                  <rect x={MINI_W + 2} y={y - 15} width={zoomW - 4} height={14} rx={3} fill="rgba(11,15,20,0.75)" />
                  <text x={MINI_W + 5} y={y - 4} fontSize={10.5} fontWeight={700} fill={col}>{kick ? 'KICK' : 'LOSS'} · {o.id} · {md.toLocaleString('en-IN')}</text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
