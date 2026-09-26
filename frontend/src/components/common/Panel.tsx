/** Panel — base surface with optional title, right-side slot and provenance chip. */
import clsx from 'clsx';
import type { ReactNode } from 'react';

export default function Panel({ title, right, className, children, bodyClass }: {
  title?: ReactNode; right?: ReactNode; className?: string; bodyClass?: string; children: ReactNode;
}) {
  return (
    <section className={clsx('panel flex min-h-0 flex-col overflow-hidden', className)}>
      {(title || right) && (
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-line px-3">
          <div className="panel-title">{title}</div>
          <div className="flex items-center gap-2">{right}</div>
        </header>
      )}
      <div className={clsx('relative min-h-0 flex-1', bodyClass)}>{children}</div>
    </section>
  );
}
