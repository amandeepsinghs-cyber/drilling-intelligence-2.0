/** PhoneMirror — what the drilling manager's phone receives (Telegram push, SDD §11). Minimal, no device frame. */
import { AnimatePresence, motion } from 'framer-motion';
import { fmt } from '../../lib/frames';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';

export default function PhoneMirror() {
  const open = useUi((s) => s.overlays.phone);
  const bundle = useScenario((s) => s.bundle);
  if (!bundle) return null;
  const f = bundle.facts;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
          className="absolute right-[440px] top-[150px] z-30 w-[320px] rounded-2xl border border-line bg-[#17212B] p-3 text-white shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full bg-[#2AABEE]" />Telegram · DI Alerts</span><span>now</span>
          </div>
          <div className="rounded-xl bg-[#232E3C] p-3 text-[13px] leading-snug">
            <div className="font-semibold">{f.well.id} · MOC approved</div>
            <div className="mt-1 text-slate-300">
              {f.ids.memo_id}: MW {fmt(f.mud.initial.mw_ppg)} → {fmt(f.mud.weighted.mw_ppg)} ppg before sand top {f.pressure.sand_top_m as number} m. Barite {f.barite.total_mt} MT ({f.barite.bags_50kg} bags). ECD {fmt(f.checkpoints[2].ecd_ppg as number)} ppg vs FIT {fmt(f.casing.last_shoe.fit_ppg)}.
            </div>
            <div className="mt-2 flex gap-2">
              <span className="rounded-md bg-[#2B5278] px-2 py-1 text-[11px]">Open memo</span>
              <span className="rounded-md bg-[#2B5278] px-2 py-1 text-[11px]">Acknowledge</span>
            </div>
          </div>
          <div className="mt-2 text-center text-[10px] text-slate-400">{f.ids.dispatch_ids[3]} · mirrored for the room</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
