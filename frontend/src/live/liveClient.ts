/**
 * liveClient — WebSocket client to /ws/live for bidirectional audio + events (SDD §12.5).
 * Bridges microphone PCM input, Gemini Live 24 kHz playback, tool progress, and UI state.
 */
import { useAgent, type VoiceState } from '../state/agentStore';
import { toChannels, useLedger } from '../state/ledgerStore';
import { useScenario } from '../state/scenarioStore';
import { useUi } from '../state/uiStore';
import { audioPlayer } from './audioPlayer';
import { micCapture } from './micCapture';

/** Approvals the screen already holds (a click, or rehearsal staging) — the backend syncs to this so the
 *  agent never asks for a click on something that is already approved. */
function uiState() {
  const S = useScenario.getState();
  return { approved_mw: S.approvedMw, rop_capped: S.ropCapped, memo_id: S.bundle?.facts.ids.memo_id };
}

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'fallback';

class LiveClient {
  private ws: WebSocket | null = null;
  private status: LiveStatus = 'disconnected';
  private statusListeners: Array<(s: LiveStatus) => void> = [];
  private currentAgentMsgId: string | null = null;
  private currentPresenterMsgId: string | null = null;
  private reconnectTimer: number | null = null;
  private turnWaiters: Array<(ok: boolean) => void> = [];
  /** Turn number / proactive flag stamped onto the next Live agent bubble (set by turnMachine). */
  private nextTurnMeta: { turn?: number; proactive?: boolean } = {};

  public setNextTurnMeta(meta: { turn?: number; proactive?: boolean }): void {
    this.nextTurnMeta = meta;
  }

  public getStatus(): LiveStatus {
    return this.status;
  }

  /** @deprecated use isLive(); kept for callers that only need "socket usable". */
  public isConnected(): boolean {
    return this.status === 'connected' || this.status === 'reconnecting' || this.status === 'fallback';
  }

  /** True only when a real Gemini Live session is (or is being transparently resumed) behind the socket. */
  public isLive(): boolean {
    return this.status === 'connected' || this.status === 'reconnecting';
  }

  /** Resolves true on the next agent turn_complete, false on timeout. */
  public waitForTurnComplete(timeoutMs = 25000): Promise<boolean> {
    return new Promise((resolve) => {
      const t = window.setTimeout(() => {
        this.turnWaiters = this.turnWaiters.filter((w) => w !== done);
        resolve(false);
      }, timeoutMs);
      const done = (ok: boolean) => {
        window.clearTimeout(t);
        resolve(ok);
      };
      this.turnWaiters.push(done);
    });
  }

  private resolveTurnWaiters(ok: boolean) {
    const ws = this.turnWaiters;
    this.turnWaiters = [];
    ws.forEach((w) => w(ok));
  }

  public onStatusChange(cb: (s: LiveStatus) => void): () => void {
    this.statusListeners.push(cb);
    cb(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  private setStatus(s: LiveStatus) {
    const prev = this.status;
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
    // P0-2: a real outage must never leave the show waiting on a Live answer that will not come.
    if (s === 'fallback' && prev !== 'fallback') {
      const U = useUi.getState();
      if (U.agentMode === 'LIVE') {
        U.setAgentMode('SCRIPTED');
        U.notify('Gemini Live unavailable — switched to SCRIPTED mode (press V to retry LIVE)', 'warn');
      }
      this.resolveTurnWaiters(false);
    }
  }

  private getWsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    // When running Vite dev server (port 5173), API is proxied/running on 8765
    if (window.location.port === '5173') return `${proto}//${host}:8765/ws/live`;
    // Cloud Run / single-container: same origin (default port → no ":port" suffix)
    return `${proto}//${window.location.host || 'localhost:8765'}/ws/live`;
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

      const sock = this.ws;
      this.ws.onclose = () => {
        if (this.ws !== sock && this.ws !== null) return; // stale socket replaced by retryLive()
        this.setStatus('disconnected');
        this.resolveTurnWaiters(false);
        if (this.ws === sock) this.scheduleReconnect();
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

  /** After a fallback the backend socket is pinned to the rehearsal engine; a fresh socket retries Gemini. */
  public retryLive(): void {
    this.disconnect();
    this.connect();
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
        if (msg.status === 'reconnecting') this.setStatus('reconnecting');
        if (msg.status === 'resumed') {
          this.setStatus('connected');
          U.notify(msg.memory ? 'Gemini Live session resumed — conversation memory kept' : 'Gemini Live session reconnected', 'info');
        }
        if (msg.status === 'fallback' || msg.status === 'rehearsal_active') this.setStatus('fallback');
        break;

      case 'input_transcript': {
        // Presenter's own speech (Hindi/Hinglish) transcribed by Gemini Live.
        const text = msg.text as string;
        if (!text) break;
        if (!this.currentPresenterMsgId) {
          this.currentPresenterMsgId = A.push({ role: 'presenter', en: text, hi: text, md: currMd, tools: [], citations: [] });
        } else {
          const target = useAgent.getState().messages.find((m) => m.id === this.currentPresenterMsgId);
          if (target) A.update(this.currentPresenterMsgId, { en: target.en + text, hi: target.hi + text });
        }
        break;
      }

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
            ...this.nextTurnMeta,
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
        this.currentPresenterMsgId = null;
        if (!this.currentAgentMsgId) {
          this.currentAgentMsgId = A.push({
            role: 'agent',
            en: text,
            hi: text,
            md: currMd,
            tools: [],
            citations: [],
            ...this.nextTurnMeta,
          });
        } else {
          const currentMsgs = useAgent.getState().messages;
          const target = currentMsgs.find((m) => m.id === this.currentAgentMsgId);
          if (target) {
            A.update(this.currentAgentMsgId, {
              en: (target.en ?? '') + text,
              hi: (target.hi ?? '') + text,
            });
          }
        }
        break;
      }

      case 'turn_complete':
        this.currentAgentMsgId = null;
        this.currentPresenterMsgId = null;
        this.nextTurnMeta = {};
        A.setVoice('idle');
        this.resolveTurnWaiters(true);
        break;

      case 'action': {
        const payload = msg.payload || {};
        // The action panels live in Act 3 (memo → approve → fan-out) and Act 4 (shift notes ⇄ WCR).
        if (['memo', 'approval', 'dispatch'].includes(msg.kind)) S.setAct('act3');
        if (['shift_log', 'wcr', 'rop_cap'].includes(msg.kind)) S.setAct('act4');
        if (msg.kind === 'approval_pending') {
          // The agent asked for approval (or tried to act early). Only the on-screen button approves.
          if (payload.approval === 'rop_cap') {
            S.setAct('act4');
            U.notify('Awaiting your approval — click "Approve ROP cap"', 'warn');
          } else {
            S.setAct('act3');
            U.notify('Awaiting your approval — review the memo and click Approve', 'warn');
          }
        } else if (msg.kind === 'memo') {
          const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];
          L.append({
            id: 'MEMO',
            kind: 'MEMO',
            md: currMd,
            title: payload.memo_id || 'MEMO-SM-2026-09',
            actor: 'agent',
            evidence,
            citations: evidence.map((e: { doc_id: string }) => e.doc_id),
          });
          if (evidence.length) L.patch('MEMO', { evidence, citations: evidence.map((e: { doc_id: string }) => e.doc_id) });
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
          const channels = toChannels(payload.channels_dispatched);
          L.append({ id: 'DISPATCH', kind: 'DISPATCH', md: currMd, title: 'MOC fan-out', actor: 'agent', channels, text: payload.message_text });
          L.patch('DISPATCH', { channels, text: payload.message_text });
          U.close('memo');
        } else if (msg.kind === 'rop_cap') {
          S.capRop();
          L.append({
            id: 'ROP_CAP',
            kind: 'ROP_CAP',
            md: currMd,
            title: `ROP cap ${payload.rop_cap_m_hr || 12} m/hr + sweep — approved`,
            actor: 'Presenter (Drilling Superintendent)',
          });
          U.notify(`ROP cap approved — capped at ${payload.rop_cap_m_hr || 12} m/hr`, 'ok');
        } else if (msg.kind === 'shift_log') {
          L.append({ id: 'SHIFT_LOG', kind: 'SHIFT_LOG', md: currMd, title: 'Shift handover notes', actor: 'agent', lines: payload.lines ?? [] });
          L.patch('SHIFT_LOG', { lines: payload.lines ?? [] });
        } else if (msg.kind === 'wcr') {
          L.append({
            id: 'WCR',
            kind: 'WCR',
            md: currMd,
            title: payload.doc_id || 'WCR-MN-SM-DW-01',
            actor: 'agent',
          });
        }
        break;
      }
    }
  }

  /**
   * Push-to-talk: start recording audio from mic and streaming to /ws/live.
   */
  /** A-8: tell the backend the live bit depth so tools answer for *this* depth, not a default. */
  private sendContext(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'context', md_m: useScenario.getState().md, ui_state: uiState() }));
    }
  }

  public async startTalking(): Promise<void> {
    audioPlayer.interrupt(); // Barge-in: cut agent speech immediately
    this.currentAgentMsgId = null;
    this.currentPresenterMsgId = null;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    useAgent.getState().setVoice('listening');
    this.sendContext();

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
      // Tell Gemini the utterance is over so it answers immediately instead of waiting for VAD silence.
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'audio_end' }));
      }
    }
  }

  /**
   * Send text prompt directly to live agent.
   */
  public sendText(text: string, turn?: number, display?: { en: string; hi: string }): void {
    const A = useAgent.getState();
    const currMd = useScenario.getState().md || 4120;
    audioPlayer.interrupt();
    this.currentAgentMsgId = null;
    this.currentPresenterMsgId = null;

    A.push({
      role: 'presenter',
      en: display?.en ?? text,
      hi: display?.hi ?? text,
      md: currMd,
      tools: [],
      citations: [],
      turn,
    });

    A.setVoice('thinking');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'prompt', text, turn, md_m: useScenario.getState().md, ui_state: uiState() }));
    } else {
      A.setVoice('idle');
      useUi.getState().notify('Live agent not connected — press N for the scripted turn, or V to switch mode', 'warn');
    }
  }

  /**
   * The presenter clicked Approve on screen — the only way an MOC gets approved in LIVE.
   * Returns false if the socket is not open (caller falls back to the scripted path).
   */
  public sendHumanApproval(memoId: string, approval: 'moc' | 'rop_cap' = 'moc'): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    audioPlayer.interrupt();
    this.currentAgentMsgId = null;
    useAgent.getState().setVoice('thinking');
    this.ws.send(JSON.stringify({ type: 'human_approval', approval, memo_id: memoId, md_m: useScenario.getState().md, ui_state: uiState() }));
    return true;
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
          ui_state: uiState(),
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
