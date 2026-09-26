import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ACTS, useScenario } from '../../state/scenarioStore';

export default function TakeawayCard() {
  const id = useScenario((s) => s.takeaway);
  const hide = useScenario((s) => s.showTakeaway);
  const act = ACTS.find((a) => a.id === id);

  useEffect(() => {
    if (!act) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, hide]);

  return (
    <AnimatePresence>
      {act && (
        <motion.div
          key={act.id}
          className="absolute inset-y-0 left-0 right-[460px] z-40 grid place-items-center bg-app/70 backdrop-blur-[3px] p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => hide(null)}
        >
          <motion.div
            className="panel max-w-[760px] px-8 py-8 text-center shadow-2xl"
            initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">
              Act {act.actNumber} · {act.title}
            </div>
            <div className="text-[28px] font-semibold leading-[1.25] tracking-tight text-fg">{act.takeaway}</div>
            <div className="mt-4 text-[12.5px] text-faint">{act.subtitle}</div>
            <div className="mt-5 text-[11px] text-muted">Press <span className="kbd">Esc</span> or click anywhere to close</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
