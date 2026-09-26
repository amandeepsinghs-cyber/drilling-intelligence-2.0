/** Slim Plotly component (plotly.js-dist-min via factory) — one shared instance across the app. */
import Plotly from 'plotly.js-dist-min';
import type { ComponentProps } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

const RawPlot = createPlotlyComponent(Plotly);

/** react-plotly swallows render errors unless onError is given — always surface them. */
export default function Plot(props: ComponentProps<typeof RawPlot>) {
  return <RawPlot onError={(e: unknown) => console.error('[Plotly]', e)} {...props} />;
}

export const plotConfig = { displayModeBar: false, responsive: true, staticPlot: false, scrollZoom: false } as const;
