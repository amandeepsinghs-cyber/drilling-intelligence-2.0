/** ledgerStore — append-only decision ledger; each approval freezes its basis (SDD §11). */
import { create } from 'zustand';

export type LedgerKind = 'TRIGGER' | 'MEMO' | 'APPROVAL' | 'DISPATCH' | 'ROP_CAP' | 'SHIFT_LOG' | 'WCR' | 'WRITEBACK';
/** Honest channel status: DELIVERED only when a real send succeeded (or in-app), SIMULATED when no credentials. */
export type ChannelStatus = 'queued' | 'sent' | 'delivered' | 'simulated' | 'failed';
export interface LedgerChannel {
  id: string;
  channel: string;
  status: ChannelStatus;
  lane?: 'mud' | 'chat' | 'email' | 'phone' | string;
  note?: string;
  action?: string;
}
export interface Evidence {
  doc_id: string;
  doc_type?: string | null;
  section?: string | null;
  page?: number | null;
  snippet?: string;
  provenance?: string;
}
export interface ShiftLine { md_m: number; text: string; source: string; wcr_section: string }
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  ts: string;
  md: number;
  title: string;
  actor: string;
  basis?: Record<string, number | string | null>;
  channels?: LedgerChannel[];
  citations?: string[];
  evidence?: Evidence[];
  lines?: ShiftLine[];
  text?: string;
}

interface LedgerState {
  entries: LedgerEntry[];
  append: (e: Omit<LedgerEntry, 'ts'>) => void;
  /** Merge fields into an existing entry (e.g. evidence / real statuses arriving after the entry was created). */
  patch: (entryId: string, p: Partial<Omit<LedgerEntry, 'id' | 'ts'>>) => void;
  setChannelStatus: (entryId: string, channelId: string, status: ChannelStatus) => void;
  clear: () => void;
}

export const useLedger = create<LedgerState>((set, get) => ({
  entries: [],
  append: (e) => {
    if (get().entries.some((x) => x.id === e.id)) return; // idempotent: replaying a turn never duplicates
    set((s) => ({ entries: [...s.entries, { ...e, ts: new Date().toISOString() }] }));
  },
  patch: (entryId, p) =>
    set((s) => ({ entries: s.entries.map((e) => (e.id === entryId ? { ...e, ...p } : e)) })),
  setChannelStatus: (entryId, channelId, status) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id !== entryId ? e : { ...e, channels: e.channels?.map((c) => (c.id === channelId ? { ...c, status } : c)) },
      ),
    })),
  clear: () => set({ entries: [] }),
}));

/** Backend status string → UI status. Anything unknown is shown as simulated (never claim delivery we can't prove). */
export function toChannelStatus(s: unknown): ChannelStatus {
  const v = String(s ?? '').toUpperCase();
  if (v === 'DELIVERED') return 'delivered';
  if (v === 'FAILED') return 'failed';
  if (v === 'QUEUED') return 'queued';
  return 'simulated';
}

export function toChannels(list: unknown): LedgerChannel[] {
  return (Array.isArray(list) ? list : []).map((c: Record<string, unknown>) => ({
    id: String(c.id), channel: String(c.channel), status: toChannelStatus(c.status),
    lane: c.lane as string | undefined, note: c.note as string | undefined, action: c.action as string | undefined,
  }));
}
