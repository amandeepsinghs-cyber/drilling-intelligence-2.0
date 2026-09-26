/** ledgerStore — append-only decision ledger; each approval freezes its basis (SDD §11). */
import { create } from 'zustand';

export type LedgerKind = 'TRIGGER' | 'MEMO' | 'APPROVAL' | 'DISPATCH' | 'ROP_CAP' | 'WCR' | 'WRITEBACK';
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  ts: string;
  md: number;
  title: string;
  actor: string;
  basis?: Record<string, number | string | null>;
  channels?: { id: string; channel: string; status: 'queued' | 'sent' | 'delivered' }[];
  citations?: string[];
}

interface LedgerState {
  entries: LedgerEntry[];
  append: (e: Omit<LedgerEntry, 'ts'>) => void;
  setChannelStatus: (entryId: string, channelId: string, status: 'queued' | 'sent' | 'delivered') => void;
  clear: () => void;
}

export const useLedger = create<LedgerState>((set, get) => ({
  entries: [],
  append: (e) => {
    if (get().entries.some((x) => x.id === e.id)) return; // idempotent: replaying a turn never duplicates
    set((s) => ({ entries: [...s.entries, { ...e, ts: new Date().toISOString() }] }));
  },
  setChannelStatus: (entryId, channelId, status) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id !== entryId ? e : { ...e, channels: e.channels?.map((c) => (c.id === channelId ? { ...c, status } : c)) },
      ),
    })),
  clear: () => set({ entries: [] }),
}));
