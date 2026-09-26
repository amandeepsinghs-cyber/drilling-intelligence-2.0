/** Canvas colours per theme. Canvas cannot read Tailwind classes, so tracks take colours from here. */
import { tokens } from '../../design/tokens';
import { useUi } from '../../state/uiStore';

export interface Palette {
  bg: string; panel: string; grid: string; gridMajor: string; text: string; muted: string; faint: string;
  accent: string; ok: string; warn: string; risk: string; ml: string; undrilled: string;
  curves: typeof tokens.curves; litho: typeof tokens.litho;
}

const dark: Palette = {
  bg: '#0B0F14', panel: '#111821', grid: 'rgba(139,155,171,0.10)', gridMajor: 'rgba(139,155,171,0.22)',
  text: '#E6EDF3', muted: '#8B9BAB', faint: '#5B6B7B',
  accent: '#22D3EE', ok: '#34D399', warn: '#F59E0B', risk: '#EF4444', ml: '#C084FC', undrilled: 'rgba(11,15,20,0.55)',
  curves: tokens.curves, litho: tokens.litho,
};
const light: Palette = {
  bg: '#F5F7FA', panel: '#FFFFFF', grid: 'rgba(74,91,107,0.10)', gridMajor: 'rgba(74,91,107,0.25)',
  text: '#0B1520', muted: '#4A5B6B', faint: '#7A8A9A',
  accent: '#0891B2', ok: '#059669', warn: '#D97706', risk: '#DC2626', ml: '#9333EA', undrilled: 'rgba(245,247,250,0.6)',
  curves: tokens.curves, litho: tokens.litho,
};

export function usePalette(): Palette {
  return useUi((s) => s.theme) === 'light' ? light : dark;
}
