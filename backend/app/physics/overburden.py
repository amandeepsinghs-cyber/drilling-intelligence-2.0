"""Overburden gradient (SDD §7): seawater column + sediment column, expressed as EMW (ppg)."""
from app.physics.units import PPG_PER_SG

SEAWATER_SG = 1.03


def obg_ppg(tvd_m: float, water_depth_m: float, air_gap_m: float = 0.0,
            sediment_density_gcc: float = 2.1, seawater_sg: float = SEAWATER_SG) -> float:
    """Average overburden gradient from RKB to `tvd_m`.

    Uses a constant average sediment bulk density below mudline (Phase 2 may replace this
    with an integrated density profile, e.g. Gardner from DT).
    """
    sediment_m = max(tvd_m - water_depth_m - air_gap_m, 0.0)
    sigma_v_sg_m = water_depth_m * seawater_sg + sediment_m * sediment_density_gcc
    return sigma_v_sg_m / tvd_m * PPG_PER_SG
