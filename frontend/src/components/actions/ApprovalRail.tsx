/** ApprovalRail — the human-in-the-loop gate. Nothing is dispatched without this click (or the spoken "approved"). */
import { useScenario } from '../../state/scenarioStore';
import { runTurn } from '../../state/turnMachine';

export default function ApprovalRail() {
  const approved = useScenario((s) => s.approvedMw);
  if (approved) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
      <div className="text-sm text-[#0B1520]">
        <div className="font-semibold">Approval required</div>
        <div className="text-xs text-slate-600">Drilling Superintendent · per MOC authority matrix</div>
      </div>
      <div className="flex gap-2">
        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Request changes</button>
        <button onClick={() => runTurn(6)} className="rounded-md bg-[#0891B2] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0E7490]">
          Approve
        </button>
      </div>
    </div>
  );
}
