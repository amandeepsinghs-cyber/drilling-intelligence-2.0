/** TypeScript mirror of data/contracts (SDD §5.3). Keep in sync with JSON Schemas + backend payloads. */
export type Provenance =
  | 'MEASURED' | 'DERIVED' | 'SIMULATED' | 'ASSUMED' | 'PUBLIC' | 'SYNTHETIC' | 'MODEL_INFERENCE' | 'NOT_RECORDED';
type NumMap<K extends string> = Partial<Record<K, number | null>>;
export type LithoClass = 'SHALE' | 'SILTSTONE' | 'SAND' | 'LIMESTONE' | 'DOLOMITE';

export interface DepthFrame {
  well_id: string; md_m: number; tvd_m?: number; t_rel_s?: number;
  curves: NumMap<'GR' | 'RDEP' | 'RMED' | 'RHOB' | 'NPHI' | 'DT' | 'PEF' | 'CALI'>;
  drilling?: NumMap<'ROP' | 'WOB' | 'RPM' | 'TORQUE' | 'SPP' | 'HKLD' | 'FLOW_IN' | 'FLOW_OUT' | 'DXC'>;
  mudlog?: NumMap<'GAS_TOTAL' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CONN_GAS'>;
  mud?: NumMap<'MW_IN_PPG' | 'MW_OUT_PPG' | 'PV' | 'YP' | 'PIT_VOL_BBL'>;
  derived: NumMap<'OBG' | 'PP' | 'FG' | 'FIT' | 'ECD' | 'OVERBAL_PSI' | 'ECD_FIT_MARGIN'>;
  ml?: { litho?: { class: LithoClass; probs: Record<string, number> }; p_kick?: number; p_loss?: number; rop_max?: number };
  provenance: Record<string, Provenance>;
}

/** Columnar frames from GET /api/scenario/{well}/frames — efficient for Plotly. */
export interface Columnar {
  well_id: string;
  md_m: number[];
  columns: Record<string, (number | string | null)[]>;
  provenance: Record<string, Provenance>;
  meta: {
    well_id: string;
    grid: { top_m: number; base_m: number; step_m: number; n: number };
    lwd_source: Record<string, unknown>;
    curve_sources: Record<string, 'public' | 'synthetic'>;
    ml_status: string;
    connections_m: number[];
    provenance_footer: string;
  };
}

export interface Checkpoint { md_m: number; label: string; [k: string]: unknown }
export interface Unit { id: string; top_m: number; base_m: number; name: string; litho_class: LithoClass; notes?: string }
export interface Facts {
  well: { id: string; display_name: string; basin: string; program: string; location: { lat: number; lon: number };
    water_depth_m: number; air_gap_m: number; rig: string; current_section: { hole_size_in: number; mud_type: string };
    live_interval_m: { start: number; td: number } };
  casing: { last_shoe: { size: string; md_m: number; fit_ppg: number; fit_sg: number };
    program?: { size: string; md_m: number; role: string }[] };
  stratigraphy: Unit[];
  /** v0.5 reservoir block (mn_sm_dw_01.yaml `reservoir:`). */
  reservoir: { unit: string; sand_top_m: number; gwc_m: number; gross_gas_column_m: number; net_to_gross: number;
    quartz_pct: number; phie_pct: number; permeability_md: number; gas_c1_pct_min: number; fluid: string;
    sw_gas_leg: number; sw_water_leg: number; rw_ohmm: number; archie: { a: number; m: number; n: number } };
  /** Mudlog lag: depth lag is derived as ROP × bottoms_up_lag_min / 60. */
  mudlog: { bottoms_up_lag_min: number };
  pressure: Record<string, number | string>;
  mud: { initial: { mw_ppg: number; mw_sg: number }; weighted: { mw_ppg: number; mw_sg: number };
    active_system_bbl: number; weight_up_location_m: number; [k: string]: unknown };
  barite: { lb_per_bbl: number; total_mt: number; bags_50kg: number; volume_gain_bbl: number; [k: string]: unknown };
  drilling: { rop_initial_m_hr: number; rop_drilling_break_m_hr: number; rop_cap_m_hr: number; flow_gpm: number };
  /** Model / display config (not measurements): P(kick) horizon, alarm threshold, PP look-ahead band. */
  ml: { kick_horizon_m: number; kick_alarm_threshold: number; pp_lookahead_m: number;
    mw_rec_p10_ppg?: number; mw_rec_p90_ppg?: number };
  checkpoints: Checkpoint[];
  triggers: Record<string, { md_m: number | 'any'; conditions: Record<string, unknown>; effects: string[] }>;
  ids: { memo_id: string; dispatch_ids: string[]; wcr_id: string };
  provenance_footer: string;
}
export interface Offset {
  id: string; status: string; distance_km?: number; location: { lat: number; lon: number }; summary?: string;
  basin?: string; incident?: Record<string, unknown> & { type: string; md_m?: number }; documents?: string[];
}
export interface Turn { n: number; md_m: number; leader: 'presenter' | 'agent'; mode: string; intent?: string; trigger?: string; tools: string[]; act?: number; label?: string }

export interface ShiftNote {
  shift_id: string;
  date: string;
  tour: string;
  md_start_m: number;
  md_end_m: number;
  rop_avg_m_hr: number;
  mw_in_ppg: number;
  mw_out_ppg: number;
  ecd_ppg: number;
  operations: string;
  handover_notes: string;
  driller: string;
}

export interface ScenarioBundle {
  facts: Facts;
  offsets: { offsets: Offset[]; sops: { id: string; title: string }[]; authenticity_markers: Offset[] & { label?: string }[] };
  turns: Turn[];
  shift_notes?: { schema_version?: number; well_id?: string; shifts: ShiftNote[] };
}

export interface Citation { doc_id: string; section: string; page?: number; snippet: string; authoring: 'synthetic' | 'public' }

export interface WhatIfResult {
  ecd_ppg: number; ecd_fit_margin_ppg: number; overbalance_psi_now: number; forecast_underbalance_ppg_30m: number;
  p_kick_30m: number; p_loss: number; rop_max_m_hr: number;
  barite: { mt: number; bags_50kg: number; volume_gain_bbl: number } | null;
  provenance: Record<string, Provenance>; model: string; offline?: boolean;
}

export interface WellFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: string; status: string; label?: string; incident?: string | null; incident_md_m?: number | null; provenance: Provenance };
}
