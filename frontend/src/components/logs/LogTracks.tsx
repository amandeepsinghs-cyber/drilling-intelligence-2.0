/**
 * LogTracks — SPWLA-standard multi-track well log display with ML Lithology column,
 * real DLIS LWD curves, pore pressure / fracture gradient window, and drilling mechanics.
 */
import { useMemo } from 'react';
import type { Columnar, Provenance } from '../../api/types';
import { axis, baseLayout } from '../../design/plotlyTemplate';
import { tokens } from '../../design/tokens';
import { indexAt, series } from '../../lib/frames';
import Plot, { plotConfig } from '../../lib/Plot';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import { lithoAnnotations, lithoShapes } from './LithoColumn';

interface CurveDef {
  col: string;
  color: string;
  ax: number;
  dash?: string;
  width?: number;
  name: string;
  mode?: 'lines' | 'markers';
  fill?: 'tozerox' | 'tonextx';
  fillcolor?: string;
}

interface TrackDef {
  title: string;
  axes: Record<string, unknown>[];
  curves: CurveDef[];
  prov: string;
}

const C = tokens.curves;

function tracks(engineer: boolean, hasOverlayDT: boolean, ghostOn: boolean): TrackDef[] {
  // Track 1: Gamma Ray & Caliper (SPWLA Standard Track 1)
  const grCali: TrackDef = {
    title: 'GR · CALI',
    prov: 'curves.GR',
    axes: [
      { range: [0, 150] },
      { range: [6, 16], side: 'bottom', showgrid: false },
    ],
    curves: [
      { col: 'curves.GR', color: C.gr, ax: 0, width: 1.8, name: 'GR (API)', fill: 'tozerox', fillcolor: 'rgba(52,211,153,0.08)' },
      { col: 'curves.CALI', color: '#F87171', ax: 1, dash: 'dash', width: 1.2, name: 'Caliper (in)' },
    ],
  };

  // Track 2: Resistivity (SPWLA Standard Logarithmic Track 2)
  const res: TrackDef = {
    title: 'RES · Ω·m',
    prov: 'curves.RDEP',
    axes: [{ type: 'log', range: [Math.log10(0.5), Math.log10(80)] }],
    curves: [
      { col: 'trend.RDEP_NCT', color: C.nct, ax: 0, dash: 'dot', width: 1, name: 'R NCT' },
      { col: 'curves.RMED', color: C.rmed, ax: 0, width: 1.2, name: 'RMED' },
      { col: 'curves.RDEP', color: C.rdep, ax: 0, width: 2, name: 'RDEP (Deep)' },
    ],
  };

  // Track 3: Sonic Slowness (SPWLA Standard Track 3)
  const dt: TrackDef = {
    title: 'DT · µs/ft',
    prov: 'curves.DT',
    axes: [{ range: [130, 50] }],
    curves: [
      { col: 'trend.DT_NCT', color: C.nct, ax: 0, dash: 'dot', width: 1.2, name: 'DT NCT' },
      ...(hasOverlayDT && ghostOn
        ? [{ col: 'overlays.DT_SCN', color: C.dt, ax: 0, dash: 'dash', width: 1, name: 'DT scenario overlay' }]
        : []),
      { col: 'curves.DT', color: C.dt, ax: 0, width: 2, name: 'DT (Sonic)' },
    ],
  };

  // Track 4: SPWLA Geopressure & Mud Weight Window (User requested: MW, FG, PP, FIT)
  const pressWindow: TrackDef = {
    title: 'MW · PP · FG · FIT · ppg',
    prov: 'derived.PP',
    axes: [{ range: [10.2, 13.0] }],
    curves: [
      { col: 'derived.PP', color: C.pp, ax: 0, dash: 'dash', width: 2, name: 'Pore Pressure (PP)' },
      { col: 'derived.FIT', color: C.fit, ax: 0, dash: 'dot', width: 1.5, name: 'Shoe FIT (12.10)' },
      { col: 'mud.MW_IN_PPG', color: C.mw, ax: 0, width: 2.2, name: 'Active MW (11.20)' },
      { col: 'derived.ECD', color: C.ecd, ax: 0, width: 1.8, name: 'Annular ECD' },
    ],
  };


  // Track 5: Drilling Dynamics (ROP & DXC)
  const ropDxc: TrackDef = {
    title: 'ROP · dxc',
    prov: 'drilling.ROP',
    axes: [
      { range: [0, 50] },
      { range: [0.6, 1.4], side: 'bottom', showgrid: false },
    ],
    curves: [
      { col: 'drilling.ROP', color: C.gr, ax: 0, width: 1.8, name: 'ROP (m/hr)', fill: 'tozerox', fillcolor: 'rgba(52,211,153,0.06)' },
      { col: 'drilling.DXC', color: C.dxc, ax: 1, dash: 'dash', width: 1.2, name: 'dxc' },
    ],
  };

  // Track 6: Gas & Mud-Log
  const gas: TrackDef = {
    title: 'GAS · %',
    prov: 'mudlog.GAS_TOTAL',
    axes: [{ type: 'log', range: [Math.log10(0.1), Math.log10(10)] }],
    curves: [
      { col: 'mudlog.GAS_TOTAL', color: C.gas, ax: 0, width: 1.8, name: 'Total Gas' },
      { col: 'mudlog.CONN_GAS', color: C.conn, ax: 0, name: 'Conn. Gas', mode: 'markers' },
    ],
  };

  // Track 7: Bulk Density & Neutron Porosity (Engineer Mode)
  const dens: TrackDef = {
    title: 'RHOB · NPHI',
    prov: 'curves.RHOB',
    axes: [
      { range: [1.95, 2.95] },
      { range: [0.45, -0.15], side: 'bottom', showgrid: false },
    ],
    curves: [
      { col: 'curves.RHOB', color: C.rhob, ax: 0, width: 1.5, name: 'RHOB (g/cc)' },
      { col: 'curves.NPHI', color: C.nphi, ax: 1, dash: 'dash', width: 1.2, name: 'NPHI (v/v)' },
    ],
  };

  return engineer
    ? [grCali, res, dt, pressWindow, ropDxc, dens, gas]
    : [grCali, res, dt, pressWindow, ropDxc];
}

export default function LogTracks() {
  const { data, bundle, md, ghostOn, hazardOn } = useScenario();
  const { mode, theme } = useUi();
  const engineer = mode === 'engineer';
  const fig = useMemo(
    () =>
      data && bundle
        ? build(
            data,
            bundle.facts.stratigraphy,
            md,
            engineer,
            theme,
            ghostOn,
            hazardOn,
            bundle.facts.pressure.sand_top_m as number,
          )
        : null,
    [data, bundle, md, engineer, theme, ghostOn, hazardOn],
  );

  if (!fig) return null;

  return (
    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
      <div className="relative h-full" style={{ minWidth: engineer ? 1280 : 980 }}>
        {/* Input vs Output Grouped Headers inspired by SAFIR-03 */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex border-b border-line bg-app/80 backdrop-blur-xs text-[9px] uppercase font-bold tracking-wider"
          style={{ paddingLeft: 52 }}
        >
          <div
            className="flex items-center justify-center py-0.5 border-r border-line text-sky-400"
            style={{ width: `${(0.08 + (engineer ? 0.38 : 0.45)) * 100}%` }}
          >
            <span>📥 INPUT · Raw LWD Telemetry</span>
          </div>
          <div className="flex-1 flex items-center justify-center py-0.5 text-purple-400">
            <span>⚡ OUTPUT · Real-Time ML Inversion & Geopressure</span>
          </div>
        </div>

        <Plot
          data={fig.traces as never}
          layout={fig.layout as never}
          config={plotConfig}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
        <div className="pointer-events-none absolute left-0 right-0 top-4 flex" style={{ paddingLeft: 52 }}>
          {fig.headers.map((h) => (
            <div
              key={h.title}
              className="flex items-center justify-center gap-1"
              style={{ width: `${h.w * 100}%`, marginLeft: `${h.gap * 100}%` }}
            >
              <span className="text-[10px] font-medium tracking-wider text-muted">{h.title}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  h.prov === 'PUBLIC'
                    ? 'bg-ok'
                    : h.prov === 'MODEL_INFERENCE'
                    ? 'bg-purple-400'
                    : h.prov === 'DERIVED'
                    ? 'bg-accent'
                    : 'bg-faint'
                }`}
                title={h.prov}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function build(
  data: Columnar,
  units: Parameters<typeof lithoShapes>[2],
  md: number,
  engineer: boolean,
  theme: 'dark' | 'light',
  ghostOn: boolean,
  hazardOn: boolean,
  sandTop: number,
) {
  const t = tokens[theme];
  const upto = indexAt(data, md);
  const y = data.md_m.slice(0, upto + 1);
  const defs = tracks(engineer, 'overlays.DT_SCN' in data.columns, ghostOn);

  // SPWLA layout: ML Lithology column width = 0.08 (8%)
  const lithoW = 0.08;
  const gap = 0.009;
  const w = (1 - lithoW - gap * defs.length) / defs.length;

  const layout: Record<string, unknown> = {
    ...baseLayout(theme),
    yaxis: axis(theme, {
      range: [md + 30, md - 140],
      title: { text: 'MD (m)', font: { size: 10 } },
      tickformat: ',d',
      dtick: 20,
    }),
    xaxis: axis(theme, { domain: [0, lithoW], showticklabels: false, showgrid: false, range: [0, 1] }),
  };

  const traces: Record<string, unknown>[] = [];
  let axisN = 2;
  const headers: { title: string; w: number; gap: number; prov: Provenance }[] = [
    { title: 'ML LITH', w: lithoW, gap: 0, prov: 'MODEL_INFERENCE' },
  ];

  const hasRibbon = 'vol.cum_shale' in data.columns;
  if (hasRibbon) {
    const cumShale = series(data, 'vol.cum_shale', upto) as number[];
    const cumSand = series(data, 'vol.cum_sand', upto) as number[];
    const cumLime = series(data, 'vol.cum_lime', upto) as number[];
    const cumTotal = series(data, 'vol.cum_total', upto) as number[];

    const vShale = series(data, 'vol.SHALE', upto) as number[];
    const vSand = series(data, 'vol.SAND', upto) as number[];
    const vLime = series(data, 'vol.LIME', upto) as number[];
    const vPhie = series(data, 'vol.PHIE', upto) as number[];
    const lithoClasses = data.columns['ml.litho.class'] as string[];

    // Stacked Area Traces (Fill rightwards: Shale -> Sand -> Lime -> Porosity)
    // 1. Shale (0 -> cumShale): Forest Olive Green
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_shale',
      x: cumShale,
      y,
      xaxis: 'x',
      yaxis: 'y',
      fill: 'tozerox',
      fillcolor: '#4B5A4A',
      line: { color: '#3A4839', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 2. Sandstone (cumShale -> cumSand): Golden Amber Yellow
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_sand',
      x: cumSand,
      y,
      xaxis: 'x',
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#FBBF24',
      line: { color: '#D97706', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 3. Limestone (cumSand -> cumLime): Slate Blue / Carbonate
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'V_lime',
      x: cumLime,
      y,
      xaxis: 'x',
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: '#5B7EA6',
      line: { color: '#3B597B', width: 0.8 },
      hoverinfo: 'skip',
    });

    // 4. Effective Porosity (cumLime -> cumTotal=1.0): Sky Blue / Pore Fluid
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'PHIE',
      x: cumTotal,
      y,
      xaxis: 'x',
      yaxis: 'y',
      fill: 'tonextx',
      fillcolor: 'rgba(56, 189, 248, 0.45)',
      line: { color: '#0284C7', width: 0.8 },
      hoverinfo: 'skip',
    });

    // Hover inspector scatter trace overlay
    const lithoHoverText = y.map((depth, idx) => {
      const cls = lithoClasses[idx] ?? 'UNKNOWN';
      const sh = ((vShale[idx] ?? 0) * 100).toFixed(1);
      const sa = ((vSand[idx] ?? 0) * 100).toFixed(1);
      const li = ((vLime[idx] ?? 0) * 100).toFixed(1);
      const po = ((vPhie[idx] ?? 0) * 100).toFixed(1);
      return `<b>Depth:</b> ${depth.toFixed(1)} m<br><b>ML Facies:</b> ${cls}<br><b>V<sub>shale</sub>:</b> ${sh}%<br><b>V<sub>sand</sub>:</b> ${sa}%<br><b>V<sub>lime</sub>:</b> ${li}%<br><b>φ<sub>e</sub> (Por):</b> ${po}%`;
    });
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'ML Lithology Inversion',
      x: y.map(() => 0.5),
      y,
      xaxis: 'x',
      yaxis: 'y',
      marker: { size: 0.1, opacity: 0 },
      hovertext: lithoHoverText,
      hoverinfo: 'text',
    });
  } else {
    // Fallback: Invisible scatter trace for hover tooltips with facies only
    const lithoClasses = data.columns['ml.litho.class'] as string[];
    const lithoHoverText = y.map((depth, idx) => {
      const cls = lithoClasses[idx] ?? 'UNKNOWN';
      const p = (data.columns[`ml.litho.probs.${cls}`] as (number | null)[] | undefined)?.[idx];
      const conf = p == null ? '—' : `${Math.round(p * 100)}%`;
      return `<b>Depth:</b> ${depth.toFixed(1)} m<br><b>ML Facies:</b> ${cls}<br><b>P(${cls}):</b> ${conf}`;
    });
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'ML Lithology',
      x: y.map(() => 0.5),
      y,
      xaxis: 'x',
      yaxis: 'y',
      marker: { size: 0.1, opacity: 0 },
      hovertext: lithoHoverText,
      hoverinfo: 'text',
    });
  }

  defs.forEach((tr, k) => {
    const x0 = lithoW + gap * (k + 1) + w * k;
    const ids = tr.axes.map((a, j) => {
      const id = axisN++;
      layout[`xaxis${id}`] = axis(theme, {
        domain: [x0, x0 + w],
        side: 'top',
        tickfont: { size: 9 },
        nticks: 4,
        ...a,
        ...(j > 0 ? { overlaying: `x${id - j}`, showgrid: false, side: 'bottom' } : {}),
      });
      return id;
    });

    headers.push({ title: tr.title, w, gap, prov: (data.provenance[tr.prov] as Provenance) ?? 'SIMULATED' });

    tr.curves.forEach((c) => {
      if (!(c.col in data.columns)) return;
      const markers = c.mode === 'markers';
      traces.push({
        type: 'scatter',
        mode: markers ? 'markers' : 'lines',
        name: c.name,
        x: series(data, c.col, upto),
        y,
        xaxis: `x${ids[c.ax]}`,
        yaxis: 'y',
        connectgaps: false,
        fill: c.fill,
        fillcolor: c.fillcolor,
        line: { color: c.color, width: c.width ?? 1.6, ...(c.dash ? { dash: c.dash } : {}) }, // facts-ok: line px width
        ...(markers ? { marker: { color: c.color, size: 6, symbol: 'diamond', line: { color: t.bgPanel, width: 1 } } } : {}),
        hovertemplate: `${c.name} %{x:.2f}<extra></extra>`,
      });
    });
  });

  const shapes: Record<string, unknown>[] = [
    ...lithoShapes(data, upto, units, 'x', true),
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: md, y1: md, line: { color: t.accent, width: 1.5 } },
    {
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: md,
      y1: md + 30,
      fillcolor: t.bgApp,
      opacity: 0.35,
      line: { width: 0 },
      layer: 'below',
    },
  ];

  const annotations: Record<string, unknown>[] = [
    ...lithoAnnotations(data, upto, 'x'),
    {
      xref: 'paper',
      yref: 'y',
      x: 1,
      y: md,
      xanchor: 'right',
      yanchor: 'bottom',
      showarrow: false,
      text: `BIT ${md.toLocaleString('en-IN', { minimumFractionDigits: 1 })} m`,
      font: { color: t.accent, size: 10 },
    },
  ];

  for (const u of units) {
    if (u.top_m <= md) {
      shapes.push({
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: lithoW,
        x1: 1,
        y0: u.top_m,
        y1: u.top_m,
        line: { color: t.lineSubtle, width: 1, dash: 'dot' },
      });
      annotations.push({
        xref: 'paper',
        yref: 'y',
        x: lithoW + 0.004,
        y: u.top_m,
        xanchor: 'left',
        yanchor: 'top',
        showarrow: false,
        text: u.id,
        font: { size: 9, color: t.textMuted },
      });
    }
  }

  if (hazardOn && md < sandTop) {
    shapes.push({
      type: 'line',
      xref: 'paper',
      yref: 'y',
      x0: lithoW,
      x1: 1,
      y0: sandTop,
      y1: sandTop,
      line: { color: t.risk, width: 1.2, dash: 'dash' },
    });
    annotations.push({
      xref: 'paper',
      yref: 'y',
      x: 1,
      y: sandTop,
      xanchor: 'right',
      yanchor: 'top',
      showarrow: false,
      text: `SAND TOP · forecast · ${(sandTop - md).toFixed(0)} m ahead`,
      font: { size: 10, color: t.risk },
    });
  }

  layout.shapes = shapes;
  layout.annotations = annotations;
  layout.uirevision = `${engineer}-${theme}`;
  return { traces, layout, headers };
}
