import type { PageMeta } from '../../types';
export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;
  return <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-4"><button className="earn-button-secondary disabled:opacity-40" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>Previous</button><span>{meta.current_page} / {meta.last_page}</span><button className="earn-button-secondary disabled:opacity-40" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Next</button></nav>;
}
