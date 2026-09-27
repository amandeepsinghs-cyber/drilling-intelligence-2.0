/** RopCapApprovalCard — Approval 2. The ROP cap instruction at the drilling break waits for the
 *  Superintendent's on-screen click. Floats over the cockpit so it is visible whichever Act 4 panel is showing.
 *  Voice / typed "approve" never applies it (see turnMachine.approveRopCap). */
import { AnimatePresence, motion } from 'framer-motion';
import { useScenario } from '../../state/scenarioStore';
import { approveRopCap } from '../../state/turnMachine';

export default function RopCapApprovalCard() {
  const bundle = useScenario((s) => s.bundle);
  const breakFired = useScenario((s) => !!s.fired.T9_DRILLING_BREAK);
  const ropCapped = useScenario((s) => s.ropCapped);
  const show = !!bundle && breakFired && !ropCapped;

  let body = null;
  if (show && bundle) {
    const f = bundle.facts;
    const brk = f.checkpoints.find((c) => c.label === 'Drilling break');
    const cap = f.checkpoints.find((c) => c.label === 'After ROP cap');
    const fit = f.casing.last_shoe.fit_ppg;
    const n2 = (v: unknown) => (typeof v === 'number' ? v.toFixed(2) : '—');
    const margin = (v: unknown) => (typeof v === 'number' ? (fit - v).toFixed(2) : '—');
    body = (
      <motion.div key="rop-cap-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="pointer-events-auto w-full max-w-2xl rounded-xl border-2 border-warn/60 bg-surface/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="chip animate-pulse border-warn/60 text-[11px] font-bold text-warn">AWAITING YOUR APPROVAL</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Approval 2 · ROP cap instruction</span>
        </div>
        <div className="mt-3 text-[17px] font-semibold text-fg">
          Drilling break at {brk?.md_m?.toLocaleString('en-IN') ?? '—'} m — ECD {n2(brk?.ecd_ppg)} ppg, only {margin(brk?.ecd_ppg)} ppg below shoe FIT {fit.toFixed(2)} ppg
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
          <div className="rounded-lg border border-line p-2.5"><div className="text-[11px] uppercase tracking-wider text-faint">Now</div><div className="num text-fg">ROP {String(brk?.rop_m_hr ?? '—')} m/hr</div></div>
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-2.5"><div className="text-[11px] uppercase tracking-wider text-faint">Proposed</div><div className="num text-accent">ROP cap {f.drilling.rop_cap_m_hr} m/hr + sweeps</div></div>
          <div className="rounded-lg border border-line p-2.5"><div className="text-[11px] uppercase tracking-wider text-faint">Expected</div><div className="num text-fg">ECD {n2(cap?.ecd_ppg)} ppg · margin {margin(cap?.ecd_ppg)}</div></div>
        </div>
        <div className="mt-2 text-[12px] text-muted">Why: avoids a repeat of the offset-well losses in this break. Nothing is applied until you approve.</div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <span className="text-[12px] text-faint">Drilling is holding at the break</span>
          <button onClick={() => void approveRopCap()} className="rounded-md bg-[#0891B2] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#0E7490]">Approve ROP cap</button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <AnimatePresence>{body}</AnimatePresence>
    </div>
  );
}
