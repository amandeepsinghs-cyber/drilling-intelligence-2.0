/**
 * WcrCompareView — Side-by-side comparison of rig-floor Shift Notes and the synthesized WCR draft.
 * Demonstrates how Gemini agent extracts facts from raw shift notes to produce the executive WCR
 * with full provenance tracking and bidirectional cross-highlighting.
 */
import { useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import type { ShiftNote } from '../../api/types';
import { fmt } from '../../lib/frames';
import { useScenario } from '../../state/scenarioStore';
import { useLedger } from '../../state/ledgerStore';

const SHIFT_WCR_MAP: Record<string, { sections: number[]; desc: string }> = {
  'SHIFT-01': { sections: [1, 2], desc: 'Well summary & shoe drill-out' },
  'SHIFT-02': { sections: [1, 2], desc: 'U1 shale top & background drilling' },
  'SHIFT-03': { sections: [3], desc: 'Warning point: dxc reversal & sonic NCT departure' },
  'SHIFT-04': { sections: [3, 4], desc: 'MOC weight-up & barite additions' },
  'SHIFT-05': { sections: [4, 6], desc: 'U3 drilling break, ROP cap & sweeps' },
  'SHIFT-06': { sections: [4], desc: 'Post-break steady drilling with capped ROP' },
  'SHIFT-07': { sections: [2, 4], desc: 'Gas-water contact & lower sand section' },
  'SHIFT-08': { sections: [1, 5], desc: 'Well TD & end-of-section circulation' },
};

export default function WcrCompareView() {
  const bundle = useScenario((s) => s.bundle);
  const entries = useLedger((s) => s.entries);
  const [shifts, setShifts] = useState<ShiftNote[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string>('SHIFT-04');

  useEffect(() => {
    if (bundle?.shift_notes?.shifts?.length) {
      setShifts(bundle.shift_notes.shifts);
      return;
    }
    fetch('/mocks/shift_notes.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.shifts) setShifts(d.shifts);
      })
      .catch((e) => console.warn('Could not load shift notes for comparison:', e));
  }, [bundle]);

  const activeShift = useMemo(
    () => shifts.find((s) => s.shift_id === activeShiftId) ?? shifts[0],
    [shifts, activeShiftId]
  );

  const activeMapping = SHIFT_WCR_MAP[activeShiftId] ?? { sections: [], desc: '' };

  if (!bundle) return null;
  const f = bundle.facts;
  const cp = (l: string) => f.checkpoints.find((c) => c.label === l)!;
  const sand = cp('Sand top (offset kick depth)');
  const brk = cp('Drilling break');
  const cap = cp('After ROP cap');
  const warn = cp('Warning point');

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner explaining the synthesis */}
      <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/5 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent uppercase tracking-wider">Automated WCR Synthesis</span>
          <span className="text-muted">· Real-time traceability from 8 daily rig-floor shift logs into the executive completion report</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-faint">Active focus:</span>
          <span className="chip border-accent/60 bg-accent/10 text-accent font-semibold">{activeShiftId} ({activeMapping.desc})</span>
        </div>
      </div>

      {/* Two-Column Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[680px]">
        {/* LEFT COLUMN: Shift Notes */}
        <div className="flex flex-col rounded-xl border border-line bg-surface/50 p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">📋 Rig Floor Daily Shift Logs</h3>
              <p className="text-[11px] text-muted">Click any shift log to see corresponding WCR clauses highlight</p>
            </div>
            <span className="chip border-strong text-muted text-[11px]">{shifts.length} shift logs</span>
          </div>

          {/* Shift selector pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {shifts.map((s) => {
              const isSelected = s.shift_id === activeShiftId;
              const text = (s.operations + ' ' + s.handover_notes).toLowerCase();
              const hasKick = text.includes('moc') || text.includes('weight-up') || text.includes('barite');
              const hasBreak = text.includes('break') || text.includes('rop cap') || text.includes('sweep');
              return (
                <button
                  key={s.shift_id}
                  onClick={() => setActiveShiftId(s.shift_id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-[11px] font-mono transition-all border',
                    isSelected
                      ? 'border-accent bg-accent text-white font-bold shadow-xs'
                      : hasKick
                      ? 'border-red-400/40 bg-red-950/20 text-red-300 hover:border-red-400'
                      : hasBreak
                      ? 'border-amber-400/40 bg-amber-950/20 text-amber-300 hover:border-amber-400'
                      : 'border-line bg-panel text-muted hover:border-strong hover:text-fg'
                  )}
                >
                  {s.shift_id}
                </button>
              );
            })}
          </div>

          {/* Active Shift Details Card */}
          {activeShift && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[12px]">
              <div className="rounded-lg border border-line bg-panel p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-fg">{activeShift.shift_id}</span>
                      <span className="chip border-accent/40 text-accent uppercase text-[10px]">{activeShift.tour}</span>
                    </div>
                    <div className="text-[11px] text-faint mt-0.5">{activeShift.date} · Driller: {activeShift.driller}</div>
                  </div>
                  <div className="text-right">
                    <div className="num font-semibold text-fg">{activeShift.md_start_m} – {activeShift.md_end_m} m</div>
                    <div className="text-[10px] text-faint">drilled {activeShift.md_end_m - activeShift.md_start_m} m</div>
                  </div>
                </div>

                {/* KPI badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60">
                  <div className="rounded bg-surface p-1.5 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-faint">MW In / Out</div>
                    <div className="num text-xs font-semibold text-fg mt-0.5">{activeShift.mw_in_ppg} / {activeShift.mw_out_ppg} ppg</div>
                  </div>
                  <div className="rounded bg-surface p-1.5 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-faint">Avg ROP</div>
                    <div className="num text-xs font-semibold text-fg mt-0.5">{activeShift.rop_avg_m_hr} m/hr</div>
                  </div>
                  <div className="rounded bg-surface p-1.5 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-faint">ECD</div>
                    <div className="num text-xs font-semibold text-fg mt-0.5">{activeShift.ecd_ppg} ppg</div>
                  </div>
                </div>

                {/* Operations */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-faint font-semibold mb-1">Operations Log</div>
                  <p className="text-slate-300 leading-relaxed bg-surface/60 p-2.5 rounded border border-line/50">{activeShift.operations}</p>
                </div>

                {/* Handover Notes */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-faint font-semibold mb-1">Handover Notes</div>
                  <p className="text-slate-300 leading-relaxed bg-surface/60 p-2.5 rounded border border-line/50">{activeShift.handover_notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Executive WCR Report */}
        <div className="flex flex-col rounded-xl border border-line bg-surface/50 p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">📄 Synthesized Executive WCR Report</h3>
              <p className="text-[11px] text-muted">Sections matching {activeShiftId} are highlighted with source attribution</p>
            </div>
            <span className="chip border-ok/50 text-ok text-[11px]">{f.ids.wcr_id}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-[13px] text-slate-200">
            {/* Section 1: Well Summary */}
            <div
              onClick={() => setActiveShiftId('SHIFT-01')}
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(1)
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">1 · Well Summary</span>
                {activeMapping.sections.includes(1) && (
                  <span className="chip border-accent/60 bg-accent/20 text-accent text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <p className="leading-relaxed text-muted text-[12px]">
                {f.well.rig}, {f.well.water_depth_m.toLocaleString('en-IN')} m water depth. {f.well.current_section.hole_size_in}-in section drilled with {f.well.current_section.mud_type} from the {f.casing.last_shoe.size} shoe at {f.casing.last_shoe.md_m.toLocaleString('en-IN')} m (FIT {fmt(f.casing.last_shoe.fit_ppg)} ppg) to TD {f.well.live_interval_m.td.toLocaleString('en-IN')} m without well-control or loss events.
              </p>
            </div>

            {/* Section 2: Stratigraphy */}
            <div
              onClick={() => setActiveShiftId('SHIFT-02')}
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(2)
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">2 · Stratigraphy</span>
                {activeMapping.sections.includes(2) && (
                  <span className="chip border-accent/60 bg-accent/20 text-accent text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <ul className="list-disc pl-4 text-muted text-[12px] space-y-0.5">
                {f.stratigraphy.map((u) => (
                  <li key={u.id}>
                    <strong className="text-fg">{u.id}</strong> ({u.top_m.toLocaleString('en-IN')}–{u.base_m.toLocaleString('en-IN')} m): {u.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Pore-Pressure Narrative */}
            <div
              onClick={() => setActiveShiftId('SHIFT-03')}
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(3)
                  ? 'border-amber-400 bg-amber-950/25 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">3 · Pore-Pressure Narrative</span>
                {activeMapping.sections.includes(3) && (
                  <span className="chip border-amber-400 bg-amber-500/20 text-amber-300 text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <p className="leading-relaxed text-muted text-[12px]">
                Normal shale pressure {fmt(f.pressure.pp_shale_normal_ppg as number)} ppg to {f.pressure.pp_ramp_start_m as number} m, ramping through the transition zone to {fmt(f.pressure.pp_sand_top_ppg as number)} ppg at the U3 sand top ({f.pressure.sand_top_m as number} m). The ramp was detected at {warn.md_m.toLocaleString('en-IN')} m, {warn.distance_to_hazard_m as number} m before the hazard.
              </p>
            </div>

            {/* Section 4: Decisions & MOC */}
            <div
              onClick={() => setActiveShiftId('SHIFT-04')}
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(4)
                  ? 'border-emerald-400 bg-emerald-950/25 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">4 · Decisions & MOC Action Log</span>
                {activeMapping.sections.includes(4) && (
                  <span className="chip border-emerald-400 bg-emerald-500/20 text-emerald-300 text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <p className="leading-relaxed text-muted text-[12px]">
                <strong className="text-fg">{f.ids.memo_id}</strong>: weight-up {fmt(f.mud.initial.mw_ppg)} → {fmt(f.mud.weighted.mw_ppg)} ppg ({f.barite.total_mt} MT barite). Sand top drilled at +{sand.overbalance_psi as number} psi overbalance, ECD {fmt(sand.ecd_ppg as number)} ppg.
                Drilling break at {brk.md_m.toLocaleString('en-IN')} m (ECD {fmt(brk.ecd_ppg as number)} ppg) managed by ROP cap {cap.rop_m_hr as number} m/hr → ECD {fmt(cap.ecd_ppg as number)} ppg.
              </p>
            </div>

            {/* Section 5: Events Log */}
            <div
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(5)
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">5 · Ledger Events Log</span>
                {activeMapping.sections.includes(5) && (
                  <span className="chip border-accent/60 bg-accent/20 text-accent text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <table className="w-full text-[11px] text-muted">
                <tbody>
                  {entries.slice(0, 4).map((e) => (
                    <tr key={e.id} className="border-b border-line/40 last:border-0">
                      <td className="num py-1 text-faint">{e.md.toLocaleString('en-IN')} m</td>
                      <td className="py-1 text-fg">{e.kind}</td>
                      <td className="py-1">{e.title}</td>
                      <td className="py-1 text-faint">{e.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 6: Lessons Learned */}
            <div
              onClick={() => setActiveShiftId('SHIFT-05')}
              className={clsx(
                'rounded-lg p-3 transition-all cursor-pointer border',
                activeMapping.sections.includes(6)
                  ? 'border-sky-400 bg-sky-950/25 shadow-sm'
                  : 'border-line/40 bg-panel/60 hover:border-line'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-fg">6 · Lessons Learned (Knowledge Ingestion)</span>
                {activeMapping.sections.includes(6) && (
                  <span className="chip border-sky-400 bg-sky-500/20 text-sky-300 text-[9.5px]">← Extracted from {activeShiftId}</span>
                )}
              </div>
              <ol className="list-decimal pl-4 text-muted text-[12px] space-y-1">
                <li>
                  Converging dxc reversal, sonic departure from NCT and rising connection gas gave {warn.distance_to_hazard_m as number} m of warning before the U3 sand top; pre-emptive weight-up avoided a repeat of the offset kick.
                </li>
                <li>
                  At drilling breaks in U3, an ROP cap of {cap.rop_m_hr as number} m/hr with sweeps keeps ECD ≥ {fmt(cap.ecd_fit_margin_ppg as number)} ppg below the shoe FIT.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
