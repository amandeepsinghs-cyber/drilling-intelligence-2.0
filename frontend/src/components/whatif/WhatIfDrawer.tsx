/** WhatIfDrawer — MW / ROP sliders → /api/physics/whatif (offline mirror if backend is down). */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { postWhatIf } from '../../api/client';
import type { WhatIfResult } from '../../api/types';
import { fmt, indexAt, num } from '../../lib/frames';
import { ecdCalibrated, ppgToSg } from '../../lib/physics';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import ProvenanceChip from '../common/ProvenanceChip';

export default function WhatIfDrawer() {
  const open = useUi((s) => s.overlays.whatif);
  const close = useUi((s) => s.close);
  const { data, bundle, md } = useScenario();
  const i = data ? indexAt(data, md) : 0;
  const mwNow = num(data, 'mud.MW_IN_PPG', i) ?? 11.2;
  const ropNow = num(data, 'drilling.ROP', i) ?? 12;
  const [mw, setMw] = useState(mwNow);
  const [rop, setRop] = useState(ropNow);
  const [res, setRes] = useState<WhatIfResult | null>(null);

  useEffect(() => { if (open) { setMw(mwNow); setRop(Math.round(ropNow)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !data || !bundle) return;
    const f = bundle.facts;
    const ahead = (data.columns['derived.PP'] as number[]).slice(i, indexAt(data, md + 30) + 1);
    const ecdF = num(data, 'derived.ECD', i) ?? 0;
    const resid = ecdF - ecdCalibrated(mwNow, ropNow);
    const h = setTimeout(async () => {
      setRes(await postWhatIf({ md_m: md, mw_ppg: mw, rop_m_hr: rop }, {
        fit: f.casing.last_shoe.fit_ppg, mw0: f.mud.initial.mw_ppg, activeBbl: f.mud.active_system_bbl,
        ppNow: num(data, 'derived.PP', i) ?? 0, ppMaxAhead: Math.max(...ahead), resid,
        pKickFrame: num(data, 'ml.p_kick', i) ?? 0, mwFrame: mwNow,
      }));
    }, 120);
    return () => clearTimeout(h);
  }, [open, mw, rop, md]); // eslint-disable-line react-hooks/exhaustive-deps

  const tone = (m: number) => (m < 0.1 ? 'text-risk' : m < 0.2 ? 'text-warn' : 'text-ok');
  return (
    <AnimatePresence>
      {open && bundle && (
        <motion.aside initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }} transition={{ duration: 0.18 }}
          className="panel absolute bottom-3 right-3 top-3 z-30 flex w-[360px] flex-col gap-4 p-4 shadow-glow">
          <div className="flex items-center justify-between">
            <div><div className="panel-title">What-if · at {md.toFixed(1)} m</div><div className="text-sm text-muted">Physics recompute, human decides</div></div>
            <button className="kbd" onClick={() => close('whatif')}>Esc</button>
          </div>
          <Slider label="Mud weight" unit="ppg" sub={`${fmt(ppgToSg(mw))} SG`} min={10.8} max={12.2} step={0.05} v={mw} set={setMw} />
          <Slider label="ROP" unit="m/hr" min={4} max={40} step={1} v={rop} set={setRop} digits={0} />
          {res && (
            <div className="grid grid-cols-2 gap-3">
              <Stat k="ECD" v={`${fmt(res.ecd_ppg)} ppg`} p={res.provenance.ecd_ppg} />
              <Stat k="ECD → FIT" v={`${fmt(res.ecd_fit_margin_ppg)} ppg`} cls={tone(res.ecd_fit_margin_ppg)} p="DERIVED" />
              <Stat k="Overbalance @ bit" v={`${res.overbalance_psi_now > 0 ? '+' : ''}${res.overbalance_psi_now} psi`} cls={res.overbalance_psi_now < 0 ? 'text-risk' : ''} p="DERIVED" />
              <Stat k="Worst UB next 30 m" v={`${fmt(res.forecast_underbalance_ppg_30m)} ppg`} cls={res.forecast_underbalance_ppg_30m > 0 ? 'text-risk' : 'text-ok'} p="DERIVED" />
              <Stat k="P(kick) 30 m" v={`${Math.round(res.p_kick_30m * 100)}%`} cls={res.p_kick_30m > 0.5 ? 'text-risk' : res.p_kick_30m > 0.15 ? 'text-warn' : 'text-ok'} p={res.provenance.p_kick_30m} />
              <Stat k="P(losses)" v={`${Math.round(res.p_loss * 100)}%`} cls={res.p_loss > 0.3 ? 'text-risk' : res.p_loss > 0.1 ? 'text-warn' : 'text-ok'} p={res.provenance.p_loss} />
              <Stat k="Max ROP · SOP margin" v={`${res.rop_max_m_hr} m/hr`} p={res.provenance.rop_max_m_hr} />
              <Stat k="Barite" v={res.barite ? `${res.barite.mt} MT · ${res.barite.bags_50kg} bags` : '—'} p="DERIVED" />
            </div>
          )}
          <div className="mt-auto text-[10.5px] leading-snug text-faint">
            {res?.model}{res?.offline ? ' · OFFLINE MIRROR' : ''}. Advisory only — any change to the mud programme requires MOC approval ({bundle.offsets.sops[2].id}).
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Slider({ label, unit, sub, min, max, step, v, set, digits = 2 }: {
  label: string; unit: string; sub?: string; min: number; max: number; step: number; v: number; set: (n: number) => void; digits?: number;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="panel-title">{label}</span>
        <span className="num text-lg text-fg">{v.toFixed(digits)} <span className="text-xs text-muted">{unit}</span> {sub && <span className="text-xs text-faint">· {sub}</span>}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} className="mt-1 w-full accent-[var(--accent)]" />
    </label>
  );
}

function Stat({ k, v, cls, p }: { k: string; v: string; cls?: string; p?: string }) {
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2">
      <div className="flex items-center justify-between gap-1"><span className="text-[10px] uppercase tracking-wider text-muted">{k}</span><ProvenanceChip p={p} className="scale-[0.8]" /></div>
      <div className={`num text-base font-semibold ${cls ?? 'text-fg'}`}>{v}</div>
    </div>
  );
}
