/** MemoOverlay — MOC memo as a document (paper on graphite), with frozen basis and approval stamp. */
import { AnimatePresence, motion } from 'framer-motion';
import { fmt } from '../../lib/frames';
import { useLedger } from '../../state/ledgerStore';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import ApprovalRail from './ApprovalRail';

export default function MemoOverlay() {
  const open = useUi((s) => s.overlays.memo);
  const close = useUi((s) => s.close);
  const { bundle, approvedMw } = useScenario();
  const entries = useLedger((s) => s.entries);
  if (!bundle) return null;
  const f = bundle.facts;
  const memo = entries.find((e) => e.id === 'MEMO');
  const appr = entries.find((e) => e.id === 'APPROVAL');
  const b = memo?.basis ?? {};
  const warn = f.checkpoints.find((c) => c.label === 'Warning point')!;
  const sand = f.checkpoints.find((c) => c.label === 'Sand top (offset kick depth)')!;
  const row = (k: string, v: string) => (
    <tr className="border-b border-slate-200 last:border-0"><td className="py-1 pr-4 text-slate-500">{k}</td><td className="num py-1 text-[#0B1520]">{v}</td></tr>
  );
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => close('memo')}>
          <motion.article onClick={(e) => e.stopPropagation()} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.18 }}
            className="relative max-h-[88vh] w-[760px] overflow-y-auto rounded-xl bg-[#FBFCFD] p-8 text-[13.5px] text-[#0B1520] shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Management of Change · Mud Programme Deviation</div>
                <h2 className="mt-1 text-xl font-semibold">Pre-emptive weight-up to {fmt(f.mud.weighted.mw_ppg)} ppg before {f.pressure.sand_top_m as number} m sand</h2>
                <div className="num mt-1 text-xs text-slate-500">{f.ids.memo_id} · {f.well.id} · raised at {warn.md_m.toLocaleString('en-IN')} m MD · draft by Drilling Intelligence Agent</div>
              </div>
              <span className="rounded border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">Synthetic demo</span>
            </header>
            <section className="mt-4 space-y-4">
              <div>
                <h3 className="mb-1 font-semibold">1 · Situation</h3>
                <p className="text-slate-700">dxc reversal from {f.triggers.T3_PRESSURE_RAMP.conditions.dxc_reversal_from_m as number} m, sonic above normal compaction trend, connection gas {(warn.conn_gas_pct as { from: number }).from}% → {(warn.conn_gas_pct as { to: number }).to}%.
                  Forecast pore pressure {fmt(warn.pp_forecast_ppg as number)} ppg at {warn.pp_forecast_at_m as number} m ({warn.distance_to_hazard_m as number} m ahead). At {fmt(f.mud.initial.mw_ppg)} ppg: {warn.overbalance_if_unchanged_psi as number} psi (underbalanced); P(kick, {f.ml.kick_horizon_m} m) {Math.round((warn.p_kick_30m_if_unchanged as number) * 100)}%.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">2 · Recommendation</h3>
                <table className="w-full"><tbody>
                  {row('Mud weight', `${fmt(f.mud.initial.mw_ppg)} → ${fmt(f.mud.weighted.mw_ppg)} ppg  (${fmt(f.mud.initial.mw_sg)} → ${fmt(f.mud.weighted.mw_sg)} SG)`)}
                  {row('Barite', `${f.barite.lb_per_bbl} lb/bbl · ${f.barite.total_mt} MT · ${f.barite.bags_50kg.toLocaleString('en-IN')} × 50 kg bags`)}
                  {row('Active system', `${f.mud.active_system_bbl.toLocaleString('en-IN')} bbl · volume gain ≈ ${f.barite.volume_gain_bbl} bbl`)}
                  {row('ROP through sand top', `≤ ${f.drilling.rop_cap_m_hr} m/hr`)}
                </tbody></table>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">3 · Predicted impact</h3>
                <table className="w-full"><tbody>
                  {row('ECD at sand top', `${fmt(sand.ecd_ppg as number)} ppg  vs shoe FIT ${fmt(f.casing.last_shoe.fit_ppg)} ppg  (margin ${fmt(f.casing.last_shoe.fit_ppg - (sand.ecd_ppg as number))})`)}
                  {row('Overbalance at sand top', `+${sand.overbalance_psi as number} psi`)}
                  {row(`P(kick, ${f.ml.kick_horizon_m} m)`, `${Math.round((sand.p_kick_30m as number) * 100)}%`)}
                </tbody></table>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">4 · Basis (frozen with approval)</h3>
                <div className="num grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11.5px] text-slate-600">
                  {Object.entries(b).map(([k, v]) => <div key={k}>{k}: <span className="text-[#0B1520]">{typeof v === 'number' ? +v.toFixed(3) : String(v ?? '—')}</span></div>)}
                </div>
                <div className="mt-2 text-[11.5px] text-slate-600">Evidence: {(memo?.citations ?? []).join(' · ') || '—'}</div>
              </div>
            </section>
            <footer className="mt-6">
              {approvedMw ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
                  <div>
                    <div className="font-semibold text-emerald-700">Approved</div>
                    <div className="num text-xs text-emerald-700/80">{appr?.actor} · {appr ? new Date(appr.ts).toLocaleString('en-IN') : ''}</div>
                  </div>
                  <motion.div initial={{ scale: 1.4, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ duration: 0.25 }}
                    className="rounded border-2 border-emerald-600 px-3 py-1 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Approved</motion.div>
                </div>
              ) : <ApprovalRail />}
            </footer>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
