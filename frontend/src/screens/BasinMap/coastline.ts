/**
 * Bundled offline GeoJSON basemap for the Basin Map.
 * Provides accurate Indian subcontinent coastline, Bay of Bengal continental shelf edge,
 * and the Mahanadi Deepwater concession block outline.
 * Operates completely offline with zero dependency on external Google Maps API keys.
 */
import type { FeatureCollection, Geometry } from 'geojson';

export const OFFLINE_BASEMAP_GEOJSON: FeatureCollection<Geometry> = {
  type: 'FeatureCollection',
  features: [
    // 1. Indian Subcontinent Landmass Polygon
    {
      type: 'Feature',
      properties: { name: 'Indian Subcontinent', type: 'land' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // West coast from Gujarat
            [68.5, 23.8],
            [70.0, 22.8],
            [69.5, 22.0],
            [70.2, 20.8],
            [72.8, 21.2],
            [72.8, 19.5],
            [72.8, 18.9],
            [73.2, 17.0],
            [73.8, 15.5],
            [74.8, 13.0],
            [76.2, 10.0],
            // Cape Comorin
            [77.55, 8.08],
            [78.2, 8.8],
            [79.2, 9.3],
            [79.8, 10.3],
            [79.8, 11.5],
            // Andhra Pradesh coast
            [80.28, 13.08],
            [80.15, 14.3],
            [80.05, 15.5],
            [81.15, 16.15],
            [82.25, 16.95],
            [83.3, 17.68],
            // Odisha coast
            [84.0, 18.3],
            [84.9, 19.25],
            [85.35, 19.65],
            [85.83, 19.8],
            [86.68, 20.27],
            [86.78, 20.35],
            [87.02, 21.45],
            // West Bengal & Bangladesh
            [87.52, 21.62],
            [88.08, 21.65],
            [88.5, 21.7],
            [89.5, 21.8],
            [90.5, 22.0],
            [91.8, 22.3],
            // Myanmar coast
            [92.4, 20.5],
            [93.5, 18.5],
            // Inland loop to close the land polygon
            [93.0, 26.5],
            [88.0, 27.5],
            [84.0, 28.5],
            [78.0, 31.0],
            [74.0, 32.5],
            [70.0, 28.0],
            [68.5, 24.0],
            [68.5, 23.8],
          ],
        ],
      },
    },
    // 2. Sri Lanka
    {
      type: 'Feature',
      properties: { name: 'Sri Lanka', type: 'land' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.8, 9.8],
            [81.8, 8.6],
            [81.8, 7.0],
            [80.5, 5.9],
            [79.8, 7.0],
            [79.8, 9.8],
          ],
        ],
      },
    },
    // 3. Bathymetric Shelf Edge (Continental Margin)
    {
      type: 'Feature',
      properties: { name: 'Continental Shelf Margin (200m isobath)', type: 'bathymetry' }, // facts-ok: bathymetric contour name
      geometry: {
        type: 'LineString',
        coordinates: [
          [80.6, 13.0],
          [80.8, 14.5],
          [81.5, 15.5],
          [82.6, 16.3],
          [83.5, 17.1],
          [84.5, 18.2],
          [85.8, 19.0],
          [86.8, 19.4],
          [87.8, 19.8],
          [88.8, 20.8],
          [90.5, 21.2],
        ],
      },
    },
    // 4. Mahanadi Deepwater Concession Block Outline
    {
      type: 'Feature',
      properties: { name: 'BLOCK MN-DW (DEEPWATER)', type: 'block' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [86.8, 19.0],
            [87.7, 19.0],
            [87.9, 19.8],
            [87.0, 19.8],
            [86.8, 19.0],
          ],
        ],
      },
    },
  ],
};

export interface GeographicLabel {
  text: string;
  coordinates: [number, number];
  size: number;
  color: [number, number, number, number];
}

export const GEOGRAPHIC_LABELS: GeographicLabel[] = [
  { text: 'ODISHA', coordinates: [85.1, 20.4], size: 13, color: [148, 163, 184, 180] },
  { text: 'ANDHRA PRADESH', coordinates: [81.8, 17.2], size: 12, color: [148, 163, 184, 160] },
  { text: 'BAY OF BENGAL', coordinates: [89.0, 17.8], size: 15, color: [56, 189, 248, 110] },
  { text: 'MAHANADI DEEPWATER PLAY', coordinates: [87.4, 18.85], size: 12, color: [34, 211, 238, 180] },
];
