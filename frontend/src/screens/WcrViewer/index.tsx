/** WcrViewer route (/wcr/:docId) — standalone page for the WCR draft. */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/common/AppHeader';
import { useScenario } from '../../state/scenarioStore';
import WcrDocument from './WcrDocument';

export default function WcrViewer() {
  const load = useScenario((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="h-full overflow-y-auto bg-app p-6">
      <div className="mx-auto mb-4 flex max-w-[1040px] items-center justify-between"><Wordmark /><Link to="/well/MN-SM-DW-01" className="btn text-xs">← Command center</Link></div>
      <div className="mx-auto max-w-[1040px] rounded-xl bg-[#FBFCFD] p-10 shadow-2xl"><WcrDocument /></div>
    </div>
  );
}
