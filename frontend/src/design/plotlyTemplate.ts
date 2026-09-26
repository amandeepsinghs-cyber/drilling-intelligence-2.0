/** Plotly templates (ADR-002): transparent paper, subtle grid, mono ticks, reversed depth axis. */
import { tokens } from './tokens';

export type Theme = 'dark' | 'light';

export function palette(theme: Theme) {
  const t = tokens[theme];
  return { ...t, curves: tokens.curves };
}

export function baseLayout(theme: Theme) {
  const t = tokens[theme];
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'JetBrains Mono, monospace', color: t.textMuted, size: 11 },
    margin: { l: 52, r: 8, t: 36, b: 8 },
    showlegend: false,
    hovermode: 'y unified' as const,
    hoverlabel: { bgcolor: t.bgPanel, bordercolor: t.lineSubtle, font: { color: t.textPrimary, family: 'JetBrains Mono', size: 11 } },
    dragmode: false as const,
  };
}

export function axis(theme: Theme, extra: Record<string, unknown> = {}) {
  const t = tokens[theme];
  return {
    gridcolor: t.lineSubtle, zeroline: false, linecolor: t.lineSubtle, tickfont: { size: 10 },
    showspikes: false, fixedrange: true, ...extra,
  };
}

/** @deprecated kept for compatibility with Phase-0 imports */
export const plotlyDark = baseLayout('dark');
