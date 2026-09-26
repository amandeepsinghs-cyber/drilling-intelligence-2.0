/** ProvenanceChip — every figure says what it rests on (EnergyFlow learning, SDD §5.3). */
import clsx from 'clsx';
import type { Provenance } from '../../api/types';

const STYLE: Record<Provenance, { label: string; cls: string; tip: string }> = {
  MEASURED: { label: 'Measured', cls: 'border-ok/50 text-ok', tip: 'Live sensor data' },
  PUBLIC: { label: 'Public log', cls: 'border-ok/50 text-ok', tip: 'Real public log (IODP/FORCE), depth-registered' },
  DERIVED: { label: 'Derived', cls: 'border-accent/50 text-accent', tip: 'Computed by physics from other fields' },
  MODEL_INFERENCE: { label: 'Model', cls: 'border-ml/50 text-ml', tip: 'Model output (baseline heuristic until Phase 6)' },
  SIMULATED: { label: 'Simulated', cls: 'border-strong text-muted', tip: 'Scenario-engine channel' },
  SYNTHETIC: { label: 'Synthetic', cls: 'border-strong text-muted', tip: 'Generated stand-in, labelled' },
  ASSUMED: { label: 'Assumed', cls: 'border-warn/50 text-warn', tip: 'Engineering assumption' },
  NOT_RECORDED: { label: 'Not recorded', cls: 'border-strong text-faint', tip: 'Channel absent in source' },
};

export default function ProvenanceChip({ p, className }: { p?: Provenance | string; className?: string }) {
  const s = STYLE[(p as Provenance) ?? 'NOT_RECORDED'] ?? STYLE.NOT_RECORDED;
  return (
    <span title={s.tip} className={clsx('chip bg-transparent', s.cls, className)}>
      {s.label}
    </span>
  );
}
