/** DemoGuide — top-bar slide-over drawer (hotkey G) + standalone /guide page for Short (15m) & Full 25+ Question Bank. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../common/AppHeader';
import { useScenario, type ActId } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';

interface ShortTurn {
  turn: string;
  mode: string;
  gate?: boolean;
  prompt: string;
  expected: string;
  cue: string;
}

interface ShortAct {
  act: ActId;
  actTitle: string;
  depth: string;
  turns: ShortTurn[];
}

interface QuestionItem {
  id: string;
  act: ActId;
  actLabel: string;
  priority: 'must' | 'addon' | 'optional';
  gate?: boolean;
  depth: string;
  prompt: string;
  expected: string;
  why: string;
}

interface CurveballItem {
  title: string;
  prompt: string;
  expected: string;
}

interface QaItem {
  q: string;
  a: string;
}

interface DemoFlowPayload {
  shortFlow: ShortAct[];
  questions: QuestionItem[];
  curveballs: CurveballItem[];
  boardQa: QaItem[];
}

let cachedPayload: DemoFlowPayload | null = null;

function useDemoFlowData() {
  const [data, setData] = useState<DemoFlowPayload | null>(cachedPayload);
  useEffect(() => {
    if (cachedPayload) return;
    fetch('/docs/demo_flow.json', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: DemoFlowPayload) => {
        cachedPayload = d;
        setData(d);
      })
      .catch(() => {});
  }, []);
  return data;
}

type GuideTab = 'long' | 'short' | 'curveballs';
type PriorityFilter = 'all' | 'must' | 'act';

function PriorityBadge({ priority, gate }: { priority: QuestionItem['priority']; gate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {priority === 'must' && (
        <span className="chip border-accent/60 bg-accent/15 font-semibold text-accent">★ MUST ASK</span>
      )}
      {priority === 'addon' && (
        <span className="chip border-ok/40 text-ok">ADD-ON</span>
      )}
      {priority === 'optional' && (
        <span className="chip border-strong text-faint">OPTIONAL</span>
      )}
      {gate && (
        <span className="chip border-warn/60 bg-warn/10 font-semibold text-warn">CLICK GATE</span>
      )}
    </span>
  );
}

function CopyPromptButton({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  if (text.startsWith('[')) return null;
  const onCopy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      id={`copy-prompt-${id}`}
      type="button"
      onClick={onCopy}
      className="kbd shrink-0 px-2 py-0.5 text-[10.5px] transition-colors hover:border-accent/60 hover:text-accent"
      title="Copy prompt to clipboard"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function GuideBody({ compact = false }: { compact?: boolean }) {
  const payload = useDemoFlowData();
  const activeAct = useScenario((s) => s.act);
  const md = useScenario((s) => s.md);
  const [tab, setTab] = useState<GuideTab>('long');
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [query, setQuery] = useState('');

  const filteredQuestions = useMemo(() => {
    if (!payload) return [];
    return payload.questions.filter((q) => {
      if (filter === 'must' && q.priority !== 'must') return false;
      if (filter === 'act' && q.act !== activeAct) return false;
      if (query.trim()) {
        const needle = query.toLowerCase();
        return (
          q.id.toLowerCase().includes(needle) ||
          q.prompt.toLowerCase().includes(needle) ||
          q.expected.toLowerCase().includes(needle) ||
          q.why.toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [payload, filter, activeAct, query]);

  if (!payload) {
    return <div className="py-8 text-center text-xs text-muted">Loading demo playbook…</div>;
  }

  const mustCount = payload.questions.filter((q) => q.priority === 'must').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top Tabs + Search/Filter Bar */}
      <div className={clsx('flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel/40', compact ? 'px-4 py-2.5' : 'px-6 py-3')}>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-app/60 p-0.5">
          <button
            id="guide-tab-long"
            type="button"
            onClick={() => setTab('long')}
            className={clsx('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', tab === 'long' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
          >
            Full Bank ({payload.questions.length})
          </button>
          <button
            id="guide-tab-short"
            type="button"
            onClick={() => setTab('short')}
            className={clsx('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', tab === 'short' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
          >
            Short Flow
          </button>
          <button
            id="guide-tab-curveballs"
            type="button"
            onClick={() => setTab('curveballs')}
            className={clsx('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', tab === 'curveballs' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
          >
            Curveballs &amp; Q&amp;A
          </button>
        </div>

        {tab === 'long' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="guide-filter-all"
              type="button"
              onClick={() => setFilter('all')}
              className={clsx('chip cursor-pointer transition-colors', filter === 'all' ? 'border-accent/60 text-accent' : 'border-line text-muted hover:text-fg')}
            >
              All ({payload.questions.length})
            </button>
            <button
              id="guide-filter-must"
              type="button"
              onClick={() => setFilter('must')}
              className={clsx('chip cursor-pointer transition-colors', filter === 'must' ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-fg')}
            >
              ★ Must Ask ({mustCount})
            </button>
            <button
              id="guide-filter-act"
              type="button"
              onClick={() => setFilter('act')}
              className={clsx('chip cursor-pointer transition-colors', filter === 'act' ? 'border-accent/60 text-accent' : 'border-line text-muted hover:text-fg')}
            >
              Current ({activeAct.toUpperCase()})
            </button>
            {!compact && (
              <input
                id="guide-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search prompts…"
                className="ml-1 rounded-md border border-line bg-app px-2.5 py-1 text-xs text-fg placeholder:text-faint focus:border-accent focus:outline-none"
              />
            )}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className={clsx('min-h-0 flex-1 space-y-4 overflow-y-auto', compact ? 'px-4 py-3' : 'px-6 py-5')}>
        {/* Non-negotiable reminder */}
        <div className="rounded-lg border border-warn/40 bg-warn/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
          <span className="font-semibold text-warn">Two Click Gates:</span> Spoken &ldquo;approve&rdquo; is intentionally refused. Click{' '}
          <span className="font-semibold text-fg">Approve</span> on the MOC memo (Act 3) and{' '}
          <span className="font-semibold text-fg">Approve ROP cap</span> at the drilling break (Act 4).{' '}
          <span className="font-semibold text-warn">Language:</span> it answers in the language you speak (English or Hinglish). Live bit:{' '}
          <span className="num font-semibold text-fg">{md.toFixed(1)}</span> {/* facts-ok: live bit depth readout */}
        </div>

        {tab === 'long' && (
          <div className="space-y-2.5">
            {filteredQuestions.map((q) => {
              const isCurrentAct = q.act === activeAct;
              return (
                <article
                  key={q.id}
                  className={clsx(
                    'rounded-lg border px-3.5 py-3 transition-colors',
                    q.priority === 'must'
                      ? 'border-accent/45 bg-raised'
                      : 'border-line bg-panel/40',
                    isCurrentAct && 'ring-1 ring-accent/25'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-xs font-bold text-fg">{q.id}</span>
                      <PriorityBadge priority={q.priority} gate={q.gate} />
                      <span className="num text-[11px] text-faint">{q.depth}</span>
                      {isCurrentAct && <span className="text-[10px] uppercase tracking-wider text-ok">● Active Act</span>}
                    </div>
                    <CopyPromptButton text={q.prompt} id={q.id} />
                  </div>
                  <div className="mt-2 text-[13.5px] font-medium leading-snug text-fg">
                    &ldquo;{q.prompt}&rdquo;
                  </div>
                  <div className="mt-1.5 text-[12px] leading-relaxed text-muted">
                    <span className="font-medium text-faint">Expected: </span>
                    {q.expected}
                  </div>
                  <div className="mt-1 text-[11.5px] text-faint">
                    <span className="text-accent/80">Why it lands: </span>
                    {q.why}
                  </div>
                </article>
              );
            })}
            {filteredQuestions.length === 0 && (
              <div className="py-6 text-center text-xs text-faint">No questions match this filter.</div>
            )}
          </div>
        )}

        {tab === 'short' && (
          <div className="space-y-5">
            {payload.shortFlow.map((section) => {
              const isCurrent = section.act === activeAct;
              return (
                <section key={section.act} className="space-y-2">
                  <div className="flex items-center justify-between border-b border-line pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="panel-title">{section.actTitle}</span>
                      {isCurrent && <span className="chip border-ok/40 text-ok">Active Act</span>}
                    </div>
                    <span className="num text-[11px] text-muted">{section.depth}</span>
                  </div>
                  <div className="space-y-2">
                    {section.turns.map((t) => (
                      <div
                        key={t.turn}
                        className={clsx(
                          'rounded-lg border px-3.5 py-2.5',
                          t.gate ? 'border-warn/50 bg-warn/5' : 'border-line bg-raised'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="kbd px-1.5 py-0.5 text-[11px]">{t.turn}</span>
                            <span className={clsx('chip', t.gate ? 'border-warn/60 text-warn' : 'border-strong text-muted')}>
                              {t.mode}
                            </span>
                          </div>
                          <CopyPromptButton text={t.prompt} id={t.turn} />
                        </div>
                        <div className="mt-1.5 text-[13px] font-medium text-fg">
                          {t.prompt.startsWith('[') ? t.prompt : `“${t.prompt}”`}
                        </div>
                        <div className="mt-1 text-[12px] text-muted">{t.expected}</div>
                        <div className="mt-1 text-[11px] text-accent/90">Cue: {t.cue}</div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {tab === 'curveballs' && (
          <div className="space-y-5">
            <section className="space-y-2">
              <div className="panel-title">Off-Script Curveballs (Live Capability Proofs)</div>
              {payload.curveballs.map((cb, idx) => (
                <div key={cb.title} className="rounded-lg border border-line bg-raised px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-accent">{cb.title}</span>
                    <CopyPromptButton text={cb.prompt} id={`cb-${idx}`} />
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-fg">&ldquo;{cb.prompt}&rdquo;</div>
                  <div className="mt-1 text-[12px] text-muted">{cb.expected}</div>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <div className="panel-title">Executive / Board Q&amp;A Crib Sheet</div>
              {payload.boardQa.map((item) => (
                <div key={item.q} className="rounded-lg border border-line bg-panel/40 px-3.5 py-2.5">
                  <div className="text-xs font-semibold text-fg">{item.q}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-muted">{item.a}</div>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export function DemoGuideDrawer() {
  const open = useUi((s) => s.overlays.guide);
  const close = useUi((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close('guide');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 540, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 540, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="panel absolute bottom-3 right-3 top-3 z-50 flex w-[520px] max-w-[92vw] flex-col overflow-hidden shadow-glow"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <div className="panel-title">Demo Playbook &amp; Question Bank</div>
              <div className="text-xs text-muted">★ Highlighted Board picks · Short &amp; Long flows</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                id="drawer-open-guide-tab"
                href="/guide"
                target="_blank"
                rel="noopener noreferrer"
                className="kbd px-2 py-1 text-[11px] hover:border-accent/60 hover:text-accent"
                title="Open full-page guide in a new browser tab"
              >
                New tab ↗
              </a>
              <button id="drawer-close-guide" type="button" className="kbd px-2 py-1" onClick={() => close('guide')}>
                Esc
              </button>
            </div>
          </header>
          <GuideBody compact />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default function DemoGuidePage() {
  return (
    <div className="flex h-full flex-col bg-app text-fg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel/60 px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="shrink-0">
            <Wordmark />
          </Link>
          <span className="border-l border-line pl-4 text-sm font-semibold text-fg">
            Sagar Drishti — Demo Flow &amp; 25-Question Playbook
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs">
          <a
            id="guide-raw-short-md"
            href="/docs/demo_flow_short.md"
            target="_blank"
            rel="noopener noreferrer"
            className="kbd px-2.5 py-1 hover:border-accent/60 hover:text-accent"
          >
            demo_flow_short.md ↗
          </a>
          <a
            id="guide-raw-long-md"
            href="/docs/demo_flow_long.md"
            target="_blank"
            rel="noopener noreferrer"
            className="kbd px-2.5 py-1 hover:border-accent/60 hover:text-accent"
          >
            demo_flow_long.md ↗
          </a>
          <Link
            id="guide-open-cockpit"
            to="/well/MN-SM-DW-01"
            className="btn border-accent/60 px-3 py-1 text-xs text-accent"
          >
            Open Live Cockpit →
          </Link>
        </div>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <GuideBody />
      </div>
    </div>
  );
}
