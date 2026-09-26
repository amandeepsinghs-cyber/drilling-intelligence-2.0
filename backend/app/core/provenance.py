"""Provenance labels (SDD §5.3). Every figure in the UI carries one of these."""
from enum import StrEnum


class Provenance(StrEnum):
    MEASURED = "MEASURED"            # real sensor data from the live well (pilot scope)
    DERIVED = "DERIVED"              # computed by physics from other fields
    SIMULATED = "SIMULATED"          # scenario-engine channel (drilling, mud-log, mud, overlays)
    ASSUMED = "ASSUMED"              # engineering assumption (e.g. PV, Ki)
    PUBLIC = "PUBLIC"                # real public log (IODP / FORCE / Volve), depth-registered
    SYNTHETIC = "SYNTHETIC"          # generated stand-in (stub curves, synthetic documents)
    MODEL_INFERENCE = "MODEL_INFERENCE"  # ML / heuristic model output
    NOT_RECORDED = "NOT_RECORDED"    # channel absent in the source


CURVES = (
    "GR", "GR_UP", "GR_DN",
    "RDEP", "RMED", "RSHAL",
    "RHOB", "NPHI", "PEF", "CALI",
    "DT", "DTSM", "VPVS",
    "PHIE", "SW",
)
DRILLING = ("ROP", "WOB", "RPM", "TORQUE", "SPP", "HKLD", "FLOW_IN", "FLOW_OUT", "DXC")
MUDLOG = ("GAS_TOTAL", "C1", "C2", "C3", "C4", "C5", "CONN_GAS", "GAS_WETNESS")
MUD = ("MW_IN_PPG", "MW_OUT_PPG", "PV", "YP", "PIT_VOL_BBL")
DERIVED = ("OBG", "PP", "FG", "FIT", "ECD", "OVERBAL_PSI", "ECD_FIT_MARGIN")
