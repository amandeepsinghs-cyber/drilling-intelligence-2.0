/** scenarioStore — frames, bit depth, playback, approvals, fired triggers (SDD §6, §12.4). */
import { create } from 'zustand';
import type { Columnar, ScenarioBundle } from '../api/types';
import { getFrames, getScenario } from '../api/client';

export type TriggerId = 'T3_PRESSURE_RAMP' | 'T8_OFFSET_DEPTH' | 'T9_DRILLING_BREAK';
export type ActId = 'act1' | 'act2' | 'act3' | 'act4';
export type HeroId = 'log' | 'pressure' | 'actions' | 'loss_report';
export type KpiId = 'depth' | 'litho' | 'mw' | 'pp' | 'overbal' | 'ecdfit' | 'pkick' | 'rop';

export interface ActConfig {
  id: ActId;
  actNumber: number;
  title: string;
  subtitle: string;
  /** Board takeaway card text (checklist §A). */
  takeaway: string;
  /** Depth the stage snaps to when the presenter enters the act (Shift+N). */
  targetMd: number;
  depthRange: [number, number];
  hero: HeroId;
  kpis: KpiId[];
}

/** v0.5 run of show: one message per act, one hero panel per act (checklist §A, build.md §0.1). */
export const ACTS: ActConfig[] = [
  {
    id: 'act1', actNumber: 1, title: 'See the rock before the mudlog', subtitle: 'ML lithology at the bit · borehole Q&A',
    takeaway: 'ML reads the rock at the bit — before the cuttings reach the surface.',
    targetMd: 4120, depthRange: [4000, 4145], hero: 'log', kpis: ['depth', 'litho', 'rop', 'mw', 'pp', 'pkick'],
  },
  {
    id: 'act2', actNumber: 2, title: 'The window closes', subtitle: 'Offset-well memory · ML mud weight',
    takeaway: 'It remembers every offset well and warns before the kick — with the mud weight to fix it.',
    targetMd: 4160, depthRange: [4145, 4172], hero: 'pressure', kpis: ['depth', 'mw', 'pp', 'overbal', 'pkick', 'ecdfit'],
  },
  {
    id: 'act3', actNumber: 3, title: 'Human decides, agent executes', subtitle: 'MOC approval · fan-out · phone',
    takeaway: 'Nothing touches the well without human approval — then it is done in seconds.',
    targetMd: 4172, depthRange: [4172, 4172], hero: 'actions', kpis: ['depth', 'mw', 'pp', 'overbal', 'pkick', 'ecdfit'],
  },
  {
    id: 'act4', actNumber: 4, title: 'Other side of the window + the report', subtitle: 'Loss prevention · shift notes → WCR',
    takeaway: 'It prevents the opposite failure too — and hands you the first-draft WCR.',
    targetMd: 4195, depthRange: [4172, 4460], hero: 'loss_report', kpis: ['depth', 'litho', 'rop', 'mw', 'ecdfit', 'overbal'],
  },
];

/** Fallback act for the current 11-turn script; Crescendo v2 (F2) adds an explicit `act` field per turn. */
const LEGACY_ACT_OF_TURN: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4 };

export function actOfTurn(t: { n: number; act?: number }): ActId {
  const a = t.act ?? LEGACY_ACT_OF_TURN[t.n] ?? 4; // facts-ok: act index (last act)
  return `act${Math.min(4, Math.max(1, a))}` as ActId;
}

export function turnsOfAct<T extends { n: number; act?: number }>(turns: T[], id: ActId): T[] {
  return turns.filter((t) => actOfTurn(t) === id);
}

interface ScenarioState {
  bundle: ScenarioBundle | null;
  data: Columnar | null;
  source: 'api' | 'mock' | null;
  md: number;
  playing: boolean;
  speed: number;            // rig-time multiplier on the real ROP curve: 1 = real time, 60 = one rig-hour per demo minute
  approvedMw: boolean;
  ropCapped: boolean;
  fired: Partial<Record<TriggerId, boolean>>;
  ghostOn: boolean;
  hazardOn: boolean;
  /** Explicit active act (acts 2 and 3 share the 4,172 m hold, so depth alone can't decide). */
  act: ActId;
  /** Act whose takeaway card is showing, or null. */
  takeaway: ActId | null;
  load: () => Promise<void>;
  setMd: (md: number) => void;
  jumpToAct: (actId: ActId) => void;
  setAct: (actId: ActId) => void;
  showTakeaway: (actId: ActId | null) => void;
  currentAct: () => ActConfig;
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
  speed: 60,
  approvedMw: false,
  ropCapped: false,
  fired: {},
  ghostOn: false,
  hazardOn: false,
  act: 'act1',
  takeaway: null,
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
  /** Low-level: snap depth + set act. Use turnMachine.enterAct() for prerequisites (approval, triggers). */
  jumpToAct: (actId) => {
    const act = ACTS.find((a) => a.id === actId);
    if (act) {
      get().setMd(act.targetMd);
      set({ act: actId, takeaway: null });
    }
  },
  setAct: (act) => set((s) => (s.act === act ? s : { act, takeaway: null })),
  showTakeaway: (takeaway) => set({ takeaway }),
  currentAct: () => ACTS.find((a) => a.id === get().act) ?? ACTS[0],
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
  reset: () => set({ md: START_MD, playing: false, approvedMw: false, ropCapped: false, fired: {}, ghostOn: false, hazardOn: false, act: 'act1', takeaway: null }),
}));
