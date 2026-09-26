/**
 * Phase-1 mock agent script (bilingual EN / हिन्दी). Replaced by Gemini Live in Phase 4, but the
 * *numbers* here are already live: every figure is read from the facts bundle or the frames, never
 * typed in. Citations point at SYNTHETIC corpus doc IDs that Phase 3 will generate.
 */
import type { Citation, Columnar, ScenarioBundle } from '../api/types';
import { fmt, fmtInt, indexAt, num } from '../lib/frames';

export interface ScriptLine {
  presenter?: { en: string; hi: string };
  agent: { en: string; hi: string };
  citations?: Citation[];
}

const n0 = (v: number) => v.toLocaleString('en-IN');

export function buildScript(b: ScenarioBundle, d: Columnar): Record<number, ScriptLine> {
  const f = b.facts;
  const at = (md: number, col: string) => num(d, col, indexAt(d, md));
  const cp = (label: string) => f.checkpoints.find((c) => c.label === label)!;
  const before = cp('Before'), warn = cp('Warning point'), sand = cp('Sand top (offset kick depth)');
  const brk = cp('Drilling break'), cap = cp('After ROP cap');
  const mw0 = f.mud.initial.mw_ppg, mw1 = f.mud.weighted.mw_ppg, fit = f.casing.last_shoe.fit_ppg;
  const shoe = f.casing.last_shoe.md_m;
  const off = b.offsets.offsets;
  const kick = off.find((o) => o.incident?.type === 'KICK')!;
  const loss = off.find((o) => o.incident?.type === 'LOSSES')!;
  const ki = kick.incident as Record<string, number>, li = loss.incident as Record<string, number>;
  const sop = b.offsets.sops[0];
  const dtx = (at(warn.md_m, 'curves.DT') ?? 0) - (at(warn.md_m, 'trend.DT_NCT') ?? 0);
  const cg = warn.conn_gas_pct as { from: number; to: number };
  const pk = Math.round((warn.p_kick_30m_if_unchanged as number) * 100);
  const margin5 = fit - (sand.ecd_ppg as number);
  const [mc, rtoc, email, push] = f.ids.dispatch_ids;
  const t2 = b.turns.find((t) => t.n === 2)!.md_m;
  const dxcFrom = f.triggers.T3_PRESSURE_RAMP.conditions.dxc_reversal_from_m as number;
  const cite = (doc_id: string, section: string, snippet: string): Citation => ({ doc_id, section, snippet, authoring: 'synthetic' });

  return {
    0: {
      presenter: { en: `Status of ${f.well.id}?`, hi: `${f.well.id} का status क्या है?` },
      agent: {
        en: `${f.well.id} is drilling ${f.well.current_section.hole_size_in}-in hole at ${n0(before.md_m)} m in the Upper Miocene seal. Mud weight ${fmt(mw0)} ppg (${fmt(f.mud.initial.mw_sg)} SG), ECD ${fmt(before.ecd_ppg as number)} ppg against a shoe FIT of ${fmt(fit)} ppg at ${n0(shoe)} m. Overbalance ${fmtInt(at(before.md_m, 'derived.OVERBAL_PSI'))} psi. No well-control indicators.`,
        hi: `${f.well.id} अभी ${n0(before.md_m)} मीटर पर Upper Miocene seal में ${f.well.current_section.hole_size_in}-इंच होल ड्रिल कर रहा है। मड वेट ${fmt(mw0)} ppg (${fmt(f.mud.initial.mw_sg)} SG), ECD ${fmt(before.ecd_ppg as number)} ppg — ${n0(shoe)} मीटर शू पर FIT ${fmt(fit)} ppg है। ओवरबैलेंस ${fmtInt(at(before.md_m, 'derived.OVERBAL_PSI'))} psi। कोई well-control संकेत नहीं।`,
      },
    },
    1: {
      presenter: { en: 'Keep watching the pressure trend and tell me the moment anything changes.', hi: 'प्रेशर ट्रेंड पर नज़र रखो, कुछ भी बदले तो तुरंत बताना।' },
      agent: {
        en: 'Watchdog armed: d-exponent, sonic against normal compaction trend, connection gas, and kick probability over the next 30 m. I will interrupt if they converge.',
        hi: 'वॉचडॉग चालू: d-exponent, normal compaction trend के मुकाबले sonic, connection gas, और अगले 30 मीटर की kick probability। ये संकेत एक साथ आए तो मैं तुरंत बीच में बोलूँगा।',
      },
    },
    2: {
      presenter: { en: 'What are we drilling through now?', hi: 'अभी हम किस formation में हैं?' },
      agent: {
        en: `At ${n0(t2)} m: compact marine shale, gamma ray about ${fmtInt(at(t2, 'curves.GR'))} API, sonic on trend. The transition zone starts at ${n0(f.stratigraphy[1].top_m)} m and the main sand at ${n0(f.stratigraphy[2].top_m)} m.`,
        hi: `${n0(t2)} मीटर पर: compact marine shale, gamma ray लगभग ${fmtInt(at(t2, 'curves.GR'))} API, sonic trend पर है। Transition zone ${n0(f.stratigraphy[1].top_m)} मीटर से और मुख्य sand ${n0(f.stratigraphy[2].top_m)} मीटर से शुरू होगी।`,
      },
    },
    3: {
      agent: {
        en: `Pressure alert at ${n0(warn.md_m)} m. The d-exponent has reversed since ${n0(dxcFrom)} m, sonic is ${fmt(dtx, 0)} µs/ft above the normal trend, and connection gas rose from ${cg.from}% to ${cg.to}%. Forecast pore pressure at the sand top, ${n0(warn.pp_forecast_at_m as number)} m — ${warn.distance_to_hazard_m} m ahead — is ${fmt(warn.pp_forecast_ppg as number)} ppg. At ${fmt(mw0)} ppg we would be about ${Math.abs(warn.overbalance_if_unchanged_psi as number)} psi underbalanced. Kick probability over the next 30 m: ${pk}%.`,
        hi: `प्रेशर अलर्ट — ${n0(warn.md_m)} मीटर। ${n0(dxcFrom)} मीटर से d-exponent उलट गया है, sonic normal trend से ${fmt(dtx, 0)} µs/ft ऊपर है, और connection gas ${cg.from}% से ${cg.to}% हो गई है। ${warn.distance_to_hazard_m} मीटर आगे, ${n0(warn.pp_forecast_at_m as number)} मीटर पर sand top में pore pressure ${fmt(warn.pp_forecast_ppg as number)} ppg का अनुमान है। ${fmt(mw0)} ppg पर हम लगभग ${Math.abs(warn.overbalance_if_unchanged_psi as number)} psi underbalanced होंगे। अगले 30 मीटर में kick की संभावना ${pk}%।`,
      },
    },
    4: {
      presenter: { en: 'What happened in the offset wells, and what does our SOP say?', hi: 'Offset wells में क्या हुआ था, और हमारा SOP क्या कहता है?' },
      agent: {
        en: `${kick.id}, ${kick.distance_km} km away, took a ${ki.gain_bbl} bbl kick at ${n0(ki.md_m)} m in this same sand with ${fmt(ki.mw_ppg)} ppg mud — SIDPP ${ki.sidpp_psi} psi, formation pressure ${fmt(ki.formation_pressure_ppg)} ppg, killed with ${fmt(ki.kill_mw_ppg)} ppg. ${loss.id} lost ${li.loss_rate_bbl_hr} bbl/hr at ${n0(li.md_m)} m when ECD reached ${fmt(li.ecd_ppg)} ppg during a drilling break at ${li.rop_m_hr} m/hr. ${sop.id} calls for a pre-emptive weight-up before the sand and an ROP cap at drilling breaks.`,
        hi: `${kick.id} (${kick.distance_km} किमी दूर) में इसी sand में ${n0(ki.md_m)} मीटर पर ${fmt(ki.mw_ppg)} ppg मड के साथ ${ki.gain_bbl} bbl का kick आया था — SIDPP ${ki.sidpp_psi} psi, formation pressure ${fmt(ki.formation_pressure_ppg)} ppg, और ${fmt(ki.kill_mw_ppg)} ppg से kill किया गया। ${loss.id} में ${n0(li.md_m)} मीटर पर drilling break के दौरान ${li.rop_m_hr} m/hr ROP पर ECD ${fmt(li.ecd_ppg)} ppg पहुँचा और ${li.loss_rate_bbl_hr} bbl/hr losses हुए। ${sop.id} कहता है: sand से पहले weight-up करें और drilling break पर ROP cap लगाएँ।`,
      },
      citations: [
        cite(`INC-${kick.id}-KICK-${ki.md_m}`, '§3 Sequence of events', `Kick of ${ki.gain_bbl} bbl at ${ki.md_m} m; SIDPP ${ki.sidpp_psi} psi; kill mud ${ki.kill_mw_ppg} ppg.`),
        cite(`INC-${loss.id}-LOSS-${li.md_m}`, '§4 Root cause', `ECD ${li.ecd_ppg} ppg at ROP ${li.rop_m_hr} m/hr; no ROP cap or sweeps during drilling break.`),
        cite(sop.id, '§5.2 Pre-emptive weight-up & ROP cap', sop.title),
      ],
    },
    5: {
      agent: {
        en: `Recommendation: weight up to ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) before drilling ahead. That is ${f.barite.lb_per_bbl} lb/bbl of barite — ${f.barite.total_mt} MT, ${n0(f.barite.bags_50kg)} bags of 50 kg — for the ${n0(f.mud.active_system_bbl)} bbl active system, adding about ${f.barite.volume_gain_bbl} bbl. ECD at ${sand.rop_m_hr} m/hr becomes ${fmt(sand.ecd_ppg as number)} ppg, ${fmt(margin5)} ppg below the shoe FIT, with +${sand.overbalance_psi} psi overbalance at the sand top. I have drafted MOC memo ${f.ids.memo_id} for your approval.`,
        hi: `सुझाव: आगे ड्रिल करने से पहले मड वेट ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) करें। इसके लिए ${n0(f.mud.active_system_bbl)} bbl active system में ${f.barite.lb_per_bbl} lb/bbl barite चाहिए — ${f.barite.total_mt} MT, यानी 50 किलो के ${n0(f.barite.bags_50kg)} बैग; वॉल्यूम लगभग ${f.barite.volume_gain_bbl} bbl बढ़ेगा। ${sand.rop_m_hr} m/hr पर ECD ${fmt(sand.ecd_ppg as number)} ppg होगा — शू FIT से ${fmt(margin5)} ppg नीचे — और sand top पर +${sand.overbalance_psi} psi ओवरबैलेंस। MOC memo ${f.ids.memo_id} आपकी मंज़ूरी के लिए तैयार है।`,
      },
      citations: [cite(b.offsets.sops[1].id, '§3 Barite addition & rheology check', b.offsets.sops[1].title),
                  cite(b.offsets.sops[2].id, '§4 Approval authority', b.offsets.sops[2].title)],
    },
    6: {
      presenter: { en: 'Approved. Go ahead.', hi: 'मंज़ूर है, आगे बढ़ो।' },
      agent: {
        en: `Approved by you. ${f.ids.memo_id} is signed and its basis — frame, calculations and citations — is frozen in the decision ledger.`,
        hi: `आपकी मंज़ूरी मिल गई। ${f.ids.memo_id} signed है, और उसका आधार — frame, calculations और citations — decision ledger में फ़्रीज़ कर दिया गया है।`,
      },
    },
    7: {
      presenter: { en: 'Send it to the mud chemist, RTOC and the drilling manager.', hi: 'Mud chemist, RTOC और drilling manager को भेज दो।' },
      agent: {
        en: `Dispatched: mud-chemist work order ${mc}, RTOC alert ${rtoc}, email ${email} to the drilling manager, and phone push ${push}. I will confirm when the mud weight out reads ${fmt(mw1)} ppg.`,
        hi: `भेज दिया: mud chemist work order ${mc}, RTOC alert ${rtoc}, drilling manager को email ${email}, और phone push ${push}। मड वेट आउट ${fmt(mw1)} ppg होते ही मैं पुष्टि करूँगा।`,
      },
    },
    8: {
      agent: {
        en: `We are at ${n0(sand.md_m)} m — the depth where ${kick.id} kicked. With ${fmt(mw1)} ppg we are +${sand.overbalance_psi} psi overbalanced; kick probability ${Math.round((sand.p_kick_30m as number) * 100)}%. Flow and pit indicators are clean.`,
        hi: `हम ${n0(sand.md_m)} मीटर पर हैं — वही गहराई जहाँ ${kick.id} में kick आया था। ${fmt(mw1)} ppg के साथ हम +${sand.overbalance_psi} psi ओवरबैलेंस में हैं; kick की संभावना ${Math.round((sand.p_kick_30m as number) * 100)}%। Flow और pit संकेत सामान्य हैं।`,
      },
    },
    9: {
      agent: {
        en: `Drilling break: ROP jumped to ${brk.rop_m_hr} m/hr and ECD is ${fmt(brk.ecd_ppg as number)} ppg — only ${fmt(brk.ecd_fit_margin_ppg as number)} ppg below the shoe FIT. This is the ${loss.id} loss pattern. Recommend capping ROP at ${cap.rop_m_hr} m/hr with a hole-cleaning sweep: ECD returns to ${fmt(cap.ecd_ppg as number)} ppg, margin ${fmt(cap.ecd_fit_margin_ppg as number)} ppg.`,
        hi: `Drilling break: ROP ${brk.rop_m_hr} m/hr हो गया और ECD ${fmt(brk.ecd_ppg as number)} ppg है — शू FIT से सिर्फ़ ${fmt(brk.ecd_fit_margin_ppg as number)} ppg नीचे। यह ${loss.id} वाला losses pattern है। सुझाव: ROP ${cap.rop_m_hr} m/hr पर cap करें और hole-cleaning sweep पंप करें — ECD वापस ${fmt(cap.ecd_ppg as number)} ppg, margin ${fmt(cap.ecd_fit_margin_ppg as number)} ppg।`,
      },
      citations: [cite(b.offsets.sops[5].id, '§6 ROP limits at drilling breaks', b.offsets.sops[5].title)],
    },
    10: {
      presenter: { en: 'We are at TD. Generate the well completion report.', hi: 'TD पहुँच गए। Well completion report बना दो।' },
      agent: {
        en: `${f.ids.wcr_id} is drafted in Google Docs: pressure narrative, the ${f.ids.memo_id} decision with its frozen basis, the ROP-cap event, and two lessons learned — now written back to the knowledge base for the next well.`,
        hi: `${f.ids.wcr_id} Google Docs में तैयार है: प्रेशर का पूरा विवरण, ${f.ids.memo_id} का निर्णय और उसका आधार, ROP-cap घटना, और दो lessons learned — जो अगले well के लिए knowledge base में जोड़ दिए गए हैं।`,
      },
      citations: [cite(b.offsets.sops[3].id, '§2 Mandatory WCR sections', b.offsets.sops[3].title)],
    },
  };
}
