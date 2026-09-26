/** Act3ActionPanel — WP-08 / mock-up #5. "Human decides, agent executes."
 *  A) MOC memo (with evidence) → Approve  ·  B) fan-out lanes with HONEST status  ·  C) phone mirror  ·  decision ledger.
 *  Driven only by ledgerStore + scenarioStore, so LIVE tool calls and the SCRIPTED fallback render identically. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { fmt } from '../../../lib/frames';
import { useLedger, type ChannelStatus, type LedgerChannel } from '../../../state/ledgerStore';
import { useScenario } from '../../../state/scenarioStore';
import { approveAndDispatch, askAgent } from '../../../state/turnMachine';
import { useUi } from '../../../state/uiStore';

const STATUS: Record<ChannelStatus, { label: string; cls: string }> = {
  queued: { label: 'Waiting', cls: 'border-line text-faint' },
  sent: { label: 'Sending…', cls: 'border-accent/50 text-accent animate-pulse' },
  delivered: { label: 'Delivered', cls: 'border-ok/60 bg-ok/10 text-ok' },
  simulated: { label: 'Simulated', cls: 'border-warn/50 bg-warn/10 text-warn' },
  failed: { label: 'Failed', cls: 'border-risk/60 bg-risk/10 text-risk' },
};

const LANE_META: Record<string, { who: string; how: string; icon: string }> = {
  mud: { who: 'Mud chemist', how: 'rig console', icon: 'M4 5h16v10H8l-4 4z' },
  chat: { who: 'RTOC onshore', how: 'Google Chat', icon: 'M3 4h14v10H7l-4 3zM19 8h2v12l-3-3h-8v-2' },
  email: { who: 'Drilling manager', how: 'email', icon: 'M3 6h18v12H3zM3 6l9 7 9-7' },
  phone: { who: 'Superintendent', how: 'phone (Telegram)', icon: 'M8 2h8v20H8zM11 18h2' },
};
const LANES = ['mud', 'chat', 'email', 'phone'] as const;

/** Non-cryptographic fingerprint of the frozen basis (display only — labelled as such). */
function fingerprint(o: unknown): string {
  const s = JSON.stringify(o ?? {});
  let h = 0x811c9dc5; // facts-ok FNV offset basis
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } // facts-ok FNV prime
  return (h >>> 0).toString(16).padStart(8, '0');
}

function Icon({ d }: { d: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0 text-muted"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

export default function Act3ActionPanel() {
  const bundle = useScenario((s) => s.bundle);
  const approvedMw = useScenario((s) => s.approvedMw);
  const entries = useLedger((s) => s.entries);
  const openOverlay = useUi((s) => s.open);
  const memo = entries.find((e) => e.id === 'MEMO');
  const appr = entries.find((e) => e.id === 'APPROVAL');
  const disp = entries.find((e) => e.id === 'DISPATCH');
  const lanes = useMemo(() => {
    const byLane = new Map<string, LedgerChannel>();
    (disp?.channels ?? []).forEach((c, i) => byLane.set(c.lane ?? LANES[i] ?? c.id, c));
    return LANES.map((l) => ({ lane: l, ch: byLane.get(l) }));
  }, [disp]);
  if (!bundle) return null;
  const f = bundle.facts;
  const warn = f.checkpoints.find((c) => c.label === 'Warning point')!;
  const sand = f.checkpoints.find((c) => c.label === 'Sand top (offset kick depth)')!;
  const kick = bundle.offsets?.offsets?.find((o: { incident?: { type?: string } }) => o.incident?.type === 'KICK') as
    { id: string; incident: { md_m: number } } | undefined;
  const phone = lanes.find((l) => l.lane === 'phone')?.ch;
  const phoneShown = !!phone && phone.status !== 'queued';
  const counts = (disp?.channels ?? []).reduce((a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {} as Record<string, number>);
  const evidence = memo?.evidence ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid min-h-0 flex-1 gap-2.5" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.25fr) minmax(150px, 210px)' }}>
        {/* A) Memo */}
        <section className="relative flex min-h-0 flex-col">
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">A · MOC memo</div>
          {!memo ? (
            <div className="flex flex-1 flex-col justify-center gap-3 rounded-xl border border-dashed border-line p-5">
              <div className="text-[15px] text-fg">The agent has flagged the pressure ramp at {warn.md_m.toLocaleString('en-IN')} m.</div>
              <div className="text-[13px] text-muted">Ask it to draft the change — it will size the barite, check the shoe and cite the offset well.</div>
              <button onClick={() => askAgent('MOC memo banao — mud weight badhao')}
                className="self-start rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[13px] text-accent hover:bg-accent/20">“MOC memo banao — mud weight badhao”</button>
            </div>
          ) : (
            <motion.article initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#FBFCFD] text-[12px] text-[#0B1520] shadow-lg">{/* facts-ok css */}
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="text-[9.5px] uppercase tracking-[0.16em] text-slate-500">Management of change · {f.ids.memo_id}</div>
                <div className="mt-0.5 text-[13.5px] font-semibold leading-snug">Weight up to {fmt(f.mud.weighted.mw_ppg)} ppg before the {f.pressure.sand_top_m as number} m sand</div>
                <table className="mt-2 w-full border-collapse"><tbody>
                  {[
                    ['Well', f.well.id],
                    ['Depth', `${f.mud.weight_up_location_m.toLocaleString('en-IN')} m`],
                    ['Mud weight', `${fmt(f.mud.initial.mw_ppg)} → ${fmt(f.mud.weighted.mw_ppg)} ppg`],
                    ['Barite', `${f.barite.total_mt} MT (${f.barite.bags_50kg.toLocaleString('en-IN')} bags)`],
                    ['At sand top', `+${sand.overbalance_psi as number} psi · ECD ${fmt(sand.ecd_ppg as number)} vs FIT ${fmt(f.casing.last_shoe.fit_ppg)}`],
                    ['Basis', kick ? `offset ${kick.id} kick at ${kick.incident.md_m.toLocaleString('en-IN')} m` : '—'],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-slate-200 last:border-0"><td className="py-0.5 pr-2 text-slate-500">{k}</td><td className="num py-0.5">{v}</td></tr>
                  ))}
                </tbody></table>
                <div className="mt-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Evidence</div>
                {evidence.length === 0 ? <div className="text-[11px] text-slate-400">Fetching sources…</div> : (
                  <ul className="mt-1 space-y-1">
                    {evidence.slice(0, 4).map((e) => (
                      <li key={e.doc_id} className="rounded border border-slate-200 px-2 py-0.5">
                        <div className="flex items-center gap-1.5 text-[10.5px]"><span className="font-semibold">{e.doc_id}</span>
                          <span className="text-slate-400">· {e.section}</span>
                          <span className={clsx('ml-auto rounded px-1 text-[8.5px] uppercase', e.provenance === 'LIVE' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500')}>{e.provenance === 'LIVE' ? 'live' : 'synthetic'}</span></div>
                        {e.snippet && <div className="line-clamp-2 text-[10.5px] text-slate-600">{e.snippet}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <AnimatePresence>
                  {approvedMw && (
                    <motion.div initial={{ scale: 1.6, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -10, opacity: 0.92 }} transition={{ duration: 0.28 }}
                      className="pointer-events-none absolute bottom-14 right-4 rounded-lg border-4 border-emerald-600 px-3 py-1 text-center text-emerald-700">
                      <div className="text-[20px] font-black uppercase tracking-[0.14em]">Approved</div>
                      <div className="text-[9.5px]">{appr?.actor?.replace(/^Presenter \((.*)\)$/, '$1') ?? 'Drilling Superintendent'} · {appr ? new Date(appr.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {!approvedMw && (
                <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-[#FBFCFD] px-3 py-2 shadow-sm">{/* facts-ok css */}
                  <div className="text-[10.5px] text-slate-500 truncate mr-2">Needs approval</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openOverlay('memo')} className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">Full memo</button>
                    <button onClick={() => void approveAndDispatch()} className="rounded-md bg-[#0891B2] px-3.5 py-1 text-[12px] font-semibold text-white hover:bg-[#0E7490]">Approve</button>
                  </div>
                </div>
              )}
            </motion.article>
          )}
        </section>

        {/* B) Fan-out */}
        <section className="flex min-h-0 flex-col">
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">B · Fan-out {approvedMw ? '' : '· after approval'}</div>
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 overflow-hidden">
            {lanes.map(({ lane, ch }, i) => {
              const m = LANE_META[lane];
              const st = STATUS[ch?.status ?? 'queued'];
              return (
                <motion.div key={lane} initial={false} animate={{ opacity: approvedMw ? 1 : 0.45 }}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-2.5 py-2">
                  <Icon d={m.icon} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-fg truncate"><span className="text-faint">{i + 1})</span> {m.who} <span className="text-muted">· {m.how}</span></div>
                    <div className="truncate text-[10.5px] text-muted" title={ch?.note}>{ch?.action ?? (approvedMw ? 'Preparing…' : 'Waiting for approval')}{ch?.note && ch.status !== 'queued' ? ` — ${ch.note}` : ''}</div>
                  </div>
                  <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', st.cls)}>{st.label}</span>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* C) Phone mirror */}
        <section className="flex min-h-0 flex-col">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">C · Superintendent's phone</div>
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-[22px] border-[4px] border-[#1F2A36] bg-[#0E1621]">{/* facts-ok css */}
            <div className="flex items-center gap-2 bg-[#17212B] px-3 py-2 text-[12px] text-white">{/* facts-ok css */}
              <span className="h-6 w-6 rounded-full bg-[#2AABEE]" />{/* facts-ok css */}
              <div><div className="font-semibold leading-tight">Sagar Drishti</div><div className="text-[10px] text-slate-400">bot</div></div>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 p-2.5">
              <AnimatePresence>
                {phoneShown && (
                  <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="self-end rounded-xl rounded-br-sm bg-[#2B5278] p-2.5 text-[12.5px] leading-snug text-white">{/* facts-ok css */}
                    {disp?.text ?? `${f.ids.memo_id} approved — weight up to ${fmt(f.mud.weighted.mw_ppg)} ppg.`}
                    <div className="mt-1 text-right text-[9.5px] text-slate-300">{new Date(disp!.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!phoneShown && <div className="text-center text-[11px] text-slate-500">Nothing yet — the push arrives after approval.</div>}
            </div>
            {phone && phone.status !== 'queued' && (
              <div className={clsx('border-t border-white/10 px-2 py-1 text-center text-[10px]', phone.status === 'delivered' ? 'text-ok' : phone.status === 'failed' ? 'text-risk' : 'text-warn')}>
                {phone.status === 'delivered' ? 'Real Telegram push delivered' : phone.status === 'failed' ? 'Telegram send failed' : 'Simulated for the demo — mirrored for the room'}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Decision ledger */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-line bg-surface/60 px-3 py-2">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Decision ledger</span>
        {entries.filter((e) => ['TRIGGER', 'MEMO', 'APPROVAL', 'DISPATCH'].includes(e.kind)).map((e) => (
          <span key={e.id} className="chip shrink-0 text-[12px]">
            {e.kind === 'TRIGGER' && `Alert · ${e.title.toLowerCase()} @ ${e.md.toLocaleString('en-IN')} m`}
            {e.kind === 'MEMO' && `Memo ${e.title} · ${evidence.length} sources`}
            {e.kind === 'APPROVAL' && `Approved · basis frozen #${fingerprint(e.basis)}`}
            {e.kind === 'DISPATCH' && `Dispatched ${(e.channels ?? []).length} · ${counts.delivered ?? 0} delivered${counts.simulated ? ` · ${counts.simulated} simulated` : ''}${counts.failed ? ` · ${counts.failed} failed` : ''}`}
          </span>
        ))}
        {entries.length === 0 && <span className="text-[12px] text-faint">Empty — entries appear as the agent acts.</span>}
      </div>
    </div>
  );
}
