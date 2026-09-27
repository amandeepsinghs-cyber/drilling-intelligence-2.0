/** AppHeader — wordmark, well identity, feed status, and presenter controls. */
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';

/** Official Google Cloud logo files (drop them into frontend/public/brand/). Never redraw the logo — brand rules. */
const LOGO = { dark: '/brand/google-cloud-logo-on-dark.svg', light: '/brand/google-cloud-logo-on-light.svg' } as const;

export function Wordmark() {
  const theme = useUi((s) => s.theme);
  const [logoOk, setLogoOk] = useState(true);
  const src = theme === 'light' ? LOGO.light : LOGO.dark;
  useEffect(() => setLogoOk(true), [src]);
  return (
    <div className="flex items-center gap-3">
      {logoOk ? (
        <img src={src} alt="Google Cloud" className="h-10 w-auto" onError={() => setLogoOk(false)} />
      ) : (
        // Placeholder until the official logo file is present: plain text, no imitation of the logo.
        <span className="whitespace-nowrap text-[18px] font-medium tracking-tight text-fg">Google Cloud</span>
      )}
      <span className="h-7 w-px bg-line" />
      <span className="whitespace-nowrap text-[16px] font-semibold tracking-tight text-muted">Drilling Intelligence</span>
    </div>
  );
}

export default function AppHeader() {
  const { bundle, source, approvedMw } = useScenario();
  const ui = useUi();
  const f = bundle?.facts;
  const seg = (on: boolean) => clsx('px-2.5 py-1 text-[11px] transition-colors', on ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg');
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <Link to="/"><Wordmark /></Link>
        {f && (
          <div className="flex items-center gap-3 border-l border-line pl-6">
            <div>
              <div className="num text-[15px] font-semibold text-fg">{f.well.id}</div>
              <div className="text-[11px] text-muted">{f.well.basin} · {f.well.water_depth_m.toLocaleString('en-IN')} m WD · {f.well.current_section.hole_size_in}-in · {f.well.current_section.mud_type}</div>
            </div>
            <span className="chip border-ok/40 text-ok"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />Live · simulated feed</span>
            {approvedMw && <span className="chip border-accent/40 text-accent">MOC active</span>}
            {ui.mode === 'engineer' && <span className="chip border-strong text-faint">{source === 'api' ? 'API' : 'offline'}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-line">
          <button className={seg(ui.mode === 'board')} onClick={() => ui.setMode('board')}>Board</button>
          <button className={seg(ui.mode === 'engineer')} onClick={() => ui.setMode('engineer')}>Engineer</button>
        </div>
        {ui.mode === 'engineer' && (<>
        <button className={clsx('btn py-1 text-[11px]', ui.view3d && 'border-accent/60 text-accent')} onClick={ui.toggle3d} title="3D offset view (D)">3D</button>
        <button className="btn py-1 text-[11px]" onClick={() => ui.toggle('whatif')} title="What-if (W)">What-if</button>
        <button className="btn py-1 text-[11px]" onClick={() => ui.toggle('audit')} title="Audit (A)">Audit</button>
        </>)}
        <button className="btn py-1 text-[11px] font-medium" onClick={ui.toggleTheme} title="Toggle Theme (T)">
          {ui.theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button className="kbd py-1" onClick={() => ui.toggle('help')} title="Hotkeys (?)">?</button>
      </div>
    </header>
  );
}
