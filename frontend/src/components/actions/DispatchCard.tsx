/** DispatchCard — fan-out status per channel (queued → sent → delivered), read from the ledger. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useLedger } from '../../state/ledgerStore';

export default function DispatchCard() {
  const d = useLedger((s) => s.entries.find((e) => e.id === 'DISPATCH'));
  return (
    <AnimatePresence>
      {d && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="panel absolute bottom-3 left-3 z-20 w-[300px] p-3">
          <div className="panel-title mb-2">MOC fan-out</div>
          <ul className="space-y-1.5">
            {d.channels?.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-fg">{c.channel}</span>
                <span className="flex items-center gap-2">
                  <span className="num text-[10px] text-faint">{c.id}</span>
                  <span className={clsx('chip', c.status === 'delivered' ? 'border-ok/50 text-ok' : c.status === 'sent' ? 'border-accent/50 text-accent' : 'border-strong text-muted')}>{c.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
