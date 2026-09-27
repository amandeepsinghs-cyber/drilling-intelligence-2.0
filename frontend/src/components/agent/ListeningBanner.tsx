/** ListeningBanner — a large, room-visible "mic is open" indicator for press-to-talk (clicker / pointer).
 *  Shown while the mic is open, and while the app is waiting to learn the clicker's talk button. */
import { AnimatePresence, motion } from 'framer-motion';
import { useTalk } from '../../state/talk';

export default function ListeningBanner() {
  const talking = useTalk((s) => s.talking);
  const learning = useTalk((s) => s.learning);
  const show = talking || learning;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={talking ? 'talk' : 'learn'}
          data-testid="listening-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex justify-center"
        >
          <div
            className={
              talking
                ? 'flex items-center gap-3 rounded-full bg-risk px-7 py-3 text-[22px] font-semibold text-white shadow-2xl ring-4 ring-risk/40'
                : 'flex items-center gap-3 rounded-full bg-accent px-7 py-3 text-[20px] font-semibold text-white shadow-2xl ring-4 ring-accent/40'
            }
          >
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-white" />
            </span>
            {talking ? '🎙 Listening… press again to send' : 'Press your clicker / pointer button for TALK… (Esc to cancel)'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
