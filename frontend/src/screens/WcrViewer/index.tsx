/** WcrViewer route (/wcr/:docId) — standalone page for the WCR draft. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/common/AppHeader';
import { useScenario } from '../../state/scenarioStore';
import WcrDocument from './WcrDocument';
import ShiftNotesTab from './ShiftNotesTab';

export default function WcrViewer() {
  const [tab, setTab] = useState<'wcr' | 'shifts'>('wcr');
  const load = useScenario((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="h-full overflow-y-auto bg-app p-6">
      <div className="mx-auto mb-4 flex max-w-[1040px] items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-line bg-card p-0.5 text-xs">
            <button
              onClick={() => setTab('wcr')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                tab === 'wcr' ? 'bg-accent/20 text-accent font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              📄 Executive WCR Report
            </button>
            <button
              onClick={() => setTab('shifts')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                tab === 'shifts' ? 'bg-accent/20 text-accent font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              📋 Drilling Shift Notes (8)
            </button>
          </div>
          <Link to="/well/MN-SM-DW-01" className="btn text-xs">← Command center</Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1040px] rounded-xl bg-[#FBFCFD] p-10 shadow-2xl">
        {tab === 'wcr' ? <WcrDocument /> : <ShiftNotesTab />}
      </div>
    </div>
  );
}
