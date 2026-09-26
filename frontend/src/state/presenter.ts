/** Presenter hotkeys + BroadcastChannel bridge (SDD §12.2 PresenterConsole). */
import { useEffect } from 'react';
import { useScenario, type ActId } from './scenarioStore';
import { enterAct, getLastTurn, nextTurn, resetShow, runTurn, turnRoles } from './turnMachine';
import { useUi } from './uiStore';
import { liveClient } from '../live/liveClient';

export const CHANNEL = 'di2-presenter';
export type PresenterCmd =
  | { cmd: 'turn'; n: number } | { cmd: 'play' } | { cmd: 'pause' } | { cmd: 'toggle' } | { cmd: 'reset' }
  | { cmd: 'mode' } | { cmd: 'theme' } | { cmd: 'lang' } | { cmd: 'overlay'; o: 'memo' | 'audit' | 'whatif' | 'wcr' } | { cmd: '3d' }
  | { cmd: 'speed'; s: number } | { cmd: 'agentMode' } | { cmd: 'act'; id: ActId } | { cmd: 'takeaway' } | { cmd: 'next' };

/** Enter: show / hide the current act's takeaway card. */
export function toggleTakeaway() {
  const S = useScenario.getState();
  S.showTakeaway(S.takeaway ? null : S.act);
}

export function execute(c: PresenterCmd) {
  const S = useScenario.getState(), U = useUi.getState();
  switch (c.cmd) {
    case 'turn': void runTurn(c.n, { jump: true }); break;
    case 'act': enterAct(c.id); break;
    case 'takeaway': toggleTakeaway(); break;
    case 'next': nextTurn(); break;
    case 'play': S.play(); break;
    case 'pause': S.pause(); break;
    case 'toggle': S.togglePlay(); break;
    case 'reset': resetShow(); break;
    case 'mode': U.toggleMode(); break;
    case 'theme': U.toggleTheme(); break;
    case 'lang': U.cycleLang(); break;
    case 'overlay': U.toggle(c.o); break;
    case '3d': U.toggle3d(); break;
    case 'speed': S.setSpeed(c.s); break;
    case 'agentMode': toggleAgentMode(); break;
  }
}

/** V: flip LIVE ↔ SCRIPTED. Going to LIVE after a fallback opens a fresh socket so the backend retries Gemini. */
export function toggleAgentMode() {
  const U = useUi.getState();
  U.toggleAgentMode();
  if (useUi.getState().agentMode === 'LIVE' && !liveClient.isLive()) liveClient.retryLive();
}

export const HOTKEYS: [string, string][] = [
  ['Shift+1 – 4', 'Enter Act 1–4 (stage only)'], ['Enter', 'Show / hide act takeaway'],
  ['N / PageDown', 'Next turn (clicker)'], ['Space', 'Play / pause drilling'], ['0 – 9', 'Jump to turn 0–9'], ['-', 'Jump to WCR turn'], ['← →', 'Step 0.5 m (Shift: 5 m)'], // facts-ok: presenter step size, not a well fact
  ['M', 'MOC memo'], ['W', 'What-if'], ['A', 'Audit drawer'], ['D', '3D offsets'], ['B', 'Board / engineer'], ['V', 'Agent: LIVE / SCRIPTED'],
  ['T', 'Theme'], ['L', 'Caption language'], ['Shift+R', 'Reset show'], ['Esc', 'Close overlays + takeaway'], ['?', 'This help'],
];

export function usePresenterBridge() {
  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => { if (e.data?.cmd) execute(e.data as PresenterCmd); };
    const echo = setInterval(() => {
      const s = useScenario.getState();
      const u = useUi.getState();
      const curTurn = getLastTurn();
      const turns = s.bundle?.turns ?? [];
      const next = turns.find((t) => t.n > curTurn);
      bc.postMessage({
        state: {
          md: s.md,
          playing: s.playing,
          approved: s.approvedMw,
          fired: s.fired,
          speed: s.speed,
          act: s.act,
          takeaway: s.takeaway,
          currentTurn: curTurn,
          nextTurn: next ? next.n : null,
          nextIntent: next ? (next.intent ?? next.trigger ?? '') : null,
          agentMode: u.agentMode,
          liveStatus: liveClient.getStatus(),
          sentAt: Date.now(),
        },
      });
    }, 500);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const S = useScenario.getState(), U = useUi.getState();
      if (e.code === 'Space') { e.preventDefault(); S.togglePlay(); return; }
      if (/^Digit[1-4]$/.test(e.code) && e.shiftKey) { e.preventDefault(); enterAct(`act${e.code.slice(5)}` as ActId); return; }
      if (/^Digit[0-9]$/.test(e.code) && !e.shiftKey) { void runTurn(+e.code.slice(5), { jump: true }); return; }
      if (e.key === 'Enter') { e.preventDefault(); toggleTakeaway(); return; }
      if (e.key === 'PageDown' || (e.key.toLowerCase() === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); nextTurn(); return; }
      if (e.key === '-') { const w = turnRoles(S.bundle?.turns ?? []).wcr; if (w >= 0) void runTurn(w, { jump: true }); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { S.setMd(S.md + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 0.5)); return; }
      if (e.key === 'Escape') { U.closeAll(); S.showTakeaway(null); return; }
      if (e.key === 'R' && e.shiftKey) { resetShow(); return; }
      const k = e.key.toLowerCase();
      if (k === 'm') U.toggle('memo');
      else if (k === 'w') U.toggle('whatif');
      else if (k === 'a') U.toggle('audit');
      else if (k === 'd') U.toggle3d();
      else if (k === 'b') U.toggleMode();
      else if (k === 'v') toggleAgentMode();
      else if (k === 't') U.toggleTheme();
      else if (k === 'l') U.cycleLang();
      else if (e.key === '?') U.toggle('help');
    };
    window.addEventListener('keydown', onKey);
    return () => { bc.close(); clearInterval(echo); window.removeEventListener('keydown', onKey); };
  }, []);
}
