/** CommandCenter — the live-well screen (SDD §12.2). */
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import DispatchCard from '../../components/actions/DispatchCard';
import MemoOverlay from '../../components/actions/MemoOverlay';
import PhoneMirror from '../../components/actions/PhoneMirror';
import AgentPanel from '../../components/agent/AgentPanel';
import AuditDrawer from '../../components/audit/AuditDrawer';
import AppHeader from '../../components/common/AppHeader';
import Panel from '../../components/common/Panel';
import ProvenanceChip from '../../components/common/ProvenanceChip';
import ProvenanceFooter from '../../components/common/ProvenanceFooter';
import Toast from '../../components/common/Toast';
import LithoLegend from '../../components/logs/LithoColumn';
import LogTracks from '../../components/logs/LogTracks';
import PressureWindow from '../../components/pressure/PressureWindow';
import Timeline from '../../components/timeline/Timeline';
import WellboreSchematic2D from '../../components/wellbore/WellboreSchematic2D';
import WellPulse from '../../components/wellpulse/WellPulse';
import WhatIfDrawer from '../../components/whatif/WhatIfDrawer';
import { HOTKEYS, usePresenterBridge } from '../../state/presenter';
import { useScenario } from '../../state/scenarioStore';
import { usePlayback } from '../../state/usePlayback';
import { useUi } from '../../state/uiStore';
import WcrOverlay from '../WcrViewer/WcrOverlay';

const Well3DView = lazy(() => import('../../components/well3d/Well3DView'));

export default function CommandCenter() {
  const { load, data } = useScenario();
  const { view3d, mode } = useUi();
  useEffect(() => { void load(); }, [load]);
  usePresenterBridge();
  usePlayback();

  if (!data) {
    return <div className="grid h-full place-items-center text-sm text-muted">Loading well data…</div>;
  }
  const curveProv = data.provenance['curves.GR'];
  return (
    <div className="relative flex h-full flex-col gap-3 bg-app p-3">
      <AppHeader />
      <WellPulse />
      <div className="grid min-h-0 flex-1 gap-3"
        style={{ gridTemplateColumns: mode === 'board' ? 'minmax(0,1.35fr) 150px minmax(0,1fr) 400px' : 'minmax(0,1.7fr) 130px minmax(0,1fr) 380px' }}>
        <Panel title={view3d ? 'Offset wells · 3D' : 'Logs · while drilling'} right={<>{!view3d && <LithoLegend />}<ProvenanceChip p={curveProv} /></>}>
          {view3d ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted">Loading 3D…</div>}><Well3DView /></Suspense>
          ) : <LogTracks />}
        </Panel>
        <Panel title="Wellbore"><WellboreSchematic2D /></Panel>
        <Panel title="Pressure window" right={<ProvenanceChip p="DERIVED" />}><PressureWindow /></Panel>
        <AgentPanel />
      </div>
      <Timeline />
      <ProvenanceFooter />
      <MemoOverlay />
      <WhatIfDrawer />
      <AuditDrawer />
      <PhoneMirror />
      <DispatchCard />
      <WcrOverlay />
      <HelpOverlay />
      <Toast />
    </div>
  );
}

function HelpOverlay() {
  const open = useUi((s) => s.overlays.help);
  const close = useUi((s) => s.close);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-50 grid place-items-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close('help')}>
          <div className="panel w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="panel-title mb-3">Presenter hotkeys</div>
            <table className="w-full text-sm"><tbody>
              {HOTKEYS.map(([k, v]) => <tr key={k}><td className="py-1 pr-4"><span className="kbd">{k}</span></td><td className="text-muted">{v}</td></tr>)}
            </tbody></table>
            <div className="mt-3 text-[11px] text-faint">Second screen: open <span className="num">/presenter</span> in another window.</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
