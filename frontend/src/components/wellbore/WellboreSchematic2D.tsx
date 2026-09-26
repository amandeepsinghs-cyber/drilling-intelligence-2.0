/**
 * WellboreSchematic2D — 2.5D schematic with a focus-compressed depth scale:
 * sea + riser (compressed) → cased hole → open hole to bit (expanded). Mud colour reflects overbalance.
 */
import { motion } from 'framer-motion';
import { tokens } from '../../design/tokens';
import { indexAt, num } from '../../lib/frames';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import { useSize } from '../../lib/useSize';

export default function WellboreSchematic2D() {
  const { data, bundle, md, hazardOn, approvedMw } = useScenario();
  const theme = useUi((s) => s.theme);
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  if (!data || !bundle) return <div ref={ref} className="absolute inset-0" />;
  const f = bundle.facts, t = tokens[theme];
  const mudline = f.well.water_depth_m + f.well.air_gap_m;
  const shoe = f.casing.last_shoe.md_m, td = data.meta.grid.base_m;
  const prog = (f.casing as { program?: { size: string; md_m: number }[] }).program ?? [{ size: f.casing.last_shoe.size, md_m: shoe }];
  // focus-compressed scale
  const y = (d: number) => {
    if (d <= mudline) return (d / mudline) * 0.16 * H;
    if (d <= shoe) return 0.16 * H + ((d - mudline) / (shoe - mudline)) * 0.26 * H;
    return 0.42 * H + ((d - shoe) / (td - shoe)) * 0.56 * H;
  };
  const cx = W / 2;
  const widths = [34, 26, 20];
  const holeW = 15;
  const ob = num(data, 'derived.OVERBAL_PSI', indexAt(data, md)) ?? 0;
  const mud = ob < 0 ? t.risk : approvedMw ? t.accent : ob < 100 ? t.warn : t.accent;
  const sandTop = f.pressure.sand_top_m as number;

  return (
    <div ref={ref} className="absolute inset-0">
    {W > 0 && <svg width={W} height={H} className="absolute inset-0">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E3A5A" stopOpacity={theme === 'dark' ? 0.55 : 0.25} />
          <stop offset="1" stopColor="#0A2233" stopOpacity={theme === 'dark' ? 0.75 : 0.35} />
        </linearGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6B7785" /><stop offset="0.5" stopColor="#C9D2DC" /><stop offset="1" stopColor="#56616D" />
        </linearGradient>
        <linearGradient id="mud" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={mud} stopOpacity="0.25" /><stop offset="0.5" stopColor={mud} stopOpacity="0.55" /><stop offset="1" stopColor={mud} stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* sea */}
      <rect x="0" y="0" width={W} height={y(mudline)} fill="url(#sea)" />
      <text x="6" y="16" fontSize="11" fill={t.textMuted} className="num">SEA · {f.well.water_depth_m.toLocaleString('en-IN')} m WD</text>
      {/* formations below mudline */}
      {f.stratigraphy.map((u) => (
        <rect key={u.id} x="0" width={W} y={y(u.top_m)} height={y(Math.min(u.base_m, td)) - y(u.top_m)}
          fill={tokens.litho[u.litho_class]} opacity={0.22} />
      ))}
      <rect x="0" y={y(mudline)} width={W} height={y(f.stratigraphy[0].top_m) - y(mudline)} fill={tokens.litho.SHALE} opacity={0.12} />
      <line x1="0" x2={W} y1={y(mudline)} y2={y(mudline)} stroke={t.textMuted} strokeOpacity="0.4" />
      {/* riser + BOP */}
      <rect x={cx - 9} y={0} width={18} height={y(mudline)} fill="url(#steel)" opacity={0.35} />
      <rect x={cx - 16} y={y(mudline) - 14} width={32} height={14} rx={2} fill="#3A4652" stroke="#7B8794" />
      {/* casing strings */}
      {prog.map((c, i) => {
        const w = widths[i] ?? 16;
        return (
          <g key={c.size}>
            <rect x={cx - w / 2 - 3} y={y(mudline)} width={3} height={y(c.md_m) - y(mudline)} fill="url(#steel)" />
            <rect x={cx + w / 2} y={y(mudline)} width={3} height={y(c.md_m) - y(mudline)} fill="url(#steel)" />
            <path d={`M${cx - w / 2 - 3},${y(c.md_m)} l-5,0 l5,-7 z M${cx + w / 2 + 3},${y(c.md_m)} l5,0 l-5,-7 z`} fill="#C9D2DC" />
            <text x={cx + w / 2 + 10} y={y(c.md_m) + 3} fontSize="10" fill={t.textMuted} className="num">{c.size} · {c.md_m.toLocaleString('en-IN')}</text>
          </g>
        );
      })}
      {/* open hole with mud column */}
      <rect x={cx - holeW / 2} y={y(shoe)} width={holeW} height={Math.max(0, y(md) - y(shoe))} fill="url(#mud)" />
      <rect x={cx - holeW / 2} y={y(mudline)} width={holeW} height={y(shoe) - y(mudline)} fill="url(#mud)" opacity={0.6} />
      {/* sand-top hazard */}
      {(hazardOn || md >= sandTop) && (
        <g>
          <line x1="4" x2={W - 4} y1={y(sandTop)} y2={y(sandTop)} stroke={approvedMw ? t.ok : t.risk} strokeDasharray="5 4" strokeWidth="1.5" />
          <text x="6" y={y(sandTop) - 4} fontSize="10" fill={approvedMw ? t.ok : t.risk} className="num">sand top {sandTop.toLocaleString('en-IN')}</text>
        </g>
      )}
      {/* bit */}
      <path d={`M${cx - holeW / 2},${y(md) - 6} L${cx + holeW / 2},${y(md) - 6} L${cx},${y(md) + 4} Z`} fill={t.accent} />
      <motion.circle cx={cx} cy={y(md)} r={8} fill="none" stroke={t.accent} strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ scale: [1, 2], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
      <text x={cx + holeW / 2 + 8} y={y(md) + 4} fontSize="11" fill={t.accent} className="num">{md.toFixed(1)} m</text>
    </svg>}
    </div>
  );
}
