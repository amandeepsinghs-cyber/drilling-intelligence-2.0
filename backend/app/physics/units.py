"""Unit conversions (SDD §7). Oilfield convention: psi = 0.052 × ppg × TVD(ft)."""

PPG_PER_SG = 8.345
FT_PER_M = 3.28084
PSI_PER_PPG_FT = 0.052


def ppg_to_sg(ppg: float) -> float:
    return ppg / PPG_PER_SG


def sg_to_ppg(sg: float) -> float:
    return sg * PPG_PER_SG


def ppg_to_psi(ppg: float, tvd_m: float) -> float:
    """Hydrostatic pressure (psi) of a fluid column of `ppg` over `tvd_m` metres."""
    return PSI_PER_PPG_FT * ppg * tvd_m * FT_PER_M


def overbalance_psi(mw_ppg: float, pp_ppg: float, tvd_m: float) -> float:
    """Static overbalance (positive) or underbalance (negative) in psi."""
    return ppg_to_psi(mw_ppg - pp_ppg, tvd_m)
