/** PresenterConsole (/presenter) — second-screen remote: turns, playback, modes. Talks via BroadcastChannel. */
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Wordmark } from '../../components/common/AppHeader';
import { CHANNEL, type PresenterCmd } from '../../state/presenter';
import { useScenario } from '../../state/scenarioStore';

interface Echo { md: number; playing: boolean; approved: boolean; fired: Record<string, boolean>; speed: number }

export default function PresenterConsole() {
  const { bundle, load } = useScenario();
  const [echo, setEcho] = useState<Echo | null>(null);
  const bc = useMemo(() => new BroadcastChannel(CHANNEL), []);
  useEffect(() => { void load(); bc.onmessage = (e) => e.data?.state && setEcho(e.data.state); return () => bc.close(); }, [bc, load]);
  const send = (c: PresenterCmd) => bc.postMessage(c);
  return (
    <div className="h-full overflow-y-auto bg-app p-6">
      <div className="mb-6 flex items-center justify-between">
        <Wordmark />
        <div className="num text-sm text-muted">
          {echo ? <>bit <span className="text-fg">{echo.md.toFixed(1)} m</span> · {echo.playing ? 'drilling' : 'paused'} · MOC {echo.approved ? 'approved' : 'pending'}</> : 'waiting for command center window…'}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {bundle?.turns.map((t) => (
          <button key={t.n} onClick={() => send({ cmd: 'turn', n: t.n })}
            className={clsx('panel p-4 text-left transition-colors hover:border-accent/60', t.leader === 'agent' && 'border-accent/30')}>
            <div className="flex items-center justify-between"><span className="num text-2xl font-semibold text-fg">{t.n}</span><span className="chip border-strong text-muted">{t.leader}</span></div>
            <div className="mt-1 text-sm text-fg">{(t.intent ?? t.trigger ?? '').replace(/_/g, ' ')}</div>
            <div className="num text-xs text-faint">{t.md_m.toLocaleString('en-IN')} m · {t.mode}</div>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => send({ cmd: 'toggle' })}>Play / pause</button>
        {[1, 2, 5].map((s) => <button key={s} className="btn" onClick={() => send({ cmd: 'speed', s })}>{s} m/s</button>)}
        <button className="btn" onClick={() => send({ cmd: 'mode' })}>Board / engineer</button>
        <button className="btn" onClick={() => send({ cmd: 'lang' })}>Captions</button>
        <button className="btn" onClick={() => send({ cmd: 'theme' })}>Theme</button>
        <button className="btn" onClick={() => send({ cmd: '3d' })}>3D</button>
        <button className="btn" onClick={() => send({ cmd: 'overlay', o: 'memo' })}>Memo</button>
        <button className="btn" onClick={() => send({ cmd: 'overlay', o: 'audit' })}>Audit</button>
        <button className="btn" onClick={() => send({ cmd: 'overlay', o: 'whatif' })}>What-if</button>
        <button className="btn border-risk/50 text-risk" onClick={() => send({ cmd: 'reset' })}>Reset show</button>
      </div>
      <p className="mt-6 text-xs text-faint">Fallback video, mute and latency meter arrive with Gemini Live (build.md Phase 4/8).</p>
    </div>
  );
}
