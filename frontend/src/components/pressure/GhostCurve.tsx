/** GhostCurve — the "if unchanged" path (MW stays 11.20 ppg) drawn ahead of the bit once T3 fires. */
import type { Columnar } from '../../api/types';
import { tokens } from '../../design/tokens';

export function ghostTrace(data: Columnar, fromIdx: number, theme: 'dark' | 'light') {
  const y = data.md_m.slice(fromIdx);
  const x = (data.columns['ghost.MW_UNCHANGED'] as number[]).slice(fromIdx);
  return {
    type: 'scatter', mode: 'lines', name: 'MW if unchanged', x, y,
    line: { color: tokens[theme].ghost, width: 2, dash: 'dash', shape: 'hv' },
    hovertemplate: 'MW if unchanged %{x:.2f} ppg<extra></extra>',
  };
}
