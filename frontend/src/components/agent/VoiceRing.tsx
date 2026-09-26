/** VoiceRing — restrained state indicator: idle · listening · thinking · speaking · alert. */
import { motion } from 'framer-motion';
import type { VoiceState } from '../../state/agentStore';

const LABEL: Record<VoiceState, string> = { idle: 'Standing by', listening: 'Listening', thinking: 'Reasoning · tools', speaking: 'Speaking', alert: 'Proactive alert' };

export default function VoiceRing({ state, size = 44 }: { state: VoiceState; size?: number }) {
  const color = state === 'alert' ? 'var(--risk)' : 'var(--accent)';
  const r = size / 2 - 3;
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2" />
        </svg>
        {state === 'thinking' && (
          <motion.svg width={size} height={size} className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2" strokeDasharray={`${r * 1.6} ${r * 10}`} strokeLinecap="round" />
          </motion.svg>
        )}
        {(state === 'listening' || state === 'alert') && (
          <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: color }}
            animate={{ scale: [1, 1.18], opacity: [0.9, 0] }} transition={{ duration: state === 'alert' ? 0.8 : 1.4, repeat: Infinity }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="w-[3px] rounded-full" style={{ background: color }}
              animate={state === 'speaking' ? { height: [4, 14 - Math.abs(2 - i) * 3, 5, 12 - Math.abs(2 - i) * 2, 4] } : { height: state === 'idle' ? 3 : 5 }}
              transition={state === 'speaking' ? { duration: 0.9 + i * 0.07, repeat: Infinity } : { duration: 0.18 }} />
          ))}
        </div>
      </div>
      <div>
        <div className="whitespace-nowrap text-[20px] font-semibold leading-tight text-fg">Sagar Drishti <span className="text-accent">AI Agent</span></div>
        {state !== 'idle' && <div className="text-[11px]" style={{ color }}>{LABEL[state]}</div>}
      </div>
    </div>
  );
}
