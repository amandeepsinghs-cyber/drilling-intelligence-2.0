/** deck.gl layers for the basin map — shared by the Google Maps overlay and the offline fallback. */
import { ScatterplotLayer, TextLayer, LineLayer } from '@deck.gl/layers';
import type { WellFeature } from '../../api/types';

type RGBA = [number, number, number, number];
const COL: Record<string, RGBA> = {
  LIVE: [34, 211, 238, 255], COMPLETED: [139, 155, 171, 255], OFFSET_KICK: [239, 68, 68, 255],
  OFFSET_LOSSES: [245, 158, 11, 255], REFERENCE_CARBONATE: [139, 155, 171, 200], AUTHENTICITY: [52, 211, 153, 255],
};

export function wellLayers(wells: WellFeature[], pulse: number, selected: string | null, light: boolean) {
  const text: RGBA = light ? [11, 21, 32, 255] : [230, 237, 243, 255];
  const live = wells.filter((w) => w.properties.status === 'LIVE');
  const liveW = live[0];
  const links = liveW ? wells.filter((w) => w.properties.status.startsWith('OFFSET') || w.properties.status === 'COMPLETED') : [];
  return [
    new LineLayer<WellFeature>({
      id: 'offset-links', data: links, getSourcePosition: () => liveW!.geometry.coordinates, getTargetPosition: (d) => d.geometry.coordinates,
      getColor: [139, 155, 171, 90], getWidth: 1, widthUnits: 'pixels',
    }),
    new ScatterplotLayer<WellFeature>({
      id: 'live-pulse', data: live, getPosition: (d) => d.geometry.coordinates, radiusUnits: 'pixels',
      getRadius: 8 + pulse * 22, getFillColor: [34, 211, 238, Math.round(90 * (1 - pulse))], stroked: false,
      updateTriggers: { getRadius: pulse, getFillColor: pulse },
    }),
    new ScatterplotLayer<WellFeature>({
      id: 'wells', data: wells, getPosition: (d) => d.geometry.coordinates, radiusUnits: 'pixels', pickable: true,
      getRadius: (d) => (d.properties.status === 'LIVE' ? 8 : d.properties.id === selected ? 7 : 5.5),
      getFillColor: (d) => COL[d.properties.status] ?? [200, 200, 200, 255],
      stroked: true, getLineColor: light ? [255, 255, 255, 255] : [11, 15, 20, 255], lineWidthUnits: 'pixels', getLineWidth: 2,
      updateTriggers: { getRadius: selected },
    }),
    new TextLayer<WellFeature>({
      id: 'labels', data: wells, getPosition: (d) => d.geometry.coordinates,
      getText: (d) => d.properties.id + (d.properties.incident && d.properties.incident_md_m ? ` · ${d.properties.incident.toLowerCase()} ${d.properties.incident_md_m} m` : ''),
      getSize: 12, getColor: (d) => (d.properties.status === 'LIVE' ? [34, 211, 238, 255] : text), getPixelOffset: [12, 0],
      getTextAnchor: 'start', getAlignmentBaseline: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
      background: true, getBackgroundColor: light ? [255, 255, 255, 200] : [11, 15, 20, 180], backgroundPadding: [4, 2],
    }),
  ];
}

export function graticule(): LineLayer<{ s: [number, number]; t: [number, number] }> {
  const lines: { s: [number, number]; t: [number, number] }[] = [];
  for (let lon = 80; lon <= 92; lon += 1) lines.push({ s: [lon, 14], t: [lon, 23] });
  for (let lat = 14; lat <= 23; lat += 1) lines.push({ s: [80, lat], t: [92, lat] });
  return new LineLayer({ id: 'graticule', data: lines, getSourcePosition: (d) => d.s, getTargetPosition: (d) => d.t, getColor: [30, 42, 54, 255], getWidth: 1 });
}
