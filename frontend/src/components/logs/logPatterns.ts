/**
 * LogPatterns — SVG pattern definitions and style helpers for SAFIR-03 composite log displays.
 * Standard SPWLA/AAPG patterns:
 * - Shale: horizontal dashes / lines (#4B5A4A)
 * - Siltstone: fine stipple dots on tan (#7C7456)
 * - Sandstone: stippled black/amber dots on golden yellow (#FBBF24 / #D9B45A)
 * - Limestone: brick pattern on carbonate blue (#5B7EA6)
 * - Cuttings in transit: diagonal grey hatching band (#64748B)
 */

export interface PatternDef {
  id: string;
  shape: 'horizontal-lines' | 'dots' | 'brick' | 'diagonal-hatch';
  fill: string;
  stroke?: string;
  size: number;
}

export const LITHO_PATTERNS: Record<string, PatternDef> = {
  SHALE: {
    id: 'pattern-shale',
    shape: 'horizontal-lines',
    fill: '#4B5A4A',
    stroke: '#344133',
    size: 8,
  },
  SILTSTONE: {
    id: 'pattern-siltstone',
    shape: 'dots',
    fill: '#7C7456',
    stroke: '#58523A',
    size: 6,
  },
  SAND: {
    id: 'pattern-sand',
    shape: 'dots',
    fill: '#FBBF24',
    stroke: '#B45309',
    size: 6,
  },
  LIMESTONE: {
    id: 'pattern-limestone',
    shape: 'brick',
    fill: '#5B7EA6',
    stroke: '#334D6B',
    size: 10,
  },
  TRANSIT: {
    id: 'pattern-cuttings-transit',
    shape: 'diagonal-hatch',
    fill: '#1E293B',
    stroke: '#94A3B8',
    size: 10,
  },
};

/** Plotly marker / fill pattern configurations */
export const PLOTLY_PATTERNS = {
  SHALE: { shape: '-', fillmode: 'overlay', fgcolor: 'rgba(0,0,0,0.35)', size: 4, solidity: 0.3 },
  SILTSTONE: { shape: '.', fillmode: 'overlay', fgcolor: 'rgba(0,0,0,0.35)', size: 4, solidity: 0.3 },
  SAND: { shape: '.', fillmode: 'overlay', fgcolor: 'rgba(0,0,0,0.45)', size: 4, solidity: 0.35 },
  LIMESTONE: { shape: '+', fillmode: 'overlay', fgcolor: 'rgba(255,255,255,0.4)', size: 5, solidity: 0.3 },
  TRANSIT: { shape: '/', fillmode: 'overlay', fgcolor: 'rgba(148, 163, 184, 0.6)', size: 6, solidity: 0.4 },
} as const;
