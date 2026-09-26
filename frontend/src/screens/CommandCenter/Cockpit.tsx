/** Cockpit — mock-up #4 "engineer-view cockpit" (build.md §1).
 * Wellbore | multi-log | pressure share one depth axis and one bit line; the agent stage sits on the right.
 * Act 3 swaps the log + pressure for the action panel; Act 4 adds the loss-side emphasis and the WCR entry point. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import AgentPanel from '../../components/agent/AgentPanel';
import Act3ActionPanel from '../../components/cockpit/act3/Act3ActionPanel';
import Act4ShiftWcr from '../../components/cockpit/act4/Act4ShiftWcr';
import CockpitGrid, { Column, type WindowCfg } from '../../components/cockpit/CockpitGrid';
import MultiLog from '../../components/cockpit/logs/MultiLog';
import PressureTrack from '../../components/cockpit/pressure/PressureTrack';
import TopBar from '../../components/cockpit/TopBar';
import WellboreColumn from '../../components/cockpit/wellbore/WellboreColumn';
import ProvenanceFooter from '../../components/common/ProvenanceFooter';
import Timeline from '../../components/timeline/Timeline';
import WellPulse from '../../components/wellpulse/WellPulse';
import { useLedger } from '../../state/ledgerStore';
import { useScenario, type ActId } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';

/** Visible depth window per act (display config): span in metres and where the bit sits (fraction of height). */
const WINDOW: Record<ActId, WindowCfg> = {
  act1: { spanM: 200, bitFrac: 0.8 }, // facts-ok display window
  act2: { spanM: 240, bitFrac: 0.62 }, // facts-ok display window
  act3: { spanM: 240, bitFrac: 0.62 }, // facts-ok display window
  act4: { spanM: 240, bitFrac: 0.7 }, // facts-ok display window
};
const WELLBORE_W = 210;
const AGENT_W = 460;

export default function Cockpit() {
  const act = useScenario((s) => s.act);
  const cur = useScenario((s) => s.currentAct());
  const openOverlay = useUi((s) => s.open);
  const hasShift = useLedger((s) => s.entries.some((e) => e.id === 'SHIFT_LOG'));
  const act4Docs = act === 'act4' && hasShift;
  const pressureW = act === 'act1' ? 280 : act4Docs ? 300 : 400;
  const pressure = (
    <motion.div className={clsx('shrink-0', act4Docs && 'border-r border-strong')} animate={{ width: pressureW }} transition={{ duration: 0.25 }} style={{ width: pressureW }}>
      <Column label={act === 'act4' ? 'Pressure · loss side' : 'Pressure · kick ↔ loss'} tone={act === 'act4' ? 'text-warn' : 'text-risk'}
        right={act === 'act4' && !act4Docs ? (
          <button onClick={() => openOverlay('wcr')} className="rounded border border-accent/50 px-1.5 text-[10.5px] font-semibold text-accent hover:bg-accent/10">Shift notes ⇄ WCR</button>
        ) : undefined}>
        <PressureTrack />
      </Column>
    </motion.div>
  );

  return (
    <div className="flex h-full flex-col bg-app">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: `minmax(0,1fr) ${AGENT_W}px`, gridTemplateRows: 'minmax(0,1fr)' }}>
          <CockpitGrid window={WINDOW[act]} bitLineWidth={act === 'act3' ? WELLBORE_W : act4Docs ? WELLBORE_W + pressureW : undefined}>
            <div className="shrink-0" style={{ width: WELLBORE_W }}><WellboreColumn /></div>
            <AnimatePresence mode="wait" initial={false}>
              {act === 'act3' ? (
                <motion.div key="act3" className="min-w-0 flex-1 overflow-hidden p-3 pt-2"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                  <Act3ActionPanel />
                </motion.div>
              ) : act4Docs ? (
                <motion.div key="act4docs" className="flex min-w-0 flex-1"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {pressure}
                  <div className="min-w-0 flex-1"><Act4ShiftWcr /></div>
                </motion.div>
              ) : (
                <motion.div key="logs" className="flex min-w-0 flex-1"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div className="min-w-0 flex-1 border-r border-strong"><MultiLog /></div>
                  {pressure}
                </motion.div>
              )}
            </AnimatePresence>
          </CockpitGrid>
          <AgentPanel />
        </div>
        <WellPulse only={cur.kpis} />
        <Timeline />
        <ProvenanceFooter />
      </div>
    </div>
  );
}
