/** uiStore — mode, theme, caption language, overlays (SDD §12.4). */
import { create } from 'zustand';

export type Overlay = 'memo' | 'audit' | 'whatif' | 'wcr' | 'phone' | 'help';
type Lang = 'both' | 'en' | 'hi';

interface UiState {
  mode: 'board' | 'engineer';
  theme: 'dark' | 'light';
  lang: Lang;
  view3d: boolean;
  overlays: Record<Overlay, boolean>;
  toast: { text: string; tone: 'ok' | 'warn' | 'risk' | 'info'; id: number } | null;
  setMode: (m: UiState['mode']) => void;
  toggleMode: () => void;
  toggleTheme: () => void;
  cycleLang: () => void;
  toggle3d: () => void;
  open: (o: Overlay) => void;
  close: (o: Overlay) => void;
  toggle: (o: Overlay) => void;
  closeAll: () => void;
  notify: (text: string, tone?: 'ok' | 'warn' | 'risk' | 'info') => void;
}

const none: Record<Overlay, boolean> = { memo: false, audit: false, whatif: false, wcr: false, phone: false, help: false };

const getSavedTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sagar_drishti_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

const initialTheme = getSavedTheme();
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(initialTheme);
}

export const useUi = create<UiState>((set) => ({
  mode: 'board',
  theme: initialTheme,
  lang: 'both',
  view3d: false,
  overlays: { ...none },
  toast: null,
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === 'board' ? 'engineer' : 'board' })),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('sagar_drishti_theme', theme);
      }
      return { theme };
    }),
  cycleLang: () => set((s) => ({ lang: s.lang === 'both' ? 'en' : s.lang === 'en' ? 'hi' : 'both' })),
  toggle3d: () => set((s) => ({ view3d: !s.view3d })),
  open: (o) => set((s) => ({ overlays: { ...s.overlays, [o]: true } })),
  close: (o) => set((s) => ({ overlays: { ...s.overlays, [o]: false } })),
  toggle: (o) => set((s) => ({ overlays: { ...s.overlays, [o]: !s.overlays[o] } })),
  closeAll: () => set({ overlays: { ...none } }),
  notify: (text, tone = 'info') => set({ toast: { text, tone, id: Date.now() } }),
}));
