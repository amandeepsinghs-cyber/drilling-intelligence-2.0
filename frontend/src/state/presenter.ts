/** Presenter hotkeys + BroadcastChannel bridge (SDD §12.2 PresenterConsole). */
import { useEffect } from 'react';
import { useScenario } from './scenarioStore';
import { resetShow, runTurn } from './turnMachine';
import { useUi } from './uiStore';

export const CHANNEL = 'di2-presenter';
export type PresenterCmd =
  | { cmd: 'turn'; n: number } | { cmd: 'play' } | { cmd: 'pause' } | { cmd: 'toggle' } | { cmd: 'reset' }
  | { cmd: 'mode' } | { cmd: 'theme' } | { cmd: 'lang' } | { cmd: 'overlay'; o: 'memo' | 'audit' | 'whatif' | 'wcr' } | { cmd: '3d' }
  | { cmd: 'speed'; s: number };

export function execute(c: PresenterCmd) {
  const S = useScenario.getState(), U = useUi.getState();
  switch (c.cmd) {
    case 'turn': void runTurn(c.n, { jump: true }); break;
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
  }
}

export const HOTKEYS: [string, string][] = [
  ['Space', 'Play / pause drilling'], ['0 – 9', 'Run turn 0–9'], ['-', 'Run turn 10 (WCR)'], ['← →', 'Step 0.5 m (Shift: 5 m)'],
  ['M', 'MOC memo'], ['W', 'What-if'], ['A', 'Audit drawer'], ['D', '3D offsets'], ['B', 'Board / engineer'],
  ['T', 'Theme'], ['L', 'Caption language'], ['Shift+R', 'Reset show'], ['Esc', 'Close overlays'], ['?', 'This help'],
];

export function usePresenterBridge() {
  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => { if (e.data?.cmd) execute(e.data as PresenterCmd); };
    const echo = setInterval(() => {
      const s = useScenario.getState();
      bc.postMessage({ state: { md: s.md, playing: s.playing, approved: s.approvedMw, fired: s.fired, speed: s.speed } });
    }, 500);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const S = useScenario.getState(), U = useUi.getState();
      if (e.code === 'Space') { e.preventDefault(); S.togglePlay(); return; }
      if (/^Digit[0-9]$/.test(e.code) && !e.shiftKey) { void runTurn(+e.code.slice(5), { jump: true }); return; }
      if (e.key === '-') { void runTurn(10, { jump: true }); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { S.setMd(S.md + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 0.5)); return; }
      if (e.key === 'Escape') { U.closeAll(); return; }
      if (e.key === 'R' && e.shiftKey) { resetShow(); return; }
      const k = e.key.toLowerCase();
      if (k === 'm') U.toggle('memo');
      else if (k === 'w') U.toggle('whatif');
      else if (k === 'a') U.toggle('audit');
      else if (k === 'd') U.toggle3d();
      else if (k === 'b') U.toggleMode();
      else if (k === 't') U.toggleTheme();
      else if (k === 'l') U.cycleLang();
      else if (e.key === '?') U.toggle('help');
    };
    window.addEventListener('keydown', onKey);
    return () => { bc.close(); clearInterval(echo); window.removeEventListener('keydown', onKey); };
  }, []);
}
