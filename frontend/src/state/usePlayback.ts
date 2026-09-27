/** usePlayback — rAF drilling clock; clamps at trigger depths and hands over to the turn machine. */
import { useEffect, useRef } from 'react';
import { indexAt, num } from '../lib/frames';
import { useScenario } from './scenarioStore';
import { checkTriggers, runTurn } from './turnMachine';
import { useUi } from './uiStore';

const FALLBACK_ROP_M_HR = 20; // facts-ok: only used if the frame has no ROP value

export function usePlayback() {
  const playing = useScenario((s) => s.playing);
  const pos = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) { pos.current = null; return; }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const S = useScenario.getState();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const prev = pos.current ?? S.md;
      // Real ROP (m/hr) at the bit × rig-time multiplier → metres per demo second.
      const rop = (S.data && num(S.data, 'drilling.ROP', indexAt(S.data, prev))) || FALLBACK_ROP_M_HR;
      const next = prev + (rop / 3600) * S.speed * dt;
      const hit = checkTriggers(prev, next);
      if (hit) {
        S.setMd(hit.clampTo);
        S.pause();
        if (hit.turn >= 0) void runTurn(hit.turn);
        else if (hit.turn === -1) useUi.getState().notify('Holding at alert depth — MOC approval required (turn 6)', 'warn');
        else if (hit.turn === -3) useUi.getState().notify('Holding at the drilling break — click "Approve ROP cap"', 'warn');
        else useUi.getState().notify('TD reached — press "-" to generate the WCR', 'info');
        return;
      }
      pos.current = next;
      S.setMd(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
