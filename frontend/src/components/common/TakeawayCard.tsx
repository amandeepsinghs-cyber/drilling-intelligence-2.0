/** TakeawayCard — the one sentence the board should remember from each act (checklist §A). Enter toggles, Esc hides. */
import { AnimatePresence, motion } from 'framer-motion';
import { ACTS, useScenario } from '../../state/scenarioStore';

export default function TakeawayCard() {
  const id = useScenario((s) => s.takeaway);
  const hide = useScenario((s) => s.showTakeaway);
  const act = ACTS.find((a) => a.id === id);
  return (
    <AnimatePresence>
      {act && (
        <motion.div
          key={act.id}
          className="absolute inset-0 z-40 grid place-items-center bg-app/70 backdrop-blur-[3px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => hide(null)}
        >
          <motion.div
            className="panel max-w-[980px] px-14 py-10 text-center shadow-2xl"
            initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-accent">
              Act {act.actNumber} · {act.title}
            </div>
            <div className="text-[40px] font-semibold leading-[1.18] tracking-tight text-fg">{act.takeaway}</div>
            <div className="mt-5 text-[13px] text-faint">{act.subtitle}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
