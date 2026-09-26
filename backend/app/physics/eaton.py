"""Eaton pore-pressure methods (SDD §7). Apply in SHALES against a normal compaction trend (NCT).

Sand pressure at the top of a dipping sand is obtained by centroid / lateral transfer
(`centroid_sand_pp`), not by applying Eaton directly in the sand.
"""


def pp_eaton_sonic(obg: float, pn: float, dt_normal: float, dt_observed: float, n: float = 3.0) -> float:
    """PP = OBG − (OBG − Pn) · (Δt_n / Δt)^n   (all gradients in ppg EMW)."""
    return obg - (obg - pn) * (dt_normal / dt_observed) ** n


def pp_eaton_resistivity(obg: float, pn: float, r_observed: float, r_normal: float, n: float = 1.2) -> float:
    """PP = OBG − (OBG − Pn) · (R / R_n)^n   (all gradients in ppg EMW)."""
    return obg - (obg - pn) * (r_observed / r_normal) ** n


def centroid_sand_pp(shale_pp_at_centroid_ppg: float, centroid_tvd_m: float, sand_top_tvd_m: float,
                     fluid_gradient_ppg: float) -> float:
    """Pressure at sand top from centroid pressure transferred up a connected sand body.

    P_top = P_centroid − ρ_fluid · (TVD_centroid − TVD_top), converted back to EMW at sand top.
    """
    p_centroid = shale_pp_at_centroid_ppg * centroid_tvd_m          # ppg·m (proportional to psi)
    p_top = p_centroid - fluid_gradient_ppg * (centroid_tvd_m - sand_top_tvd_m)
    return p_top / sand_top_tvd_m
