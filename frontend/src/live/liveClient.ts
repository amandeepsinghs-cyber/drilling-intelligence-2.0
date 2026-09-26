/**
 * liveClient — WebSocket client to /ws/live for bidirectional audio + events (SDD §12.5).
 * Bridges microphone PCM input, Gemini Live 24 kHz playback, tool progress, and UI state.
 */
import { useAgent, type VoiceState } from '../state/agentStore';
import { useLedger } from '../state/ledgerStore';
import { useScenario } from '../state/scenarioStore';
import { useUi } from '../state/uiStore';
import { audioPlayer } from './audioPlayer';
import { micCapture } from './micCapture';

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'fallback';

class LiveClient {
  private ws: WebSocket | null = null;
  private status: LiveStatus = 'disconnected';
  private statusListeners: Array<(s: LiveStatus) => void> = [];
  private currentAgentMsgId: string | null = null;
  private reconnectTimer: number | null = null;

  public getStatus(): LiveStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'connected' || this.status === 'fallback';
  }

  public onStatusChange(cb: (s: LiveStatus) => void): () => void {
    this.statusListeners.push(cb);
    cb(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  private getWsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    // When running Vite dev server (port 5173), API is proxied/running on 8765
    const port = window.location.port === '5173' ? '8765' : (window.location.port || '8765');
    return `${proto}//${host}:${port}/ws/live`;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    const url = this.getWsUrl();

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        // Connected to server
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Downstream 24 kHz audio chunk from Gemini Live
          audioPlayer.playPcmChunk(event.data);
          useAgent.getState().setVoice('speaking');
          return;
        }

        try {
          const msg = JSON.parse(event.data);
          this.handleServerEvent(msg);
        } catch (_) {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('disconnected');
      };
    } catch (_) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    micCapture.stop();
    audioPlayer.interrupt();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private handleServerEvent(msg: Record<string, any>): void {
    const A = useAgent.getState();
    const S = useScenario.getState();
    const L = useLedger.getState();
    const U = useUi.getState();
    const currMd = S.md || 4120;

    switch (msg.type) {
      case 'status':
        if (msg.status === 'connected') this.setStatus('connected');
        if (msg.status === 'fallback') this.setStatus('fallback');
        break;

      case 'voice_state':
        A.setVoice(msg.state as VoiceState);
        break;

      case 'tool_call': {
        const toolName = msg.name as string;
        const toolStatus = msg.status as 'running' | 'done';

        if (!this.currentAgentMsgId) {
          this.currentAgentMsgId = A.push({
            role: 'agent',
            en: '',
            hi: '',
            md: currMd,
            tools: [{ name: toolName, status: toolStatus }],
            citations: [],
          });
        } else {
          const currentMsgs = useAgent.getState().messages;
          const target = currentMsgs.find((m) => m.id === this.currentAgentMsgId);
          if (target) {
            const existing = target.tools.find((t) => t.name === toolName);
            const updatedTools = existing
              ? target.tools.map((t) => (t.name === toolName ? { ...t, status: toolStatus } : t))
              : [...target.tools, { name: toolName, status: toolStatus }];
            A.update(this.currentAgentMsgId, { tools: updatedTools });
          }
        }
        break;
      }

      case 'caption_delta': {
        const text = msg.text as string;
        if (!this.currentAgentMsgId) {
          this.currentAgentMsgId = A.push({
            role: 'agent',
            en: text,
            hi: text,
            md: currMd,
            tools: [],
            citations: [],
          });
        } else {
          const currentMsgs = useAgent.getState().messages;
          const target = currentMsgs.find((m) => m.id === this.currentAgentMsgId);
          if (target) {
            A.update(this.currentAgentMsgId, {
              en: (target.en ? target.en + ' ' : '') + text,
              hi: (target.hi ? target.hi + ' ' : '') + text,
            });
          }
        }
        break;
      }

      case 'turn_complete':
        this.currentAgentMsgId = null;
        A.setVoice('idle');
        break;

      case 'action': {
        const payload = msg.payload || {};
        if (msg.kind === 'memo') {
          L.append({
            id: 'MEMO',
            kind: 'MEMO',
            md: currMd,
            title: payload.memo_id || 'MEMO-SM-2026-09',
            actor: 'agent',
          });
          U.open('memo');
          U.notify('MOC Memo drafted for approval', 'warn');
        } else if (msg.kind === 'approval') {
          S.approve();
          L.append({
            id: 'APPROVAL',
            kind: 'APPROVAL',
            md: currMd,
            title: `${payload.memo_id || 'MEMO'} approved`,
            actor: 'Drilling Superintendent (Company Man)',
          });
          U.notify('MOC Approved — decision basis frozen in ledger', 'ok');
        } else if (msg.kind === 'dispatch') {
          L.append({
            id: 'DISPATCH',
            kind: 'DISPATCH',
            md: currMd,
            title: 'MOC fan-out',
            actor: 'agent',
            channels: (payload.channels_dispatched || []).map((c: any) => ({
              id: c.id,
              channel: c.channel,
              status: c.status === 'DELIVERED' ? 'delivered' : 'sent',
            })),
          });
          U.close('memo');
          U.open('phone');
          setTimeout(() => U.close('phone'), 7000);
        } else if (msg.kind === 'rop_cap') {
          S.capRop();
          L.append({
            id: 'ROP_CAP',
            kind: 'ROP_CAP',
            md: currMd,
            title: `ROP capped at ${payload.rop_cap_m_hr || 12} m/hr + sweep`,
            actor: 'Driller (accepted)',
          });
          U.notify(`ROP capped at ${payload.rop_cap_m_hr || 12} m/hr`, 'ok');
        } else if (msg.kind === 'wcr') {
          L.append({
            id: 'WCR',
            kind: 'WCR',
            md: currMd,
            title: payload.doc_id || 'WCR-MN-SM-DW-01',
            actor: 'agent',
          });
          U.open('wcr');
        }
        break;
      }
    }
  }

  /**
   * Push-to-talk: start recording audio from mic and streaming to /ws/live.
   */
  public async startTalking(): Promise<void> {
    audioPlayer.interrupt(); // Barge-in: cut agent speech immediately
    this.currentAgentMsgId = null;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    useAgent.getState().setVoice('listening');

    await micCapture.start((chunk: Uint8Array) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(chunk);
      }
    });
  }

  /**
   * Push-to-talk release: stop recording and transition to thinking.
   */
  public stopTalking(): void {
    if (micCapture.isCapturing()) {
      micCapture.stop();
      useAgent.getState().setVoice('thinking');
    }
  }

  /**
   * Send text prompt directly to live agent.
   */
  public sendText(text: string, turn?: number): void {
    const A = useAgent.getState();
    const currMd = useScenario.getState().md || 4120;
    audioPlayer.interrupt();

    A.push({
      role: 'presenter',
      en: text,
      hi: text,
      md: currMd,
      tools: [],
      citations: [],
      turn,
    });

    A.setVoice('thinking');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'prompt', text, turn }));
    }
  }

  /**
   * Send proactive trigger event injection (e.g. 4,172 m T3_PRESSURE_RAMP).
   */
  public sendProactiveTrigger(triggerId: string, md: number, prompt: string): void {
    audioPlayer.interrupt();
    useAgent.getState().setVoice('alert');
    this.currentAgentMsgId = null;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'proactive_event',
          trigger_id: triggerId,
          md_m: md,
          prompt,
        })
      );
    }
  }

  /**
   * Barge-in interruption.
   */
  public interrupt(): void {
    audioPlayer.interrupt();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }
}

export const liveClient = new LiveClient();
