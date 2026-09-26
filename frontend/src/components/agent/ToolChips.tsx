/** ToolChips — which tools the agent called for this answer (auditability at a glance). */
import clsx from 'clsx';
import type { ToolChip } from '../../state/agentStore';

export default function ToolChips({ tools }: { tools: ToolChip[] }) {
  if (!tools.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <span key={t.name} className={clsx('chip num normal-case tracking-normal', t.status === 'done' ? 'border-accent/40 text-accent' : 'border-strong text-muted')}>
          {t.status === 'running' ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
          ) : (
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5.2 4 7.5 8.5 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>
          )}
          {t.name}()
        </span>
      ))}
    </div>
  );
}
