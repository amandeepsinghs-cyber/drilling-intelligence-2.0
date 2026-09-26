/**
 * ShiftNotesTab — Rig-floor shift handover logs & daily operational notes for MN-SM-DW-01.
 * Reads directly from data/scenario/shift_notes.yaml via the scenario bundle / mock fallback.
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { ShiftNote } from '../../api/types';
import { useScenario } from '../../state/scenarioStore';

export default function ShiftNotesTab() {
  const bundle = useScenario((s) => s.bundle);
  const [localShifts, setLocalShifts] = useState<ShiftNote[]>([]);
  const [filterTour, setFilterTour] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Load shifts from scenario bundle or mock fallback
  useEffect(() => {
    if (bundle?.shift_notes?.shifts?.length) {
      setLocalShifts(bundle.shift_notes.shifts);
      if (!selectedShiftId) setSelectedShiftId(bundle.shift_notes.shifts[0].shift_id);
      return;
    }

    // Fallback to /mocks/shift_notes.json if not yet in bundle
    fetch('/mocks/shift_notes.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.shifts) {
          setLocalShifts(data.shifts);
          if (!selectedShiftId) setSelectedShiftId(data.shifts[0].shift_id);
        }
      })
      .catch((err) => console.warn('Failed to load mock shift notes:', err));
  }, [bundle, selectedShiftId]);

  const shifts = useMemo(() => {
    return localShifts.filter((s) => {
      const matchTour =
        filterTour === 'ALL' ||
        (filterTour === 'DAY' && s.tour.toUpperCase().includes('DAY')) ||
        (filterTour === 'NIGHT' && s.tour.toUpperCase().includes('NIGHT'));

      const matchSearch =
        searchQuery === '' ||
        s.operations.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.handover_notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.shift_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.driller.toLowerCase().includes(searchQuery.toLowerCase());

      return matchTour && matchSearch;
    });
  }, [localShifts, filterTour, searchQuery]);

  const activeShift = useMemo(() => {
    return localShifts.find((s) => s.shift_id === selectedShiftId) ?? localShifts[0];
  }, [localShifts, selectedShiftId]);

  if (!localShifts.length) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-500">
        Loading operational shift notes…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#0B1520]">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Drilling Tour Diary · 12-1/4" Section (3,850 m – 4,450 m MD)
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rig Handover Logs & Shift Notes
          </h2>
          <div className="text-xs text-slate-600">
            Well MN-SM-DW-01 · 8 Operational Shifts · Zero NPT · Zero Influx
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search operations, drillers, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          />

          {/* Tour Filter Buttons */}
          <div className="flex overflow-hidden rounded-md border border-slate-300 bg-slate-100 text-xs font-medium">
            <button
              onClick={() => setFilterTour('ALL')}
              className={clsx(
                'px-2.5 py-1 transition-colors',
                filterTour === 'ALL'
                  ? 'bg-white text-[#0891B2] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Shifts
            </button>
            <button
              onClick={() => setFilterTour('DAY')}
              className={clsx(
                'px-2.5 py-1 transition-colors',
                filterTour === 'DAY'
                  ? 'bg-white text-[#0891B2] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Day
            </button>
            <button
              onClick={() => setFilterTour('NIGHT')}
              className={clsx(
                'px-2.5 py-1 transition-colors',
                filterTour === 'NIGHT'
                  ? 'bg-white text-[#0891B2] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Night
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Master List & Detail View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Side: Shift Timeline List */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Shift Chronology ({shifts.length} of {localShifts.length})
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {shifts.map((s) => {
              const isSelected = s.shift_id === selectedShiftId;
              const hasAlert = s.shift_id === 'SHIFT-04';
              const hasMoc = s.shift_id === 'SHIFT-05';
              const hasBreak = s.shift_id === 'SHIFT-06';
              const isTd = s.shift_id === 'SHIFT-08';

              return (
                <button
                  key={s.shift_id}
                  onClick={() => setSelectedShiftId(s.shift_id)}
                  className={clsx(
                    'w-full rounded-lg border p-3 text-left transition-all',
                    isSelected
                      ? 'border-[#0891B2] bg-cyan-50/60 shadow-xs ring-1 ring-[#0891B2]/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-mono font-bold text-slate-800">{s.shift_id}</span>
                    <span className="text-[11px] text-slate-500">{s.date}</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{s.tour}</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-600">
                      {s.md_start_m.toFixed(0)}–{s.md_end_m.toFixed(0)} m
                    </span>
                  </div>

                  {/* Highlights / Badges */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hasAlert && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        ⚠️ Watchdog Alert
                      </span>
                    )}
                    {hasMoc && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        🛡️ MOC-003 Weight-Up
                      </span>
                    )}
                    {hasBreak && (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                        🎯 U3 Sand Entry
                      </span>
                    )}
                    {isTd && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                        🏁 Section TD 4,450 m
                      </span>
                    )}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      {s.rop_avg_m_hr} m/hr
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      {s.mw_in_ppg} ppg
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Shift Detail View */}
        {activeShift && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-lg font-bold text-slate-900">
                    {activeShift.shift_id} · Detailed Handover
                  </h3>
                  <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                    {activeShift.tour}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Logged on {activeShift.date} · Sign-off: {activeShift.driller}
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                  Start: <b>{activeShift.md_start_m.toFixed(1)} m</b>
                </span>
                <span className="text-slate-400">➜</span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                  End: <b>{activeShift.md_end_m.toFixed(1)} m</b>
                </span>
                <span className="rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                  +{(activeShift.md_end_m - activeShift.md_start_m).toFixed(1)} m
                </span>
              </div>
            </div>

            {/* Telemetry & Key Metrics Banner */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Mud Weight (In / Out)
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {activeShift.mw_in_ppg.toFixed(2)} / {activeShift.mw_out_ppg.toFixed(2)}{' '}
                  <span className="text-[11px] font-normal text-slate-500">ppg</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {(activeShift.mw_in_ppg / 8.33).toFixed(2)} SG equivalent
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Annular ECD
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {activeShift.ecd_ppg.toFixed(2)}{' '}
                  <span className="text-[11px] font-normal text-slate-500">ppg</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {(activeShift.ecd_ppg / 8.33).toFixed(2)} SG dynamic
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Shoe FIT Margin
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-emerald-700">
                  +{(12.10 - activeShift.ecd_ppg).toFixed(2)}{' '}
                  <span className="text-[11px] font-normal text-slate-500">ppg</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  FIT: 12.10 ppg (3,850 m)
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Average ROP
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {activeShift.rop_avg_m_hr.toFixed(1)}{' '}
                  <span className="text-[11px] font-normal text-slate-500">m/hr</span>
                </div>
                <div className="text-[10px] text-slate-500">Controlled penetration</div>
              </div>
            </div>

            {/* Operations Diary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Operational Narrative & Chronology
              </h4>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 text-[13px] leading-relaxed text-slate-800">
                {activeShift.operations}
              </div>
            </div>

            {/* Handover Notes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Driller Handover & Geomechanical Observations
              </h4>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 text-[13px] leading-relaxed text-slate-800">
                <p className="font-medium text-cyan-950 mb-1">
                  Handover to Relief Tour:
                </p>
                {activeShift.handover_notes}
              </div>
            </div>

            {/* Formal Attestation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Verified against real-time LWD telemetry · Rig spread: <b>Deepwater Rig 01</b>
                </span>
              </div>
              <div className="font-mono text-[11px]">
                Driller Signature: <span className="font-semibold text-slate-800">{activeShift.driller}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
