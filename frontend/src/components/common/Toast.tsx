/** Toast — single transient status line (approvals, caps, gating). */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useUi } from '../../state/uiStore';

export default function Toast() {
  const toast = useUi((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => useUi.setState({ toast: null }), 3200);
    return () => clearTimeout(h);
  }, [toast]);
  const tone = toast?.tone === 'ok' ? 'border-ok/50 text-ok' : toast?.tone === 'warn' ? 'border-warn/50 text-warn' : toast?.tone === 'risk' ? 'border-risk/50 text-risk' : 'border-accent/50 text-accent';
  return (
    <AnimatePresence>
      {toast && (
        <motion.div key={toast.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className={`panel absolute left-1/2 top-4 z-50 -translate-x-1/2 border px-4 py-2 text-sm ${tone}`}>
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
