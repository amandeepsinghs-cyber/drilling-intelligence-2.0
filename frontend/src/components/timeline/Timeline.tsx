/** Timeline — depth scrubber with trigger & turn markers, play/pause and speed. */
import clsx from 'clsx';
import { hms, indexAt, num } from '../../lib/frames';
import { useScenario } from '../../state/scenarioStore';
import { runTurn } from '../../state/turnMachine';
import { useUi } from '../../state/uiStore';

export default function Timeline() {
  const { data, bundle, md, playing, speed, fired, togglePlay, setSpeed, setMd } = useScenario();
  const board = useUi((s) => s.mode) === 'board';
  if (!data || !bundle) return <div className="panel h-[68px]" />;
  const f = bundle.facts;
  const lo = f.checkpoints[0].md_m - 20, hi = f.well.live_interval_m.td;
  const pct = (d: number) => ((d - lo) / (hi - lo)) * 100;
  const trig = [
    { id: 'T3_PRESSURE_RAMP', label: 'T3 · pressure ramp', md: f.triggers.T3_PRESSURE_RAMP.md_m as number, tone: 'risk' },
    { id: 'T8_OFFSET_DEPTH', label: 'T8 · offset kick depth', md: f.triggers.T8_OFFSET_DEPTH.md_m as number, tone: 'ok' },
    { id: 'T9_DRILLING_BREAK', label: 'T9 · drilling break', md: f.triggers.T9_DRILLING_BREAK.md_m as number, tone: 'warn' },
    { id: 'TD', label: 'TD · casing point', md: hi, tone: 'accent' },
  ] as const;
  const t = num(data, 't_rel_s', indexAt(data, md)) ?? 0;

  return (
    <div className="panel flex h-[68px] shrink-0 items-center gap-4 px-4">
      <button className="btn-primary h-10 w-10 justify-center rounded-full p-0" onClick={togglePlay} title="Play / pause (Space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="flex flex-col">
        <span className="num text-sm text-fg">{hms(t)}</span>
        <span className="text-[10px] text-faint">rig time (compressed)</span>
      </div>
      <div className="relative h-10 flex-1">
        <div className="absolute left-0 right-0 top-[18px] h-[3px] rounded bg-line" />
        <div className="absolute left-0 top-[18px] h-[3px] rounded bg-accent/70" style={{ width: `${pct(md)}%` }} />
        {trig.map((x) => (
          <button key={x.id} onClick={() => setMd(x.md)} title={x.label}
            className="group absolute top-[10px] -translate-x-1/2" style={{ left: `${pct(x.md)}%` }}>
            <span className={clsx('block h-[19px] w-[3px] rounded',
              x.tone === 'risk' ? 'bg-risk' : x.tone === 'warn' ? 'bg-warn' : x.tone === 'ok' ? 'bg-ok' : 'bg-accent',
              x.id !== 'TD' && !fired[x.id as keyof typeof fired] && 'opacity-40')} />
            <span className="num absolute left-1/2 top-[22px] -translate-x-1/2 whitespace-nowrap text-[9.5px] text-muted">{x.md.toLocaleString('en-IN')}</span>
          </button>
        ))}
        <input type="range" min={lo} max={hi} step={0.5} value={md} onChange={(e) => setMd(+e.target.value)}
          className="absolute inset-x-0 top-[8px] h-6 w-full cursor-pointer opacity-0" aria-label="Bit depth" />
        <div className="pointer-events-none absolute top-[11px] h-[17px] w-[17px] -translate-x-1/2 rounded-full border-2 border-accent bg-app shadow-glow"
          style={{ left: `${pct(md)}%` }} />
      </div>
      {!board && (<>
      <div className="flex items-center gap-1">
        {[1, 2, 5].map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={clsx('kbd px-2 py-0.5', speed === s && 'border-accent text-accent')}>{s} m/s</button>
        ))}
      </div>
      <div className="flex items-center gap-1 border-l border-line pl-3">
        {bundle.turns.map((tn) => (
          <button key={tn.n} onClick={() => runTurn(tn.n, { jump: true })} title={`Turn ${tn.n} · ${tn.intent ?? tn.trigger}`}
            className={clsx('kbd h-6 w-6 justify-center px-0', tn.leader === 'agent' && 'border-accent/40 text-accent')}>{tn.n}</button>
        ))}
      </div>
      </>)}
    </div>
  );
}
