/** ActNavBar — the 4-act run of show (checklist §A). Click or Shift+1…4 stages an act via turnMachine.enterAct.
 * No key listener here: presenter.ts owns all hotkeys (plain digits = turns, Shift+digits = acts).
 */
import clsx from 'clsx';
import { ACTS, useScenario } from '../../state/scenarioStore';
import { enterAct } from '../../state/turnMachine';

export default function ActNavBar() {
  const md = useScenario((s) => s.md);
  const act = useScenario((s) => s.act);
  const done = ACTS.findIndex((a) => a.id === act);

  return (
    <nav className="flex w-full shrink-0 items-stretch gap-2" aria-label="Acts">
      {ACTS.map((a, i) => {
        const active = a.id === act;
        return (
          <button
            key={a.id}
            onClick={() => enterAct(a.id)}
            title={`${a.takeaway}  (Shift+${a.actNumber})`}
            className={clsx(
              'group relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left transition-all duration-200',
              active ? 'border-accent/60 bg-accent/10 shadow-sm' : 'border-line bg-card/60 hover:border-strong',
            )}
          >
            <span
              className={clsx(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold',
                active ? 'bg-accent text-white' : i < done ? 'bg-ok/20 text-ok' : 'bg-surface text-faint',
              )}
            >
              {i < done ? '✓' : a.actNumber}
            </span>
            <span className="min-w-0 leading-tight">
              <span className={clsx('block truncate text-[13.5px] font-semibold', active ? 'text-fg' : 'text-muted')}>{a.title}</span>
              <span className="block truncate text-[11px] text-faint">{a.subtitle}</span>
            </span>
            {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent" />}
          </button>
        );
      })}
      <div className="flex shrink-0 flex-col justify-center rounded-lg border border-line bg-card/60 px-3 text-right">
        <span className="text-[10px] uppercase tracking-wider text-faint">Bit depth</span>
        <span className="num text-[15px] font-semibold text-fg">{md.toLocaleString('en-IN', { minimumFractionDigits: 1 })} m</span>
      </div>
    </nav>
  );
}
