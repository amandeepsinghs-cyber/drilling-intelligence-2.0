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

  const callouts = useMemo(() => {
    if (!data || !bundle) return null;
    const f = bundle.facts;
    const sandTop = f.reservoir.sand_top_m;
    const triggerMd = (f.triggers.T3_PRESSURE_RAMP.md_m as number) - 12;
    if (md < triggerMd && !hazardOn) return null;

    const iSand = indexAt(data, sandTop);
    const iNow = indexAt(data, md);
    const ppSand = data.columns['derived.PP']?.[iSand] as number;
    const mwActive = (data.columns['mud.MW_IN_PPG']?.[iNow] as number | undefined) ?? (approvedMw ? f.mud.weighted.mw_ppg : f.mud.initial.mw_ppg);
    const fit = f.casing.last_shoe.fit_ppg;
    const ecdNow = data.columns['derived.ECD']?.[iNow] as number;
    const kickMargin = ppSand - mwActive;
    const lossMargin = fit - ecdNow;

    return {
      sandTop,
      kickMargin,
      lossMargin,
      underbalanced: kickMargin > 0,
      nearLoss: lossMargin < 0.25,
    };
  }, [data, bundle, md, approvedMw, hazardOn]);

  if (!fig) return null;
  return (
    <div className="absolute inset-0">
      <Plot data={fig.traces as never} layout={fig.layout as never} config={plotConfig} useResizeHandler style={{ width: '100%', height: '100%' }} />
      <DistanceToHazard />

      {/* F5 Two Margin Callouts for Board Members (Active when bit >= 4,160 m or hazardOn) */}
      {callouts && (
        <div className="pointer-events-none absolute left-14 top-2 z-10 flex flex-col gap-1.5 max-w-[calc(100%-210px)] text-[11px] font-bold">
          <div className={`flex items-center gap-2 rounded-md px-2.5 py-1 backdrop-blur shadow-sm border truncate ${
            callouts.underbalanced ? 'border-red-500/60 bg-red-950/50 text-red-300' : 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
          }`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
            <span className="truncate">Kick margin @ {callouts.sandTop.toLocaleString('en-IN')} m: PP − MW = {callouts.kickMargin > 0 ? `+${callouts.kickMargin.toFixed(2)}` : callouts.kickMargin.toFixed(2)} ppg {callouts.underbalanced ? '(UNDERBALANCED)' : '(SAFE)'}</span>
          </div>

          <div className={`flex items-center gap-2 rounded-md px-2.5 py-1 backdrop-blur shadow-sm border truncate ${
            callouts.nearLoss ? 'border-amber-500/60 bg-amber-950/50 text-amber-300' : 'border-sky-500/60 bg-sky-950/50 text-sky-300'
          }`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
            <span className="truncate">Loss margin: FIT − ECD = {callouts.lossMargin > 0 ? `+${callouts.lossMargin.toFixed(2)}` : callouts.lossMargin.toFixed(2)} ppg {callouts.nearLoss ? '(TIGHT WINDOW)' : '(SAFE)'}</span>
          </div>
        </div>
      )}

      {bundle && <Legend theme={theme} bundle={bundle} />}
    </div>
  );
}

function Legend({ theme, bundle }: { theme: 'dark' | 'light'; bundle: ScenarioBundle }) {
  const c = tokens.curves, t = tokens[theme], f = bundle.facts;
  const items: [string, string, string?][] = [
    ['PP', c.pp],
    ['FG', c.fg, 'dot'],
    ['FIT', c.fit],
    ['MW', c.mw],
    ['ECD', c.ecd],
    [`ML Rec MW (${f.mud.weighted.mw_ppg.toFixed(2)})`, '#22D3EE', 'dash'],
    ['OBG', c.obg],
    ['If unchanged', t.ghost, 'dash'],
  ];
  return (
    <div className="pointer-events-none absolute bottom-1.5 left-14 right-4 flex items-center justify-between overflow-x-auto whitespace-nowrap rounded-md bg-panel/90 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur border border-line">
      <div className="flex items-center gap-x-3 gap-y-0.5">
        {items.map(([k, col, dash]) => (
          <span key={k} className="flex items-center gap-1.5">
            <svg width="14" height="3"><line x1="0" y1="1.5" x2="14" y2="1.5" stroke={col} strokeWidth="2" strokeDasharray={dash === 'dot' ? '1 2' : dash === 'dash' ? '3 2' : undefined} /></svg>
            <span className="truncate">{k}</span>
          </span>
        ))}
      </div>
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

  const ppFull = col('derived.PP');
  const ecdFull = col('derived.ECD');
  const ghostFull = col('ghost.MW_UNCHANGED') ?? yAll.map(() => f.mud.initial.mw_ppg);
  const fgFull = col('derived.FG');

  const traces: Record<string, unknown>[] = [
    line('OBG', col('derived.OBG'), yAll, c.obg, { line: { width: 1.2 } }),
    line('FG', fgFull, yAll, c.fg, { line: { dash: 'dot', width: 1.5 } }),
    // window shading: PP (drilled) → FIT
    line('PP', series(data, 'derived.PP', upto), yD, c.pp, { line: { width: 2.4 } }),
    { type: 'scatter', mode: 'lines', x: yD.map(() => fit), y: yD, fill: 'tonextx', fillcolor: t.window, line: { color: c.fit, width: 2 },
      name: 'Shoe FIT', hovertemplate: `FIT ${fit.toFixed(2)} ppg<extra></extra>` },
    { type: 'scatter', mode: 'lines', x: [fit, fit], y: [shoe, yAll[yAll.length - 1]], line: { color: c.fit, width: 1, dash: 'dot' }, hoverinfo: 'skip' },
    line('ECD', series(data, 'derived.ECD', upto), yD, c.ecd, { line: { width: 2 } }),
    line('MW', series(data, 'mud.MW_IN_PPG', upto), yD, c.mw, { line: { width: 2.4, shape: 'hv' } }),
  ];

  // 1. Shaded Kick Zone (PP > if-unchanged MW): Red 22% opacity
  // Uses ghost.MW_UNCHANGED (or initial unweighted MW) so it is visibly open before weight-up approval!
  const kickX1: (number | null)[] = [];
  const kickX2: (number | null)[] = [];
  const kickY: number[] = [];
  let kickZoneMidY: number | null = null;
  let kickZoneMidX: number | null = null;

  for (let i = 0; i < yAll.length; i++) {
    const yVal = yAll[i];
    const ppVal = ppFull[i];
    const mwUnchanged = ghostFull[i] ?? f.mud.initial.mw_ppg;
    if (ppVal !== undefined && mwUnchanged !== undefined && ppVal > mwUnchanged) {
      kickX1.push(mwUnchanged);
      kickX2.push(ppVal);
      kickY.push(yVal);
      if (kickZoneMidY === null && yVal >= f.reservoir.sand_top_m) {
        kickZoneMidY = yVal;
        kickZoneMidX = (mwUnchanged + ppVal) / 2;
      }
    }
  }
  if (kickY.length > 0) {
    traces.push({
      type: 'scatter', mode: 'lines', x: kickX1, y: kickY, line: { width: 0 }, hoverinfo: 'skip', showlegend: false,
    });
    traces.push({
      type: 'scatter', mode: 'lines', x: kickX2, y: kickY, fill: 'tonextx', fillcolor: 'rgba(239, 68, 68, 0.22)',
      line: { color: 'rgba(239, 68, 68, 0.55)', width: 1.2 }, name: 'KICK SIDE', hovertemplate: 'Kick Hazard (PP > MW unchanged)<extra></extra>',
    });
  }

  // 2. Shaded Loss Zone (along whole look-ahead): amber band [limit - 0.10, limit] (limit = min(FG, FIT))
  // plus red fill where ECD exceeds limit
  const lossX1: (number | null)[] = [];
  const lossX2: (number | null)[] = [];
  const lossY: number[] = [];
  const lookAheadBase = Math.min(md + f.ml.pp_lookahead_m, yAll[yAll.length - 1]);
  const iStartLook = indexAt(data, md);
  const iEndLook = indexAt(data, lookAheadBase);
  let lossZoneMidY: number | null = null;
  let lossZoneMidX: number | null = null;

  for (let i = iStartLook; i <= iEndLook; i++) {
    const yVal = yAll[i];
    const limit = Math.min(fgFull[i] ?? fit, fit);
    lossX1.push(limit - 0.10);
    lossX2.push(limit);
    lossY.push(yVal);
    if (lossZoneMidY === null && i === Math.floor((iStartLook + iEndLook) / 2)) {
      lossZoneMidY = yVal;
      lossZoneMidX = limit - 0.05;
    }
  }
  if (lossY.length > 0) {
    traces.push({
      type: 'scatter', mode: 'lines', x: lossX1, y: lossY, line: { width: 0 }, hoverinfo: 'skip', showlegend: false,
    });
    traces.push({
      type: 'scatter', mode: 'lines', x: lossX2, y: lossY, fill: 'tonextx', fillcolor: 'rgba(245, 158, 11, 0.28)',
      line: { color: 'rgba(245, 158, 11, 0.6)', width: 1.2 }, name: 'LOSS SIDE', hovertemplate: 'Loss Hazard Band [FIT − 0.10, FIT]<extra></extra>',
    });
  }

  // Over-limit ECD red fill (if ECD exceeds limit)
  const ecdOverX1: (number | null)[] = [];
  const ecdOverX2: (number | null)[] = [];
  const ecdOverY: number[] = [];
  for (let i = 0; i <= upto; i++) {
    const yVal = yD[i];
    const ecdVal = ecdFull[i];
    const limit = Math.min(fgFull[i] ?? fit, fit);
    if (ecdVal !== undefined && ecdVal > limit) {
      ecdOverX1.push(limit);
      ecdOverX2.push(ecdVal);
      ecdOverY.push(yVal);
    }
  }
  if (ecdOverY.length > 0) {
    traces.push({
      type: 'scatter', mode: 'lines', x: ecdOverX1, y: ecdOverY, line: { width: 0 }, hoverinfo: 'skip', showlegend: false,
    });
    traces.push({
      type: 'scatter', mode: 'lines', x: ecdOverX2, y: ecdOverY, fill: 'tonextx', fillcolor: 'rgba(239, 68, 68, 0.35)',
      line: { color: 'rgba(239, 68, 68, 0.8)', width: 1.5 }, name: 'ECD LOSS EXCEEDANCE', hovertemplate: 'ECD > Fracture Limit<extra></extra>',
    });
  }

  // 3. ML Recommended MW (Bold Dashed Teal Line @ 11.65 ppg)
  const mlMwVal = f.mud.weighted.mw_ppg;
  const mlMwSg = f.mud.weighted.mw_sg;
  traces.push({
    type: 'scatter',
    mode: 'lines',
    name: 'ML Recommended MW',
    x: yAll.map(() => mlMwVal),
    y: yAll,
    line: { color: '#22D3EE', width: 2.4, dash: 'dash' },
    hovertemplate: `ML recommended ${mlMwVal.toFixed(2)} ppg (${mlMwSg.toFixed(2)} SG)<extra></extra>`,
  });

  if (hazardOn) {
    traces.push(line('PP forecast', col('derived.PP').slice(upto), yA, c.pp, { line: { dash: 'dash', width: 2 }, opacity: 0.85 }));
    if (approved) traces.push(line('MW plan', col('mud.MW_IN_PPG').slice(upto), yA, c.mw, { line: { dash: 'dot', width: 1.6, shape: 'hv' }, opacity: 0.7 }));
  }
  if (ghostOn) traces.push(ghostTrace(data, Math.max(0, indexAt(data, f.mud.weight_up_location_m) - 1), theme));

  // 4. Look-Ahead Band: bit -> bit + 50 m shaded light grey
  const shapes: Record<string, unknown>[] = [
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: md, y1: md, line: { color: t.accent, width: 1.8 } },
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: shoe, y1: shoe, line: { color: t.lineSubtle, width: 1 } },
    {
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: md,
      y1: lookAheadBase,
      fillcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      line: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)', width: 1, dash: 'dot' },
      layer: 'below',
    },
  ];

  const annotations: Record<string, unknown>[] = [
    { xref: 'x', yref: 'y', x: fit, y: shoe + 8, xanchor: 'left', yanchor: 'top', showarrow: false,
      text: `${f.casing.last_shoe.size} shoe · FIT ${fit.toFixed(2)}`, font: { size: 12, color: c.fit } },
    { xref: 'paper', yref: 'y', x: 0.01, y: md, xanchor: 'left', yanchor: 'bottom', showarrow: false, text: 'BIT', font: { size: 12, color: t.accent } },
    { xref: 'paper', yref: 'y', x: 0.99, y: (md + lookAheadBase) / 2, xanchor: 'right', yanchor: 'middle', showarrow: false, text: `next ${f.ml.pp_lookahead_m} m`, font: { size: 12, color: t.textMuted } },
  ];

  // In-zone prominent labels for KICK SIDE and LOSS SIDE (>= 12 px)
  if (kickZoneMidX !== null && kickZoneMidY !== null) {
    annotations.push({
      xref: 'x',
      yref: 'y',
      x: kickZoneMidX,
      y: kickZoneMidY,
      text: '<b>KICK SIDE</b>',
      font: { size: 12, color: '#EF4444' },
      showarrow: false,
      xanchor: 'center',
      yanchor: 'middle',
    });
  }

  if (lossZoneMidX !== null && lossZoneMidY !== null) {
    annotations.push({
      xref: 'x',
      yref: 'y',
      x: lossZoneMidX - 0.04,
      y: lossZoneMidY,
      text: '<b>LOSS SIDE</b>',
      font: { size: 12, color: '#F59E0B' },
      showarrow: false,
      xanchor: 'right',
      yanchor: 'middle',
    });
  }

  for (const o of b.offsets.offsets) {
    const inc = o.incident;
    if (!inc?.md_m || (inc.type !== 'KICK' && inc.type !== 'LOSSES')) continue;
    const kick = inc.type === 'KICK';
    if (!hazardOn && md < inc.md_m) continue;
    shapes.push({ type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: inc.md_m - 1.5, y1: inc.md_m + 1.5,
      fillcolor: kick ? t.hazard : 'rgba(245,158,11,0.10)', line: { width: 0 }, layer: 'below' });
    annotations.push({ xref: 'paper', yref: 'y', x: 0.99, y: inc.md_m, xanchor: 'right', yanchor: kick ? 'bottom' : 'top', showarrow: false,
      text: `${o.id} ${kick ? 'kick' : 'losses'} · ${inc.md_m.toLocaleString('en-IN')} m`, font: { size: 12, color: kick ? t.risk : t.warn } });
  }

  const layout = {
    ...baseLayout(theme),
    margin: { l: 52, r: 10, t: 30, b: 28 },
    xaxis: axis(theme, { range: [10.6, 14.3], side: 'top', title: { text: 'ppg (EMW)', font: { size: 12 }, standoff: 4 }, dtick: 0.5 }),
    yaxis: axis(theme, { range: [yAll[yAll.length - 1] + 5, shoe - 25], tickformat: ',d', title: { text: 'MD (m)', font: { size: 12 } } }),
    shapes, annotations, uirevision: theme,
  };
  return { traces, layout };
}

