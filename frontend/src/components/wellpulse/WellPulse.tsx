/** WellPulse — the one-glance KPI strip with ML Lithology and ML Mud Weight outputs. */
import clsx from 'clsx';
import type { Provenance } from '../../api/types';
import { fmt, indexAt, num, str } from '../../lib/frames';
import { overbalancePsi, ppgToSg } from '../../lib/physics';
import { useScenario, type KpiId } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import KpiNumber from '../common/KpiNumber';
import ProvenanceChip from '../common/ProvenanceChip';

type Tone = 'ok' | 'warn' | 'risk' | 'neutral';
const toneCls: Record<Tone, string> = { ok: 'text-ok', warn: 'text-warn', risk: 'text-risk', neutral: 'text-fg' };

function Kpi({
  label,
  value,
  unit,
  textValue,
  digits = 2,
  tone = 'neutral',
  sub,
  subTone,
  prov,
  sign,
  big,
}: {
  label: string;
  value?: number | null;
  textValue?: string;
  unit?: string;
  digits?: number;
  tone?: Tone;
  sub?: string;
  subTone?: Tone;
  prov?: Provenance;
  sign?: boolean;
  big: boolean;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col justify-between border-r border-line px-3.5 py-2 last:border-r-0">
      <div className="flex items-center justify-between gap-1.5">
        <span className="panel-title truncate text-[11px] font-medium">{label}</span>
        {prov && <ProvenanceChip p={prov} className="scale-85 opacity-90" />}
      </div>
      <div className="flex items-baseline gap-1.5">
        {textValue ? (
          <span
            className={clsx(
              big ? 'text-[32px] leading-tight' : 'text-[24px] leading-tight',
              'font-semibold tracking-wide',
              toneCls[tone],
            )}
          >
            {textValue}
          </span>
        ) : (
          <KpiNumber
            value={value ?? null}
            digits={digits}
            prefixSign={sign}
            className={clsx(
              big ? 'text-[38px] leading-[1.05]' : 'text-[28px] leading-tight',
              'font-semibold',
              toneCls[tone],
            )}
          />
        )}
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      <div className={clsx('num h-4 truncate text-[10.5px]', subTone ? toneCls[subTone] : 'text-faint')}>
        {sub ?? ''}
      </div>
    </div>
  );
}

export default function WellPulse({ only }: { only?: KpiId[] } = {}) {
  const { data, bundle, md, hazardOn, approvedMw, ropCapped, fired } = useScenario();
  const mode = useUi((s) => s.mode);
  if (!data || !bundle) return <div className="panel h-[112px]" />;

  const f = bundle.facts;
  const i = indexAt(data, md);
  const v = (c: string) => num(data, c, i);
  const p = data.provenance;
  const mw = v('mud.MW_IN_PPG');
  const ecd = v('derived.ECD');
  const pp = v('derived.PP');
  const ob = v('derived.OVERBAL_PSI');
  const margin = v('derived.ECD_FIT_MARGIN');
  const pk = v('ml.p_kick');
  const rop = v('drilling.ROP');

  const unit =
    f.stratigraphy.find((u) => md >= u.top_m && md < u.base_m) ??
    f.stratigraphy[f.stratigraphy.length - 1];
  const sandTop = f.pressure.sand_top_m as number;
  const ppTop = f.pressure.pp_sand_top_ppg as number;
  const obIfUnchanged = overbalancePsi(f.mud.initial.mw_ppg, ppTop, sandTop);
  const big = mode === 'board';

  const obTone: Tone = ob === null ? 'neutral' : ob < 0 ? 'risk' : ob < 100 ? 'warn' : 'ok';
  const mTone: Tone = margin === null ? 'neutral' : margin < 0.1 ? 'risk' : margin < 0.2 ? 'warn' : 'ok';
  const pkTone: Tone = pk === null ? 'neutral' : pk >= f.ml.kick_alarm_threshold ? 'risk' : pk >= 0.15 ? 'warn' : 'ok';

  // ML outputs — all numbers from the scenario YAML / frames, never literals.
  const lithClass = str(data, 'ml.litho.class', i) ?? '—';
  const recMw = f.mud.weighted.mw_ppg;
  const needsWeightUp = !!fired.T3_PRESSURE_RAMP && !approvedMw;
  const delta = recMw - f.mud.initial.mw_ppg;

  const all: Record<KpiId, JSX.Element | null> = {
    depth: (
      <Kpi key="depth" big={big} label="Bit depth · MD" value={md} unit="m" digits={1}
        sub={`${unit.id} · shoe ${f.casing.last_shoe.md_m.toLocaleString('en-IN')} m`} />
    ),
    litho: (
      <Kpi key="litho" big={big} label="ML lithology at bit" textValue={lithClass}
        tone={lithClass === 'SAND' ? 'warn' : 'neutral'} prov="MODEL_INFERENCE"
        sub={`ML facies · ${unit.name.split(':')[0]}`} />
    ),
    mw: (
      <Kpi key="mw" big={big} label="Mud weight · active" value={mw} unit="ppg"
        tone={needsWeightUp ? 'warn' : 'ok'} prov={p['mud.MW_IN_PPG']}
        sub={
          approvedMw
            ? `${fmt(recMw)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) · MOC approved`
            : needsWeightUp
            ? `ML rec ${fmt(recMw)} ppg (+${fmt(delta)} ppg)`
            : `${fmt(ppgToSg(mw ?? f.mud.initial.mw_ppg))} SG · on plan`
        }
        subTone={needsWeightUp ? 'warn' : approvedMw ? 'ok' : undefined} />
    ),
    pp: (
      <Kpi key="pp" big={big} label="Pore pressure @ bit" value={pp} unit="ppg" prov={p['derived.PP']}
        sub={hazardOn ? `sand top forecast ${fmt(ppTop)} ppg` : 'on normal compaction trend'}
        subTone={hazardOn ? 'warn' : undefined} />
    ),
    overbal: (
      <Kpi key="overbal" big={big} label="Overbalance" value={ob} unit="psi" digits={0} sign tone={obTone}
        prov={p['derived.OVERBAL_PSI']}
        sub={hazardOn && !approvedMw ? `if unchanged @ sand: ${Math.round(obIfUnchanged)} psi` : 'minimum +100 psi target'}
        subTone={hazardOn && !approvedMw ? 'risk' : undefined} />
    ),
    ecdfit: (
      <Kpi key="ecdfit" big={big} label="ECD → FIT margin" value={margin} unit="ppg" tone={mTone}
        prov={p['derived.ECD_FIT_MARGIN']}
        sub={ecd ? `ECD ${fmt(ecd)} vs FIT ${fmt(f.casing.last_shoe.fit_ppg)}` : ''} />
    ),
    pkick: (
      <Kpi key="pkick" big={big} label={`P(kick) · next ${f.ml.kick_horizon_m} m`} value={pk === null ? null : pk * 100} unit="%" digits={0}
        tone={pkTone} prov={p['ml.p_kick']}
        sub={pk && pk >= f.ml.kick_alarm_threshold ? `exceeds ${Math.round(f.ml.kick_alarm_threshold * 100)}% alarm threshold` : 'ML kick-risk model'} />
    ),
    rop: (
      <Kpi key="rop" big={big} label="ROP" value={rop} unit="m/hr" digits={0} prov={p['drilling.ROP']}
        tone={rop !== null && rop > 30 ? 'warn' : 'neutral'}
        sub={ropCapped ? `capped ${f.drilling.rop_cap_m_hr} m/hr by agent` : rop !== null && rop > 30 ? 'drilling break in progress' : 'normal penetration'}
        subTone={ropCapped ? 'ok' : rop !== null && rop > 30 ? 'warn' : undefined} />
    ),
  };
  const order: KpiId[] = only ?? ['depth', 'litho', 'mw', 'pp', 'overbal', 'ecdfit', 'pkick', 'rop'];

  return (
    <div className="panel flex h-[112px] shrink-0 items-stretch overflow-hidden">
      {order.map((k) => all[k])}
    </div>
  );
}
