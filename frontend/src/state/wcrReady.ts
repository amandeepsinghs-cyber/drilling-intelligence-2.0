/** "WCR draft for review is ready" signal, shared by the main-screen card, the header badge and the agent panel.
 *  Ready = the agent actually created the WCR draft (generate_wcr tool → WCR ledger entry).
 *  Talking about a WCR / its link only counts AFTER the draft exists — the offset wells' own source documents are
 *  WCRs too (WCR-MN-DW-02 / -03), so an offset-well answer must never pop the card. */
import { useAgent, type AgentMessage } from './agentStore';
import { useLedger } from './ledgerStore';

/** Spoken Hinglish is transcribed in Devanagari ("डब्ल्यूसीआर", "लिंक"), so match those too.
 *  Bare "report" is excluded — it would fire on offset-report citations ("MN-DW-03 ki report"). */
export const WCR_RE = /\bW\.?\s?C\.?\s?R\b|completion report|reports\/WCR|\blink\b|डब्ल्यू\s?सी\s?आर|लिंक/i;

const wcrDrafted = () => useLedger.getState().entries.some((e) => e.id === 'WCR');

export const mentionsWcr = (m: AgentMessage, drafted: boolean = wcrDrafted()) =>
  m.role === 'agent' && (m.tools.some((t) => t.name === 'generate_wcr') || (drafted && WCR_RE.test(`${m.en} ${m.hi}`)));

/** Number of agent replies about the WCR (a new one re-opens the card) and whether the draft exists at all. */
export function useWcrReady(): { ready: boolean; mentions: number } {
  const hasWcr = useLedger((s) => s.entries.some((e) => e.id === 'WCR'));
  const mentions = useAgent((s) => s.messages.filter((m) => mentionsWcr(m, hasWcr)).length);
  return { ready: hasWcr || mentions > 0, mentions: mentions + (hasWcr ? 1 : 0) };
}
