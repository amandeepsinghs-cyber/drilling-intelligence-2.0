/** agentStore — conversation, voice state, tool chips, citations (SDD §12.4). Phase 4 feeds it from Gemini Live. */
import { create } from 'zustand';
import type { Citation } from '../api/types';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert';
export interface ToolChip { name: string; status: 'running' | 'done' }
export interface AgentMessage {
  id: string;
  role: 'presenter' | 'agent';
  proactive?: boolean;
  en: string;
  hi: string;
  md: number;
  tools: ToolChip[];
  citations: Citation[];
  turn?: number;
}

interface AgentState {
  messages: AgentMessage[];
  voice: VoiceState;
  push: (m: Omit<AgentMessage, 'id'>) => string;
  update: (id: string, patch: Partial<AgentMessage>) => void;
  setVoice: (v: VoiceState) => void;
  clear: () => void;
}

export const useAgent = create<AgentState>((set) => ({
  messages: [],
  voice: 'idle',
  push: (m) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ messages: [...s.messages, { ...m, id }] }));
    return id;
  },
  update: (id, patch) => set((s) => ({ messages: s.messages.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  setVoice: (voice) => set({ voice }),
  clear: () => set({ messages: [], voice: 'idle' }),
}));
