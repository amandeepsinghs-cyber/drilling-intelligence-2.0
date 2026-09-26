declare module 'plotly.js-dist-min' {
  import Plotly from 'plotly.js';
  export default Plotly;
}
declare module 'react-plotly.js/factory' {
  import type { ComponentType } from 'react';
  import type { PlotParams } from 'react-plotly.js';
  const createPlotlyComponent: (plotly: unknown) => ComponentType<PlotParams>;
  export default createPlotlyComponent;
}
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}
