/** DistanceToHazard — countdown to the forecast sand top; visible once T3 has fired and until the bit passes it. */
import { AnimatePresence, motion } from 'framer-motion';
import { useScenario } from '../../state/scenarioStore';

export default function DistanceToHazard() {
  const { bundle, md, hazardOn, approvedMw } = useScenario();
  if (!bundle) return null;
  const top = bundle.facts.pressure.sand_top_m as number;
  const d = top - md;
  const show = hazardOn && d > 0;
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className={`absolute right-3 top-11 z-10 rounded-lg border px-3 py-2 backdrop-blur ${approvedMw ? 'border-ok/40 bg-ok/10' : 'border-risk/50 bg-risk/10'}`}>
          <div className="panel-title">{approvedMw ? 'Sand top · protected' : 'Distance to hazard'}</div>
          <div className={`num text-2xl font-semibold ${approvedMw ? 'text-ok' : 'text-risk'}`}>
            {d.toFixed(1)} <span className="text-xs text-muted">m</span>
          </div>
          <div className="num text-[10px] text-muted">sand top {top.toLocaleString('en-IN')} m · PP {bundle.facts.pressure.pp_sand_top_ppg as number} ppg</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
