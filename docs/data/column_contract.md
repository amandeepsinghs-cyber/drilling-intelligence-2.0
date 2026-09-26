# Column contract — MN-SM-DW-01 serving view (hi-res synthetic, O6)

**Provenance:** every `curves.*` / `truth.*` column is **SYNTHETIC**, produced by the forward model in
[`hires_well.py`](../../backend/app/scenario/hires_well.py) from the scenario YAMLs. No real log is loaded.
Persisted copy: `data/processed/lwd/mn_sm_dw_01_synth_hires.parquet` (+ `.meta.json`) via
`pipelines/synth/generate_hires_well.py`. Physics guards: `backend/tests/scenario/test_hires_physics.py`.

## Grid

| Item | Value | Source |
|---|---|---|
| Interval | 4,000 – 4,460 m MD (MD ≈ TVD) | `profiles.yaml › grid` |
| Step | 0.125 m (8 samples/m; finer than the 0.5 ft LWD norm) | `profiles.yaml › grid.step_m` |
| Samples | 3,681 | derived |
| Why 0.125 m | every checkpoint depth (4,120 / 4,172 / 4,195 / 4,205 / first post-break sample) lands exactly on a sample | — |

## Petrophysical curves (`curves.*`, SYNTHETIC)

| Column | Unit | Model | Tool res. (FWHM) |
|---|---|---|---|
| GR | API | 25 + 100·Vsh | 0.30 m |
| GR_UP / GR_DN | API | GR + independent azimuthal-bin noise | 0.30 m |
| RHOB | g/cc | volumetric: Σ Vᵢ ρᵢ + CBW·ρbrine + PHIE·(flushed-zone fluid ρ); washout correction | 0.45 m |
| NPHI | v/v (limestone units) | volumetric hydrogen index (clay 0.33, quartz −0.02, gas HI 0.35) | 0.45 m |
| PEF | b/e | mass-weighted mineral + fluid PEF | 0.30 m |
| CALI | in | bit 12.25 in + unit gauge + seeded U2 washouts (overpressured shale spalling) | 0.15 m |
| DT | µs/ft | shaly: NCT × Eaton⁻¹ (n = 3) + U2 transition-gas term; matrix: Wyllie + gas slowing | 0.60 m |
| DTSM | µs/ft | DT × VPVS | 0.60 m |
| VPVS | – | shale 2.05 / gas sand 1.60 / water sand 1.85 / limestone 1.90 | 0.60 m |
| RSHAL / RMED / RDEP | Ω·m | radial mix 1/Ra = J/Rxo + (1−J)/Rt, J = 0.70 / 0.35 / 0.05 | 0.40 / 0.80 / 1.50 m |
| PHIE | v/v | truth PHIE through the density-tool response | 0.45 m |
| SW | v/v | Archie interpretation from logged RDEP + PHIE (a, m, n, Rw from YAML) | derived |

All noise is band-limited and seeded from `well_id + profiles.seed_salt`, so the result is identical on every run.

## Trends and ground truth

| Column | Meaning |
|---|---|
| `trend.DT_NCT` | Normal compaction trend. Anchored so that NCT(T3 depth) = warning-point DT − T3 departure (both from YAML). Slope comes from `hires.dt_nct_per_m`. |
| `trend.RDEP_NCT` | Shale resistivity trend (`hires.rdep_nct`). |
| `truth.VSH, VCL, VQTZ, VCALC, PHIT` | Generator bulk volumes. VCL + VQTZ + VCALC + PHIT = 1. |
| `truth.PHIE` | PHIT − clay-bound water. |
| `truth.SW, SXO_W` | Water saturation in the virgin zone and in the flushed zone. |
| `truth.LITHO` | Label for ML training: SHALE / SILTSTONE / SAND / LIMESTONE. Includes the U3 interbeds and the U2 stringers. |
| `mudlog.CUT_*_PCT` | Cuttings % at the shakers: truth solids lagged by ROP × 45/60 m and rounded to 10 % steps. |
| `mudlog.LAG_M` | Cuttings depth lag (DERIVED). |

## Modelling decisions (owner-visible)

1. **DT departure at 4,172 m = Eaton plus a transition-gas term.**
   - The story needs DT − NCT = +10 µs/ft, which gives DT = 101.
   - Eaton n = 3 at the scenario PP (11.08 ppg against an OBG of 13.95) explains only about +1.3 µs/ft.
   - The remaining ~8.6 µs/ft comes from a U2 gas/transition term. It is justified by gas leaking up from the U3 sand: connection gas is rising, and a few % gas in shale slows Vp sharply.
   - The term is calibrated so the logged DT at the trigger equals the checkpoint. `meta.lwd_source.dt_decomposition_at_trigger` records the split.
2. **No SP curve.** SP cannot be recorded in non-conductive SOBM.
3. **Rw = 0.10 Ω·m** (generator-only). This gives Rt ≈ 35 Ω·m in clean gas sand, inside the YAML range of 28–45.
4. **SOBM invasion.**
   - Base-oil filtrate is non-conductive and displaces only movable fluid.
   - **Gas leg:** RSHAL ≈ RMED ≈ RDEP, so the curves stack.
   - **Water leg:** RSHAL > RMED > RDEP, because oil raises Rxo.
   - The density–neutron crossover appears only in the gas leg: residual gas stays in the flushed zone.
5. **Thin beds.**
   - U3 is an interbedded turbidite (NTG ≈ 0.84).
   - Deep resistivity smears the shale interbeds while GR resolves them. This is real shoulder-bed behaviour, so the YAML ranges are tested on clean sand ≥ 1 m from a boundary.
6. **Dry gas in U3.** Mud-log C1 is ~90 % of C1–C5 in U3, which satisfies the YAML rule C1 > 88 %. The background elsewhere is wetter.
7. **Checkpoint "After ROP cap".** Its display depth stays 4,205 m. Its values are sampled at `frame_md_m`, the first sample after the break interval.
