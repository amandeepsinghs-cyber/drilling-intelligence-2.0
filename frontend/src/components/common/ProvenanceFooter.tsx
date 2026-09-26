/** ProvenanceFooter — permanent honesty line; text comes from the scenario YAML (provenance_footer). */
import { useScenario } from '../../state/scenarioStore';

export default function ProvenanceFooter() {
  const data = useScenario((s) => s.data);
  const source = useScenario((s) => s.source);
  if (!data) return null;
  const text = data.meta.provenance_footer;
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-6 border-t border-line px-4 text-[10.5px] text-faint">
      <span className="truncate">{text}</span>
      <span className="num shrink-0">data: {source === 'api' ? 'live API' : 'offline mocks'} · ml: {data.meta.ml_status}</span>
    </footer>
  );
}
