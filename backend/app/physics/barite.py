"""Barite weight-up calculations (SDD §7).

Standard field formula: sacks(100 lb) per 100 bbl = 1470 · (W2 − W1) / (35 − W2),
which is numerically equal to lb of barite per bbl of mud. Barite density = 35 ppg (4.2 SG).
"""

LB_PER_KG = 2.20462
BARITE_PPG = 35.0
GAL_PER_BBL = 42.0


def barite_lb_per_bbl(w1_ppg: float, w2_ppg: float) -> float:
    return 1470.0 * (w2_ppg - w1_ppg) / (BARITE_PPG - w2_ppg)


def barite_total(w1_ppg: float, w2_ppg: float, volume_bbl: float, bag_kg: float = 50.0) -> dict:
    lb = barite_lb_per_bbl(w1_ppg, w2_ppg) * volume_bbl
    kg = lb / LB_PER_KG
    return {"lb": lb, "mt": kg / 1000.0, "bags": kg / bag_kg}


def barite_volume_gain_bbl(barite_lb: float) -> float:
    """Volume added by barite (bbl) = lb / (35 ppg × 42 gal/bbl)."""
    return barite_lb / (BARITE_PPG * GAL_PER_BBL)
