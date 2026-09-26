/** WcrDocument — Well Completion Report draft built from facts + decision ledger (Google Docs export in Phase 5). */
import { fmt } from '../../lib/frames';
import { useLedger } from '../../state/ledgerStore';
import { useScenario } from '../../state/scenarioStore';

export default function WcrDocument() {
  const bundle = useScenario((s) => s.bundle);
  const entries = useLedger((s) => s.entries);
  if (!bundle) return null;
  const f = bundle.facts;
  const cp = (l: string) => f.checkpoints.find((c) => c.label === l)!;
  const sand = cp('Sand top (offset kick depth)'), brk = cp('Drilling break'), cap = cp('After ROP cap'), warn = cp('Warning point');
  const toc = ['Well summary', 'Stratigraphy', 'Pore-pressure narrative', 'Decisions & MOC', 'Events log', 'Lessons learned', 'Data provenance'];
  const H = ({ n, t }: { n: number; t: string }) => <h3 id={`s${n}`} className="mb-2 mt-6 text-base font-semibold">{n} · {t}</h3>;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-8">
      <nav className="sticky top-0 space-y-1.5 self-start text-[12px] text-slate-500">
        <div className="mb-2 text-[10px] uppercase tracking-[0.16em]">Contents</div>
        {toc.map((t, i) => <a key={t} href={`#s${i + 1}`} className="block hover:text-[#0891B2]">{i + 1}. {t}</a>)}
      </nav>
      <div className="text-[13.5px] leading-relaxed text-[#0B1520]">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Well Completion Report · Draft</div>
        <h2 className="text-2xl font-semibold">{f.ids.wcr_id}</h2>
        <div className="num text-xs text-slate-500">{f.well.display_name} · {f.well.basin} · {f.well.program}</div>
        <H n={1} t="Well summary" />
        <p>{f.well.rig}, {f.well.water_depth_m.toLocaleString('en-IN')} m water depth. {f.well.current_section.hole_size_in}-in section drilled with {f.well.current_section.mud_type} from the {f.casing.last_shoe.size} shoe at {f.casing.last_shoe.md_m.toLocaleString('en-IN')} m (FIT {fmt(f.casing.last_shoe.fit_ppg)} ppg) to TD {f.well.live_interval_m.td.toLocaleString('en-IN')} m without well-control or loss events.</p>
        <H n={2} t="Stratigraphy" />
        <ul className="list-disc pl-5">{f.stratigraphy.map((u) => <li key={u.id}><b>{u.id}</b> {u.top_m.toLocaleString('en-IN')}–{u.base_m.toLocaleString('en-IN')} m: {u.name}</li>)}</ul>
        <H n={3} t="Pore-pressure narrative" />
        <p>Normal shale pressure {fmt(f.pressure.pp_shale_normal_ppg as number)} ppg to {f.pressure.pp_ramp_start_m as number} m, ramping through the transition zone to {fmt(f.pressure.pp_sand_top_ppg as number)} ppg at the U3 sand top ({f.pressure.sand_top_m as number} m). The ramp was detected at {warn.md_m.toLocaleString('en-IN')} m, {warn.distance_to_hazard_m as number} m before the hazard.</p>
        <H n={4} t="Decisions & MOC" />
        <p>{f.ids.memo_id}: weight-up {fmt(f.mud.initial.mw_ppg)} → {fmt(f.mud.weighted.mw_ppg)} ppg ({f.barite.total_mt} MT barite). Sand top drilled at +{sand.overbalance_psi as number} psi overbalance, ECD {fmt(sand.ecd_ppg as number)} ppg.
          Drilling break at {brk.md_m.toLocaleString('en-IN')} m (ECD {fmt(brk.ecd_ppg as number)} ppg) managed by ROP cap {cap.rop_m_hr as number} m/hr → ECD {fmt(cap.ecd_ppg as number)} ppg.</p>
        <H n={5} t="Events log" />
        <table className="w-full text-[12px]"><tbody>
          {entries.map((e) => <tr key={e.id} className="border-b border-slate-200"><td className="num py-1 pr-3 text-slate-500">{e.md.toLocaleString('en-IN')} m</td><td className="py-1 pr-3">{e.kind}</td><td className="py-1">{e.title}</td><td className="py-1 text-slate-500">{e.actor}</td></tr>)}
        </tbody></table>
        <H n={6} t="Lessons learned (written back to knowledge base)" />
        <ol className="list-decimal pl-5">
          <li>Converging dxc reversal, sonic departure from NCT and rising connection gas gave {warn.distance_to_hazard_m as number} m of warning before the U3 sand top; pre-emptive weight-up avoided a repeat of the offset kick.</li>
          <li>At drilling breaks in U3, an ROP cap of {cap.rop_m_hr as number} m/hr with sweeps keeps ECD ≥ {fmt(cap.ecd_fit_margin_ppg as number)} ppg below the shoe FIT.</li>
        </ol>
        <H n={7} t="Data provenance" />
        <p className="text-slate-600">{f.provenance_footer} All offset reports, SOPs and this WCR are synthetic for demonstration.</p>
      </div>
    </div>
  );
}
