/** Timeline — depth scrubber with trigger & turn markers, play/pause and speed (FT-10). */
import clsx from 'clsx';
import { hms, indexAt, num } from '../../lib/frames';
import { useScenario } from '../../state/scenarioStore';
import { runTurn } from '../../state/turnMachine';
import { useUi } from '../../state/uiStore';

const SHORT: Record<string, string> = {
  act1: 'Rock at the bit',
  act2: 'Window closes',
  act3: 'Decide & act',
  act4: 'Loss side · WCR',
};

export default function Timeline() {
  const { data, bundle, md, playing, speed, fired, togglePlay, setSpeed, setMd } = useScenario();
  const board = useUi((s) => s.mode) === 'board';
  if (!data || !bundle) return <div className="panel h-[48px]" />;
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

  const actStarts = [1, 2, 3, 4].map((actNum) => {
    const id = `act${actNum}`;
    const tn = bundle.turns.find((t) => t.act === actNum || (actNum === 1 && t.n === 0));
    return { id, label: SHORT[id], md: tn ? tn.md_m : lo };
  });

  return (
    <div className="panel flex h-[48px] shrink-0 items-center gap-3 px-3">
      <button className="btn-primary h-8 w-8 justify-center rounded-full p-0 shrink-0" onClick={togglePlay} title="Play / pause (Space)">
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="flex flex-col shrink-0 leading-tight">
        <span className="num text-[12px] font-semibold text-fg">{hms(t)}</span>
        <span className="text-[9px] text-faint">rig time</span>
      </div>
      <div className="relative h-10 flex-1">
        {/* Act boundary labels */}
        {actStarts.map((a, i) => (
          <div key={a.id}
            className={clsx('pointer-events-none absolute top-0 flex flex-col',
              i === 0 ? 'items-start' : i === 3 ? 'items-end' : 'items-center -translate-x-1/2'
            )}
            style={{ left: `${pct(a.md)}%` }}>
            <span className="whitespace-nowrap text-[8.5px] font-semibold text-muted/70">{a.label}</span>
            <span className="h-1 w-[1px] bg-line" />
          </div>
        ))}

        {/* Track bar */}
        <div className="absolute left-0 right-0 top-[18px] h-[3px] rounded bg-line" />
        <div className="absolute left-0 top-[18px] h-[3px] rounded bg-accent/70" style={{ width: `${pct(md)}%` }} />

        {/* Turn tick marks */}
        {bundle.turns.map((tn) => (
          <div key={tn.n} className="pointer-events-none absolute top-[16px] -translate-x-1/2" style={{ left: `${pct(tn.md_m)}%` }}
            title={`Turn ${tn.n} (${tn.md_m} m)`}>
            <span className="block h-[7px] w-[1px] bg-muted/40" />
          </div>
        ))}

        {/* Trigger markers */}
        {trig.map((x) => (
          <button key={x.id} onClick={() => setMd(x.md)} title={x.label}
            className="group absolute top-[13px] -translate-x-1/2" style={{ left: `${pct(x.md)}%` }}>
            <span className={clsx('block h-[13px] w-[2.5px] rounded-sm',
              x.tone === 'risk' ? 'bg-risk' : x.tone === 'warn' ? 'bg-warn' : x.tone === 'ok' ? 'bg-ok' : 'bg-accent',
              x.id !== 'TD' && !fired[x.id as keyof typeof fired] && 'opacity-40')} />
            <span className="num absolute left-1/2 top-[13px] -translate-x-1/2 whitespace-nowrap text-[8.5px] text-muted">{x.md.toLocaleString('en-IN')}</span>
          </button>
        ))}

        <input type="range" min={lo} max={hi} step={0.5} value={md} onChange={(e) => setMd(+e.target.value)}
          className="absolute inset-x-0 top-[8px] h-6 w-full cursor-pointer opacity-0" aria-label="Bit depth" />
        <div className="pointer-events-none absolute top-[12px] h-[15px] w-[15px] -translate-x-1/2 rounded-full border-2 border-accent bg-app shadow-glow"
          style={{ left: `${pct(md)}%` }} />
      </div>
      {!board && (<>
      <div className="flex items-center gap-1 shrink-0">
        {[1, 2, 5].map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={clsx('kbd px-1.5 py-0.5 text-[10px]', speed === s && 'border-accent text-accent')}>{s} m/s</button>
        ))}
      </div>
      <div className="flex items-center gap-1 border-l border-line pl-2 shrink-0">
        {bundle.turns.map((tn) => (
          <button key={tn.n} onClick={() => runTurn(tn.n, { jump: true })} title={`Turn ${tn.n} · ${tn.intent ?? tn.trigger}`}
            className={clsx('kbd h-5 w-5 justify-center px-0 text-[10px]', tn.leader === 'agent' && 'border-accent/40 text-accent')}>{tn.n}</button>
        ))}
      </div>
      </>)}
    </div>
  );
}
