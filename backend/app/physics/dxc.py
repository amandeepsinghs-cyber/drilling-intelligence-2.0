"""d-exponent and corrected d-exponent (Jorden & Shirley, 1966). SDD §7.

    d   = log10(R / (60·N)) / log10(12·W / (10^6 · D))
    dxc = d · (ρ_normal / ρ_ecd)
R = ROP (ft/hr), N = RPM, W = WOB (lb), D = bit diameter (in).
A *reversal* (dxc falling below its compaction trend with depth) flags undercompaction / overpressure.
"""
import math

from app.physics.units import FT_PER_M


def d_exponent(rop_m_hr: float, rpm: float, wob_klb: float, bit_in: float) -> float:
    r_ft_hr = rop_m_hr * FT_PER_M
    return math.log10(r_ft_hr / (60.0 * rpm)) / math.log10(12.0 * wob_klb * 1000.0 / (1e6 * bit_in))


def dxc(rop_m_hr: float, rpm: float, wob_klb: float, bit_in: float, mw_normal_ppg: float,
        ecd_ppg: float) -> float:
    return d_exponent(rop_m_hr, rpm, wob_klb, bit_in) * (mw_normal_ppg / ecd_ppg)
