"""ECD model (SDD §7).

Phase 0/1: a *scenario-calibrated* linear model that reproduces brief §3C exactly:
    ECD = MW + a(MW) + b · ROP + residual_cuttings
    a(MW) = 0.04 + 0.115 · (MW − 11.20)   [frictional term, grows with MW/PV]
    b     = 0.18 / 22                      [cuttings-loading term per m/hr]
Phase 2 replaces this with Bingham-plastic annular losses + cuttings concentration,
calibrated to the same checkpoints (acceptance tests stay unchanged).
"""

A0 = 0.04
A_SLOPE = 0.115
MW_REF = 11.20
B_ROP = 0.18 / 22.0


def ecd_calibrated(mw_ppg: float, rop_m_hr: float, residual_cuttings_ppg: float = 0.0) -> float:
    friction = A0 + A_SLOPE * (mw_ppg - MW_REF)
    return mw_ppg + friction + B_ROP * rop_m_hr + residual_cuttings_ppg
