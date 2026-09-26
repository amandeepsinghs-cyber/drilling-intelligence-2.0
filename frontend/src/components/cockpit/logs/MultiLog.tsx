/** MultiLog — SAFIR-03-style multi-log on the shared depth axis (Canvas, no Plotly).
 * INPUT: GR·CALI | depth + tops | RHOB·NPHI·PEF | RSHAL·RMED·RDEP.  OUTPUT: SW·SXO | PHIE | ML lithology 0–100 %.
 * LAG: cuttings column that ends LAG metres above the bit. Every curve stops at the bit. */
import { useCallback } from 'react';
import { useUi } from '../../../state/uiStore';
import type { Columnar, Facts } from '../../../api/types';
import { indexAt } from '../../../lib/frames';
import { useScenario } from '../../../state/scenarioStore';
import CanvasLayer from '../CanvasLayer';
import { COLUMN_TOP_PX, type DepthScale } from '../depth';
import { usePalette, type Palette } from '../palette';
import Track from '../Track';
import { col, drilledRange, fillRows, linX, logX, mix, strokeCurve } from './draw';
import { pattern } from './patterns';
import { BOARD_TRACKS, COLORS, ENGINEER_TRACKS, SCALE, type TrackId } from './tracks';

type D = { data: Columnar; facts: Facts; p: Palette };
const fmtScale = (v: number) => (Math.abs(v) < 1 && v !== 0 ? v.toFixed(2) : String(v));

function GrTrack({ data, facts }: D) {
  const bitIn = facts.well.current_section.hole_size_in;
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const r = drilledRange(data, s); if (!r) return;
    const x = linX(SCALE.GR[0], SCALE.GR[1], w), xc = linX(SCALE.CALI[0], SCALE.CALI[1], w);
    const gr = col(data, 'curves.GR');
    // FT-7: compute fill colour from a 1 m running mean of curves.GR
    const stepM = data.meta.grid.step_m;
    const win = Math.max(1, Math.round(1 / stepM));
    const halfWin = Math.floor(win / 2);
    const grSmooth = new Float32Array(gr.length);
    for (let i = 0; i < gr.length; i++) {
      let sum = 0, count = 0;
      const j0 = Math.max(0, i - halfWin);
      const j1 = Math.min(gr.length - 1, i + halfWin);
      for (let j = j0; j <= j1; j++) {
        const val = gr[j];
        if (val != null) { sum += val; count++; }
      }
      grSmooth[i] = count > 0 ? sum / count : (gr[i] ?? 0);
    }

    // GR shading: fill from the left edge to the GR line, sand-yellow → shale-grey.
    fillRows(ctx, data, s, h, (i) => {
      const v = gr[i]; if (v == null) return null;
      const sv = grSmooth[i] || v;
      return [x(SCALE.GR[0]), x(v), mix(COLORS.sand, COLORS.shaleGr, (sv - 30) / 80)];
    });
    ctx.save(); ctx.strokeStyle = COLORS.bit; ctx.setLineDash([2, 3]); ctx.beginPath();
    ctx.moveTo(xc(bitIn), 0); ctx.lineTo(xc(bitIn), Math.min(h, s.y(s.bitMd))); ctx.stroke(); ctx.restore();
    strokeCurve(ctx, data, s, 'curves.CALI', r[0], r[1], xc, { color: COLORS.cali, width: 1, dash: [4, 2] });
    strokeCurve(ctx, data, s, 'curves.GR', r[0], r[1], x, { color: COLORS.gr, width: 1.6 });
  }, [data, bitIn]);
  return (
    <Track title="Gamma ray · caliper" scales={[
      { label: 'GR', min: SCALE.GR[0], max: SCALE.GR[1], unit: 'API', color: COLORS.gr },
      { label: 'CALI', min: SCALE.CALI[0], max: SCALE.CALI[1], unit: 'in', color: COLORS.cali, dash: true },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

function DepthTrack({ data, facts, p }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    // Unit bands at the left edge + top lines and ids.
    for (const u of facts.stratigraphy) {
      const y0 = Math.max(0, s.y(u.top_m)), y1 = Math.min(h, s.y(u.base_m));
      if (y1 <= 0 || y0 >= h) continue;
      ctx.fillStyle = p.litho[u.litho_class] ?? p.faint;
      ctx.globalAlpha = 0.85; ctx.fillRect(0, y0, 6, y1 - y0); ctx.globalAlpha = 1;
      const yt = s.y(u.top_m);
      if (yt >= 0 && yt <= h) {
        ctx.strokeStyle = p.accent; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, yt + 0.5); ctx.lineTo(w, yt + 0.5); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = p.accent; ctx.font = '600 12px "Inter Variable", Inter, sans-serif';
      ctx.fillText(u.id, 10, Math.max(14, y0 + 14));
    }
    // Depth labels every 10 m.
    ctx.fillStyle = p.muted; ctx.font = '12.5px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
    const step = 10; // facts-ok display grid
    for (let md = Math.ceil(s.topMd / step) * step; md <= s.baseMd; md += step) {
      const y = s.y(md);
      if (y < 8 || y > h - 4) continue;
      ctx.fillStyle = md > s.bitMd ? p.faint : p.text;
      ctx.fillText(md.toLocaleString('en-IN'), w - 4, y + 4);
    }
    ctx.textAlign = 'left';
    void data;
  }, [data, facts, p]);
  return (
    <Track title="Depth" width={74} grid>
      <CanvasLayer draw={draw} />
      <div className="pointer-events-none absolute bottom-1 right-1 text-[10px] text-faint">m MD</div>
    </Track>
  );
}

function DensityNeutronTrack({ data }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const r = drilledRange(data, s); if (!r) return;
    const xr = linX(SCALE.RHOB[0], SCALE.RHOB[1], w), xn = linX(SCALE.NPHI[0], SCALE.NPHI[1], w), xp = linX(SCALE.PEF[0], SCALE.PEF[1], w);
    const rh = col(data, 'curves.RHOB'), np = col(data, 'curves.NPHI');
    // Crossover: neutron left of density = gas/sand (yellow); right = shale (grey).
    fillRows(ctx, data, s, h, (i) => {
      const a = rh[i], b = np[i]; if (a == null || b == null) return null;
      const X1 = xr(a), X2 = xn(b);
      return [X1, X2, X2 > X1 ? COLORS.crossGas : COLORS.crossShale];
    });
    strokeCurve(ctx, data, s, 'curves.PEF', r[0], r[1], xp, { color: COLORS.pef, width: 1, alpha: 0.8 });
    strokeCurve(ctx, data, s, 'curves.NPHI', r[0], r[1], xn, { color: COLORS.nphi, width: 1.5, dash: [5, 2] });
    strokeCurve(ctx, data, s, 'curves.RHOB', r[0], r[1], xr, { color: COLORS.rhob, width: 1.6 });
  }, [data]);
  return (
    <Track title="Density · neutron" scales={[
      { label: 'RHOB', min: SCALE.RHOB[0], max: SCALE.RHOB[1], unit: 'g/cc', color: COLORS.rhob },
      { label: 'NPHI', min: fmtScale(SCALE.NPHI[0]), max: fmtScale(SCALE.NPHI[1]), unit: 'v/v', color: COLORS.nphi, dash: true },
      { label: 'PEF', min: SCALE.PEF[0], max: SCALE.PEF[1], unit: 'b/e', color: COLORS.pef },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

function ResistivityTrack({ data, p }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const x = logX(SCALE.RES[0], SCALE.RES[1], w);
    // Log-decade grid.
    ctx.strokeStyle = p.grid;
    for (const d of [1, 10, 100]) { const X = Math.round(x(d)) + 0.5; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, h); ctx.stroke(); }
    const r = drilledRange(data, s); if (!r) return;
    const rd = col(data, 'curves.RDEP'), rs = col(data, 'curves.RSHAL');
    // Invasion separation (shallow vs deep) lightly filled — a permeability indicator.
    fillRows(ctx, data, s, h, (i) => {
      const a = rs[i], b = rd[i]; if (a == null || b == null || Math.abs(Math.log10(b / a)) < 0.08) return null;
      return [x(a), x(b), 'rgba(244,114,182,0.14)'];
    });
    strokeCurve(ctx, data, s, 'curves.RSHAL', r[0], r[1], x, { color: COLORS.rshal, width: 1, dash: [1.5, 2] });
    strokeCurve(ctx, data, s, 'curves.RMED', r[0], r[1], x, { color: COLORS.rmed, width: 1.2, dash: [5, 2] });
    strokeCurve(ctx, data, s, 'curves.RDEP', r[0], r[1], x, { color: COLORS.rdep, width: 1.7 });
  }, [data, p]);
  return (
    <Track title="Resistivity (log)" scales={[
      { label: 'RDEP', min: SCALE.RES[0], max: SCALE.RES[1], unit: 'Ω·m', color: COLORS.rdep },
      { label: 'RMED', min: SCALE.RES[0], max: SCALE.RES[1], color: COLORS.rmed, dash: true },
      { label: 'RSHAL', min: SCALE.RES[0], max: SCALE.RES[1], color: COLORS.rshal, dash: true },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

function SaturationTrack({ data }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const r = drilledRange(data, s); if (!r) return;
    const x = linX(SCALE.SW[0], SCALE.SW[1], w);
    const sw = col(data, 'curves.SW'), sx = col(data, 'truth.SXO_W');
    fillRows(ctx, data, s, h, (i) => {
      const a = sw[i], b = sx[i]; if (a == null || b == null || b <= a) return null;
      return [x(a), x(b), 'rgba(52,211,153,0.35)']; // movable hydrocarbon
    });
    strokeCurve(ctx, data, s, 'truth.SXO_W', r[0], r[1], x, { color: COLORS.sxo, width: 1.1, dash: [4, 2] });
    strokeCurve(ctx, data, s, 'curves.SW', r[0], r[1], x, { color: COLORS.sw, width: 1.6 });
  }, [data]);
  return (
    <Track title="Saturation" scales={[
      { label: 'SW', min: SCALE.SW[0], max: SCALE.SW[1], unit: 'v/v', color: COLORS.sw },
      { label: 'SXO', min: SCALE.SW[0], max: SCALE.SW[1], color: COLORS.sxo, dash: true },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

function PorosityTrack({ data }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const r = drilledRange(data, s); if (!r) return;
    const x = linX(SCALE.PHIE[0], SCALE.PHIE[1], w);
    const ph = col(data, 'curves.PHIE'), sw = col(data, 'curves.SW');
    fillRows(ctx, data, s, h, (i) => {
      const a = ph[i], b = sw[i]; if (a == null || b == null) return null;
      return [x(0), x(a * b), 'rgba(59,130,246,0.55)']; // bulk volume water
    });
    fillRows(ctx, data, s, h, (i) => {
      const a = ph[i], b = sw[i]; if (a == null || b == null) return null;
      return [x(a * b), x(a), 'rgba(52,211,153,0.6)']; // hydrocarbon pore volume
    });
    strokeCurve(ctx, data, s, 'curves.PHIE', r[0], r[1], x, { color: COLORS.phie, width: 1.3 });
  }, [data]);
  return (
    <Track title="Porosity" scales={[
      { label: 'PHIE', min: SCALE.PHIE[0], max: SCALE.PHIE[1], unit: 'v/v', color: COLORS.phie },
      { label: 'HC · water', min: '', max: '', color: COLORS.hc },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

function LithoTrack({ data }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const sh = col(data, 'vol.SHALE'), sa = col(data, 'vol.SAND'), li = col(data, 'vol.LIME'), ph = col(data, 'vol.PHIE');
    const pats = { sh: pattern(ctx, 'SHALE'), sa: pattern(ctx, 'SAND'), li: pattern(ctx, 'LIMESTONE'), po: pattern(ctx, 'PORE') };
    const yEnd = Math.min(h, s.y(Math.min(s.baseMd, s.bitMd)));
    for (let y = 0; y < yEnd; y++) {
      const i = indexAt(data, s.md(y + 0.5));
      const parts: [number, CanvasPattern | string][] = [[sh[i] ?? 0, pats.sh], [sa[i] ?? 0, pats.sa], [li[i] ?? 0, pats.li], [ph[i] ?? 0, pats.po]];
      const tot = parts.reduce((a, [v]) => a + Math.max(0, v), 0) || 1;
      let x0 = 0;
      for (const [v, f] of parts) {
        const ww = (Math.max(0, v) / tot) * w;
        if (ww > 0.2) { ctx.fillStyle = f; ctx.fillRect(x0, y, ww, 1); }
        x0 += ww;
      }
    }
  }, [data]);
  return (
    <Track title="ML lithology" scales={[
      { label: 'volume', min: 0, max: 100, unit: '%', color: '#C084FC' },
    ]}>
      <CanvasLayer draw={draw} />
      <div className="pointer-events-none absolute right-1 top-1 rounded bg-ml/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-ml">ML · at the bit</div>
    </Track>
  );
}

function CuttingsTrack({ data, p }: D) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, s: DepthScale, w: number, h: number) => {
    const bi = indexAt(data, s.bitMd);
    const lag = (col(data, 'mudlog.LAG_M')[bi] ?? 0) as number;
    const lagTop = s.bitMd - lag;
    const sh = col(data, 'mudlog.CUT_SHALE_PCT'), sa = col(data, 'mudlog.CUT_SAND_SILT_PCT'), ca = col(data, 'mudlog.CUT_CARB_PCT');
    const pats = [pattern(ctx, 'SHALE'), pattern(ctx, 'SAND'), pattern(ctx, 'LIMESTONE')];
    // Blocky 1 m bins, only down to the depth the cuttings have reached the surface.
    const bin = 1; // facts-ok display bin (m)
    for (let top = Math.floor(s.topMd); top < Math.min(s.baseMd, lagTop); top += bin) {
      const i = indexAt(data, Math.min(top + bin / 2, lagTop));
      const y0 = s.y(top), y1 = s.y(Math.min(top + bin, lagTop));
      const vals = [sh[i] ?? 0, sa[i] ?? 0, ca[i] ?? 0];
      const tot = vals.reduce((a, b) => a + b, 0) || 1;
      let x0 = 0;
      vals.forEach((v, k) => { const ww = (v / tot) * w; ctx.fillStyle = pats[k]; ctx.fillRect(x0, y0, ww, y1 - y0); x0 += ww; });
    }
    // In-transit hatch between lag top and bit.
    const yt = s.y(lagTop), yb = s.y(s.bitMd);
    if (yb > 0 && yt < h && lag > 0) {
      ctx.fillStyle = pattern(ctx, 'HATCH'); ctx.fillRect(0, yt, w, yb - yt);
      ctx.strokeStyle = p.warn; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(0, yt + 0.5); ctx.lineTo(w, yt + 0.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(w / 2 + 4, (yt + yb) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = p.warn; ctx.font = '600 11.5px "Inter Variable", Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`in transit · ${lag.toFixed(1)} m`, 0, 0); ctx.restore();
    }
  }, [data, p]);
  return (
    <Track title="Cuttings" width={112} scales={[
      { label: 'lag', min: 0, max: 100, unit: '%', color: '#94A3B8' },
    ]}>
      <CanvasLayer draw={draw} />
    </Track>
  );
}

const TRACK_CMP: Record<TrackId, (d: D) => JSX.Element> = {
  gr: GrTrack, depth: DepthTrack, dn: DensityNeutronTrack, res: ResistivityTrack,
  sw: SaturationTrack, phie: PorosityTrack, litho: LithoTrack, cuttings: CuttingsTrack,
};

export default function MultiLog() {
  const data = useScenario((s) => s.data);
  const facts = useScenario((s) => s.bundle?.facts);
  const p = usePalette();
  const engineer = useUi((u) => u.mode) === 'engineer'; // B toggles board / engineer (presenter.ts)
  if (!data || !facts) return null;
  const ids = engineer ? ENGINEER_TRACKS : BOARD_TRACKS;
  const inputIds = ids.filter((t) => ['gr', 'depth', 'dn', 'res'].includes(t));
  const outputIds = ids.filter((t) => ['sw', 'phie', 'litho'].includes(t));
  const lagIds = ids.filter((t) => t === 'cuttings');
  const group = (label: string, tone: string, list: TrackId[]) => list.length ? (
    <div className="relative flex min-w-0 flex-1 border-r border-strong last:border-r-0" style={{ flexGrow: list.length }}>
      <span style={{ top: -COLUMN_TOP_PX, height: COLUMN_TOP_PX }} className={`pointer-events-none absolute left-2 flex items-center text-[10.5px] font-bold uppercase tracking-[0.2em] ${tone}`}>{label}</span>
      {list.map((t) => { const C = TRACK_CMP[t]; return <C key={t} data={data} facts={facts} p={p} />; })}
    </div>
  ) : null;
  return (
    <div className="flex h-full min-w-0" style={{ paddingTop: COLUMN_TOP_PX }} data-multilog={engineer ? 'engineer' : 'board'}>
      {group('Input · LWD', 'text-muted', inputIds)}
      {group('Output · ML', 'text-ml', outputIds)}
      {lagIds.length ? <div className="relative flex shrink-0">
        <span style={{ top: -COLUMN_TOP_PX, height: COLUMN_TOP_PX }} className="pointer-events-none absolute left-2 flex items-center text-[10.5px] font-bold uppercase tracking-[0.2em] text-warn">Lag</span>
        {lagIds.map((t) => { const C = TRACK_CMP[t]; return <C key={t} data={data} facts={facts} p={p} />; })}
      </div> : null}
    </div>
  );
}
