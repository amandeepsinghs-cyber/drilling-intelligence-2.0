/**
 * CompositeLog — composite-log style 9-track well log display with:
 * - Two-row grouped header:
 *   Row 1: "INPUT · raw LWD at the bit", "OUTPUT · ML inversion (instant)", "LAG · what the mudlogger sees"
 *   Row 2: Per-track curve labels, scales, and units
 * - Track 1: GR (0–150 API, green), CALI + BIT (6–16 in, red dashed / grey)
 * - Track 2: Depth ruler (m) with major/minor tick marks
 * - Track 3: Formation tops U1–U4 as distinct stratigraphic blocks with IDs
 * - Track 4: RHOB (1.95–2.95 g/cc, red), NPHI (0.45–-0.15 reversed, green), PEF (0–20, black),
 *            yellow shading where NPHI < RHOB-equivalent (gas/sand crossover)
 * - Track 5: Resistivity logarithmic RDEP / RMED / RSHAL (0.2–2000 Ω·m)
 * - Track 6: SW + SXO (1–0) with horizontal GWC line + label at 4,270 m (from reservoir.gwc_m)
 * - Track 7: PHIE (0.5–0) with fluid breakdown fills: residual HC (green), movable HC (yellow), water
 * - Track 8: Lithology 0–100% cumulative stacked fill (shale, siltstone, sandstone, limestone)
 * - Track 9: Mudlog lithology from cuttings down to (bit - lag_m), with hatched grey transit band
 *
 * Mode filtering:
 * - Board mode (useUi().mode === 'board'): ①②④⑤ ‖ ⑦⑧ ‖ ⑨ (includes depth ruler so depths are visible)
 * - Engineer mode: all 9 tracks
 */

import { useMemo } from 'react';
import type { Columnar, Provenance, Unit } from '../../api/types';
import { axis, baseLayout } from '../../design/plotlyTemplate';
import { tokens } from '../../design/tokens';
import { indexAt, series } from '../../lib/frames';
import Plot, { plotConfig } from '../../lib/Plot';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import { PLOTLY_PATTERNS } from './logPatterns';

const C = tokens.curves;

interface TrackConfig {
  id: number;
  key: string;
  band: 'input' | 'output' | 'lag';
  title: string;
  subtitle: string;
  weight: number;
}

export default function CompositeLog() {
  const { data, bundle, md, hazardOn } = useScenario();
  const { mode, theme } = useUi();
  const board = mode === 'board';

  const facts = bundle?.facts;
  const stratigraphy = facts?.stratigraphy ?? [];
  const fig = useMemo(() => {
    if (!data || !facts) return null;
    return buildCompositeFigure({
      data,
      units: stratigraphy,
      md,
      board,
      theme,
      hazardOn,
      gwcM: facts.reservoir.gwc_m,
      sandTopM: facts.reservoir.sand_top_m,
      bottomsUpLagMin: facts.mudlog.bottoms_up_lag_min,
    });
  }, [data, facts, stratigraphy, md, board, theme, hazardOn]);

  if (!fig) return null;

  return (
    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden select-none">
      <div
        className="relative h-full flex flex-col"
        style={{ minWidth: board ? 980 : 1380 }}
      >
        {/* ROW 1: Grouped Band Headers (composite-log style) */}
        <div className="shrink-0 flex h-7 border-b border-line bg-panel/90 backdrop-blur-xs text-[11px] font-bold tracking-wider uppercase">
          <div
            className="flex items-center justify-center border-r border-line text-sky-400 gap-1.5"
            style={{ width: `${fig.bandFractions.input * 100}%` }}
          >
            <span>📥 INPUT · raw LWD at the bit</span>
          </div>
          <div
            className="flex items-center justify-center border-r border-line text-purple-400 gap-1.5"
            style={{ width: `${fig.bandFractions.output * 100}%` }}
          >
            <span>⚡ OUTPUT · ML inversion (instant)</span>
          </div>
          <div
            className="flex-1 flex items-center justify-center text-amber-400 gap-1.5"
            style={{ width: `${fig.bandFractions.lag * 100}%` }}
          >
            <span>⏱️ LAG · what the mudlogger sees</span>
          </div>
        </div>

        {/* ROW 2: Sub-track column scale labels */}
        <div className="shrink-0 flex h-6 border-b border-line/60 bg-surface/60 text-[10px] font-mono text-muted">
          {fig.activeTracks.map((tr) => (
            <div
              key={tr.key}
              className="flex items-center justify-between px-1.5 border-r border-line/40 truncate"
              style={{ width: `${tr.widthPct}%` }}
              title={`${tr.title} — ${tr.subtitle}`}
            >
              <span className="font-semibold text-fg/90 truncate">{tr.title}</span>
              <span className="text-[9px] text-faint truncate ml-1">{tr.subtitle}</span>
            </div>
          ))}
        </div>

        {/* Multi-track Plot */}
        <div className="relative flex-1 min-h-0">
          <Plot
            data={fig.traces as never}
            layout={fig.layout as never}
            config={plotConfig}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

interface BuildParams {
  data: Columnar;
  units: Unit[];
  md: number;
  board: boolean;
  theme: 'dark' | 'light';
  hazardOn: boolean;
  gwcM: number;
  sandTopM: number;
  bottomsUpLagMin: number;
}

function buildCompositeFigure({
  data,
  units,
  md,
  board,
  theme,
  hazardOn,
  gwcM,
  sandTopM,
  bottomsUpLagMin,
}: BuildParams) {
  const t = tokens[theme];
  const upto = indexAt(data, md);
  const yAll = data.md_m;
  const yDrilled = yAll.slice(0, upto + 1);

  // Compute lag depth for Mudlog Track 9
  // lag_m = ROP (m/hr) * bottoms_up_lag_min / 60
  const curRop = data.columns['drilling.ROP']?.[upto] as number;
  const lagM = (curRop * bottomsUpLagMin) / 60;
  const mudlogMd = Math.max(yAll[0], md - lagM);
  const mudlogUpto = indexAt(data, mudlogMd);
  const yMudlog = yAll.slice(0, mudlogUpto + 1);

  // Define All 10 tracks
  // Board mode filters: ①②④⑤ ‖ ⑨⑩ (GR/CALI, Depth, D-N crossover, Triple R, ML Litho, Cuttings)
  // Engineer mode: ①②③④⑤⑥⑦⑧⑨⑩ (adds Strat, PEF, DT+NCT departure, DTSM, SW, PHIE)
  const trackDefs: TrackConfig[] = [
    { id: 1, key: 'tr1_gr_cali', band: 'input', title: '① GR · CALI', subtitle: '0–150 API | 6–16"', weight: 1.1 }, // facts-ok: track axis ranges
    { id: 2, key: 'tr2_depth', band: 'input', title: '② DEPTH', subtitle: 'MD (m)', weight: 0.55 },
    { id: 3, key: 'tr3_tops', band: 'input', title: '③ STRAT', subtitle: 'Units U1–U4', weight: 0.65 },
    { id: 4, key: 'tr4_density', band: 'input', title: '④ RHOB · NPHI', subtitle: '1.95–2.95 | 0.45–-0.15', weight: 1.25 }, // facts-ok: track axis ranges
    { id: 5, key: 'tr5_res', band: 'input', title: '⑤ RESISTIVITY', subtitle: '0.2–2000 Ω·m (log)', weight: 1.2 }, // facts-ok: track axis ranges
    { id: 6, key: 'tr6_sonic', band: 'input', title: '⑥ DT · SONIC', subtitle: '40–140 µs/ft | NCT', weight: 1.15 }, // facts-ok: track axis ranges
    { id: 7, key: 'tr7_saturation', band: 'output', title: '⑦ SATURATION', subtitle: 'SW · SXO (1–0)', weight: 1.05 },
    { id: 8, key: 'tr8_porosity', band: 'output', title: '⑧ POROSITY', subtitle: 'PHIE · Fluid (0.5–0)', weight: 1.15 },
    { id: 9, key: 'tr9_litho', band: 'output', title: '⑨ ML LITHO', subtitle: '0–100% Stacked', weight: 1.25 },
    { id: 10, key: 'tr10_mudlog', band: 'lag', title: '⑩ MUDLOG', subtitle: `Cuttings Lag (${bottomsUpLagMin} min)`, weight: 1.1 },
  ];

  const activeTracks = board
    ? trackDefs.filter((tr) => [1, 2, 4, 5, 9, 10].includes(tr.id))
    : trackDefs;

  const totalWeight = activeTracks.reduce((sum, tr) => sum + tr.weight, 0);
  const gap = 0.007;
  const netDomain = 1 - gap * (activeTracks.length - 1);

  // Calculate domains and percentage widths
  const domains: Record<number, [number, number]> = {};
  let curX = 0;
  activeTracks.forEach((tr, idx) => {
    const w = (tr.weight / totalWeight) * netDomain;
    domains[tr.id] = [curX, curX + w];
    curX += w + (idx < activeTracks.length - 1 ? gap : 0);
  });

  // Calculate fractions of the 3 top bands
  const inputWeight = activeTracks.filter((t) => t.band === 'input').reduce((s, t) => s + t.weight, 0);
  const outputWeight = activeTracks.filter((t) => t.band === 'output').reduce((s, t) => s + t.weight, 0);
  const lagWeight = activeTracks.filter((t) => t.band === 'lag').reduce((s, t) => s + t.weight, 0);
  const bandFractions = {
    input: inputWeight / totalWeight,
    output: outputWeight / totalWeight,
    lag: lagWeight / totalWeight,
  };

  const activeTracksWithPct = activeTracks.map((tr) => ({
    ...tr,
    widthPct: (tr.weight / totalWeight) * 100,
  }));

  // Setup Plotly layout axes
  const layout: Record<string, unknown> = {
    ...baseLayout(theme),
    margin: { l: 8, r: 8, t: 8, b: 8 },
    yaxis: axis(theme, {
      range: [md + 35, md - 135],
      autorange: false,
      showticklabels: false, // A-10 fix: hide stray ticks on left border; Track 2 depth ruler displays MD
      showgrid: false,
      zeroline: false,
    }),
  };

  const traces: Record<string, unknown>[] = [];
  const shapes: Record<string, unknown>[] = [];
  const annotations: Record<string, unknown>[] = [];

  let axisCounter = 1;

  // Track 1: GR (0-150 API) / CALI (6-16 in) / SP
  if (domains[1]) {
    const axGr = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[1];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0, 150],
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const axCali = `x${axisCounter}`;
    layout[`xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [6, 16],
      overlaying: axGr === 'x' ? 'x' : axGr,
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    // GR curve with subtle pale-green wash
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'GR (API)',
      x: series(data, 'curves.GR', upto),
      y: yDrilled,
      xaxis: axGr,
      yaxis: 'y',
      fill: 'tozerox',
      fillcolor: 'rgba(52,211,153,0.08)',
      line: { color: C.gr, width: 1.8 },
      hovertemplate: 'GR: %{x:.1f} API<extra></extra>',
    });

    // Caliper curve (dashed red)
    if ('curves.CALI' in data.columns) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'CALI (in)',
        x: series(data, 'curves.CALI', upto),
        y: yDrilled,
        xaxis: axCali,
        yaxis: 'y',
        line: { color: '#F87171', width: 1.2, dash: 'dash' },
        hovertemplate: 'Caliper: %{x:.2f} in<extra></extra>',
      });
    }

    // Nominal Bit Size baseline at 12.25 in
    shapes.push({
      type: 'line',
      xref: axCali,
      yref: 'y',
      x0: 12.25,
      x1: 12.25,
      y0: yAll[0],
      y1: md,
      line: { color: 'rgba(148, 163, 184, 0.4)', width: 1, dash: 'dot' },
    });
  }

  // Track 2: Depth Ruler (Engineer mode only)
  if (domains[2]) {
    const axDepth = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[2];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0, 1],
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    // Depth labels at 10m intervals
    for (let d = Math.floor(yAll[0] / 10) * 10; d <= md + 40; d += 10) {
      const isMajor = d % 50 === 0;
      annotations.push({
        xref: axDepth,
        yref: 'y',
        x: 0.5,
        y: d,
        text: `<b>${d}</b>`,
        font: { size: isMajor ? 10 : 8, color: isMajor ? t.textPrimary : t.textMuted },
        showarrow: false,
      });
      shapes.push({
        type: 'line',
        xref: axDepth,
        yref: 'y',
        x0: isMajor ? 0.05 : 0.2,
        x1: isMajor ? 0.95 : 0.8,
        y0: d,
        y1: d,
        line: { color: isMajor ? t.textMuted : t.lineSubtle, width: isMajor ? 1.2 : 0.8 },
      });
    }
  }

  // Track 3: Formation Tops U1–U4 as coloured blocks with IDs (Engineer mode)
  if (domains[3]) {
    const axTops = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[3];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0, 1],
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    units.forEach((u) => {
      const top = u.top_m;
      const base = u.base_m;
      const color = tokens.litho[u.litho_class] ?? '#475569';
      shapes.push({
        type: 'rect',
        xref: axTops,
        yref: 'y',
        x0: 0.05,
        x1: 0.95,
        y0: top,
        y1: base,
        fillcolor: color,
        opacity: 0.35,
        line: { color, width: 1 },
      });
      annotations.push({
        xref: axTops,
        yref: 'y',
        x: 0.5,
        y: (top + Math.min(base, top + 35)) / 2,
        text: `<b>${u.id}</b>`,
        font: { size: 10, color: '#FFFFFF' },
        showarrow: false,
      });
    });
  }

  // Track 4: RHOB (1.95–2.95) / NPHI (0.45–-0.15 reversed) with Gas Crossover Fill
  if (domains[4]) {
    const axRhob = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[4];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [1.95, 2.95],
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const axNphi = `x${axisCounter}`;
    layout[`xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0.45, -0.15], // standard SPWLA reversed scale
      overlaying: axRhob === 'x' ? 'x' : axRhob,
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const rhobVals = series(data, 'curves.RHOB', upto) as (number | null)[];
    const nphiVals = series(data, 'curves.NPHI', upto) as (number | null)[];

    // Compute Sandstone gas crossover fill (yellow shading)
    // On limestone compatibility: RHOB equivalent = 2.71 - (NPHI * 1.71) or on standard 1.95-2.95 / 0.45--0.15:
    // Crossover occurs when NPHI < (2.71 - RHOB) / 1.71, or visually normalized: NPHI curve is to the right of RHOB curve
    // In normalized coords [0, 1] on domain:
    // normRhob = (rhob - 1.95) / (2.95 - 1.95) = (rhob - 1.95)
    // normNphi = (0.45 - nphi) / (0.45 - (-0.15)) = (0.45 - nphi) / 0.60
    // When normNphi > normRhob -> Gas Crossover!
    const crossoverSegments: { top: number; bot: number; midVal: number }[] = [];
    let startCross: number | null = null;

    for (let i = 0; i <= upto; i++) {
      const r = rhobVals[i];
      const n = nphiVals[i];
      const depth = yDrilled[i];
      if (r !== null && n !== null) {
        const normR = r - 1.95;
        const normN = (0.45 - n) / 0.6;
        if (normN > normR) {
          if (startCross === null) startCross = depth;
        } else {
          if (startCross !== null) {
            crossoverSegments.push({ top: startCross, bot: yDrilled[i - 1], midVal: 1 });
            startCross = null;
          }
        }
      }
    }
    if (startCross !== null) {
      crossoverSegments.push({ top: startCross, bot: yDrilled[upto], midVal: 1 });
    }

    // Yellow crossover shading rects on paper domain
    crossoverSegments.forEach((seg) => {
      shapes.push({
        type: 'rect',
        xref: 'paper',
        yref: 'y',
        x0: x0,
        x1: x1,
        y0: seg.top,
        y1: seg.bot,
        fillcolor: 'rgba(251, 191, 36, 0.35)', // Golden Amber gas crossover
        line: { width: 0 },
        layer: 'below',
      });
    });

    // RHOB curve (red line)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'RHOB (g/cc)',
      x: rhobVals,
      y: yDrilled,
      xaxis: axRhob,
      yaxis: 'y',
      line: { color: '#EF4444', width: 1.8 },
      hovertemplate: 'RHOB: %{x:.2f} g/cc<extra></extra>',
    });

    // NPHI curve (dashed cyan/blue)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'NPHI (v/v)',
      x: nphiVals,
      y: yDrilled,
      xaxis: axNphi,
      yaxis: 'y',
      line: { color: '#38BDF8', width: 1.6, dash: 'dash' },
      hovertemplate: 'NPHI: %{x:.3f} v/v<extra></extra>',
    });

    // PEF curve (b/e) in Engineer mode
    if (!board && 'curves.PEF' in data.columns) {
      const axPef = `x${axisCounter}`;
      layout[`xaxis${axisCounter}`] = axis(theme, {
        domain: [x0, x1],
        range: [0, 10], // facts-ok: track axis ranges
        overlaying: axRhob === 'x' ? 'x' : axRhob,
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      });
      axisCounter++;

      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'PEF (b/e)',
        x: series(data, 'curves.PEF', upto),
        y: yDrilled,
        xaxis: axPef,
        yaxis: 'y',
        line: { color: '#C084FC', width: 1.2, dash: 'dot' },
        hovertemplate: 'PEF: %{x:.2f} b/e<extra></extra>',
      });
    }
  }

  // Track 5: Resistivity (0.2–2000 Ω·m logarithmic)
  if (domains[5]) {
    const axRes = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[5];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      type: 'log',
      range: [Math.log10(0.2), Math.log10(2000)], // facts-ok: track axis ranges
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    // RSHAL (shallow/micro, grey)
    if ('curves.RSHAL' in data.columns) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'RSHAL (Ω·m)',
        x: series(data, 'curves.RSHAL', upto),
        y: yDrilled,
        xaxis: axRes,
        yaxis: 'y',
        line: { color: '#64748B', width: 1.1, dash: 'dot' },
        hovertemplate: 'RSHAL: %{x:.2f} Ω·m<extra></extra>',
      });
    }

    // RMED (medium, blue dotted)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'RMED (Ω·m)',
      x: series(data, 'curves.RMED', upto),
      y: yDrilled,
      xaxis: axRes,
      yaxis: 'y',
      line: { color: '#3B82F6', width: 1.3, dash: 'dot' },
      hovertemplate: 'RMED: %{x:.2f} Ω·m<extra></extra>',
    });

    // RDEP (deep, red/magenta dashed)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'RDEP (Ω·m)',
      x: series(data, 'curves.RDEP', upto),
      y: yDrilled,
      xaxis: axRes,
      yaxis: 'y',
      line: { color: '#EC4899', width: 2, dash: 'dash' },
      hovertemplate: 'RDEP: %{x:.2f} Ω·m<extra></extra>',
    });
  }

  // Track 6: Sonic DT (40–140 µs/ft) & NCT Departure Shading (Engineer mode)
  if (domains[6]) {
    const axDt = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[6];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [140, 40], // reversed petrophysical scale // facts-ok: track axis ranges
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const dtVals = series(data, 'curves.DT', upto) as (number | null)[];
    const nctVals = series(data, 'trend.DT_NCT', upto) as (number | null)[];

    // NCT background compaction trend
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'DT NCT (µs/ft)',
      x: nctVals,
      y: yDrilled,
      xaxis: axDt,
      yaxis: 'y',
      line: { color: '#94A3B8', width: 1.4, dash: 'dash' },
      hovertemplate: 'NCT: %{x:.1f} µs/ft<extra></extra>',
    });

    // DT curve with overpressure departure fill when slowing above NCT
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'DT (µs/ft)',
      x: dtVals,
      y: yDrilled,
      xaxis: axDt,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: 'rgba(245, 158, 11, 0.25)', // Overpressure departure wash
      line: { color: '#F59E0B', width: 1.8 },
      hovertemplate: 'DT: %{x:.1f} µs/ft<extra></extra>',
    });

    if ('curves.DTSM' in data.columns) {
      const axDtsm = `x${axisCounter}`;
      layout[`xaxis${axisCounter}`] = axis(theme, {
        domain: [x0, x1],
        range: [300, 80], // facts-ok: track axis ranges
        overlaying: axDt === 'x' ? 'x' : axDt,
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      });
      axisCounter++;

      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'DTSM (µs/ft)',
        x: series(data, 'curves.DTSM', upto),
        y: yDrilled,
        xaxis: axDtsm,
        yaxis: 'y',
        line: { color: '#818CF8', width: 1.2, dash: 'dot' },
        hovertemplate: 'DTSM: %{x:.1f} µs/ft<extra></extra>',
      });
    }
  }

  // Track 7: SW + SXO (1–0) with GWC at 4,270 m (Engineer mode)
  if (domains[7]) {
    const axSw = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[7];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [1.0, 0.0], // 1 -> 0 scale // facts-ok: track axis ranges
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const swVals = series(data, 'curves.SW', upto);
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'SW (water)',
      x: swVals,
      y: yDrilled,
      xaxis: axSw,
      yaxis: 'y',
      line: { color: '#0284C7', width: 1.8 },
      hovertemplate: 'Sw: %{x:.3f}<extra></extra>',
    });

    // Horizontal GWC line at 4,270 m
    shapes.push({
      type: 'line',
      xref: axSw,
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: gwcM,
      y1: gwcM,
      line: { color: '#06B6D4', width: 2, dash: 'dashdot' },
    });
    annotations.push({
      xref: axSw,
      yref: 'y',
      x: 0.95,
      y: gwcM,
      text: `<b>GWC ${gwcM} m</b>`,
      font: { size: 9, color: '#06B6D4' },
      xanchor: 'right',
      yanchor: 'bottom',
      showarrow: false,
    });
  }

  // Track 8: PHIE (0.5–0) with fluid breakdown fills
  if (domains[8]) {
    const axPhi = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[8];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0.5, 0.0], // 0.5 to 0 reversed // facts-ok: track axis ranges
      showgrid: true,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const phieVals = series(data, 'curves.PHIE', upto) as (number | null)[];
    const swVals = series(data, 'curves.SW', upto) as (number | null)[];

    // Compute bulk volume water: BVW = PHIE * SW
    const bvwVals = phieVals.map((p, i) => {
      const s = swVals[i] ?? 1.0;
      return p !== null ? p * s : null;
    });

    // Water fill: 0 to BVW (white/transparent pale blue)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'BVW (Water)',
      x: bvwVals,
      y: yDrilled,
      xaxis: axPhi,
      yaxis: 'y',
      fill: 'tozerox',
      fillcolor: 'rgba(224, 242, 254, 0.35)',
      line: { color: '#38BDF8', width: 0.8 },
      hovertemplate: 'BVW: %{x:.3f}<extra></extra>',
    });

    // Hydrocarbon fill: BVW to PHIE (golden yellow hydrocarbon)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'PHIE (Total Porosity)',
      x: phieVals,
      y: yDrilled,
      xaxis: axPhi,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: 'rgba(234, 179, 8, 0.45)', // Hydrocarbon fill
      line: { color: '#CA8A04', width: 1.5 },
      hovertemplate: 'φe: %{x:.3f}<extra></extra>',
    });
  }

  // Track 9: Lithology 0–100% cumulative stacked fill with standard facies
  if (domains[9]) {
    const axLith = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[9];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0, 1], // facts-ok: track axis ranges
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    const cumShale = series(data, 'vol.cum_shale', upto) as number[];
    const cumSand = series(data, 'vol.cum_sand', upto) as number[];
    const cumLime = series(data, 'vol.cum_lime', upto) as number[];
    const cumTotal = series(data, 'vol.cum_total', upto) as number[];

    // 1. Shale (0 -> cumShale): Forest Olive Green with horizontal lines
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_shale',
      x: cumShale,
      y: yDrilled,
      xaxis: axLith,
      yaxis: 'y',
      fill: 'tozerox',
      fillcolor: '#4B5A4A',
      fillpattern: PLOTLY_PATTERNS.SHALE,
      line: { color: '#344133', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 2. Sandstone (cumShale -> cumSand): Golden Amber Yellow with stipple dots
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_sand',
      x: cumSand,
      y: yDrilled,
      xaxis: axLith,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#FBBF24',
      fillpattern: PLOTLY_PATTERNS.SAND,
      line: { color: '#D97706', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 3. Limestone (cumSand -> cumLime): Slate Carbonate Blue with block pattern
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_lime',
      x: cumLime,
      y: yDrilled,
      xaxis: axLith,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#5B7EA6',
      fillpattern: PLOTLY_PATTERNS.LIMESTONE,
      line: { color: '#3B597B', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 4. Effective Porosity (cumLime -> cumTotal=1.0): Sky Blue Fluid
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'PHIE',
      x: cumTotal,
      y: yDrilled,
      xaxis: axLith,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: 'rgba(56, 189, 248, 0.45)',
      line: { color: '#0284C7', width: 0.8 },
      hoverinfo: 'skip',
    });

    // Interactive tooltip hover trace
    const vShale = series(data, 'vol.SHALE', upto) as number[];
    const vSand = series(data, 'vol.SAND', upto) as number[];
    const vLime = series(data, 'vol.LIME', upto) as number[];
    const vPhie = series(data, 'vol.PHIE', upto) as number[];
    const lithoClasses = data.columns['ml.litho.class'] as string[];

    const hoverText = yDrilled.map((depth, idx) => {
      const cls = lithoClasses[idx] ?? 'UNKNOWN';
      const sh = ((vShale[idx] ?? 0) * 100).toFixed(1);
      const sa = ((vSand[idx] ?? 0) * 100).toFixed(1);
      const li = ((vLime[idx] ?? 0) * 100).toFixed(1);
      const po = ((vPhie[idx] ?? 0) * 100).toFixed(1);
      return `<b>ML Inversion @ ${depth.toFixed(1)} m</b><br>Facies: <b>${cls}</b><br>Shale: ${sh}% · Sand: ${sa}%<br>Lime: ${li}% · φe: ${po}%`;
    });

    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'ML Inversion at Bit',
      x: yDrilled.map(() => 0.5),
      y: yDrilled,
      xaxis: axLith,
      yaxis: 'y',
      marker: { size: 0.1, opacity: 0 },
      hovertext: hoverText,
      hoverinfo: 'text',
    });
  }

  // Track 10: Mudlog lithology from lagged shaker cuttings down to mudlogMd + transit hatched band
  if (domains[10]) {
    const axMud = axisCounter === 1 ? 'x' : `x${axisCounter}`;
    const [x0, x1] = domains[10];
    layout[axisCounter === 1 ? 'xaxis' : `xaxis${axisCounter}`] = axis(theme, {
      domain: [x0, x1],
      range: [0, 1], // facts-ok: track axis ranges
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    });
    axisCounter++;

    // Read real lagged shaker cuttings percentages (0–100%) from column contract
    const cutShale = (series(data, 'mudlog.CUT_SHALE_PCT', mudlogUpto) as (number | null)[]).map((v) =>
      v !== null ? v / 100 : 0
    );
    const cutSand = (series(data, 'mudlog.CUT_SAND_SILT_PCT', mudlogUpto) as (number | null)[]).map((v) =>
      v !== null ? v / 100 : 0
    );
    const cutCarb = (series(data, 'mudlog.CUT_CARB_PCT', mudlogUpto) as (number | null)[]).map((v) =>
      v !== null ? v / 100 : 0
    );

    const cumShaleMud = cutShale;
    const cumSandMud = cutSand.map((v, i) => (cumShaleMud[i] ?? 0) + v);
    const cumCarbMud = cutCarb.map((v, i) => Math.min(1, (cumSandMud[i] ?? 0) + v));

    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Mudlog Shale',
      x: cumShaleMud,
      y: yMudlog,
      xaxis: axMud,
      yaxis: 'y',
      fill: 'tozerox',
      fillcolor: '#4B5A4A',
      fillpattern: PLOTLY_PATTERNS.SHALE,
      line: { color: '#344133', width: 0.8 },
      hoverinfo: 'skip',
    });

    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Mudlog Sand',
      x: cumSandMud,
      y: yMudlog,
      xaxis: axMud,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#FBBF24',
      fillpattern: PLOTLY_PATTERNS.SAND,
      line: { color: '#D97706', width: 0.8 },
      hoverinfo: 'skip',
    });

    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Mudlog Lime',
      x: cumCarbMud,
      y: yMudlog,
      xaxis: axMud,
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#5B7EA6',
      fillpattern: PLOTLY_PATTERNS.LIMESTONE,
      line: { color: '#3B597B', width: 0.8 },
      hoverinfo: 'skip',
    });

    // Hatched grey band between mudlogMd and bit depth (cuttings in transit)
    if (md > mudlogMd) {
      shapes.push({
        type: 'rect',
        xref: axMud,
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: mudlogMd,
        y1: md,
        fillcolor: 'rgba(51, 65, 85, 0.45)', // slate grey transit band
        line: { color: '#94A3B8', width: 1, dash: 'dash' },
      });

      annotations.push({
        xref: axMud,
        yref: 'y',
        x: 0.5,
        y: (mudlogMd + md) / 2,
        text: `<b>cuttings in transit<br>+${bottomsUpLagMin} min (${lagM.toFixed(1)} m)</b>`,
        font: { size: 9, color: '#F1F5F9' },
        showarrow: false,
        align: 'center',
      });
    }
  }

  // Bit Depth Indicator across entire composite width
  shapes.push({
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: md,
    y1: md,
    line: { color: t.accent, width: 2 },
  });

  annotations.push({
    xref: 'paper',
    yref: 'y',
    x: 1,
    y: md,
    text: `<b>BIT ${md.toLocaleString('en-IN', { minimumFractionDigits: 1 })} m</b>`,
    font: { size: 10, color: t.accent },
    xanchor: 'right',
    yanchor: 'bottom',
    showarrow: false,
  });

  // Ahead of bit shaded lookahead
  shapes.push({
    type: 'rect',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: md,
    y1: md + 35,
    fillcolor: t.bgApp,
    opacity: 0.35,
    line: { width: 0 },
    layer: 'below',
  });

  // Stratigraphic formation top lines across composite log
  units.forEach((u) => {
    if (u.top_m <= md) {
      shapes.push({
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: u.top_m,
        y1: u.top_m,
        line: { color: t.lineSubtle, width: 1, dash: 'dot' },
      });
      annotations.push({
        xref: 'paper',
        yref: 'y',
        x: 0.005,
        y: u.top_m,
        text: u.id,
        font: { size: 9, color: t.textMuted },
        xanchor: 'left',
        yanchor: 'top',
        showarrow: false,
      });
    }
  });

  // Hazard annotation (sand top forecast)
  if (hazardOn && md < sandTopM) {
    shapes.push({
      type: 'line',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: sandTopM,
      y1: sandTopM,
      line: { color: t.risk, width: 1.5, dash: 'dash' },
    });
    annotations.push({
      xref: 'paper',
      yref: 'y',
      x: 0.99,
      y: sandTopM,
      text: `SAND TOP · forecast · ${(sandTopM - md).toFixed(0)} m ahead`,
      font: { size: 10, color: t.risk },
      xanchor: 'right',
      yanchor: 'top',
      showarrow: false,
    });
  }

  layout.shapes = shapes;
  layout.annotations = annotations;
  layout.uirevision = `${board}-${theme}`;

  return { traces, layout, activeTracks: activeTracksWithPct, bandFractions };
}
