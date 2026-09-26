/** scenarioStore — frames, bit depth, playback, approvals, fired triggers (SDD §6, §12.4). */
import { create } from 'zustand';
import type { Columnar, ScenarioBundle } from '../api/types';
import { getFrames, getScenario } from '../api/client';

export type TriggerId = 'T3_PRESSURE_RAMP' | 'T8_OFFSET_DEPTH' | 'T9_DRILLING_BREAK';

interface ScenarioState {
  bundle: ScenarioBundle | null;
  data: Columnar | null;
  source: 'api' | 'mock' | null;
  md: number;
  playing: boolean;
  speed: number;            // metres of hole per second of demo time
  approvedMw: boolean;
  ropCapped: boolean;
  fired: Partial<Record<TriggerId, boolean>>;
  ghostOn: boolean;
  hazardOn: boolean;
  load: () => Promise<void>;
  setMd: (md: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  approve: () => void;
  capRop: () => void;
  markFired: (t: TriggerId) => void;
  reset: () => void;
}

const START_MD = 4120;

export const useScenario = create<ScenarioState>((set, get) => ({
  bundle: null,
  data: null,
  source: null,
  md: START_MD,
  playing: false,
  speed: 2,
  approvedMw: false,
  ropCapped: false,
  fired: {},
  ghostOn: false,
  hazardOn: false,
  load: async () => {
    if (get().data) return;
    const s = await getScenario();
    const f = await getFrames(s.data.facts.well.id);
    set({ bundle: s.data, data: f.data, source: f.source === 'api' && s.source === 'api' ? 'api' : 'mock' });
  },
  setMd: (md) => {
    const d = get().data;
    if (!d) return;
    const { top_m, base_m, step_m } = d.meta.grid;
    const snapped = Math.round(Math.min(base_m, Math.max(top_m, md)) / step_m) * step_m;
    set({ md: +snapped.toFixed(1) });
  },
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  approve: () => set({ approvedMw: true }),
  capRop: () => set({ ropCapped: true }),
  markFired: (t) =>
    set((s) => ({
      fired: { ...s.fired, [t]: true },
      ghostOn: s.ghostOn || t === 'T3_PRESSURE_RAMP',
      hazardOn: s.hazardOn || t === 'T3_PRESSURE_RAMP',
    })),
  reset: () => set({ md: START_MD, playing: false, approvedMw: false, ropCapped: false, fired: {}, ghostOn: false, hazardOn: false }),
}));
