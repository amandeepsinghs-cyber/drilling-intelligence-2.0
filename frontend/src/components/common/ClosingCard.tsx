/** ClosingCard — "Four layers of AI" summary after the WCR turn (checklist §A, FT-9).
 *  Data (hi-res logs) · Physics (PP/FG, ECD) · ML (lithology, kick risk) · Agent (voice, memo, actions).
 *  Text only, no numbers unless read from bundle.facts. Esc closes. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLedger } from '../../state/ledgerStore';

const LAYERS = [
  {
    layer: 'Data',
    title: 'Hi-res logs',
    desc: 'High-resolution well logs and cuttings, lined up to the bit depth.',
    accent: 'text-accent border-accent/30 bg-accent/5',
  },
  {
    layer: 'Physics',
    title: 'PP/FG · ECD',
    desc: 'Pore pressure, fracture limit and mud pressure computed live — the safe window at every metre.',
    accent: 'text-ok border-ok/30 bg-ok/5',
  },
  {
    layer: 'ML',
    title: 'Lithology · Kick risk',
    desc: 'Rock type at the bit before cuttings arrive, learned from the offset wells; kick risk flagged ahead of the sand.',
    accent: 'text-ml border-ml/30 bg-ml/5',
  },
  {
    layer: 'Agent',
    title: 'Voice · Memo · Actions',
    desc: 'Answers in Hindi or English, drafts the memo with its sources, and sends instructions only after approval.',
    accent: 'text-warn border-warn/30 bg-warn/5',
  },
] as const;

export default function ClosingCard() {
  const hasWcr = useLedger((s) => s.entries.some((e) => e.id === 'WCR'));
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasWcr && !dismissed) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [hasWcr, dismissed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        setDismissed(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-y-0 left-0 right-[460px] z-40 grid place-items-center bg-app/80 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { setOpen(false); setDismissed(true); }}
        >
          <motion.div
            className="panel max-w-[760px] p-8 text-center shadow-2xl"
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.24em] text-accent">
              Drilling Intelligence Platform · Synthesis
            </div>
            <h2 className="text-[28px] font-bold tracking-tight text-fg">
              Four Layers of AI
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              One system: the agent prepares, the engineer decides.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              {LAYERS.map((item) => (
                <div key={item.layer} className={`rounded-xl border p-4 ${item.accent}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{item.layer}</span>
                    <span className="text-[13px] font-semibold text-fg">{item.title}</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-[12px] text-faint">
              <span>Press <span className="kbd">Esc</span> to return to cockpit</span>
              <button
                onClick={() => { setOpen(false); setDismissed(true); }}
                className="btn py-1 text-[12px]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
