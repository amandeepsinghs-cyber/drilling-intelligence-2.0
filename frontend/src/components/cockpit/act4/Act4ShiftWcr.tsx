/** Act4ShiftWcr — WP-09. Shift handover notes ⇄ WCR draft, side by side; hover a note to see where it lands in the WCR.
 *  Notes come from the backend `draft_shift_log` tool (LIVE tool call or SCRIPTED via /api/tools), each with its source. */
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLedger } from '../../../state/ledgerStore';
import { useScenario } from '../../../state/scenarioStore';
import { askAgent } from '../../../state/turnMachine';
import { useUi } from '../../../state/uiStore';

const WCR_SECTIONS = [
  'Geological summary & stratigraphy',
  'Drilling operations & ROP log',
  'Mud program & weight-up',
  'Well control audit',
  'Casing & cementing',
];
const secNo = (s: string) => parseInt(s, 10) || 0;

export default function Act4ShiftWcr() {
  const bundle = useScenario((s) => s.bundle);
  const entries = useLedger((s) => s.entries);
  const openOverlay = useUi((s) => s.open);
  const [hover, setHover] = useState<number | null>(null);
  const shift = entries.find((e) => e.id === 'SHIFT_LOG');
  const wcr = entries.find((e) => e.id === 'WCR');
  const md = useScenario((s) => s.md);
  if (!bundle) return null;
  const f = bundle.facts;
  const lines = (shift?.lines ?? []).filter((l) => l.md_m <= md + 0.5); // never report events below the bit · facts-ok tolerance
  const hoverSec = hover !== null ? secNo(lines[hover]?.wcr_section ?? '') : 0;

  if (!shift) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-[16px] text-fg">Section drilled with no kick and no losses.</div>
        <div className="max-w-md text-[13px] text-muted">Ask the agent for the shift handover — it writes the notes from the log and the ledger, then turns them into the WCR draft.</div>
        <div className="flex gap-2">
          {['Shift handover notes banao', 'WCR draft karo'].map((q) => (
            <button key={q} onClick={() => askAgent(q)} className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[13px] text-accent hover:bg-accent/20">“{q}”</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-3 p-3 pt-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)' }}>
      <section className="flex min-h-0 flex-col">
        <div className="mb-1.5 flex items-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Shift handover notes <span className="ml-2 font-normal normal-case tracking-normal text-faint">drafted by the agent · each line has a source</span>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {lines.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              className={clsx('cursor-default rounded-lg border px-3 py-2', hover === i ? 'border-accent bg-accent/10' : 'border-line bg-surface/70')}>
              <div className="flex items-baseline gap-2">
                <span className="num shrink-0 text-[12px] text-accent">{l.md_m.toLocaleString('en-IN')} m</span>
                <span className="text-[13.5px] leading-snug text-fg">{l.text}</span>
              </div>
              <div className="mt-0.5 flex gap-2 text-[11px] text-faint"><span>source: {l.source}</span><span className="ml-auto">→ WCR §{secNo(l.wcr_section)}</span></div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="mb-1.5 flex items-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          WCR draft
          <span className="ml-2 font-normal normal-case tracking-normal text-faint">{wcr ? wcr.title : `${f.ids.wcr_id} · builds from the notes`}</span>
          <button onClick={() => openOverlay('wcr')} className="ml-auto rounded border border-accent/50 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-accent hover:bg-accent/10">Open full WCR</button>
        </div>
        <article className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-[#FBFCFD] p-4 text-[12.5px] text-[#0B1520]">{/* facts-ok css */}
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Well completion report · draft · {f.well.id}</div>
          {WCR_SECTIONS.map((title, si) => {
            const n = si + 1;
            const mine = lines.filter((l) => secNo(l.wcr_section) === n);
            return (
              <div key={title} className={clsx('mt-2 rounded px-2 py-1.5 transition-colors', hoverSec === n ? 'bg-cyan-100/70 ring-1 ring-cyan-500' : '')}>
                <div className="font-semibold">{n}. {title}</div>
                {mine.length === 0 ? <div className="text-[11.5px] text-slate-400">From the daily reports (not part of this shift).</div> : (
                  <ul className="ml-4 list-disc text-[12px] text-slate-700">
                    {mine.map((l, k) => <li key={k}>{l.text} <span className="text-[10.5px] text-slate-400">[{l.source}]</span></li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </article>
      </section>
    </div>
  );
}
