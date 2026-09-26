"""Fracture gradient & loss limit (SDD §7)."""


def fg_matthews_kelly(obg: float, pp: float, ki: float) -> float:
    """FG = Ki · (OBG − PP) + PP   (ppg EMW). Ki = matrix stress coefficient at depth."""
    return ki * (obg - pp) + pp


def loss_limit(fg_at_weak_point: float, fit_at_shoe: float) -> float:
    """Governing loss limit: the weaker of the formation FG and the measured shoe FIT."""
    return min(fg_at_weak_point, fit_at_shoe)
