/**
 * Phase-1 mock agent script (bilingual EN / हिन्दी). Replaced by Gemini Live in Phase 4, but the
 * *numbers* here are already live: every figure is read from the facts bundle or the frames, never
 * typed in. Citations point at SYNTHETIC corpus doc IDs that Phase 3 will generate.
 */
import type { Citation, Columnar, ScenarioBundle } from '../api/types';
import { fmt, fmtInt, indexAt, num } from '../lib/frames';
import { overbalancePsi } from '../lib/physics';

export interface ScriptLine {
  presenter?: { en: string; hi: string };
  agent: { en: string; hi: string };
  citations?: Citation[];
}

const n0 = (v: number) => v.toLocaleString('en-IN');

export function buildScript(b: ScenarioBundle, d: Columnar): Record<number, ScriptLine> {
  const f = b.facts;
  const at = (md: number, col: string): number => {
    const v = num(d, col, indexAt(d, md));
    if (v == null || Number.isNaN(v)) throw new Error(`Missing frame value for ${col} at ${md}m`);
    return v;
  };
  const getShaleFrac = (md: number): number => {
    for (const c of ['vol.SHALE', 'ml.litho.probs.SHALE', 'vol.VSH']) {
      if (c in d.columns) {
        const v = num(d, c, indexAt(d, md));
        if (v != null && !Number.isNaN(v)) return v;
      }
    }
    throw new Error(`Missing shale fraction column in frames at md=${md}`);
  };

  const cp = (label: string) => {
    const found = f.checkpoints.find((c) => c.label === label);
    if (!found) throw new Error(`Missing checkpoint "${label}"`);
    return found;
  };
  const before = cp('Before'), warn = cp('Warning point'), sand = cp('Sand top (offset kick depth)');
  const brk = cp('Drilling break'), cap = cp('After ROP cap');
  const mw0 = f.mud.initial.mw_ppg, mw1 = f.mud.weighted.mw_ppg, fit = f.casing.last_shoe.fit_ppg;
  const shoe = f.casing.last_shoe.md_m;
  const off = b.offsets.offsets;
  const kick = off.find((o) => o.incident?.type === 'KICK')!;
  const loss = off.find((o) => o.incident?.type === 'LOSSES')!;
  const ki = kick.incident as Record<string, number>, li = loss.incident as Record<string, number>;
  const sop = b.offsets.sops[0];
  const dtx = at(warn.md_m, 'curves.DT') - at(warn.md_m, 'trend.DT_NCT');
  const cg = warn.conn_gas_pct as { from: number; to: number };
  const pk = Math.round((warn.p_kick_30m_if_unchanged as number) * 100);
  const margin5 = fit - (sand.ecd_ppg as number);
  const [mc, rtoc, email, push] = f.ids.dispatch_ids;
  const t2 = b.turns.find((t) => t.n === 2)!.md_m;
  const t3 = b.turns.find((t) => t.n === 3)!.md_m;
  const t4b = b.turns.find((t) => t.n === 5)!.md_m;
  const dxcFrom = f.triggers.T3_PRESSURE_RAMP.conditions.dxc_reversal_from_m as number;
  const cite = (doc_id: string, section: string, snippet: string): Citation => ({ doc_id, section, snippet, authoring: 'synthetic' });

  const t2Ecd = at(t2, 'derived.ECD');
  const t2Rop = at(t2, 'drilling.ROP');

  const t3ShalePct = Math.round(getShaleFrac(t3) * 100);
  const lagMin = f.mudlog.bottoms_up_lag_min;
  const t3Rop = at(t3, 'drilling.ROP');
  const t3LagM = (t3Rop * lagMin) / 60;
  const u1 = f.stratigraphy.find((u) => u.id === 'U1')!;
  const u1Thickness = u1.base_m - u1.top_m;

  const dist4b = f.reservoir.sand_top_m - t4b;
  const rop4b = at(t4b, 'drilling.ROP');
  const eta_h = fmt(dist4b / rop4b, 1);
  const sandTop = f.reservoir.sand_top_m;
  const ppSand = (sand.pp_forecast_ppg ?? sand.pp_ppg ?? f.pressure.pp_sand_top_ppg) as number;
  const ubPsi = Math.round(Math.abs(overbalancePsi(mw0, ppSand, sandTop)));

  const kiUb = Math.round(Math.abs(overbalancePsi(ki.mw_ppg, ki.formation_pressure_ppg, ki.md_m)));
  const obSand = Math.round(overbalancePsi(mw1, ppSand, sandTop));
  const pk10 = Math.round(at(sand.md_m, 'ml.p_kick') * 100);
  const brkMargin = fit - (brk.ecd_ppg as number);
  const bagKg = 50;
  const lookaheadM = 30;

  return {
    0: {
      presenter: { en: 'Hey, I hope everything is going okay.', hi: 'Hey, I hope everything is going okay.' },
      agent: {
        en: `${f.well.id} is drilling ${f.well.current_section.hole_size_in}-in hole at ${n0(before.md_m)} m in the Upper Miocene seal. Mud weight ${fmt(mw0)} ppg (${fmt(f.mud.initial.mw_sg)} SG), ECD ${fmt(before.ecd_ppg as number)} ppg against shoe FIT ${fmt(fit)} ppg at ${n0(shoe)} m. Overbalance is clean at ${fmtInt(at(before.md_m, 'derived.OVERBAL_PSI'))} psi.`,
        hi: `${f.well.id} अभी ${n0(before.md_m)} मीटर पर Upper Miocene seal में ${f.well.current_section.hole_size_in}-इंच होल ड्रिल कर रहा है। मड वेट ${fmt(mw0)} ppg (${fmt(f.mud.initial.mw_sg)} SG), ECD ${fmt(before.ecd_ppg as number)} ppg — ${n0(shoe)} मीटर शू पर FIT ${fmt(fit)} ppg है। ओवरबैलेंस ${fmtInt(at(before.md_m, 'derived.OVERBAL_PSI'))} psi।`,
      },
    },
    1: {
      presenter: {
        en: 'Keep watching the pressure trend and tell me the moment anything starts going wrong.',
        hi: 'मुझे बता देना जब कुछ भी गड़बड़ हो, ठीक है?',
      },
      agent: {
        en: `Watchdog armed: tracking d-exponent reversal, sonic excursion above normal compaction trend, connection gas, and ${lookaheadM}-meter kick probability. I will interrupt immediately if indicators converge.`,
        hi: `वॉचडॉग चालू: d-exponent, normal compaction trend के मुकाबले sonic, connection gas, और अगले ${lookaheadM} मीटर की kick probability पर लाइव नज़र है। कुछ भी गड़बड़ हुई तो मैं तुरंत बीच में बोलूँगा।`,
      },
    },
    2: {
      presenter: {
        en: 'Can you tell me a bit about what is currently happening inside the well?',
        hi: 'थोड़ा बताएंगे अभी well के अंदर क्या चल रहा है?',
      },
      agent: {
        en: `Current bit depth is ${n0(t2)} m in compact claystone. Active mud weight is ${fmt(mw0)} ppg, circulating ECD is ${fmt(t2Ecd)} ppg, and ROP is steady at ${fmtInt(t2Rop)} m/hr with normal torque.`,
        hi: `अभी बिट की गहराई ${n0(t2)} मीटर पर है, कॉम्पैक्ट क्लेस्टोन में। एक्टिव मड वेट ${fmt(mw0)} ppg है, सर्कुलेटिंग ECD ${fmt(t2Ecd)} ppg, और ROP ${fmtInt(t2Rop)} m/hr पर सामान्य टॉर्क के साथ स्थिर है।`,
      },
    },
    3: {
      presenter: {
        en: 'What formation are we in right now? Mudlog cuttings will only arrive much later.',
        hi: 'अभी कौन सी formation में हैं? Mudlog तो बाद में आएगा।',
      },
      agent: {
        en: `Real-time ML petrophysics reads ${fmtInt(at(t3, 'curves.GR'))} API gamma ray and ${t3ShalePct}% shale volume directly at the bit. While bottoms-up cuttings lag by ${lagMin} minutes (~${fmt(t3LagM, 1)} m behind at ${fmtInt(t3Rop)} m/hr), our ML inversion confirms we are still securely in the Upper Miocene seal.`,
        hi: `बिट पर रियल-टाइम ML पेट्रोफिज़िक्स ${fmtInt(at(t3, 'curves.GR'))} API गामा रे और ${t3ShalePct}% शेल वॉल्यूम माप रहा है। जहाँ कटिंग्स सतह तक आने में ${lagMin} मिनट का लैग (~${fmt(t3LagM, 1)} मीटर पीछे) है, वहीं हमारा ML मॉडल पुष्टि करता है कि हम अभी भी सुरक्षित रूप से सील शेल में हैं।`,
      },
      citations: [
        cite('WCR-MN-DW-01', '§4.1 Seal Integrity', `Upper Miocene marine shale seal thickness ${u1Thickness} m, normal compaction baseline.`),
      ],
    },
    4: {
      presenter: {
        en: 'How much time will it take to reach the next zone?',
        hi: 'अगले zone तक कितना time लगेगा?',
      },
      agent: {
        en: `Which zone do you mean — the Miocene Unit U3 main pay sand at ${n0(f.reservoir.sand_top_m)} m MD?`,
        hi: `कौन सा zone — Miocene Unit U3 main pay sand, ${n0(f.reservoir.sand_top_m)} मीटर पर?`,
      },
    },
    5: {
      presenter: {
        en: 'Yes, the pay sand.',
        hi: 'हाँ, pay sand।',
      },
      agent: {
        en: `At our current ${fmtInt(rop4b)} m/hr ROP, we have ${dist4b} m to drill, reaching the sand top in approximately ${eta_h} hours. Offset well MN-DW-02 proves this is an ${f.reservoir.quartz_pct}% quartz pay sand with ${f.reservoir.phie_pct}% porosity and a ${f.reservoir.gross_gas_column_m} m gross gas column, but pore pressure ramps to ${fmt(ppSand)} ppg—creating a ${ubPsi} psi kick hazard at our current ${fmt(mw0)} ppg mud weight.`,
        hi: `मौजूदा ${fmtInt(rop4b)} m/hr ROP पर ${dist4b} मीटर बाकी हैं, लगभग ${eta_h} घंटे में सैंड टॉप पहुँचेगा। ऑफसेट MN-DW-02 से प्रमाणित है कि यह ${f.reservoir.quartz_pct}% क्वार्ट्ज, ${f.reservoir.phie_pct}% पोरोसिटी और ${f.reservoir.gross_gas_column_m} मीटर ग्रॉस गैस कॉलम वाला पे-सैंड है, लेकिन पोर प्रेशर ${fmt(ppSand)} ppg तक बढ़ेगा — जो मौजूदा ${fmt(mw0)} ppg मड पर ${ubPsi} psi किक का खतरा है।`,
      },
      citations: [
        cite('WCR-MN-DW-02', '§4.1 Reservoir Characterization', `Miocene channel sand ${f.reservoir.unit} petrophysical log evaluation: quartz=${f.reservoir.quartz_pct}%, phi=${f.reservoir.phie_pct}%, k=${f.reservoir.permeability_md} mD, ${f.reservoir.gross_gas_column_m} m gross gas column.`),
        cite('ONGC-SM-SOP-04', '§3.1 Pre-drill Geomechanics & Mud Weight Window', `Pre-drill PP forecast ${fmt(ppSand)} ppg; shoe FIT limit ${fmt(fit)} ppg; recommended minimum MW ${fmt(mw1)} ppg.`),
      ],
    },
    6: {
      agent: {
        en: `Sir, ek minute — pressure alert at ${n0(warn.md_m)} m. The d-exponent has reversed since ${n0(dxcFrom)} m, sonic is ${fmt(dtx, 0)} µs/ft above trend, and connection gas rose from ${cg.from}% to ${cg.to}%. Forecast pore pressure at ${n0(sandTop)} m is ${fmt(warn.pp_forecast_ppg as number)} ppg. At ${fmt(mw0)} ppg we will be ${ubPsi} psi underbalanced with a ${pk}% kick probability.`,
        hi: `Sir, ek minute — प्रेशर अलर्ट — ${n0(warn.md_m)} मीटर। ${n0(dxcFrom)} मीटर से d-exponent उलट गया है, sonic normal trend से ${fmt(dtx, 0)} µs/ft ऊपर है, और connection gas ${cg.from}% से ${cg.to}% हो गई है। ${n0(sandTop)} मीटर पर pore pressure ${fmt(warn.pp_forecast_ppg as number)} ppg का अनुमान है। ${fmt(mw0)} ppg पर हम ${ubPsi} psi underbalanced होंगे और kick की संभावना ${pk}% है।`,
      },
    },
    7: {
      presenter: {
        en: 'What complication did the nearby rig have, and how was it mitigated?',
        hi: 'पास वाले रिग पर क्या complication आई थी, और कैसे mitigate किया?',
      },
      agent: {
        en: `On ${kick.id} (${kick.distance_km} km away), a ${ki.gain_bbl} bbl gas kick occurred at ${n0(ki.md_m)} m when drilling ${kiUb} psi underbalanced with ${fmt(ki.mw_ppg)} ppg mud, causing ${ki.sidpp_psi} psi SIDPP. They shut in on the annular preventer and killed it with ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) mud. On ${loss.id}, severe losses of ${li.loss_rate_bbl_hr} bbl/hr occurred at ${n0(li.md_m)} m during a drilling break; they mitigated by pumping LCM and capping ROP at ${f.drilling.rop_cap_m_hr} m/hr.`,
        hi: `${kick.id} (${kick.distance_km} km दूर) में ${n0(ki.md_m)} मीटर पर ${fmt(ki.mw_ppg)} ppg मड पर ${kiUb} psi underbalanced होने से ${ki.gain_bbl} bbl गैस kick आया — ${ki.sidpp_psi} psi SIDPP। उन्होंने annular preventer बंद करके ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) किल मड से सर्कुलेट किया। वहीं ${loss.id} में ${n0(li.md_m)} मीटर पर ड्रिलिंग ब्रेक के दौरान ${li.loss_rate_bbl_hr} bbl/hr losses हुए, जिसे LCM पिल और ${f.drilling.rop_cap_m_hr} m/hr ROP कैप से नियंत्रित किया गया।`,
      },
      citations: [
        cite(`INC-${kick.id}-KICK-${ki.md_m}`, '§3 Sequence of events', `Kick of ${ki.gain_bbl} bbl at ${n0(ki.md_m)} m; SIDPP ${ki.sidpp_psi} psi; kill mud ${fmt(mw1)} ppg.`),
        cite(`INC-${loss.id}-LOSS-${li.md_m}`, '§4 Root cause & mitigation', `ECD ${fmt(li.ecd_ppg)} ppg at ROP ${li.rop_m_hr} m/hr; mitigated by LCM pill squeeze and ${f.drilling.rop_cap_m_hr} m/hr ROP cap.`),
        cite(sop.id, '§5.2 Pre-emptive weight-up & ROP cap', sop.title),
      ],
    },
    8: {
      presenter: {
        en: 'The mud weight seems quite low, can we increase it a bit?',
        hi: 'Mud weight काफी कम लग रहा है, थोड़ा बढ़ा सकते हैं?',
      },
      agent: {
        en: `Recommendation: weight up to ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) before drilling ahead. That requires ${f.barite.lb_per_bbl} lb/bbl barite (${f.barite.total_mt} MT, ${n0(f.barite.bags_50kg)} bags of ${bagKg} kg) for the ${n0(f.mud.active_system_bbl)} bbl active system, adding ${f.barite.volume_gain_bbl} bbl volume. ECD will be ${fmt(sand.ecd_ppg as number)} ppg (safe by ${fmt(margin5)} ppg below shoe FIT) with +${obSand} psi overbalance. I have drafted MOC memo ${f.ids.memo_id}.`,
        hi: `सुझाव: आगे ड्रिल करने से पहले मड वेट ${fmt(mw1)} ppg (${fmt(f.mud.weighted.mw_sg)} SG) करें। इसके लिए ${n0(f.mud.active_system_bbl)} bbl सिस्टम में ${f.barite.lb_per_bbl} lb/bbl barite (${f.barite.total_mt} MT, ${bagKg} किलो के ${n0(f.barite.bags_50kg)} बैग) चाहिए; वॉल्यूम ${f.barite.volume_gain_bbl} bbl बढ़ेगा। ECD ${fmt(sand.ecd_ppg as number)} ppg होगा (शू FIT से ${fmt(margin5)} ppg नीचे) और +${obSand} psi ओवरबैलेंस। MOC memo ${f.ids.memo_id} तैयार है।`,
      },
      citations: [cite(b.offsets.sops[1].id, '§3 Barite addition & rheology check', b.offsets.sops[1].title),
                  cite(b.offsets.sops[2].id, '§4 Approval authority', b.offsets.sops[2].title)],
    },
    9: {
      presenter: { en: 'Approved. Go ahead.', hi: 'ठीक है, कर दो।' },
      agent: {
        en: `Approved by you. ${f.ids.memo_id} is signed and its basis — frame, calculations and citations — is frozen in the decision ledger. Who should I dispatch to?`,
        hi: `आपकी मंज़ूरी मिल गई। ${f.ids.memo_id} signed है, और उसका आधार decision ledger में फ़्रीज़ कर दिया गया है। किसको dispatch करूँ?`,
      },
    },
    10: {
      presenter: {
        en: 'Send message to mud chemist, email to manager, and inform base too.',
        hi: 'Mud chemist को message, manager को email, base को भी बता दो।',
      },
      agent: {
        en: `Dispatched: mud chemist work order ${mc}, RTOC alert ${rtoc}, email ${email} to drilling manager, and phone push ${push}. Confirmation delivered to your device.`,
        hi: `भेज दिया: mud chemist work order ${mc}, RTOC alert ${rtoc}, manager को email ${email}, और phone push ${push}। पुष्टि आपके फ़ोन पर पहुँच गई है।`,
      },
    },
    11: {
      agent: {
        en: `We are at ${n0(sand.md_m)} m — the depth where ${kick.id} kicked. With ${fmt(mw1)} ppg we are +${obSand} psi overbalanced; kick probability is down to ${pk10}%. Flow and pit indicators are completely stable.`,
        hi: `हम ${n0(sand.md_m)} मीटर पर हैं — वही गहराई जहाँ ${kick.id} में kick आया था। ${fmt(mw1)} ppg के साथ हम +${obSand} psi ओवरबैलेंस में हैं; kick की संभावना ${pk10}% पर आ गई है। Flow और pit संकेत पूरी तरह स्थिर हैं।`,
      },
    },
    12: {
      agent: {
        en: `Drilling break at ${n0(brk.md_m)} m: ROP surged to ${brk.rop_m_hr} m/hr and circulating ECD reached ${fmt(brk.ecd_ppg as number)} ppg—only ${fmt(brkMargin)} ppg below shoe FIT. To prevent repeat of ${loss.id} losses, I have capped ROP at ${f.drilling.rop_cap_m_hr} m/hr with hole-cleaning sweeps. ECD returned safely to ${fmt(cap.ecd_ppg as number)} ppg.`,
        hi: `${n0(brk.md_m)} मीटर पर drilling break: ROP ${brk.rop_m_hr} m/hr हो गया और ECD ${fmt(brk.ecd_ppg as number)} ppg पहुँच गया — शू FIT से सिर्फ ${fmt(brkMargin)} ppg नीचे। ${loss.id} जैसे losses रोकने के लिए मैंने ROP ${f.drilling.rop_cap_m_hr} m/hr पर cap कर दिया है। ECD वापस सुरक्षित ${fmt(cap.ecd_ppg as number)} ppg पर आ गया है।`,
      },
      citations: [cite(b.offsets.sops[5].id, '§6 ROP limits at drilling breaks', b.offsets.sops[5].title)],
    },
    13: {
      presenter: {
        en: 'Prepare the handover note for this shift.',
        hi: 'इस shift का handover note बना दो।',
      },
      agent: {
        en: `Shift handover note drafted for Tour Day (${n0(before.md_m)}–${n0(cap.md_m)} m): active MW ${fmt(mw1)} ppg, ${f.ids.memo_id} executed with ${f.barite.total_mt} MT barite, drilling break managed by ${f.drilling.rop_cap_m_hr} m/hr ROP cap, zero losses or kicks recorded. Indexed to DDR records.`,
        hi: `Day Shift handover note तैयार है (${n0(before.md_m)}–${n0(cap.md_m)} मीटर): एक्टिव MW ${fmt(mw1)} ppg, ${f.ids.memo_id} के तहत ${f.barite.total_mt} MT बैराइट डाला गया, ${f.drilling.rop_cap_m_hr} m/hr ROP कैप से ड्रिलिंग ब्रेक नियंत्रित, कोई लॉस या किक नहीं। DDR में दर्ज।`,
      },
      citations: [cite('DDR-MN-SM-DW-01-SHIFT-05', '§2 Operational Summary', `Weight-up to ${fmt(mw1)} ppg completed; ${f.reservoir.unit} sand entered at ${n0(sand.md_m)} m without kick.`)],
    },
    14: {
      presenter: {
        en: 'Well is complete. Create the first draft of the completion report.',
        hi: 'Well complete हो गया, completion report का पहला draft बना दो।',
      },
      agent: {
        en: `${f.ids.wcr_id} is drafted: pressure narrative, the ${f.ids.memo_id} decision with its frozen basis, the ROP-cap event, and two lessons learned — now indexed in the enterprise knowledge lakehouse for future campaigns.`,
        hi: `${f.ids.wcr_id} ड्राफ्ट तैयार है: प्रेशर का पूरा विवरण, ${f.ids.memo_id} का निर्णय और उसका आधार, ROP-cap घटना, और दो lessons learned — जो अगले कुएं के लिए knowledge lakehouse में जोड़ दिए गए हैं।`,
      },
      citations: [cite(b.offsets.sops[3].id, '§2 Mandatory WCR sections', b.offsets.sops[3].title)],
    },
  };
}

