/** AuditDrawer — "what does this number rest on?": frame provenance, data sources, models, and the decision ledger. */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fmt, indexAt, num } from '../../lib/frames';
import { useLedger } from '../../state/ledgerStore';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import ProvenanceChip from '../common/ProvenanceChip';

const FIELDS: [string, string, string][] = [
  ['mud.MW_IN_PPG', 'Mud weight in', 'ppg'], ['derived.ECD', 'ECD', 'ppg'], ['derived.PP', 'Pore pressure', 'ppg'],
  ['derived.FG', 'Fracture gradient', 'ppg'], ['derived.OBG', 'Overburden', 'ppg'], ['derived.OVERBAL_PSI', 'Overbalance', 'psi'],
  ['derived.ECD_FIT_MARGIN', 'ECD→FIT margin', 'ppg'], ['ml.p_kick', 'P(kick) · look-ahead', ''], ['ml.p_loss', 'P(losses)', ''],
  ['drilling.ROP', 'ROP', 'm/hr'], ['drilling.DXC', 'dxc', ''], ['curves.GR', 'Gamma ray', 'API'], ['curves.DT', 'Sonic', 'µs/ft'],
  ['curves.RDEP', 'Deep resistivity', 'Ω·m'], ['mudlog.GAS_TOTAL', 'Total gas', '%'],
];

export default function AuditDrawer() {
  const open = useUi((s) => s.overlays.audit);
  const close = useUi((s) => s.close);
  const { data, md, source } = useScenario();
  const entries = useLedger((s) => s.entries);
  if (!data) return null;
  const i = indexAt(data, md);
  const lwd = data.meta.lwd_source as Record<string, unknown>;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close('audit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside initial={{ x: 440, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 440, opacity: 0 }} transition={{ duration: 0.18 }}
          className="panel absolute bottom-3 right-3 top-3 z-50 flex w-[420px] flex-col overflow-hidden shadow-glow">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div><div className="panel-title">Audit · basis of every figure</div><div className="num text-xs text-muted">frame @ {md.toFixed(1)} m · {source === 'api' ? 'live API' : 'offline mocks'}</div></div>
            <button className="kbd" onClick={() => close('audit')}>Esc</button>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
            <section>
              <div className="panel-title mb-2">Current frame</div>
              <table className="w-full text-[12px]"><tbody>
                {FIELDS.map(([k, label, u]) => (
                  <tr key={k} className="border-b border-line/60">
                    <td className="py-1 text-muted">{label}</td>
                    <td className="num py-1 text-right text-fg">{fmt(num(data, k, i), k.startsWith('ml.') ? 2 : k.includes('PSI') ? 0 : 2)} <span className="text-faint">{u}</span></td>
                    <td className="py-1 pl-2 text-right"><ProvenanceChip p={data.provenance[k]} className="scale-90" /></td>
                  </tr>
                ))}
              </tbody></table>
            </section>
            <section className="space-y-1 text-[12px]">
              <div className="panel-title mb-1">Sources & models</div>
              <div className="text-muted">Petrophysics: <span className="text-fg">{String(lwd.dataset_id ?? lwd.source ?? 'synthetic_stub')}</span>{lwd.licence ? ` · ${String(lwd.licence)}` : ''}</div>
              <div className="text-muted">Curves: {Object.entries(data.meta.curve_sources).map(([c, s]) => `${c}=${s}`).join(' · ')}</div>
              <div className="text-muted">Physics: Eaton / Matthews–Kelly / Jorden–Shirley dxc / scenario-calibrated ECD</div>
              <div className="text-muted">ML: {data.meta.ml_status === 'trained_rf_lithology' ? 'lithology = RandomForest trained on offset wells; kick risk = scenario baseline' : `${data.meta.ml_status} (trained model not loaded)`}</div>
              <div className="text-muted">Agent: Gemini Enterprise Agent Platform (Live API) · search over synthetic offset reports, SOPs and WCRs</div>
            </section>
            <section>
              <div className="panel-title mb-2">Decision ledger · append-only</div>
              {entries.length === 0 && <div className="text-[12px] text-faint">No decisions yet.</div>}
              <ol className="space-y-2">
                {entries.map((e) => (
                  <li key={e.id} className="rounded-lg border border-line bg-raised px-3 py-2 text-[12px]">
                    <div className="flex items-center justify-between"><span className="font-medium text-fg">{e.title}</span><span className="chip border-strong text-muted">{e.kind}</span></div>
                    <div className="num text-[10.5px] text-faint">{new Date(e.ts).toLocaleTimeString('en-IN')} · {e.md.toLocaleString('en-IN')} m · {e.actor}</div>
                    {e.basis && <div className="num mt-1 text-[10.5px] text-muted">basis: {Object.entries(e.basis).slice(1, 6).map(([k, v]) => `${k}=${typeof v === 'number' ? +v.toFixed(2) : v}`).join(' · ')}</div>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
