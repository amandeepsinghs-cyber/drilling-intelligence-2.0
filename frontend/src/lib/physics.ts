/**
 * Offline mirror of backend physics (backend/app/physics/*) — used ONLY if /api/physics/whatif is
 * unreachable. Constants mirror ecd.py; results are flagged `offline: true` in the Audit drawer.
 */
import type { WhatIfResult } from '../api/types';

const A0 = 0.04, A_SLOPE = 0.115, MW_REF = 11.2, B_ROP = 0.18 / 22;
const FT_PER_M = 3.28084, LB_PER_KG = 2.20462;

export const ecdCalibrated = (mw: number, rop: number, resid = 0) => mw + A0 + A_SLOPE * (mw - MW_REF) + B_ROP * rop + resid;
export const overbalancePsi = (mw: number, pp: number, tvd: number) => 0.052 * (mw - pp) * tvd * FT_PER_M;
export const ppgToSg = (ppg: number) => ppg / 8.345;

export function whatIfOffline(
  q: { md_m: number; mw_ppg: number; rop_m_hr: number },
  ctx: { fit: number; mw0: number; activeBbl: number; ppNow: number; ppMaxAhead: number; resid: number; pKickFrame: number; mwFrame: number },
): WhatIfResult {
  const ecd = ecdCalibrated(q.mw_ppg, q.rop_m_hr, ctx.resid);
  const margin = ctx.fit - ecd;
  const ub = ctx.ppMaxAhead - q.mw_ppg;
  const logistic = (u: number) => 0.04 + 0.9 / (1 + Math.exp(-(u - 0.2266) / 0.05));
  const pk = Math.min(0.99, Math.max(0, ctx.pKickFrame + logistic(ub) - logistic(ctx.ppMaxAhead - ctx.mwFrame)));
  const pl = 0.02 + 0.6 / (1 + Math.exp((margin - 0.1) / 0.03));
  const head = ctx.fit - 0.24 - q.mw_ppg - (A0 + A_SLOPE * (q.mw_ppg - MW_REF)) - ctx.resid;
  let barite: WhatIfResult['barite'] = null;
  if (q.mw_ppg > ctx.mw0) {
    const lbBbl = Math.round((1470 * (q.mw_ppg - ctx.mw0)) / (35 - q.mw_ppg) * 10) / 10;
    const lb = lbBbl * ctx.activeBbl, kg = lb / LB_PER_KG;
    barite = { mt: Math.round(kg / 100) / 10, bags_50kg: Math.round(kg / 50), volume_gain_bbl: Math.round(lb / (35 * 42)) };
  }
  return {
    ecd_ppg: +ecd.toFixed(3), ecd_fit_margin_ppg: +margin.toFixed(3),
    overbalance_psi_now: Math.round(overbalancePsi(q.mw_ppg, ctx.ppNow, q.md_m)),
    forecast_underbalance_ppg_30m: +ub.toFixed(3), p_kick_30m: +pk.toFixed(3), p_loss: +pl.toFixed(3),
    rop_max_m_hr: +Math.min(40, Math.max(0, head / B_ROP)).toFixed(1), barite,
    provenance: { ecd_ppg: 'DERIVED', p_kick_30m: 'MODEL_INFERENCE', p_loss: 'MODEL_INFERENCE', rop_max_m_hr: 'MODEL_INFERENCE', barite: 'DERIVED' },
    model: 'offline mirror of ecd_calibrated + baseline_heuristic', offline: true,
  };
}
