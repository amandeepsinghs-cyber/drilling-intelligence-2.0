/** PressureTrack — the drilling window on the shared depth axis (ppg across, depth down).
 * Drilled part (to the bit): PP, FG, MW, ECD, window fill, kick side (MW < PP) red, loss side (ECD ≥ limit) amber.
 * Ahead of the bit (Act 2+ or after T3 fires): dashed forecast PP/FG and the "if unchanged" MW, ML-recommended MW
 * (deterministic line + P10–P90 band). Everything ahead of the bit is dashed and labelled. */
import { useCallback } from 'react';
import type { Columnar, ScenarioBundle } from '../../../api/types';
import { indexAt } from '../../../lib/frames';
import { useScenario } from '../../../state/scenarioStore';
import CanvasLayer from '../CanvasLayer';
import type { DepthScale } from '../depth';
import { usePalette, type Palette } from '../palette';
import Track from '../Track';
import { col, fillRows, linX, strokeCurve } from '../logs/draw';

export interface PressureRange { lo: number; hi: number }

/** x range from facts: a little below the lowest of PP/MW, a little above the shoe FIT. */
export function pressureRange(b: ScenarioBundle): PressureRange {
  const f = b.facts;
  const lo = Math.min(f.mud.initial.mw_ppg, Number(f.pressure.pp_shale_normal_ppg));
  const hi = f.casing.last_shoe.fit_ppg;
  const pad = (hi - lo) * 0.18;
  return { lo: +(lo - pad).toFixed(1), hi: +(hi + pad).toFixed(1) };
}

/** Kick side = MW below PP; loss side = ECD at or above the loss limit (min FG, FIT). Pure, unit-tested. */
export function zoneAt(mw: number | null, pp: number | null, ecd: number | null, limit: number): 'kick' | 'loss' | null {
  if (mw != null && pp != null && mw < pp) return 'kick';
  if (ecd != null && ecd >= limit) return 'loss';
  return null;
}

function draw(ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number,
  data: Columnar, b: ScenarioBundle, p: Palette, ahead: boolean, approved: boolean) {
  const f = b.facts;
  const R = pressureRange(b);
  const x = linX(R.lo, R.hi, w, 6);
  const fit = f.casing.last_shoe.fit_ppg;
  const c = p.curves;
  const pp = col(data, 'derived.PP'), fg = col(data, 'derived.FG'), ecd = col(data, 'derived.ECD');
  const mw = col(data, 'mud.MW_IN_PPG'), ghost = col(data, 'ghost.MW_UNCHANGED');
  const bi = indexAt(data, Math.min(s.bitMd, s.baseMd));
  const i0 = indexAt(data, s.topMd);
  const limitAt = (i: number) => Math.min(fg[i] ?? fit, fit);

  // Vertical ppg grid.
  ctx.strokeStyle = p.grid;
  for (let v = Math.ceil(R.lo * 2) / 2; v <= R.hi; v += 0.5) { const X = Math.round(x(v)) + 0.5; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, h); ctx.stroke(); }

  // Drilled: window fill (PP → limit), then kick/loss fills.
  fillRows(ctx, data, s, h, (i) => (pp[i] == null ? null : [x(pp[i]!), x(limitAt(i)), 'rgba(52,211,153,0.07)']));
  fillRows(ctx, data, s, h, (i) => {
    const z = zoneAt(mw[i], pp[i], ecd[i], limitAt(i));
    if (z === 'kick') return [x(mw[i]!), x(pp[i]!), 'rgba(239,68,68,0.35)'];
    if (z === 'loss') return [x(limitAt(i)), x(ecd[i]!), 'rgba(245,158,11,0.45)'];
    return null;
  });

  // Shoe FIT (a limit, constant below the shoe).
  ctx.save(); ctx.strokeStyle = c.fit; ctx.setLineDash([2, 3]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x(fit), Math.max(0, s.y(f.casing.last_shoe.md_m))); ctx.lineTo(x(fit), h); ctx.stroke(); ctx.restore();

  // Ahead of the bit: forecast (dashed) + if-unchanged + ML band.
  if (ahead) {
    const aheadBase = Math.min(s.baseMd, s.bitMd + f.ml.pp_lookahead_m);
    const j1 = indexAt(data, aheadBase);
    const yb = s.y(s.bitMd), ya = s.y(aheadBase);
    for (let y = Math.max(0, Math.ceil(yb)); y < Math.min(h, ya); y++) {
      const i = indexAt(data, s.md(y + 0.5));
      const g = approved ? (f.mud.weighted.mw_ppg) : (ghost[i] ?? f.mud.initial.mw_ppg);
      const q = pp[i];
      if (q != null && g < q) { ctx.fillStyle = 'rgba(239,68,68,0.28)'; ctx.fillRect(x(g), y, x(q) - x(g), 1); }
    }
    const p10 = f.ml.mw_rec_p10_ppg, p90 = f.ml.mw_rec_p90_ppg;
    if (p10 != null && p90 != null) {
      ctx.fillStyle = 'rgba(192,132,252,0.16)'; ctx.fillRect(x(p10), yb, x(p90) - x(p10), ya - yb);
    }
    const aheadCurve = (arr: (number | null)[], color: string, width = 1.4) => {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash([5, 4]); ctx.beginPath();
      let pen = false;
      for (let i = bi; i <= j1; i++) { const v = arr[i]; if (v == null) { pen = false; continue; } const X = x(v), Y = s.y(data.md_m[i]); if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; } }
      ctx.stroke(); ctx.restore();
    };
    aheadCurve(pp, c.pp); aheadCurve(fg, c.fg, 1.1);
    if (!approved) aheadCurve(ghost, p.muted, 1.6);
    ctx.save(); ctx.strokeStyle = p.ml; ctx.lineWidth = 2; ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(x(f.mud.weighted.mw_ppg), yb); ctx.lineTo(x(f.mud.weighted.mw_ppg), ya); ctx.stroke(); ctx.restore();
    // Labels.
    ctx.font = '600 11px "Inter Variable", Inter, sans-serif';
    ctx.fillStyle = p.ml; ctx.textAlign = 'left';
    ctx.fillText(`ML MW ${f.mud.weighted.mw_ppg.toFixed(2)}`, x(f.mud.weighted.mw_ppg) + 4, Math.min(h - 6, yb + 16));
    if (p10 != null && p90 != null) { ctx.fillStyle = p.faint; ctx.fillText(`P10–P90 ${p10.toFixed(2)}–${p90.toFixed(2)}`, x(f.mud.weighted.mw_ppg) + 4, Math.min(h - 6, yb + 30)); }
    if (!approved) { ctx.fillStyle = p.muted; ctx.fillText('if unchanged', 8, Math.min(h - 6, ya - 6)); }
  }

  // Drilled curves (stop at the bit).
  strokeCurve(ctx, data, s, 'derived.FG', i0, bi, x, { color: c.fg, width: 1.3, dash: [1.5, 2] });
  strokeCurve(ctx, data, s, 'derived.PP', i0, bi, x, { color: c.pp, width: 2.2 });
  strokeCurve(ctx, data, s, 'derived.ECD', i0, bi, x, { color: c.ecd, width: 1.8 });
  strokeCurve(ctx, data, s, 'mud.MW_IN_PPG', i0, bi, x, { color: c.mw, width: 2.4 });

  // Side labels.
  ctx.font = '700 11px "Inter Variable", Inter, sans-serif';
  ctx.fillStyle = p.risk; ctx.textAlign = 'left'; ctx.fillText('◀ KICK SIDE', 6, 14);
  ctx.fillStyle = p.warn; ctx.textAlign = 'right'; ctx.fillText('LOSS SIDE ▶', w - 6, 14);
  ctx.textAlign = 'left';
}

export default function PressureTrack() {
  const data = useScenario((s) => s.data);
  const bundle = useScenario((s) => s.bundle);
  const act = useScenario((s) => s.act);
  const ghostOn = useScenario((s) => s.ghostOn);
  const approved = useScenario((s) => s.approvedMw);
  const p = usePalette();
  const ahead = ghostOn || act !== 'act1';
  const fn = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    if (data && bundle) draw(ctx, s, w, h, data, bundle, p, ahead, approved);
  }, [data, bundle, p, ahead, approved]);
  if (!data || !bundle) return null;
  const R = pressureRange(bundle);
  const c = p.curves;
  return (
    <Track title="Pressure window · ppg" shadeUndrilled={false} scales={[
      { label: 'PP', min: R.lo, max: R.hi, color: c.pp },
      { label: 'MW · ECD', min: R.lo, max: R.hi, color: c.mw },
      { label: 'FG · FIT', min: R.lo, max: R.hi, color: c.fg, dash: true },
    ]}>
      <CanvasLayer draw={fn} />
    </Track>
  );
}
