/**
 * PresenterConsole (/presenter) — second-screen remote for presenter:
 * synchronized show-state (turn, act, md, next turn preview, and latency meter)
 * communicating via BroadcastChannel and WebSocket (/ws/events).
 */
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Wordmark } from '../../components/common/AppHeader';
import { SPEEDS } from '../../components/timeline/Timeline';
import { CHANNEL, type PresenterCmd } from '../../state/presenter';
import { ACTS, actOfTurn, useScenario, type ActId } from '../../state/scenarioStore';

interface Echo {
  md: number;
  playing: boolean;
  approved: boolean;
  fired: Record<string, boolean>;
  speed: number;
  act?: ActId;
  takeaway?: ActId | null;
  currentTurn?: number;
  nextTurn?: number | null;
  nextIntent?: string | null;
  agentMode?: 'LIVE' | 'SCRIPTED';
  liveStatus?: string;
  sentAt?: number;
}

function getWsEventsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const port = window.location.port === '5173' ? '8765' : (window.location.port || '8765');
  return `${proto}//${host}:${port}/ws/events`;
}

export default function PresenterConsole() {
  const { bundle, load } = useScenario();
  const [echo, setEcho] = useState<Echo | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bc = useMemo(() => new BroadcastChannel(CHANNEL), []);

  useEffect(() => {
    void load();

    // 1. BroadcastChannel for zero-latency same-browser sync
    bc.onmessage = (e) => {
      if (e.data?.state) {
        setEcho(e.data.state);
        if (e.data.state.sentAt) {
          setLatencyMs(Math.max(1, Date.now() - e.data.state.sentAt));
        }
      }
    };

    // 2. WebSocket (/ws/events) for remote/cross-device presenter sync
    let sock: WebSocket | null = null;
    try {
      sock = new WebSocket(getWsEventsUrl());
      wsRef.current = sock;
      sock.onopen = () => setWsConnected(true);
      sock.onclose = () => setWsConnected(false);
      sock.onerror = () => setWsConnected(false);
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.state) {
            setEcho(msg.state);
            if (msg.state.sentAt) {
              setLatencyMs(Math.max(1, Date.now() - msg.state.sentAt));
            }
          }
        } catch (_) {
          // non-json
        }
      };
    } catch (_) {
      // ws unavailable, bc continues
    }

    return () => {
      bc.close();
      if (sock) sock.close();
    };
  }, [bc, load]);

  const send = (c: PresenterCmd) => {
    bc.postMessage(c);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(c));
      } catch (_) {
        // ignore send error
      }
    }
  };

  const currentTurn = echo?.currentTurn ?? -1; // facts-ok: turn index sentinel when no turn is active
  const currentTurnObj = bundle?.turns.find((t) => t.n === currentTurn);
  const nextTurnObj = bundle?.turns.find((t) => t.n > currentTurn);
  const currentAct = ACTS.find((a) => a.id === echo?.act) ?? ACTS[0];
  const activeLatency = latencyMs ?? 0; // facts-ok: fallback display latency in milliseconds

  return (
    <div className="h-full overflow-y-auto bg-app p-6 text-fg flex flex-col gap-6">
      {/* ── Top Bar: Wordmark + Live Telemetry + Latency ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="text-xs uppercase tracking-wider text-muted font-mono px-2 py-0.5 rounded bg-panel/60 border border-strong">
            Presenter Remote · /presenter
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {/* Connection Indicator */}
          <div className="chip border-strong flex items-center gap-1.5 px-2 py-1">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                echo ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
              )}
            />
            <span className="text-muted">{echo ? (wsConnected ? 'BC + WS Sync' : 'Local BC Sync') : 'Connecting…'}</span>
          </div>

          {/* Latency Meter */}
          <div className="chip border-strong text-muted flex items-center gap-1.5 px-2 py-1">
            <span className="text-faint">Latency</span>
            <span className={clsx('font-semibold', activeLatency < 50 ? 'text-emerald-400' : 'text-amber-400')}>
              {latencyMs !== null ? `${latencyMs} ms` : '< 5 ms'}
            </span>
          </div>

          {/* Bit Depth */}
          <div className="chip border-strong px-2 py-1">
            <span className="text-muted mr-1.5">Bit</span>
            <span className="num text-fg font-semibold text-sm">{echo ? `${echo.md.toFixed(1)} m` : '—'}</span>
          </div>

          {/* Drilling State */}
          <div className="chip border-strong px-2 py-1">
            <span className={echo?.playing ? 'text-emerald-400' : 'text-muted'}>
              {echo?.playing ? `Drilling (rig time ×${echo.speed})` : 'Paused'}
            </span>
          </div>

          {/* Active Act */}
          <div className="chip border-accent/40 bg-accent/10 px-2 py-1 text-accent-fg font-medium">
            Act {currentAct.actNumber}: {currentAct.title}
          </div>

          {/* Agent Mode */}
          <div
            className={clsx(
              'chip px-2 py-1 font-semibold uppercase tracking-wider',
              echo?.agentMode === 'LIVE'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-sky-500/15 text-sky-400 border-sky-500/40'
            )}
          >
            {echo?.agentMode ?? 'SCRIPTED'}
          </div>

          {/* MOC Status */}
          <div
            className={clsx(
              'chip px-2 py-1',
              echo?.approved
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-amber-400 border-amber-500/30'
            )}
          >
            {echo?.approved ? '🛡 MOC Approved' : '⏳ MOC Pending'}
          </div>
        </div>
      </header>

      {/* ── Act Quick Switcher & Takeaway Deck ── */}
      <section className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-muted font-mono">Act Staging (Shift+1…4)</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {ACTS.map((act) => {
            const isActive = echo?.act === act.id;
            return (
              <button
                key={act.id}
                onClick={() => send({ cmd: 'act', id: act.id })}
                className={clsx(
                  'panel p-3.5 text-left transition-all relative overflow-hidden flex flex-col gap-1',
                  isActive
                    ? 'border-accent bg-accent/15 ring-2 ring-accent/70 shadow-lg shadow-accent/15'
                    : 'hover:border-accent/50 hover:bg-panel/80'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-accent-fg">
                    Act {act.actNumber}
                  </span>
                  <span className="num text-xs text-muted">
                    {act.targetMd.toLocaleString('en-IN')} m
                  </span>
                </div>
                <div className="text-sm font-semibold text-fg line-clamp-1">{act.title}</div>
                <div className="text-xs text-muted line-clamp-1">{act.subtitle}</div>
                {isActive && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-bl" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── HUD: Current Turn & Next Turn Callout with Clicker Button ── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Current Turn Status */}
        <div className="md:col-span-4 panel p-4 bg-surface/40 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Current Turn</div>
            {currentTurnObj ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="num text-3xl font-bold text-accent-fg">T{currentTurnObj.n}</span>
                  <span className="chip border-strong text-muted text-xs capitalize">{currentTurnObj.leader}</span>
                </div>
                <div className="mt-1 text-sm font-medium text-fg">
                  {(currentTurnObj.intent ?? currentTurnObj.trigger ?? '').replace(/_/g, ' ')}
                </div>
                <div className="num text-xs text-faint mt-0.5">
                  {currentTurnObj.md_m.toLocaleString('en-IN')} m · {currentTurnObj.mode}
                </div>
              </div>
            ) : (
              <div className="text-sm text-faint italic py-2">Show reset / ready to start</div>
            )}
          </div>
        </div>

        {/* Next Turn Preview */}
        <div className="md:col-span-5 panel p-4 bg-surface/40 flex flex-col justify-between border-dashed">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Next Upcoming Turn</div>
            {nextTurnObj ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="num text-2xl font-bold text-fg">T{nextTurnObj.n}</span>
                  <span className="chip border-accent/40 text-accent-fg text-xs capitalize">
                    {nextTurnObj.leader}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium text-fg line-clamp-1">
                  {(nextTurnObj.intent ?? nextTurnObj.trigger ?? '').replace(/_/g, ' ')}
                </div>
                <div className="num text-xs text-faint mt-0.5">
                  {nextTurnObj.md_m.toLocaleString('en-IN')} m · {nextTurnObj.mode}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted py-2">All scripted crescendo turns completed</div>
            )}
          </div>
        </div>

        {/* Primary Clicker Action Buttons */}
        <div className="md:col-span-3 flex flex-col gap-2 justify-center">
          <button
            onClick={() => send({ cmd: 'next' })}
            disabled={!nextTurnObj}
            className={clsx(
              'btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-md',
              !nextTurnObj && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>Next Turn</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-xs font-mono">N</kbd>
          </button>

          <button
            onClick={() => send({ cmd: 'takeaway' })}
            className={clsx(
              'btn py-2 text-xs flex items-center justify-center gap-2',
              echo?.takeaway && 'border-accent text-accent-fg bg-accent/15'
            )}
          >
            <span>{echo?.takeaway ? 'Hide Takeaway Card' : 'Show Takeaway Card'}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface/50 text-[10px] font-mono">Enter</kbd>
          </button>
        </div>
      </section>

      {/* ── All Turns Grid ── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted font-mono">
            Crescendo Script ({bundle?.turns.length ?? 0} Turns)
          </div>
          <div className="text-xs text-faint font-mono">Click card to jump · 0–9 hotkeys</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {bundle?.turns.map((t) => {
            const isCur = currentTurn === t.n;
            const isFired = currentTurn > t.n;
            const actId = actOfTurn(t);
            const actNum = actId.replace('act', '');

            return (
              <button
                key={t.n}
                onClick={() => send({ cmd: 'turn', n: t.n })}
                className={clsx(
                  'panel p-3.5 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]',
                  isCur && 'border-accent bg-accent/20 ring-2 ring-accent shadow-lg shadow-accent/20',
                  !isCur && isFired && 'border-border/40 opacity-70 bg-surface/30',
                  !isCur && !isFired && 'hover:border-accent/60 hover:bg-panel/80'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx('num text-xl font-bold', isCur ? 'text-accent-fg' : 'text-fg')}>
                      T{t.n}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded bg-surface/60 border border-border/40">
                        Act {actNum}
                      </span>
                      <span
                        className={clsx(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border capitalize',
                          t.leader === 'agent'
                            ? 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                            : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                        )}
                      >
                        {t.leader}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-fg line-clamp-2 leading-snug">
                    {(t.intent ?? t.trigger ?? '').replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-border/20 flex items-center justify-between text-[11px] text-faint num">
                  <span>{t.md_m.toLocaleString('en-IN')} m</span>
                  <span className="text-[10px] uppercase font-mono">{t.mode}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick Actions Toolbar ── */}
      <footer className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={() => send({ cmd: 'toggle' })}>
            Play / pause (Space)
          </button>
          {SPEEDS.map(([s, label]) => (
            <button
              key={s}
              className={clsx('btn text-xs', echo?.speed === s && 'border-accent text-accent-fg')}
              onClick={() => send({ cmd: 'speed', s })}
            >
              {label}
            </button>
          ))}
          <button className="btn text-xs" onClick={() => send({ cmd: 'mode' })}>
            Board / engineer (B)
          </button>
          <button
            className={clsx('btn text-xs', echo?.agentMode === 'LIVE' ? 'text-emerald-400' : 'text-sky-400')}
            onClick={() => send({ cmd: 'agentMode' })}
          >
            Agent {echo?.agentMode ?? 'SCRIPTED'} (V)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'lang' })}>
            Captions (L)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'theme' })}>
            Theme (T)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: '3d' })}>
            3D (D)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'overlay', o: 'memo' })}>
            Memo (M)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'overlay', o: 'audit' })}>
            Audit (A)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'overlay', o: 'whatif' })}>
            What-if (W)
          </button>
          <button className="btn text-xs" onClick={() => send({ cmd: 'overlay', o: 'wcr' })}>
            WCR
          </button>
        </div>

        <button
          className="btn border-risk/60 text-risk hover:bg-risk/10 text-xs font-semibold px-4"
          onClick={() => send({ cmd: 'reset' })}
        >
          Reset Show (Shift+R)
        </button>
      </footer>
    </div>
  );
}
