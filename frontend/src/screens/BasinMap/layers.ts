/** deck.gl layers for the basin map — shared by the Google Maps overlay and the offline fallback. */
import { ScatterplotLayer, TextLayer, LineLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { WellFeature } from '../../api/types';
import { OFFLINE_BASEMAP_GEOJSON, GEOGRAPHIC_LABELS, type GeographicLabel } from './coastline';

type RGBA = [number, number, number, number];
const COL: Record<string, RGBA> = {
  LIVE: [34, 211, 238, 255],
  COMPLETED: [139, 155, 171, 255],
  OFFSET_KICK: [239, 68, 68, 255],
  OFFSET_LOSSES: [245, 158, 11, 255],
  REFERENCE_CARBONATE: [139, 155, 171, 200],
  AUTHENTICITY: [52, 211, 153, 255],
};

interface LabelConfig {
  offset: [number, number];
  anchor: 'start' | 'end' | 'middle';
  baseline: 'top' | 'bottom' | 'center';
  text: string;
}

/** Decluttered label configuration to prevent overlap in the tight Mahanadi offshore cluster */
function getWellLabelConfig(w: WellFeature): LabelConfig {
  const id = w.properties.id;
  switch (id) {
    case 'MN-SM-DW-01':
      return {
        offset: [16, -18],
        anchor: 'start',
        baseline: 'bottom',
        text: '★ MN-SM-DW-01 (LIVE · 4,120 m)', // facts-ok: canonical checkpoint depth
      };
    case 'MN-DW-01':
      return {
        offset: [-16, -8],
        anchor: 'end',
        baseline: 'center',
        text: 'MN-DW-01 · 3.2 km (ref)', // facts-ok: canonical offset distance
      };
    case 'MN-DW-02':
      return {
        offset: [16, 2],
        anchor: 'start',
        baseline: 'center',
        text: 'MN-DW-02 · kick 4,195 m', // facts-ok: canonical offset kick depth
      };
    case 'MN-DW-03':
      return {
        offset: [16, 22],
        anchor: 'start',
        baseline: 'top',
        text: 'MN-DW-03 · losses 4,222 m', // facts-ok: canonical offset loss depth
      };
    case 'IODP-U1445':
      return {
        offset: [14, 0],
        anchor: 'start',
        baseline: 'center',
        text: 'IODP Exp. 353 Site U1445 (real log)',
      };
    case 'MH-112':
      return {
        offset: [14, 0],
        anchor: 'start',
        baseline: 'center',
        text: 'MH-112 · Mumbai High (ref)',
      };
    default:
      return {
        offset: [14, 0],
        anchor: 'start',
        baseline: 'center',
        text: id + (w.properties.incident && w.properties.incident_md_m ? ` · ${w.properties.incident.toLowerCase()} ${w.properties.incident_md_m} m` : ''),
      };
  }
}

export function wellLayers(wells: WellFeature[], pulse: number, selected: string | null, light: boolean) {
  const text: RGBA = light ? [11, 21, 32, 255] : [230, 237, 243, 255];
  const live = wells.filter((w) => w.properties.status === 'LIVE');
  const liveW = live[0];
  const links = liveW ? wells.filter((w) => w.properties.status.startsWith('OFFSET') || w.properties.status === 'COMPLETED') : [];

  return [
    new LineLayer<WellFeature>({
      id: 'offset-links',
      data: links,
      getSourcePosition: () => liveW!.geometry.coordinates,
      getTargetPosition: (d) => d.geometry.coordinates,
      getColor: [139, 155, 171, 90],
      getWidth: 1,
      widthUnits: 'pixels',
    }),
    new ScatterplotLayer<WellFeature>({
      id: 'live-pulse',
      data: live,
      getPosition: (d) => d.geometry.coordinates,
      radiusUnits: 'pixels',
      getRadius: 8 + pulse * 22,
      getFillColor: [34, 211, 238, Math.round(90 * (1 - pulse))],
      stroked: false,
      updateTriggers: { getRadius: pulse, getFillColor: pulse },
    }),
    new ScatterplotLayer<WellFeature>({
      id: 'wells',
      data: wells,
      getPosition: (d) => d.geometry.coordinates,
      radiusUnits: 'pixels',
      pickable: true,
      getRadius: (d) => (d.properties.status === 'LIVE' ? 8 : d.properties.id === selected ? 7 : 5.5),
      getFillColor: (d) => COL[d.properties.status] ?? [200, 200, 200, 255],
      stroked: true,
      getLineColor: light ? [255, 255, 255, 255] : [11, 15, 20, 255],
      lineWidthUnits: 'pixels',
      getLineWidth: 2,
      updateTriggers: { getRadius: selected },
    }),
    new TextLayer<WellFeature>({
      id: 'decluttered-labels',
      data: wells,
      getPosition: (d) => d.geometry.coordinates,
      getText: (d) => getWellLabelConfig(d).text,
      getSize: (d) => (d.properties.status === 'LIVE' ? 12.5 : 11.5),
      getColor: (d) => {
        if (d.properties.status === 'LIVE') return [34, 211, 238, 255];
        if (d.properties.status === 'OFFSET_KICK') return [248, 113, 113, 255];
        if (d.properties.status === 'OFFSET_LOSSES') return [251, 191, 36, 255];
        return text;
      },
      getPixelOffset: (d) => getWellLabelConfig(d).offset,
      getTextAnchor: (d) => getWellLabelConfig(d).anchor,
      getAlignmentBaseline: (d) => getWellLabelConfig(d).baseline,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 600,
      background: true,
      getBackgroundColor: light ? [255, 255, 255, 220] : [11, 15, 20, 210],
      backgroundPadding: [5, 3],
    }),
  ];
}

/** Bundled offline basemap layers: coastline, shelf edge, block outline & geographic labels */
export function offlineBasemapLayers(light: boolean) {
  const landFill: RGBA = light ? [235, 240, 245, 255] : [18, 26, 38, 255];
  const coastLine: RGBA = light ? [175, 190, 205, 255] : [55, 85, 115, 255];
  const shelfLine: RGBA = light ? [14, 165, 233, 160] : [56, 189, 248, 130];
  const blockFill: RGBA = light ? [14, 165, 233, 25] : [34, 211, 238, 22];
  const blockLine: RGBA = light ? [14, 165, 233, 180] : [34, 211, 238, 170];

  return [
    new GeoJsonLayer({
      id: 'offline-coastline',
      data: OFFLINE_BASEMAP_GEOJSON,
      filled: true,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: (f: { properties?: { type?: string } }) => (f?.properties?.type === 'bathymetry' ? 1.4 : 1.6),
      getFillColor: (f: { properties?: { type?: string } }) => {
        if (f?.properties?.type === 'block') return blockFill;
        if (f?.properties?.type === 'land') return landFill;
        return [0, 0, 0, 0];
      },
      getLineColor: (f: { properties?: { type?: string } }) => {
        if (f?.properties?.type === 'block') return blockLine;
        if (f?.properties?.type === 'bathymetry') return shelfLine;
        return coastLine;
      },
      getLineDashArray: (f: { properties?: { type?: string } }) => {
        if (f?.properties?.type === 'bathymetry') return [4, 3];
        if (f?.properties?.type === 'block') return [6, 4];
        return [0, 0];
      },
      dashJustified: true,
    }),
    new TextLayer<GeographicLabel>({
      id: 'geographic-labels',
      data: GEOGRAPHIC_LABELS,
      getPosition: (d) => d.coordinates,
      getText: (d) => d.text,
      getSize: (d) => d.size,
      getColor: (d) => d.color,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
    }),
  ];
}

export function graticule(): LineLayer<{ s: [number, number]; t: [number, number] }> {
  const lines: { s: [number, number]; t: [number, number] }[] = [];
  for (let lon = 80; lon <= 92; lon += 1) lines.push({ s: [lon, 14], t: [lon, 23] });
  for (let lat = 14; lat <= 23; lat += 1) lines.push({ s: [80, lat], t: [92, lat] });
  return new LineLayer({
    id: 'graticule',
    data: lines,
    getSourcePosition: (d) => d.s,
    getTargetPosition: (d) => d.t,
    getColor: [30, 42, 54, 180],
    getWidth: 1,
  });
}
