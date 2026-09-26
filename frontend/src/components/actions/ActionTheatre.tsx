/**
 * ActionTheatre — Act 3 Hero Experience.
 * Replaces static grey rows with a live, interactive action theatre:
 * 1. Live MOC Memo Document displaying dynamic engineering figures.
 * 2. Animated 'APPROVED' rubber stamp when approved.
 * 3. 4 Fan-Out Delivery Lanes ticking with status pulses to 'delivered'.
 * 4. Realistic Mobile Phone Mirror showing the delivered alert and ledger hash.
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { fmt } from '../../lib/frames';
import { useLedger } from '../../state/ledgerStore';
import { useScenario } from '../../state/scenarioStore';
import { runTurn } from '../../state/turnMachine';

export default function ActionTheatre() {
  const bundle = useScenario((s) => s.bundle);
  const approved = useScenario((s) => s.approvedMw);
  const entries = useLedger((s) => s.entries);

  const f = bundle?.facts;
  const memo = useMemo(() => entries.find((e) => e.id === 'MEMO'), [entries]);
  const appr = useMemo(() => entries.find((e) => e.id === 'APPROVAL'), [entries]);
  const disp = useMemo(() => entries.find((e) => e.id === 'DISPATCH'), [entries]);

  if (!f) return null;

  const warn = f.checkpoints.find((c) => c.label === 'Warning point')!;
  const sand = f.checkpoints.find((c) => c.label === 'Sand top (offset kick depth)')!;
  const basis = memo?.basis ?? {};

  // 4 Fan-out lanes configuration
  const channels = [
    {
      id: f.ids.dispatch_ids[0] ?? 'DISP-CHEM-01',
      title: 'Rig Mud Chemist',
      role: 'Rig Floor / Mud Pits',
      action: `Stage ${f.barite.total_mt} MT barite (${f.barite.bags_50kg.toLocaleString('en-IN')} bags)`,
      status: approved ? 'delivered' : 'queued',
      latency: '0.8s',
    },
    {
      id: f.ids.dispatch_ids[1] ?? 'DISP-RTOC-01',
      title: 'RTOC Operations Center',
      role: 'Townsville / Kakinada Shore',
      action: 'Alarm thresholds updated; loss watchdog armed',
      status: approved ? 'delivered' : 'queued',
      latency: '1.1s',
    },
    {
      id: f.ids.dispatch_ids[2] ?? 'DISP-MGR-01',
      title: 'Drilling Manager',
      role: 'Asset Leadership',
      action: `MOC approval registered: MW ${fmt(f.mud.weighted.mw_ppg)} ppg`,
      status: approved ? 'delivered' : 'queued',
      latency: '1.4s',
    },
    {
      id: f.ids.dispatch_ids[3] ?? 'DISP-PUSH-01',
      title: 'Mobile Secure Push',
      role: 'Superintendent Handset',
      action: 'Encrypted ledger dispatch delivered with SHA-256 receipt',
      status: approved ? 'delivered' : 'queued',
      latency: '1.6s',
    },
  ];

  return (
    <div className="h-full flex flex-col gap-3 select-none">
      {/* Top Theater Header */}
      <div className="flex items-center justify-between rounded-lg border border-line bg-surface/70 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-fg">Act 3 · Human Decides, Agent Executes</span>
          <span className="text-faint">|</span>
          <span className="text-xs text-muted">Audited MOC workflow: {f.ids.memo_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-faint">Authority Matrix:</span>
          <span className="chip border-accent/50 text-accent font-semibold text-[10px]">ONGC-MOC-SOP-07</span>
        </div>
      </div>

      {/* Main Theatre Stage: Memo Document on Left, Execution Lanes & Phone on Right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3">
        {/* LEFT PANE: MOC Memo Document with Live Figures & Stamp */}
        <div className="relative flex flex-col rounded-xl border border-line bg-[#FBFCFD] text-[#0B1520] p-6 shadow-md overflow-y-auto">
          {/* Animated APPROVED Stamp Overlay */}
          <AnimatePresence>
            {approved && (
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -22 }}
                animate={{ scale: 1, opacity: 0.95, rotate: -14 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                className="pointer-events-none absolute right-8 top-16 z-20 rounded-xl border-[4px] border-emerald-600 bg-emerald-50/80 px-6 py-3 text-center shadow-lg backdrop-blur-xs"
              >
                <div className="text-2xl font-black tracking-widest text-emerald-700">APPROVED</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Drilling Superintendent</div>
                <div className="num text-[9px] text-emerald-900 mt-0.5">{appr?.actor ?? 'D. K. Sharma'} · RIG FLOOR</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memo Header */}
          <header className="border-b border-slate-200 pb-3 mb-4 flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">
                Management of Change · Mud Programme Deviation · Agent drafts the MOC memo
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Pre-emptive Weight-Up to {fmt(f.mud.weighted.mw_ppg)} ppg before Sand Top</h2>
              <div className="num text-[11px] text-slate-500 mt-0.5">
                {f.ids.memo_id} · {f.well.id} · raised at {warn.md_m.toLocaleString('en-IN')} m MD
              </div>
            </div>
            <span className="chip border-slate-300 bg-slate-100 text-slate-600 font-mono text-[10px]">VERIFIED BASIS</span>
          </header>

          {/* Memo Body */}
          <div className="space-y-3.5 text-[12.5px] leading-relaxed flex-1">
            {/* Section 1: Situation */}
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5 text-xs">1 · Geological & Pressure Trigger</h4>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                dxc exponent reversal confirmed from {f.triggers.T3_PRESSURE_RAMP.conditions.dxc_reversal_from_m as number} m, compressional sonic departing above normal compaction trend, connection gas rising to {(warn.conn_gas_pct as { to: number }).to}%.
                Forecast pore pressure ramps to {fmt(warn.pp_forecast_ppg as number)} ppg at {warn.pp_forecast_at_m as number} m ({warn.distance_to_hazard_m as number} m ahead).
                Unweighted margin represents a {warn.overbalance_if_unchanged_psi as number} psi deficit (underbalanced) with P(kick) of {Math.round((warn.p_kick_30m_if_unchanged as number) * 100)}%.
              </p>
            </div>

            {/* Section 2: Recommended Mud Program */}
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5 text-xs">2 · Proposed Treatment Parameters</h4>
              <table className="w-full text-[12px] bg-slate-50 rounded border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 text-slate-500 font-medium">Mud Weight Treatment</td>
                    <td className="num py-1 px-2.5 font-bold text-slate-900 text-right">
                      {fmt(f.mud.initial.mw_ppg)} → {fmt(f.mud.weighted.mw_ppg)} ppg ({fmt(f.mud.initial.mw_sg)} → {fmt(f.mud.weighted.mw_sg)} SG)
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 text-slate-500 font-medium">Barite Densification</td>
                    <td className="num py-1 px-2.5 font-semibold text-slate-900 text-right">
                      {f.barite.lb_per_bbl} lb/bbl · {f.barite.total_mt} MT ({f.barite.bags_50kg.toLocaleString('en-IN')} × 50 kg bags)
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 text-slate-500 font-medium">Active Surface Volume</td>
                    <td className="num py-1 px-2.5 font-semibold text-slate-900 text-right">
                      {f.mud.active_system_bbl.toLocaleString('en-IN')} bbl (volume gain ≈ {f.barite.volume_gain_bbl} bbl)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 text-slate-500 font-medium">ROP Constraint at Sand Top</td>
                    <td className="num py-1 px-2.5 font-semibold text-slate-900 text-right">
                      ≤ {f.drilling.rop_cap_m_hr} m/hr (drilling break control)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Predicted Impact */}
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5 text-xs">3 · Safety Margin Verification</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Overbalance at Sand</div>
                  <div className="num font-bold text-emerald-700 text-sm mt-0.5">+{sand.overbalance_psi as number} psi</div>
                  <div className="text-[9px] text-slate-400">Target ≥ 100 psi</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">ECD @ Sand Top</div>
                  <div className="num font-bold text-sky-700 text-sm mt-0.5">{fmt(sand.ecd_ppg as number)} ppg</div>
                  <div className="text-[9px] text-slate-400">Shoe FIT: {fmt(f.casing.last_shoe.fit_ppg)} ppg</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">Kick Probability</div>
                  <div className="num font-bold text-emerald-700 text-sm mt-0.5">{Math.round((sand.p_kick_30m as number) * 100)}%</div>
                  <div className="text-[9px] text-slate-400">Reduced from {Math.round((warn.p_kick_30m_if_unchanged as number) * 100)}%</div>
                </div>
              </div>
            </div>

            {/* Section 4: Cryptographic Ledger Basis */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-xs">4 · Immutable Audit Basis (Frozen on Approval)</span>
                <span className="num text-[10px] text-slate-500">SHA-256 basis lock</span>
              </div>
              <div className="num grid grid-cols-3 gap-1 bg-slate-100 p-2 rounded border border-slate-200 text-[11px] text-slate-600">
                {Object.entries(basis).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="truncate">
                    {k}: <span className="font-semibold text-slate-900">{typeof v === 'number' ? +v.toFixed(2) : String(v ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Human Gate + 4 Fan-Out Lanes + Phone Mirror */}
        <div className="flex flex-col gap-3">
          {/* Human-in-the-Loop Superintendent Gate */}
          <div className="rounded-xl border border-line bg-panel p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-fg">Drilling Superintendent Sign-Off</div>
                <div className="text-[11px] text-muted">Mandatory human authorization step</div>
              </div>
              <span className={clsx('chip text-[10px] font-bold', approved ? 'border-ok/50 text-ok' : 'border-risk/50 text-risk animate-pulse')}>
                {approved ? 'STATUS: APPROVED' : 'AWAITING APPROVAL'}
              </span>
            </div>

            {!approved ? (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => runTurn(6)}
                  className="flex-1 rounded-lg bg-accent py-2 text-xs font-bold text-white shadow-glow hover:bg-accent/90 transition-all"
                >
                  Approve MOC Pre-emptive Weight-Up
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-ok/40 bg-ok/10 p-2 text-[11.5px] text-ok flex items-center justify-between">
                <span>✓ Authorized by {appr?.actor ?? 'Superintendent'}</span>
                <span className="num text-[10px] text-muted">{appr ? new Date(appr.ts).toLocaleTimeString('en-IN') : '14:22:10'}</span>
              </div>
            )}
          </div>

          {/* 4 Fan-Out Execution Lanes */}
          <div className="flex-1 rounded-xl border border-line bg-panel p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2.5">
                <span className="text-xs font-bold text-fg">Real-Time Fan-Out Channels</span>
                <span className="text-[10px] text-faint">4 parallel targets</span>
              </div>

              <div className="space-y-2">
                {channels.map((ch, idx) => (
                  <div
                    key={ch.id}
                    className={clsx(
                      'rounded-lg border p-2.5 transition-all text-xs flex items-center justify-between gap-2',
                      ch.status === 'delivered' ? 'border-ok/30 bg-ok/5' : 'border-line/60 bg-surface/40 opacity-75'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg truncate">{ch.title}</span>
                        <span className="text-[10px] text-faint truncate">({ch.role})</span>
                      </div>
                      <div className="text-[11px] text-muted truncate mt-0.5">{ch.action}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={clsx('chip text-[10px] uppercase font-bold', ch.status === 'delivered' ? 'border-ok/50 text-ok' : 'border-line text-faint')}>
                        {ch.status === 'delivered' ? `✓ ${ch.latency}` : 'queued'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Phone Handset Mirror Preview */}
            <div className="mt-3 pt-2.5 border-t border-line/60">
              <div className="text-[10px] uppercase tracking-wider text-faint font-semibold mb-1.5 flex items-center justify-between">
                <span>Superintendent Mobile Push Mirror</span>
                <span className="text-[9px] text-ok">● Live</span>
              </div>
              <div className="rounded-xl border border-line bg-[#17212B] p-2.5 text-white shadow-sm text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-300 pb-1 mb-1 border-b border-slate-700/50">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2AABEE]" />
                    <span className="font-bold">Drilling Intelligence · High priority</span>
                  </span>
                  <span className="num text-slate-400">now</span>
                </div>
                <div className="text-[11.5px] font-semibold text-fg mt-0.5">{f.well.id} · MOC Executed</div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  {f.ids.memo_id}: MW {fmt(f.mud.initial.mw_ppg)} → {fmt(f.mud.weighted.mw_ppg)} ppg before sand {f.pressure.sand_top_m as number} m. Barite {f.barite.total_mt} MT. ECD {fmt(sand.ecd_ppg as number)} ppg.
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-400 border-t border-slate-700/40 pt-1">
                  <span className="font-mono truncate max-w-[200px]">hash: {disp?.id ? `sha256:7f9a...${disp.id}` : 'sha256:7f9a...e31b'}</span>
                  <span className="text-emerald-400 font-semibold">DELIVERED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
