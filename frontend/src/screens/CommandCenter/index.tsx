/** CommandCenter — the live-well screen (SDD §12.2). */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import DispatchCard from '../../components/actions/DispatchCard';
import MemoOverlay from '../../components/actions/MemoOverlay';
import PhoneMirror from '../../components/actions/PhoneMirror';
import AuditDrawer from '../../components/audit/AuditDrawer';
import Toast from '../../components/common/Toast';
import WhatIfDrawer from '../../components/whatif/WhatIfDrawer';
import { HOTKEYS, usePresenterBridge } from '../../state/presenter';
import { useScenario, type ActId } from '../../state/scenarioStore';
import { enterAct } from '../../state/turnMachine';
import { usePlayback } from '../../state/usePlayback';
import { useUi } from '../../state/uiStore';
import WcrOverlay from '../WcrViewer/WcrOverlay';
import TakeawayCard from '../../components/common/TakeawayCard';
import Cockpit from './Cockpit';


export default function CommandCenter() {
  const { load, data } = useScenario();
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get('act');
    if (data && a && /^[1-4]$/.test(a)) enterAct(`act${a}` as ActId);
  }, [data]);
  usePresenterBridge();
  usePlayback();

  if (!data) {
    return <div className="grid h-full place-items-center text-sm text-muted">Loading well data…</div>;
  }
  return (
    <div className="relative h-full">
      <Cockpit />
      <TakeawayCard />
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
