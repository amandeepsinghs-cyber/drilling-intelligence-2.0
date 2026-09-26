/** Track scales (display ranges, not facts) and column names for the SAFIR-style multi-log.
 * Column meanings: docs/data/column_contract.md. */
import { tokens } from '../../../design/tokens';

const c = tokens.curves;
export const COLORS = {
  gr: c.gr, cali: '#94A3B8', bit: '#64748B', rhob: c.rhob, nphi: c.nphi, pef: '#A78BFA',
  rshal: '#FDBA74', rmed: c.rmed, rdep: c.rdep, sw: '#60A5FA', sxo: '#93C5FD', phie: '#E6EDF3',
  hc: '#34D399', water: '#3B82F6', sand: '#E3BE5C', shaleGr: '#6B7A5E', crossGas: 'rgba(250,204,21,0.55)', crossShale: 'rgba(100,116,139,0.35)',
};

// facts-ok scale: all ranges below are display scales, as printed on a paper log header.
export const SCALE = {
  GR: [0, 150] as const,
  CALI: [8, 18] as const,
  RHOB: [1.95, 2.95] as const,
  NPHI: [0.45, -0.15] as const,
  PEF: [0, 10] as const,
  RES: [0.2, 200] as const,
  SW: [1, 0] as const,
  PHIE: [0.5, 0] as const,
};

export type TrackId = 'gr' | 'depth' | 'dn' | 'res' | 'sw' | 'phie' | 'litho' | 'cuttings';
export const BOARD_TRACKS: TrackId[] = ['gr', 'depth', 'dn', 'res', 'litho', 'cuttings'];
export const ENGINEER_TRACKS: TrackId[] = ['gr', 'depth', 'dn', 'res', 'sw', 'phie', 'litho', 'cuttings'];
