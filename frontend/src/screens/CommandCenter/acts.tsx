/** Act stages — one hero visual per act in board mode (build.md §0.1 FE-1).
 * F7 swaps LogTracks → CompositeLog here with a single import change.
 */
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Panel from '../../components/common/Panel';
import ProvenanceChip from '../../components/common/ProvenanceChip';
import LithoLegend from '../../components/logs/LithoColumn';
import CompositeLog from '../../components/logs/CompositeLog';
import PressureWindow from '../../components/pressure/PressureWindow';
import WellboreSchematic2D from '../../components/wellbore/WellboreSchematic2D';
import { useLedger, type LedgerEntry } from '../../state/ledgerStore';
import { useScenario, type HeroId } from '../../state/scenarioStore';

function LogHero() {
  const prov = useScenario((s) => s.data?.provenance['curves.GR']);
  return (
    <Panel title="Logs while drilling · ML lithology at the bit" right={<><LithoLegend />{prov && <ProvenanceChip p={prov} />}</>}>
      <CompositeLog />
    </Panel>
  );
}

function PressureHero() {
  return (
    <div className="grid min-h-0 gap-3" style={{ gridTemplateColumns: '150px minmax(0,1fr)' }}>
      <Panel title="Wellbore"><WellboreSchematic2D /></Panel>
      <Panel title="Pressure window · kick side ↔ loss side" right={<ProvenanceChip p="DERIVED" />}><PressureWindow /></Panel>
    </div>
  );
}

type StepState = 'todo' | 'active' | 'done';
function Step({ n, title, sub, state, children }: { n: number; title: string; sub: string; state: StepState; children?: ReactNode }) {
  return (
    <div className={clsx('flex gap-4 rounded-xl border p-4 transition-all duration-300',
      state === 'done' ? 'border-ok/40 bg-ok/5' : state === 'active' ? 'border-accent/60 bg-accent/5 shadow-sm' : 'border-line opacity-55')}>
      <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold',
        state === 'done' ? 'bg-ok text-white' : state === 'active' ? 'bg-accent text-white' : 'bg-surface text-faint')}>
        {state === 'done' ? '✓' : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold text-fg">{title}</div>
        <div className="text-[13px] text-muted">{sub}</div>
        {children}
      </div>
    </div>
  );
}

import ActionTheatre from '../../components/actions/ActionTheatre';
import { useUi } from '../../state/uiStore';

function ActionsHero() {
  return <ActionTheatre />;
}

function LossReportHero() {
  const openOverlay = useUi((s) => s.open);
  return (
    <div className="grid min-h-0 gap-3" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
      <LogHero />
      <Panel
        title="Pressure window · loss side"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => openOverlay('wcr')}
              className="btn py-0.5 px-2 text-[11px] border-accent/40 text-accent hover:border-accent"
            >
              📑 Shift Notes ⇄ WCR
            </button>
            <ProvenanceChip p="DERIVED" />
          </div>
        }
      >
        <PressureWindow />
      </Panel>
    </div>
  );
}

export function ActStage({ hero }: { hero: HeroId }) {
  switch (hero) {
    case 'log': return <LogHero />;
    case 'pressure': return <PressureHero />;
    case 'actions': return <ActionsHero />;
    case 'loss_report': return <LossReportHero />;
  }
}
