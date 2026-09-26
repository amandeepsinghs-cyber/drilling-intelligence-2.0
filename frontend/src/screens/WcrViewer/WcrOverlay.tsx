/** WcrOverlay — WCR draft over the command center (turn 10). */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUi } from '../../state/uiStore';
import WcrDocument from './WcrDocument';
import ShiftNotesTab from './ShiftNotesTab';
import WcrCompareView from './WcrCompareView';

export default function WcrOverlay() {
  const open = useUi((s) => s.overlays.wcr);
  const close = useUi((s) => s.close);
  const [tab, setTab] = useState<'compare' | 'wcr' | 'shifts'>('compare');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => close('wcr')}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16 }}
            transition={{ duration: 0.18 }}
            className="relative max-h-[92vh] w-[1360px] max-w-[96vw] overflow-y-auto rounded-xl bg-app border border-line p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div className="flex overflow-hidden rounded-lg border border-line bg-surface p-0.5 text-xs">
                <button
                  onClick={() => setTab('compare')}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    tab === 'compare' ? 'bg-panel text-accent shadow-xs font-semibold' : 'text-muted hover:text-fg'
                  }`}
                >
                  📑 Shift Notes ⇄ WCR (Compare)
                </button>
                <button
                  onClick={() => setTab('wcr')}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    tab === 'wcr' ? 'bg-panel text-accent shadow-xs font-semibold' : 'text-muted hover:text-fg'
                  }`}
                >
                  📄 Executive WCR Report
                </button>
                <button
                  onClick={() => setTab('shifts')}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    tab === 'shifts' ? 'bg-panel text-accent shadow-xs font-semibold' : 'text-muted hover:text-fg'
                  }`}
                >
                  📋 Raw Shift Notes (8)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button disabled title="Google Docs export — build.md Phase 5" className="btn py-1 text-xs opacity-60">
                  Open in Google Docs
                </button>
                <button onClick={() => close('wcr')} className="btn py-1 px-3 text-xs">
                  Esc
                </button>
              </div>
            </div>
            {tab === 'compare' ? <WcrCompareView /> : tab === 'wcr' ? <div className="bg-[#FBFCFD] p-6 rounded-lg text-[#0B1520]"><WcrDocument /></div> : <ShiftNotesTab />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
