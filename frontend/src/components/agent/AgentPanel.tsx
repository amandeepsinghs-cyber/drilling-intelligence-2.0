/** AgentPanel — the agent stage (WP-04).
 * Top: the current answer, large (Hindi first, English below), the reasoning steps in plain words, and the evidence.
 * Idle: never empty — a live "well at a glance" card and example questions.
 * Below: earlier turns, compact. Footer: hold-to-talk + typed question. Connection state is a small pill, never blocking. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fmt, fmtInt, indexAt, num, str } from '../../lib/frames';
import { liveClient, type LiveStatus } from '../../live/liveClient';
import { useAgent, type AgentMessage } from '../../state/agentStore';
import { toggleAgentMode } from '../../state/presenter';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import CitationCard from './CitationCard';
import VoiceRing from './VoiceRing';

/** Tool name → what the agent did, in plain words (shown as reasoning steps). */
const STEP: Record<string, string> = {
  get_well_status: 'Read the live well data',
  get_lithology: 'Checked the ML lithology at the bit',
  forecast_pore_pressure: 'Forecast pore pressure ahead of the bit',
  compute_ecd: 'Calculated the ECD',
  compute_barite: 'Calculated the barite needed',
  search_knowledge: 'Searched offset reports and SOPs',
  lookup_offset_events: 'Checked what happened in the offset wells',
  create_moc_memo: 'Drafted the MOC memo',
  request_approval: 'Asked for your approval',
  dispatch_fanout: 'Sent the instructions to the team',
  set_rop_cap: 'Set the ROP limit',
  generate_wcr: 'Drafted the well completion report',
  writeback_lessons: 'Saved the lessons learned',
};
const EXAMPLES = ['Well ka status batao', 'Agle zone tak kitna time lagega?', 'Paas wale rig pe kya hua tha?'];

function StatusPill({ live, mode }: { live: LiveStatus; mode: string }) {
  const ok = live === 'connected' || live === 'reconnecting';
  const text = mode === 'SCRIPTED' ? 'Scripted' : ok ? 'Gemini Live' : live === 'fallback' ? 'Rehearsal engine' : 'Connecting';
  return (
    <button onClick={toggleAgentMode} title="Agent mode (V): LIVE = Gemini answers and acts; SCRIPTED = rehearsal script"
      className={clsx('chip text-[10.5px]', ok && mode === 'LIVE' ? 'border-ok/50 text-ok' : 'border-strong text-muted')}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', ok && mode === 'LIVE' ? 'animate-pulse bg-ok' : 'bg-warn')} />{text}
    </button>
  );
}

function WellGlance() {
  const data = useScenario((s) => s.data);
  const bundle = useScenario((s) => s.bundle);
  const md = useScenario((s) => s.md);
  if (!data || !bundle) return null;
  const f = bundle.facts;
  const i = indexAt(data, md);
  const unit = f.stratigraphy.find((u) => md >= u.top_m && md < u.base_m);
  const next = f.stratigraphy.find((u) => u.top_m > md);
  const rop = num(data, 'drilling.ROP', i);
  const dist = next ? next.top_m - md : null;
  const etaMin = dist != null && rop ? (dist / rop) * 60 : null;
  const ob = num(data, 'derived.OVERBAL_PSI', i);
  const litho = str(data, 'ml.litho.class', i);
  const row = (k: string, v: string, tone = 'text-fg') => (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5 last:border-b-0">
      <span className="text-[13px] text-muted">{k}</span><span className={clsx('num text-[15px] font-semibold', tone)}>{v}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-line bg-raised/60 p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Well at a glance</div>
      {row('Bit depth', `${fmt(md, 1)} m`)}
      {row('Formation at bit', `${unit?.id ?? '—'} · ${litho ?? '—'}`)}
      {next && row(`Next zone (${next.id} top)`, `${fmtInt(dist)} m · ${etaMin != null ? `${Math.floor(etaMin / 60)} h ${Math.round(etaMin % 60)} min` : '—'}`)}
      {row('Overbalance now', `${ob != null ? (ob > 0 ? '+' : '') + fmtInt(ob) : '—'} psi`, ob != null && ob < 0 ? 'text-risk' : 'text-ok')}
    </div>
  );
}

function Stage({ m, speaking }: { m: AgentMessage; speaking: boolean }) {
  const lang = useUi((s) => s.lang);
  return (
    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={clsx('rounded-xl border p-4', m.proactive ? 'border-risk/50 bg-risk/[0.07]' : 'border-accent/30 bg-accent/[0.04]')}>
      <div className="mb-2 flex items-center justify-between">
        <span className={clsx('text-[11px] font-bold uppercase tracking-[0.18em]', m.proactive ? 'text-risk' : 'text-accent')}>
          {m.proactive ? 'Agent · warning' : 'Agent'}{speaking && <span className="ml-2 animate-pulse text-ok">● speaking</span>}
        </span>
        <span className="num text-[11px] text-faint">{m.md.toLocaleString('en-IN')} m{m.turn !== undefined ? ` · turn ${m.turn}` : ''}</span>
      </div>
      {lang !== 'en' && m.hi && <p className="devanagari text-[24px] font-medium leading-[1.45] text-fg">{m.hi}</p>}
      {lang !== 'hi' && m.en && (lang === 'en' || m.en !== m.hi) && <p className={clsx('leading-relaxed', lang === 'en' ? 'text-[20px] text-fg' : 'mt-2 text-[15px] text-muted')}>{m.en}</p>}
      {m.tools.length > 0 && (
        <ol className="mt-3 space-y-1 border-t border-line/70 pt-2.5">
          {m.tools.map((t, k) => (
            <li key={t.name + k} className="flex items-center gap-2 text-[13.5px]">
              <span className={clsx('grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                t.status === 'done' ? 'bg-ok/20 text-ok' : 'animate-pulse bg-accent/20 text-accent')}>{t.status === 'done' ? '✓' : '…'}</span>
              <span className={t.status === 'done' ? 'text-fg' : 'text-muted'}>{STEP[t.name] ?? t.name.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ol>
      )}
      {m.citations.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">Evidence</div>
          {m.citations.slice(0, 2).map((c) => <CitationCard key={c.doc_id + c.section} c={c} />)}
        </div>
      )}
    </motion.div>
  );
}

export default function AgentPanel() {
  const { messages, voice } = useAgent();
  const { lang, cycleLang, agentMode } = useUi();
  const [live, setLive] = useState<LiveStatus>('disconnected');
  const [talking, setTalking] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    liveClient.connect();
    return liveClient.onStatusChange((s) => setLive(s));
  }, []);

  const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
  const lastPresenter = [...messages].reverse().find((m) => m.role === 'presenter');
  const history = messages.filter((m) => m.id !== lastAgent?.id && m.id !== lastPresenter?.id).slice(-6).reverse();

  const start = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try { setTalking(true); await liveClient.startTalking(); } catch (err) { console.warn('Microphone error:', err); setTalking(false); }
  };
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); if (talking) { setTalking(false); liveClient.stopTalking(); } };
  const send = (text: string) => { if (text.trim()) liveClient.sendText(text.trim()); };

  return (
    <aside className="panel flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <VoiceRing state={voice} />
        <div className="ml-auto flex items-center gap-2">
          <StatusPill live={live} mode={agentMode} />
          <button onClick={cycleLang} className="kbd py-0.5" title="Caption language (L)">{lang === 'both' ? 'हिं + EN' : lang === 'en' ? 'EN' : 'हिंदी'}</button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lastPresenter && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-br-sm border border-line bg-raised px-3 py-2">{/* facts-ok css */}
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-faint">Presenter</div>
              <div className="text-[15px] text-fg">{lastPresenter.en || lastPresenter.hi}</div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {lastAgent ? <Stage m={lastAgent} speaking={voice === 'speaking'} /> : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <WellGlance />
              <div className="rounded-xl border border-dashed border-line p-4">
                <div className="text-[15px] text-fg">Ask in Hindi, English or Hinglish</div>
                <div className="devanagari text-[14px] text-muted">हिंदी, अंग्रेज़ी या हिंग्लिश में पूछिए</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border border-accent/40 bg-accent/5 px-3 py-1 text-[13px] text-accent hover:bg-accent/15">“{q}”</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {lastAgent && <WellGlance />}
        {history.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-faint">Earlier</div>
            {history.map((m) => (
              <div key={m.id} className="flex gap-2 text-[12.5px] leading-snug">
                <span className={clsx('shrink-0 font-semibold', m.role === 'agent' ? 'text-accent' : 'text-muted')}>{m.role === 'agent' ? 'Agent' : 'You'}</span>
                <span className="line-clamp-2 text-muted">{m.en || m.hi}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onTouchStart={start} onTouchEnd={stop}
            className={clsx('btn h-11 flex-1 select-none justify-center text-[15px] transition-all', talking ? 'bg-risk text-white ring-2 ring-risk/50' : 'border-accent/50 text-accent hover:bg-accent/10')}
            title="Hold to speak, release to send">
            <svg width="16" height="16" viewBox="0 0 14 14" className={clsx(talking && 'animate-pulse')}>
              <rect x="4.5" y="1" width="5" height="8" rx="2.5" fill="currentColor" />
              <path d="M2.5 6.5a4.5 4.5 0 0 0 9 0M7 11v2" stroke="currentColor" fill="none" strokeWidth="1.3" />
            </svg>
            {talking ? 'Listening… release to send' : 'Hold to talk'}
          </button>
          {voice === 'speaking' && (
            <button onClick={() => liveClient.interrupt()} className="btn h-11 border-risk/40 px-3 text-[13px] text-risk" title="Interrupt the agent">Stop</button>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(typed); setTyped(''); }} className="flex items-center gap-1.5">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type a question…"
            className="flex-1 rounded-lg border border-line bg-app px-3 py-1.5 text-[13.5px] text-fg placeholder:text-faint focus:border-accent focus:outline-none" />
          <button type="submit" className="btn py-1.5 text-[13px]">Ask</button>
        </form>
      </footer>
    </aside>
  );
}
