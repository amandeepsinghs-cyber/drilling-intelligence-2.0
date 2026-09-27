/** TopBar — one 56 px row: brand · well · act stepper · LIVE/SCRIPTED · bit depth · controls. */
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTS, useScenario } from '../../state/scenarioStore';
import { enterAct } from '../../state/turnMachine';
import { useUi } from '../../state/uiStore';
import { Wordmark } from '../common/AppHeader';
import { WCR_REPORT_URL } from '../../lib/reportUrl';
import { useWcrReady } from '../../state/wcrReady';

const SHORT: Record<string, string> = { act1: 'Rock at the bit', act2: 'Window closes', act3: 'Decide & act', act4: 'Loss side · WCR' };

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000 * 15); return () => clearInterval(id); }, []);
  return <span className="num text-[13px] text-muted">{t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>;
}

export default function TopBar() {
  const bundle = useScenario((s) => s.bundle);
  const md = useScenario((s) => s.md);
  const act = useScenario((s) => s.act);
  const approved = useScenario((s) => s.approvedMw);
  const wcrReady = useWcrReady().ready;
  const ui = useUi();
  const f = bundle?.facts;
  const cur = ACTS.findIndex((a) => a.id === act);
  return (
    <header className="flex h-14 shrink-0 items-center gap-5 border-b border-line bg-panel/60 px-4">
      <Link to="/" className="shrink-0"><Wordmark /></Link>
      {f && (
        <div className="shrink-0 border-l border-line pl-5 leading-tight">
          <div className="num text-[16px] font-semibold text-fg">{f.well.id}</div>
          <div className="whitespace-nowrap text-[11.5px] text-muted">
            Mahanadi deepwater · {f.well.water_depth_m.toLocaleString('en-IN')} m water
            <span className="hidden min-[2000px]:inline"> · {f.well.rig}</span>
          </div>
        </div>
      )}
      <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden" aria-label="Acts">
        {ACTS.map((a, i) => {
          const on = a.id === act, done = i < cur;
          return (
            <div key={a.id} className="flex shrink-0 items-center">
              {i > 0 && <span className={clsx('mx-1 h-px w-4 min-[1800px]:w-6', done || on ? 'bg-accent/60' : 'bg-line')} />}
              <button onClick={() => enterAct(a.id)} title={`${SHORT[a.id] ?? a.title} — ${a.takeaway} (Shift+${a.actNumber})`}
                className={clsx('flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all duration-200',
                  on ? 'border-accent/70 bg-accent/15 shadow-glow' : 'border-transparent hover:border-line')}>
                <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold',
                  on ? 'bg-accent text-app' : done ? 'bg-ok/20 text-ok' : 'bg-raised text-faint')}>{done ? '✓' : a.actNumber}</span>
                {/* Active act always shows its name; the others only on very wide screens (no overlap). */}
                <span className={clsx('whitespace-nowrap text-[13.5px] font-semibold', on ? 'text-fg' : 'hidden text-muted min-[1800px]:inline')}>{SHORT[a.id] ?? a.title}</span>
              </button>
            </div>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-3">
        {approved && <span className="chip border-accent/40 text-accent">MOC active</span>}
        {/* Stays on the main screen after the "WCR draft for review is ready" card is closed. */}
        {wcrReady && (
          <a href={WCR_REPORT_URL} target="_blank" rel="noopener" title="WCR draft for review — open from the data lake"
            className="chip animate-pulse border-warn/60 font-semibold text-warn hover:bg-warn/10 hover:[animation:none]">📄 WCR draft ↗</a>
        )}
        {/* LIVE/SCRIPTED chip lives only in the agent panel (owner: one "LIVE" on screen). V still toggles. */}
        <div className="border-l border-line pl-3 text-right leading-tight">
          <div className="text-[10px] uppercase tracking-wider text-faint">Bit depth</div>
          <div className="num text-[17px] font-semibold text-fg">{md.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[12px] text-muted">m</span></div>
        </div>
        <Clock />
        <button className="kbd py-1" onClick={ui.toggleTheme} title="Theme (T)">{ui.theme === 'dark' ? '☀' : '☾'}</button>
        <button className="kbd py-1" onClick={() => ui.toggle('help')} title="Hotkeys (?)">?</button>
      </div>
    </header>
  );
}
