"""API smoke tests (SDD §13)."""
from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_health_and_wells():
    assert c.get("/api/health").json()["status"] == "ok"
    assert c.get("/api/wells").json()["type"] == "FeatureCollection"


def test_frames_and_frame():
    r = c.get("/api/scenario/MN-SM-DW-01/frames", params={"from": 4160, "to": 4180}).json()
    assert r["md_m"][0] == 4160 and len(r["columns"]["derived.ECD"]) == len(r["md_m"])
    f = c.get("/api/scenario/MN-SM-DW-01/frame", params={"md": 4195}).json()
    assert f["mud"]["MW_IN_PPG"] == 11.65
    assert c.get("/api/scenario/NOPE/frames").status_code == 404


def test_whatif_reproduces_brief():
    unchanged = c.post("/api/physics/whatif", json={"md_m": 4172, "mw_ppg": 11.20, "rop_m_hr": 22}).json()
    assert unchanged["p_kick_30m"] >= 0.6 and unchanged["barite"] is None
    weighted = c.post("/api/physics/whatif", json={"md_m": 4172, "mw_ppg": 11.65, "rop_m_hr": 12}).json()
    assert weighted["ecd_ppg"] == 11.84 and weighted["p_kick_30m"] < 0.1
    assert weighted["barite"] == {"mt": 39.8, "bags_50kg": 796, "volume_gain_bbl": 60}
    brk = c.post("/api/physics/whatif", json={"md_m": 4205, "mw_ppg": 11.65, "rop_m_hr": 34}).json()
    assert brk["ecd_fit_margin_ppg"] == 0.08
