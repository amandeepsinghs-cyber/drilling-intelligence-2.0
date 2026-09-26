/** WcrOverlay — WCR draft over the command center (turn 10). */
import { AnimatePresence, motion } from 'framer-motion';
import { useUi } from '../../state/uiStore';
import WcrDocument from './WcrDocument';

export default function WcrOverlay() {
  const open = useUi((s) => s.overlays.wcr);
  const close = useUi((s) => s.close);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close('wcr')}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16 }} transition={{ duration: 0.18 }}
            className="relative max-h-[88vh] w-[980px] overflow-y-auto rounded-xl bg-[#FBFCFD] p-8 shadow-2xl">
            <div className="absolute right-6 top-6 flex gap-2">
              <button disabled title="Google Docs export — build.md Phase 5" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-500">Open in Google Docs</button>
              <button onClick={() => close('wcr')} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600">Esc</button>
            </div>
            <WcrDocument />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
