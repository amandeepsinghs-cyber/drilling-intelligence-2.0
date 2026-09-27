/** Press-to-talk for a standing presenter: one press opens the mic, the next press sends the question.
 *  Works from any clicker / pointer / single wireless button — the talk key is learnable (Shift+K, then press
 *  the button), stored in this browser. Default talk keys: PageUp and "." (common clicker buttons).
 *  The mic is closed unless opened on purpose, so room noise and the agent's own voice never reach Gemini. */
import { create } from 'zustand';
import { liveClient } from '../live/liveClient';
import { useUi } from './uiStore';

const MAX_OPEN_MS = 30000; // safety: never leave the mic open by accident
const KEY_STORE = 'di.talkKey';
export const DEFAULT_TALK_KEYS = ['PageUp', '.'];

type TalkState = { talking: boolean; learning: boolean; learnedKey: string | null };
export const useTalk = create<TalkState>(() => ({
  talking: false,
  learning: false,
  learnedKey: typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_STORE) : null,
}));

let timer: ReturnType<typeof setTimeout> | null = null;

export async function startTalk() {
  if (useTalk.getState().talking) return;
  if (useUi.getState().agentMode !== 'LIVE') {
    useUi.getState().notify('Voice needs LIVE mode — press V (or type the question)', 'warn');
    return;
  }
  useTalk.setState({ talking: true });
  try {
    await liveClient.startTalking();
    // A second press may arrive while the mic was still opening — close it now so it never stays open unseen.
    if (!useTalk.getState().talking) { liveClient.stopTalking(); return; }
    timer = setTimeout(() => stopTalk(), MAX_OPEN_MS);
  } catch (err) {
    console.warn('Microphone error:', err);
    useTalk.setState({ talking: false });
    useUi.getState().notify('Microphone not available — check the browser mic permission', 'warn');
  }
}

export function stopTalk() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!useTalk.getState().talking) return;
  useTalk.setState({ talking: false });
  liveClient.stopTalking();
}

export function toggleTalk() {
  if (useTalk.getState().talking) stopTalk();
  else void startTalk();
}

/** A key event's identity: the key name, or the physical code for keys that have no printable name. */
const keyId = (e: KeyboardEvent) => (e.key && e.key !== 'Unidentified' ? e.key : e.code);

export function isTalkKey(e: KeyboardEvent): boolean {
  const learned = useTalk.getState().learnedKey;
  const id = keyId(e);
  return learned ? id === learned || e.code === learned : DEFAULT_TALK_KEYS.includes(id);
}

/** Shift+K: the next key pressed (e.g. the clicker's button) becomes the talk key. */
export function beginLearnTalkKey() {
  useTalk.setState({ learning: true });
  useUi.getState().notify('Press the clicker / pointer button you want for TALK…', 'info');
}

/** Returns true if the event was consumed by learn mode. */
export function handleLearnKey(e: KeyboardEvent): boolean {
  if (!useTalk.getState().learning) return false;
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return true; // wait for a real key
  e.preventDefault();
  if (e.key === 'Escape') {
    useTalk.setState({ learning: false });
    useUi.getState().notify('Talk key unchanged', 'info');
    return true;
  }
  const id = keyId(e);
  localStorage.setItem(KEY_STORE, id);
  useTalk.setState({ learning: false, learnedKey: id });
  useUi.getState().notify(`Talk key set: "${id}" — press once to talk, again to send`, 'ok');
  return true;
}

export function resetTalkKey() {
  localStorage.removeItem(KEY_STORE);
  useTalk.setState({ learnedKey: null });
}
