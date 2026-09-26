/** AgentPanel — conversation column: voice state, bilingual captions, tool chips, citations, live push-to-talk. */
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { liveClient, type LiveStatus } from '../../live/liveClient';
import { useAgent } from '../../state/agentStore';
import { useUi } from '../../state/uiStore';
import Captions from './Captions';
import CitationCard from './CitationCard';
import ToolChips from './ToolChips';
import VoiceRing from './VoiceRing';

export default function AgentPanel() {
  const { messages, voice } = useAgent();
  const { lang, cycleLang } = useUi();
  const end = useRef<HTMLDivElement>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('disconnected');
  const [isTalking, setIsTalking] = useState(false);
  const [typedPrompt, setTypedPrompt] = useState('');

  // Auto-connect WebSocket on mount and subscribe to status
  useEffect(() => {
    liveClient.connect();
    const unsub = liveClient.onStatusChange((s) => setLiveStatus(s));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, voice]);

  const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');

  const handleStartTalk = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      setIsTalking(true);
      await liveClient.startTalking();
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsTalking(false);
    }
  };

  const handleStopTalk = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isTalking) {
      setIsTalking(false);
      liveClient.stopTalking();
    }
  };

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedPrompt.trim()) return;
    liveClient.sendText(typedPrompt.trim());
    setTypedPrompt('');
  };

  return (
    <aside className="panel flex min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <VoiceRing state={voice} />
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'inline-block h-2 w-2 rounded-full',
                liveStatus === 'connected' ? 'bg-ok animate-pulse' :
                liveStatus === 'connecting' ? 'bg-warn animate-ping' :
                liveStatus === 'fallback' ? 'bg-accent' : 'bg-muted'
              )}
            />
            <span className="chip border-accent/40 text-accent font-medium">
              {liveStatus === 'connected' ? 'Gemini 3.8 Live' :
               liveStatus === 'connecting' ? 'Connecting...' :
               liveStatus === 'fallback' ? 'Rehearsal Live' : 'Gemini Live'}
            </span>
          </div>
          <button onClick={cycleLang} className="kbd" title="Caption language (L)">
            {lang === 'both' ? 'EN + हिं' : lang === 'en' ? 'EN' : 'हिंदी'}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="mt-8 space-y-2 text-center text-sm text-muted">
            <p>Ask in Hindi, English or Hinglish.</p>
            <p className="devanagari text-faint">हिंदी, अंग्रेज़ी या हिंग्लिश में पूछें।</p>
            <p className="pt-4 text-[11px] text-faint">
              Hold the microphone button below to speak, or press <span className="kbd">0</span> for status.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={clsx(
                'rounded-xl border px-3 py-2.5',
                m.role === 'presenter'
                  ? 'ml-8 border-line bg-raised'
                  : m.proactive
                  ? 'border-risk/40 bg-risk/[0.06]'
                  : 'border-line bg-transparent'
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  {m.role === 'presenter' ? 'Presenter' : m.proactive ? 'Agent · proactive' : 'Agent'}
                </span>
                <span className="num text-[10px] text-faint">
                  {m.md.toLocaleString('en-IN')} m{m.turn !== undefined ? ` · T${m.turn}` : ''}
                </span>
              </div>
              <Captions en={m.en} hi={m.hi} live={m.id === lastAgent?.id && voice === 'speaking'} />
              {m.tools.length > 0 && (
                <div className="mt-2">
                  <ToolChips tools={m.tools} />
                </div>
              )}
              {m.citations.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.citations.map((c) => (
                    <CitationCard key={c.doc_id + c.section} c={c} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={end} />
      </div>

      <footer className="flex flex-col gap-2 border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={handleStartTalk}
            onPointerUp={handleStopTalk}
            onPointerLeave={handleStopTalk}
            onTouchStart={handleStartTalk}
            onTouchEnd={handleStopTalk}
            className={clsx(
              'btn flex-1 justify-center transition-all select-none',
              isTalking ? 'bg-risk text-white ring-2 ring-risk/50 shadow-lg' : 'hover:border-accent/60'
            )}
            title="Push to talk (Hold to record audio, release to send to Gemini Live)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" className={clsx(isTalking && 'animate-pulse')}>
              <rect x="4.5" y="1" width="5" height="8" rx="2.5" fill="currentColor" />
              <path d="M2.5 6.5a4.5 4.5 0 0 0 9 0M7 11v2" stroke="currentColor" fill="none" strokeWidth="1.3" />
            </svg>
            {isTalking ? 'Listening... release to send' : 'Hold to talk'}
          </button>

          {voice === 'speaking' && (
            <button
              onClick={() => liveClient.interrupt()}
              className="btn border-risk/40 text-risk text-xs px-2.5 py-1"
              title="Interrupt agent speech (Barge-in)"
            >
              Barge-in
            </button>
          )}
        </div>

        <form onSubmit={handleSendTyped} className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={typedPrompt}
            onChange={(e) => setTypedPrompt(e.target.value)}
            placeholder="Or type a question (e.g. 'Status of well?')..."
            className="flex-1 bg-surface border border-line rounded px-2.5 py-1 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!typedPrompt.trim()}
            className="btn px-2.5 py-1 text-xs disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </footer>
    </aside>
  );
}
