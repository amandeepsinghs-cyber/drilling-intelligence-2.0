/**
 * PressureWindow — PP · FG · shoe FIT · OBG · MW · ECD vs depth, with the drilling window shaded,
 * the forecast PP ahead of the bit, the ghost "if unchanged" MW, and offset events as hazard markers.
 */
import { useMemo } from 'react';
import type { ScenarioBundle, Columnar } from '../../api/types';
import { axis, baseLayout } from '../../design/plotlyTemplate';
import { tokens } from '../../design/tokens';
import { indexAt, series } from '../../lib/frames';
import Plot, { plotConfig } from '../../lib/Plot';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import DistanceToHazard from './DistanceToHazard';
import { ghostTrace } from './GhostCurve';

export default function PressureWindow() {
  const { data, bundle, md, ghostOn, hazardOn, approvedMw } = useScenario();
  const theme = useUi((s) => s.theme);
  const fig = useMemo(() => (data && bundle ? build(data, bundle, md, theme, ghostOn, hazardOn, approvedMw) : null),
    [data, bundle, md, theme, ghostOn, hazardOn, approvedMw]);
  if (!fig) return null;
  return (
    <div className="absolute inset-0">
      <Plot data={fig.traces as never} layout={fig.layout as never} config={plotConfig} useResizeHandler style={{ width: '100%', height: '100%' }} />
      <DistanceToHazard />
      <Legend theme={theme} />
    </div>
  );
}

function Legend({ theme }: { theme: 'dark' | 'light' }) {
  const c = tokens.curves, t = tokens[theme];
  const items: [string, string, string?][] = [['PP', c.pp], ['FG', c.fg, 'dot'], ['FIT', c.fit], ['MW', c.mw], ['ECD', c.ecd], ['OBG', c.obg], ['If unchanged', t.ghost, 'dash']];
  return (
    <div className="pointer-events-none absolute bottom-2 left-14 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-panel/80 px-2 py-1 text-[10px] text-muted backdrop-blur">
      {items.map(([k, col, dash]) => (
        <span key={k} className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={col} strokeWidth="2" strokeDasharray={dash === 'dot' ? '1 3' : dash === 'dash' ? '4 3' : undefined} /></svg>
          {k}
        </span>
      ))}
    </div>
  );
}

function build(data: Columnar, b: ScenarioBundle, md: number, theme: 'dark' | 'light', ghostOn: boolean, hazardOn: boolean, approved: boolean) {
  const t = tokens[theme], c = tokens.curves, f = b.facts;
  const upto = indexAt(data, md);
  const yAll = data.md_m, yD = yAll.slice(0, upto + 1), yA = yAll.slice(upto);
  const fit = f.casing.last_shoe.fit_ppg, shoe = f.casing.last_shoe.md_m;
  const col = (k: string) => data.columns[k] as number[];
  const line = (name: string, x: (number | null)[], y: number[], color: string,
    extra: { line?: Record<string, unknown>; opacity?: number } = {}) => ({
    type: 'scatter', mode: 'lines', name, x, y, opacity: extra.opacity, line: { color, width: 2, ...extra.line },
    hovertemplate: `${name} %{x:.2f} ppg<extra></extra>`,
  });
  const traces: Record<string, unknown>[] = [
    line('OBG', col('derived.OBG'), yAll, c.obg, { line: { width: 1.2 } }),
    line('FG', col('derived.FG'), yAll, c.fg, { line: { dash: 'dot', width: 1.5 } }),
    // window shading: PP (drilled) → FIT
    line('PP', series(data, 'derived.PP', upto), yD, c.pp, { line: { width: 2.4 } }),
    { type: 'scatter', mode: 'lines', x: yD.map(() => fit), y: yD, fill: 'tonextx', fillcolor: t.window, line: { color: c.fit, width: 2 },
      name: 'Shoe FIT', hovertemplate: `FIT ${fit.toFixed(2)} ppg<extra></extra>` },
    { type: 'scatter', mode: 'lines', x: [fit, fit], y: [shoe, yAll[yAll.length - 1]], line: { color: c.fit, width: 1, dash: 'dot' }, hoverinfo: 'skip' },
    line('ECD', series(data, 'derived.ECD', upto), yD, c.ecd, { line: { width: 2 } }),
    line('MW', series(data, 'mud.MW_IN_PPG', upto), yD, c.mw, { line: { width: 2.4, shape: 'hv' } }),
  ];
  if (hazardOn) {
    traces.push(line('PP forecast', col('derived.PP').slice(upto), yA, c.pp, { line: { dash: 'dash', width: 2 }, opacity: 0.85 }));
    if (approved) traces.push(line('MW plan', col('mud.MW_IN_PPG').slice(upto), yA, c.mw, { line: { dash: 'dot', width: 1.6, shape: 'hv' }, opacity: 0.7 }));
  }
  if (ghostOn) traces.push(ghostTrace(data, Math.max(0, indexAt(data, f.mud.weight_up_location_m) - 1), theme));

  const shapes: Record<string, unknown>[] = [
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: md, y1: md, line: { color: t.accent, width: 1.5 } },
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: shoe, y1: shoe, line: { color: t.lineSubtle, width: 1 } },
  ];
  const annotations: Record<string, unknown>[] = [
    { xref: 'x', yref: 'y', x: fit, y: shoe + 8, xanchor: 'left', yanchor: 'top', showarrow: false,
      text: `${f.casing.last_shoe.size} shoe · FIT ${fit.toFixed(2)}`, font: { size: 10, color: c.fit } },
    { xref: 'paper', yref: 'y', x: 0.01, y: md, xanchor: 'left', yanchor: 'bottom', showarrow: false, text: 'BIT', font: { size: 10, color: t.accent } },
  ];
  for (const o of b.offsets.offsets) {
    const inc = o.incident;
    if (!inc?.md_m || (inc.type !== 'KICK' && inc.type !== 'LOSSES')) continue;
    const kick = inc.type === 'KICK';
    if (!hazardOn && md < inc.md_m) continue;
    shapes.push({ type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: inc.md_m - 1.5, y1: inc.md_m + 1.5,
      fillcolor: kick ? t.hazard : 'rgba(245,158,11,0.10)', line: { width: 0 }, layer: 'below' });
    annotations.push({ xref: 'paper', yref: 'y', x: 0.99, y: inc.md_m, xanchor: 'right', yanchor: kick ? 'bottom' : 'top', showarrow: false,
      text: `${o.id} ${kick ? 'kick' : 'losses'} · ${inc.md_m.toLocaleString('en-IN')} m`, font: { size: 10, color: kick ? t.risk : t.warn } });
  }
  const layout = {
    ...baseLayout(theme),
    margin: { l: 52, r: 10, t: 30, b: 28 },
    xaxis: axis(theme, { range: [10.6, 14.3], side: 'top', title: { text: 'ppg (EMW)', font: { size: 10 }, standoff: 4 }, dtick: 0.5 }),
    yaxis: axis(theme, { range: [yAll[yAll.length - 1] + 5, shoe - 25], tickformat: ',d', title: { text: 'MD (m)', font: { size: 10 } } }),
    shapes, annotations, uirevision: theme,
  };
  return { traces, layout };
}
