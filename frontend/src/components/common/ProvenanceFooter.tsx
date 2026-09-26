/** ProvenanceFooter — permanent honesty line; text switches automatically when PUBLIC curves are registered. */
import { useScenario } from '../../state/scenarioStore';

export default function ProvenanceFooter() {
  const data = useScenario((s) => s.data);
  const source = useScenario((s) => s.source);
  if (!data) return null;
  const pub = Object.values(data.meta.curve_sources).some((v) => v === 'public');
  const text = pub
    ? data.meta.provenance_footer
    : 'Petrophysical curves: SYNTHETIC stand-ins (real public IODP logs drop in via pipelines/ingest). Drilling, mud-log and chemistry channels, offset reports & SOPs are simulated for an illustrative Mahanadi deepwater scenario. Plug-in to ONGC data = pilot scope.';
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-6 border-t border-line px-4 text-[10.5px] text-faint">
      <span className="truncate">{text}</span>
      <span className="num shrink-0">data: {source === 'api' ? 'live API' : 'offline mocks'} · ml: {data.meta.ml_status}</span>
    </footer>
  );
}
