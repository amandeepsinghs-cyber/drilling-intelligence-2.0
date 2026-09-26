/**
 * turnMachine — run-of-show orchestration (SDD §6, data/scenario/turns.yaml).
 * Phase 1: drives the mock agent script. Phase 4: the same side-effects are triggered by Gemini Live
 * tool calls, so the UI contract (stores, ledger, overlays) does not change.
 */
import { buildScript } from '../mocks/agentScript';
import { chime } from '../lib/chime';
import { indexAt, num } from '../lib/frames';
import { useAgent } from './agentStore';
import { useLedger } from './ledgerStore';
import { useScenario, type TriggerId } from './scenarioStore';
import { useUi } from './uiStore';
import { liveClient } from '../live/liveClient';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let busy = false;
let watchdog = false;

export const isWatchdogArmed = () => watchdog;

function snapshot(md: number): Record<string, number | null> {
  const { data } = useScenario.getState();
  if (!data) return {};
  const i = indexAt(data, md);
  const pick = (c: string) => num(data, c, i);
  return {
    md_m: md, mw_ppg: pick('mud.MW_IN_PPG'), ecd_ppg: pick('derived.ECD'), pp_ppg: pick('derived.PP'),
    overbal_psi: pick('derived.OVERBAL_PSI'), ecd_fit_margin_ppg: pick('derived.ECD_FIT_MARGIN'),
    p_kick_30m: pick('ml.p_kick'), rop_m_hr: pick('drilling.ROP'), dt_us_ft: pick('curves.DT'),
    conn_gas_pct: pick('mudlog.CONN_GAS'),
  };
}

/** Apply the state a turn assumes, silently (used when the presenter jumps turns during rehearsal). */
function ensurePrereqs(n: number) {
  const s = useScenario.getState();
  const f = s.bundle!.facts;
  const L = useLedger.getState();
  if (n >= 2) watchdog = true;
  if (n >= 4 && !s.fired.T3_PRESSURE_RAMP) s.markFired('T3_PRESSURE_RAMP');
  if (n >= 7 && !s.approvedMw) {
    s.approve();
    L.append({ id: 'MEMO', kind: 'MEMO', md: f.mud.weight_up_location_m, title: f.ids.memo_id, actor: 'agent', basis: snapshot(f.mud.weight_up_location_m) });
    L.append({ id: 'APPROVAL', kind: 'APPROVAL', md: f.mud.weight_up_location_m, title: `${f.ids.memo_id} approved`, actor: 'Presenter (Drilling Superintendent)', basis: snapshot(f.mud.weight_up_location_m) });
  }
  if (n >= 9 && !s.fired.T8_OFFSET_DEPTH) s.markFired('T8_OFFSET_DEPTH');
  if (n >= 10 && !s.fired.T9_DRILLING_BREAK) { s.markFired('T9_DRILLING_BREAK'); s.capRop(); }
}

async function speak(id: string, text: string) {
  const A = useAgent.getState();
  A.setVoice('speaking');
  const words = text.split(/\s+/).length;
  await sleep(Math.min(9000, Math.max(1800, words * 110)));
  A.update(id, {});
}

export async function runTurn(n: number, opts: { jump?: boolean } = {}) {
  const S = useScenario.getState();
  const { bundle, data } = S;
  if (!bundle || !data || busy) return;
  const turn = bundle.turns.find((t) => t.n === n);
  if (!turn) return;
  busy = true;
  try {
    const script = buildScript(bundle, data)[n];
    const f = bundle.facts;
    const A = useAgent.getState();
    const L = useLedger.getState();
    const U = useUi.getState();
    if (opts.jump) {
      ensurePrereqs(n);
      S.pause();
      S.setMd(turn.md_m);
    }
    if (turn.trigger) {
      S.markFired(turn.trigger as TriggerId);
      chime(n === 8 ? 'info' : 'alert');
      A.setVoice('alert');
      L.append({ id: turn.trigger, kind: 'TRIGGER', md: turn.md_m, title: turn.trigger.replace(/_/g, ' '), actor: 'watchdog', basis: snapshot(turn.md_m) });
      await sleep(500);
      if (liveClient.isConnected()) {
        liveClient.sendProactiveTrigger(turn.trigger, turn.md_m, script.agent.en);
      }
    }
    if (script.presenter) {
      A.setVoice('listening');
      A.push({ role: 'presenter', en: script.presenter.en, hi: script.presenter.hi, md: turn.md_m, tools: [], citations: [], turn: n });
      await sleep(700);
    }
    A.setVoice('thinking');
    const id = A.push({
      role: 'agent', proactive: turn.leader === 'agent' && !!turn.trigger, en: script.agent.en, hi: script.agent.hi, md: turn.md_m,
      tools: turn.tools.map((name) => ({ name, status: 'running' as const })), citations: [], turn: n,
    });
    await sleep(turn.tools.length ? 900 : 350);
    A.update(id, { tools: turn.tools.map((name) => ({ name, status: 'done' as const })), citations: script.citations ?? [] });

    // ── side effects (the same ones Gemini tool calls will trigger in Phase 4) ──
    if (n === 1) watchdog = true;
    if (n === 5) {
      L.append({ id: 'MEMO', kind: 'MEMO', md: turn.md_m, title: f.ids.memo_id, actor: 'agent', basis: snapshot(turn.md_m),
        citations: (script.citations ?? []).map((c) => c.doc_id) });
      U.open('memo');
    }
    if (n === 6) {
      S.approve();
      L.append({ id: 'APPROVAL', kind: 'APPROVAL', md: turn.md_m, title: `${f.ids.memo_id} approved`, actor: 'Presenter (Drilling Superintendent)', basis: snapshot(turn.md_m) });
      U.notify(`${f.ids.memo_id} approved — basis frozen`, 'ok');
    }
    if (n === 7) {
      const labels = ['Mud chemist work order', 'RTOC alert', 'Email · Drilling Manager', 'Phone push'];
      L.append({ id: 'DISPATCH', kind: 'DISPATCH', md: turn.md_m, title: 'MOC fan-out', actor: 'agent',
        channels: f.ids.dispatch_ids.map((cid, i) => ({ id: cid, channel: labels[i] ?? cid, status: 'queued' as const })) });
      U.close('memo');
      U.open('phone');
      f.ids.dispatch_ids.forEach((cid, i) => {
        setTimeout(() => useLedger.getState().setChannelStatus('DISPATCH', cid, 'sent'), 500 + i * 350);
        setTimeout(() => useLedger.getState().setChannelStatus('DISPATCH', cid, 'delivered'), 1600 + i * 400);
      });
      setTimeout(() => useUi.getState().close('phone'), 7000);
    }
    if (n === 9) {
      setTimeout(() => {
        useScenario.getState().capRop();
        useLedger.getState().append({ id: 'ROP_CAP', kind: 'ROP_CAP', md: turn.md_m, title: `ROP cap ${f.drilling.rop_cap_m_hr} m/hr + sweep`, actor: 'Driller (accepted)', basis: snapshot(turn.md_m) });
        useUi.getState().notify(`ROP capped at ${f.drilling.rop_cap_m_hr} m/hr`, 'ok');
      }, 2500);
    }
    if (n === 10) {
      L.append({ id: 'WCR', kind: 'WCR', md: turn.md_m, title: f.ids.wcr_id, actor: 'agent' });
      L.append({ id: 'WRITEBACK', kind: 'WRITEBACK', md: turn.md_m, title: '2 lessons → knowledge base', actor: 'agent' });
      U.open('wcr');
    }
    await speak(id, script.agent.en);
    A.setVoice('idle');
    if (n === 4) { busy = false; await sleep(1200); await runTurn(5); return; }
    if (n === 8) { busy = false; await sleep(600); useScenario.getState().play(); return; }
  } finally {
    busy = false;
  }
}

/** Depth-triggered proactive turns while playing. Returns the md to clamp to (or null). */
export function checkTriggers(prevMd: number, nextMd: number): { clampTo: number; turn: number } | null {
  const S = useScenario.getState();
  const f = S.bundle?.facts;
  if (!f) return null;
  const t = f.triggers;
  const crosses = (m: number) => prevMd < m && nextMd >= m;
  const t3 = t.T3_PRESSURE_RAMP.md_m as number, t8 = t.T8_OFFSET_DEPTH.md_m as number, t9 = t.T9_DRILLING_BREAK.md_m as number;
  if (!S.fired.T3_PRESSURE_RAMP && crosses(t3)) return { clampTo: t3, turn: 3 };
  if (S.fired.T3_PRESSURE_RAMP && !S.approvedMw && nextMd > t3) return { clampTo: t3, turn: -1 };
  if (!S.fired.T8_OFFSET_DEPTH && crosses(t8)) return { clampTo: t8, turn: 8 };
  if (!S.fired.T9_DRILLING_BREAK && crosses(t9)) return { clampTo: t9, turn: 9 };
  const td = f.well.live_interval_m.td;
  if (crosses(td)) return { clampTo: td, turn: -2 };
  return null;
}

export function resetShow() {
  watchdog = false;
  busy = false;
  useScenario.getState().reset();
  useAgent.getState().clear();
  useLedger.getState().clear();
  useUi.getState().closeAll();
}
