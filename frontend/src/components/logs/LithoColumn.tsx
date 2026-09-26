/** LithoColumn — SPWLA-standard ML Lithology column with facies shapes and labels. */
import type { Columnar, Unit } from '../../api/types';
import { tokens } from '../../design/tokens';

type Shape = Record<string, unknown>;
type Annotation = Record<string, unknown>;

export function lithoShapes(data: Columnar, upto: number, units: Unit[], xref: string, showFuture: boolean): Shape[] {
  const md = data.md_m;
  const cls = data.columns['ml.litho.class'] as string[];
  const hasRibbon = 'vol.cum_shale' in data.columns;
  const shapes: Shape[] = [];

  // If no ribbon data, fall back to discrete facies blocks
  if (!hasRibbon) {
    let start = 0;
    for (let i = 1; i <= upto + 1; i++) {
      if (i === upto + 1 || cls[i] !== cls[start]) {
        const top = md[start];
        const bot = md[Math.min(i, upto)];
        const lithClass = cls[start] as keyof typeof tokens.litho;
        shapes.push({
          type: 'rect', xref, yref: 'y', x0: 0, x1: 1, y0: top, y1: bot,
          fillcolor: tokens.litho[lithClass] ?? '#555',
          line: { color: 'rgba(0,0,0,0.3)', width: 1 },
          layer: 'below',
        });
        start = i;
      }
    }
  }

  // Ahead of bit / future prognosis
  if (showFuture) {
    for (const u of units) {
      if (u.base_m <= md[upto]) continue;
      shapes.push({
        type: 'rect', xref, yref: 'y', x0: 0, x1: 1, y0: Math.max(u.top_m, md[upto]), y1: u.base_m,
        fillcolor: tokens.litho[u.litho_class] ?? '#555',
        opacity: 0.22,
        line: { color: 'rgba(255,255,255,0.1)', width: 1, dash: 'dot' },
        layer: 'below',
      });
    }
  }
  return shapes;
}

export function lithoAnnotations(data: Columnar, upto: number, xref: string): Annotation[] {
  const md = data.md_m;
  const cls = data.columns['ml.litho.class'] as string[];
  const annos: Annotation[] = [];
  let start = 0;

  for (let i = 1; i <= upto + 1; i++) {
    if (i === upto + 1 || cls[i] !== cls[start]) {
      const top = md[start];
      const bot = md[Math.min(i, upto)];
      const mid = (top + bot) / 2;
      const lithClass = cls[start];

      if (bot - top >= 10) {
        annos.push({
          xref,
          yref: 'y',
          x: 0.5,
          y: mid,
          text: `<b>${lithClass}</b>`,
          showarrow: false,
          font: { size: 9, color: '#FFFFFF' },
          xanchor: 'center',
          yanchor: 'middle',
          textangle: 0,
        });
      }
      start = i;
    }
  }
  return annos;
}

export default function LithoLegend() {
  return (
    <div className="flex items-center gap-2.5 text-[10px] text-muted">
      <span className="rounded bg-purple-500/15 px-1 py-0.5 text-[9px] font-semibold text-purple-400 border border-purple-500/30">
        ML Petrophysics · 0–100%
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm border border-black/30 bg-[#4B5A4A]" />
        shale
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm border border-black/30 bg-[#FBBF24]" />
        sandstone
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm border border-black/30 bg-[#5B7EA6]" />
        limestone
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm border border-black/30 bg-[#38BDF8]" />
        porosity (φe)
      </span>
    </div>
  );
}

