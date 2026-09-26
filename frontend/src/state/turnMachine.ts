/**
 * turnMachine — run-of-show orchestration (SDD §6, data/scenario/turns.yaml).
 * Phase 1: drives the mock agent script. Phase 4: the same side-effects are triggered by Gemini Live
 * tool calls, so the UI contract (stores, ledger, overlays) does not change.
 */
import { buildScript } from '../mocks/agentScript';
import { chime } from '../lib/chime';
import { indexAt, num } from '../lib/frames';
import { useAgent } from './agentStore';
import { useLedger, toChannels, type Evidence, type LedgerChannel, type ShiftLine } from './ledgerStore';
import { actOfTurn, turnsOfAct, useScenario, type ActId, type TriggerId } from './scenarioStore';
import { useUi } from './uiStore';
import { liveClient } from '../live/liveClient';
import { postTool } from '../api/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let busy = false;
let lastTurn = -1;
let watchdog = false;

export const isWatchdogArmed = () => watchdog;
export const getLastTurn = () => lastTurn;
export const isBusy = () => busy;

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

/** SCRIPTED path: pull memo evidence from the same backend tool Live uses (no-op offline). */
async function fetchMemoEvidence() {
  const r = await postTool<{ evidence?: Evidence[] }>('create_moc_memo');
  if (r?.evidence?.length) useLedger.getState().patch('MEMO', { evidence: r.evidence, citations: r.evidence.map((e) => e.doc_id) });
}

/** SCRIPTED path: real fan-out via backend (honest statuses). Offline → mud console in-app, the rest SIMULATED. */
async function fetchDispatch(f: { ids: { dispatch_ids: string[] } }) {
  const r = await postTool<{ channels_dispatched?: unknown[]; message_text?: string }>('dispatch_fanout');
  const labels = ['Mud Chemist Console', 'RTOC Chat', 'Drilling Manager Email', 'Superintendent Phone'];
  const lanes = ['mud', 'chat', 'email', 'phone'];
  const channels: LedgerChannel[] = r?.channels_dispatched
    ? toChannels(r.channels_dispatched)
    : f.ids.dispatch_ids.map((cid, i) => ({
        id: cid, channel: labels[i] ?? cid, lane: lanes[i], status: i === 0 ? ('delivered' as const) : ('simulated' as const),
        note: i === 0 ? 'Shown in the in-app mud console' : 'Backend offline — simulated',
      }));
  return { channels, text: r?.message_text };
}

async function fetchShiftLog(md: number) {
  const r = await postTool<{ lines?: ShiftLine[] }>('draft_shift_log');
  const L = useLedger.getState();
  L.append({ id: 'SHIFT_LOG', kind: 'SHIFT_LOG', md, title: 'Shift handover notes', actor: 'agent', lines: r?.lines ?? [] });
  if (r?.lines) L.patch('SHIFT_LOG', { lines: r.lines });
}

/** Turn numbers by role, read from turns.yaml (trigger / intent) so renumbering the script never breaks side effects. */
export interface TurnRoles { watch: number; t3: number; memo: number; approve: number; fanout: number; t8: number; t9: number; shift: number; wcr: number }
export function turnRoles(turns: { n: number; trigger?: string; intent?: string }[]): TurnRoles {
  const by = (p: (t: { trigger?: string; intent?: string }) => boolean) => turns.find(p)?.n ?? -1; // facts-ok: "not found" sentinel
  return {
    watch: by((t) => t.intent === 'arm_watchdog'),
    t3: by((t) => t.trigger === 'T3_PRESSURE_RAMP'),
    memo: by((t) => t.intent === 'recommend_weight_up'),
    approve: by((t) => t.intent === 'approve'),
    fanout: by((t) => t.intent === 'fanout'),
    t8: by((t) => t.trigger === 'T8_OFFSET_DEPTH'),
    t9: by((t) => t.trigger === 'T9_DRILLING_BREAK'),
    shift: by((t) => t.intent === 'draft_shift_log'),
    wcr: by((t) => t.intent === 'generate_wcr'),
  };
}
const roles = () => turnRoles(useScenario.getState().bundle?.turns ?? []);

/** Apply the state a turn assumes — everything from roles strictly *before* turn n — silently (rehearsal jumps). */
function ensurePrereqs(n: number) {
  const s = useScenario.getState();
  const f = s.bundle!.facts;
  const L = useLedger.getState();
  const R = roles();
  const before = (role: number) => role >= 0 && n > role;
  if (before(R.watch)) watchdog = true;
  if (before(R.t3) && !s.fired.T3_PRESSURE_RAMP) s.markFired('T3_PRESSURE_RAMP');
  if (before(R.memo) && !L.entries.some((e) => e.id === 'MEMO')) {
    L.append({ id: 'MEMO', kind: 'MEMO', md: f.mud.weight_up_location_m, title: f.ids.memo_id, actor: 'agent', basis: snapshot(f.mud.weight_up_location_m) });
    void fetchMemoEvidence();
  }
  if (before(R.approve) && !s.approvedMw) {
    s.approve();
    L.append({ id: 'APPROVAL', kind: 'APPROVAL', md: f.mud.weight_up_location_m, title: `${f.ids.memo_id} approved`, actor: 'Presenter (Drilling Superintendent)', basis: snapshot(f.mud.weight_up_location_m) });
  }
  if (before(R.fanout) && !L.entries.some((e) => e.id === 'DISPATCH')) {
    L.append({ id: 'DISPATCH', kind: 'DISPATCH', md: f.mud.weight_up_location_m, title: 'MOC fan-out', actor: 'agent', channels: [] });
    void fetchDispatch(f).then(({ channels, text }) => useLedger.getState().patch('DISPATCH', { channels, text }));
  }
  if (before(R.t8) && !s.fired.T8_OFFSET_DEPTH) s.markFired('T8_OFFSET_DEPTH');
  if (before(R.t9) && !s.fired.T9_DRILLING_BREAK) {
    s.markFired('T9_DRILLING_BREAK'); s.capRop();
    const t9 = f.triggers.T9_DRILLING_BREAK.md_m as number;
    L.append({ id: 'ROP_CAP', kind: 'ROP_CAP', md: t9, title: `ROP cap ${f.drilling.rop_cap_m_hr} m/hr + sweep`, actor: 'Driller (accepted)', basis: snapshot(t9) });
  }
  if (before(R.shift) && !L.entries.some((e) => e.id === 'SHIFT_LOG')) void fetchShiftLog(s.md);
}

async function speak(id: string, text: string) {
  const A = useAgent.getState();
  A.setVoice('speaking');
  const words = text.split(/\s+/).length;
  await sleep(Math.min(9000, Math.max(1800, words * 110)));
  A.update(id, {});
}

/** LIVE only when the presenter chose it AND a real Gemini session is behind the socket. */
export function liveActive(): boolean {
  return useUi.getState().agentMode === 'LIVE' && liveClient.isLive();
}

function watchdogContext(trigger: string, md: number): string {
  return (
    `[WATCHDOG EVENT ${trigger} @ ${md} m MD]\n` +
    `Live snapshot (authoritative numbers): ${JSON.stringify(snapshot(md))}\n` +
    `Proactively alert the presenter in Hinglish. Use only these numbers or tool results, ` +
    `call the tools you need, and end with one clear recommendation.`
  );
}

export async function runTurn(n: number, opts: { jump?: boolean } = {}) {
  const S = useScenario.getState();
  const { bundle, data } = S;
  if (!bundle || !data || busy) return;
  const turn = bundle.turns.find((t) => t.n === n);
  if (!turn) return;
  busy = true;
  lastTurn = n;
  try {
    const R = turnRoles(bundle.turns);
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
    S.setAct(actOfTurn(turn));
    S.showTakeaway(null);
    let live = liveActive();
    const proactive = turn.leader === 'agent' && !!turn.trigger;
    if (turn.trigger) {
      S.markFired(turn.trigger as TriggerId);
      chime(n === R.t8 ? 'info' : 'alert');
      A.setVoice('alert');
      L.append({ id: turn.trigger, kind: 'TRIGGER', md: turn.md_m, title: turn.trigger.replace(/_/g, ' '), actor: 'watchdog', basis: snapshot(turn.md_m) });
      await sleep(500);
    }

    // ── LIVE: Gemini answers; its tool calls drive memo/approval/dispatch/ROP/WCR via liveClient ──
    let liveAnswered = false;
    if (live) {
      liveClient.setNextTurnMeta({ turn: n, proactive });
      if (script.presenter) {
        const prompt = turn.trigger ? `${watchdogContext(turn.trigger, turn.md_m)}\n\nPresenter: ${script.presenter.hi}` : script.presenter.hi;
        liveClient.sendText(prompt, n, { en: script.presenter.en, hi: script.presenter.hi });
      } else if (turn.trigger) {
        liveClient.sendProactiveTrigger(turn.trigger, turn.md_m, watchdogContext(turn.trigger, turn.md_m));
      } else {
        const intent = (turn as { intent?: string }).intent ?? 'continue';
        liveClient.sendProactiveTrigger(
          `TURN_${n}`,
          turn.md_m,
          `[AGENT CONTINUATION · turn ${n} · ${turn.md_m} m MD] Intent: ${intent}. ` +
            `Expected tools: ${turn.tools.join(', ') || 'none'}. Snapshot: ${JSON.stringify(snapshot(turn.md_m))}. ` +
            `Proceed in Hinglish without waiting for the presenter.`,
        );
      }
      liveAnswered = await liveClient.waitForTurnComplete(30000);
      // Live died mid-turn (fallback / socket loss) → finish this turn from the script so the show continues.
      if (!liveAnswered && !liveClient.isLive()) live = false;
    }

    let id: string | null = null;
    if (!live) {
      if (script.presenter) {
        A.setVoice('listening');
        A.push({ role: 'presenter', en: script.presenter.en, hi: script.presenter.hi, md: turn.md_m, tools: [], citations: [], turn: n });
        await sleep(700);
      }
      A.setVoice('thinking');
      id = A.push({
        role: 'agent', proactive, en: script.agent.en, hi: script.agent.hi, md: turn.md_m,
        tools: turn.tools.map((name) => ({ name, status: 'running' as const })), citations: [], turn: n,
      });
      await sleep(turn.tools.length ? 900 : 350);
      A.update(id, { tools: turn.tools.map((name) => ({ name, status: 'done' as const })), citations: script.citations ?? [] });
    }

    // ── side effects. SCRIPTED: primary. LIVE: idempotent safety net (skipped if Live's tool call already did it) ──
    const done = (entryId: string) => live && useLedger.getState().entries.some((e) => e.id === entryId);
    if (n === R.watch) watchdog = true;
    if (n === R.memo && !done('MEMO')) {
      L.append({ id: 'MEMO', kind: 'MEMO', md: turn.md_m, title: f.ids.memo_id, actor: 'agent', basis: snapshot(turn.md_m),
        citations: (script.citations ?? []).map((c) => c.doc_id) });
      void fetchMemoEvidence();
    }
    if (n === R.memo && live && !useLedger.getState().entries.find((e) => e.id === 'MEMO')?.evidence?.length) void fetchMemoEvidence();
    if (n === R.approve && !(live && useScenario.getState().approvedMw)) {
      S.approve();
      L.append({ id: 'APPROVAL', kind: 'APPROVAL', md: turn.md_m, title: `${f.ids.memo_id} approved`, actor: 'Presenter (Drilling Superintendent)', basis: snapshot(turn.md_m) });
      U.notify(`${f.ids.memo_id} approved — basis frozen`, 'ok');
    }
    if (n === R.fanout && !done('DISPATCH')) {
      const { channels, text } = await fetchDispatch(f);
      L.append({ id: 'DISPATCH', kind: 'DISPATCH', md: turn.md_m, title: 'MOC fan-out', actor: 'agent', text,
        channels: channels.map((c) => ({ ...c, status: 'queued' as const })) });
      channels.forEach((c, i) => {
        setTimeout(() => useLedger.getState().setChannelStatus('DISPATCH', c.id, 'sent'), 400 + i * 300);
        setTimeout(() => useLedger.getState().setChannelStatus('DISPATCH', c.id, c.status), 1300 + i * 350);
      });
    }
    if (n === R.t9 && !done('ROP_CAP')) {
      setTimeout(() => {
        useScenario.getState().capRop();
        useLedger.getState().append({ id: 'ROP_CAP', kind: 'ROP_CAP', md: turn.md_m, title: `ROP cap ${f.drilling.rop_cap_m_hr} m/hr + sweep`, actor: 'Driller (accepted)', basis: snapshot(turn.md_m) });
        useUi.getState().notify(`ROP capped at ${f.drilling.rop_cap_m_hr} m/hr`, 'ok');
      }, live ? 0 : 2500);
    }
    if (n === R.shift && !useLedger.getState().entries.find((e) => e.id === 'SHIFT_LOG')?.lines?.length) await fetchShiftLog(turn.md_m);
    if (n === R.wcr) {
      if (!useLedger.getState().entries.some((e) => e.id === 'SHIFT_LOG')) await fetchShiftLog(turn.md_m);
      L.append({ id: 'WCR', kind: 'WCR', md: turn.md_m, title: f.ids.wcr_id, actor: 'agent' });
      L.append({ id: 'WRITEBACK', kind: 'WRITEBACK', md: turn.md_m, title: '2 lessons → knowledge base', actor: 'agent' });
    }
    if (!live && id) await speak(id, script.agent.en);
    A.setVoice('idle');
    const actId = actOfTurn(turn);
    const actTurns = turnsOfAct(bundle.turns, actId);
    const lastOfAct = actTurns.length > 0 && actTurns[actTurns.length - 1].n === n;
    if (lastOfAct) {
      await sleep(1200);
      useScenario.getState().showTakeaway(actId);
    }
    // After the fan-out, resume drilling toward the sand (T10/T11 are depth-triggered). Hold the Act 3 card first.
    if (n === R.fanout) {
      busy = false;
      await sleep(lastOfAct ? 4000 : 600);
      useScenario.getState().showTakeaway(null);
      useScenario.getState().play();
      return;
    }
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
  const R = turnRoles(S.bundle!.turns);
  if (!S.fired.T3_PRESSURE_RAMP && crosses(t3)) return { clampTo: t3, turn: R.t3 };
  if (S.fired.T3_PRESSURE_RAMP && !S.approvedMw && nextMd > t3) return { clampTo: t3, turn: -1 };
  if (!S.fired.T8_OFFSET_DEPTH && crosses(t8)) return { clampTo: t8, turn: R.t8 };
  if (!S.fired.T9_DRILLING_BREAK && crosses(t9)) return { clampTo: t9, turn: R.t9 };
  const td = f.well.live_interval_m.td;
  if (crosses(td)) return { clampTo: td, turn: -2 };
  return null;
}

/** Shift+1…4: stage an act (prereqs + depth + hero) without running a turn — the presenter then speaks or presses a turn. */
export function enterAct(id: ActId) {
  const S = useScenario.getState();
  if (!S.bundle || busy) return;
  const first = turnsOfAct(S.bundle.turns, id)[0];
  if (first) ensurePrereqs(first.n);
  S.pause();
  S.jumpToAct(id);
  useUi.getState().closeAll();
}

/** N / PageDown: run the next turn in the script (clicker-friendly). */
export function nextTurn() {
  const turns = useScenario.getState().bundle?.turns ?? [];
  const next = turns.find((t) => t.n > lastTurn);
  if (next) void runTurn(next.n, { jump: true });
}

/** Wait until the running turn finishes (clicks during an agent reply must not be dropped). */
async function waitIdle(maxMs = 45000) {
  const t0 = Date.now();
  while (busy && Date.now() - t0 < maxMs) await sleep(150);
}

/** Approve button (Act 3): approval turn, then fan-out turn — works in LIVE (Gemini calls the tools) and SCRIPTED. */
export async function approveAndDispatch() {
  const R = roles();
  if (R.approve < 0) return;
  await waitIdle();
  if (!useScenario.getState().approvedMw) await runTurn(R.approve, { jump: lastTurn < R.memo });
  await waitIdle();
  if (!useLedger.getState().entries.some((e) => e.id === 'DISPATCH') && R.fanout >= 0) await runTurn(R.fanout);
}

/** FT-12: keyword → scripted turn intent (Hinglish + English). Order matters: first match wins. */
const INTENT_KEYWORDS: [RegExp, string][] = [
  [/approve|manzoor|approved|sign/i, 'approve'],
  [/dispatch|bhej|send|fan.?out|notify/i, 'fanout'],
  [/memo|moc|mud weight|weight.?up|barite|badha|recommend/i, 'recommend_weight_up'],
  [/offset|paas|pados|nearby|rig pe|complication|history|pehle/i, 'nearby_rig_complications'],
  [/shift|handover|notes/i, 'draft_shift_log'],
  [/wcr|completion|report/i, 'generate_wcr'],
  [/formation|cuttings|litho|chattan|rock/i, 'formation_and_cuttings_lag'],
  [/time|kitna|eta|kab|zone/i, 'eta_next_zone_query'],
  [/sand|aage|ahead|preview/i, 'prospective_sand_preview'],
  [/watch|nazar|monitor|arm/i, 'arm_watchdog'],
  [/status|haal|kya chal|depth|well/i, 'status_check'],
];

export function scriptedTurnFor(text: string): number | null {
  const turns = useScenario.getState().bundle?.turns ?? [];
  for (const [re, intent] of INTENT_KEYWORDS) {
    if (re.test(text)) {
      const t = turns.find((x) => (x as { intent?: string }).intent === intent);
      if (t) return t.n;
    }
  }
  return null;
}

/** Agent panel input / example chips. LIVE → Gemini. Otherwise → the matching scripted turn (the show never dead-ends). */
export async function askAgent(text: string) {
  const q = text.trim();
  if (!q) return;
  if (liveActive()) {
    liveClient.sendText(q);
    return;
  }
  const n = scriptedTurnFor(q);
  if (n === null) {
    useUi.getState().notify('Scripted mode: try "status", "agle zone", "paas wale rig", "memo banao", "approve"', 'warn');
    return;
  }
  const R = roles();
  if (n === R.approve) { await approveAndDispatch(); return; }
  await waitIdle();
  await runTurn(n, { jump: n !== lastTurn + 1 });
}

export function resetShow() {
  lastTurn = -1;
  watchdog = false;
  busy = false;
  useScenario.getState().reset();
  useAgent.getState().clear();
  useLedger.getState().clear();
  useUi.getState().closeAll();
}
