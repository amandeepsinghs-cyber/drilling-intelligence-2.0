/** CitationCard — RAG evidence with doc id, section and authoring label (synthetic corpus is always labelled). */
import type { Citation } from '../../api/types';

export default function CitationCard({ c }: { c: Citation }) {
  const kind = c.doc_id.startsWith('INC-') ? 'Incident report' : c.doc_id.includes('SOP') ? 'SOP' : c.doc_id.startsWith('WCR') ? 'WCR' : 'Document';
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="num truncate text-[11px] text-accent">{c.doc_id}</span>
        <span className="chip shrink-0 border-strong text-faint">{c.authoring === 'synthetic' ? 'synthetic' : 'public'} · {kind}</span>
      </div>
      <div className="text-[11px] text-muted">{c.section}</div>
      <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg/90">“{c.snippet}”</div>
    </div>
  );
}
