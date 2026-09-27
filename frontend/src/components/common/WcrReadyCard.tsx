/** WcrReadyCard — shown when the agent finishes the WCR draft (replaces the "Four Layers of AI" ClosingCard,
 *  which is kept in ClosingCard.tsx but no longer mounted). Tells the presenter the draft is ready for human
 *  review and gives the real link to the report in the data lake. Esc / Close dismisses. */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { WCR_REPORT_URL } from '../../lib/reportUrl';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import { useWcrReady } from '../../state/wcrReady';

export default function WcrReadyCard() {
  const { ready, mentions } = useWcrReady();
  const seen = useRef(0); // a new WCR reply from the agent re-opens the card even after Close
  const wcrId = useScenario((s) => s.bundle?.facts.ids.wcr_id) ?? 'WCR';
  const openOverlay = useUi((s) => s.open);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) { setOpen(false); seen.current = 0; return; } // show reset
    if (mentions > seen.current) {
      seen.current = mentions;
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [ready, mentions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() { setOpen(false); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-y-0 left-0 right-[460px] z-40 grid place-items-center bg-app/60 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="panel w-full max-w-[620px] p-7 shadow-2xl"
            initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="chip border-warn/60 text-[11px] font-bold text-warn">DRAFT FOR REVIEW</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{wcrId}</span>
            </div>
            <div className="mt-3 text-[26px] font-semibold text-fg">WCR draft for review is ready</div>
            <div className="mt-2 text-[14px] leading-relaxed text-muted">
              Prepared by the agent from the shift logs, the approved MOC and the action ledger. It stays a draft until the engineer reviews and releases it.
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={WCR_REPORT_URL} target="_blank" rel="noopener" onClick={close}
                className="inline-flex items-center gap-2 rounded-md bg-[#0891B2] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0E7490]">
                📄 Open WCR report ↗
              </a>
              <button onClick={() => { close(); openOverlay('wcr'); }}
                className="rounded-md border border-accent/60 bg-accent/10 px-4 py-2.5 text-[14px] font-semibold text-accent hover:bg-accent/20">
                View in app
              </button>
              <button onClick={close} className="ml-auto text-[13px] text-faint hover:text-fg">Close (Esc)</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
