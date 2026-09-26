/** Columnar frame helpers + number formatting. */
import type { Columnar } from '../api/types';

export function indexAt(data: Columnar, md: number): number {
  const { top_m, step_m, n } = data.meta.grid;
  return Math.min(n - 1, Math.max(0, Math.round((md - top_m) / step_m)));
}

export function num(data: Columnar | null, col: string, i: number): number | null {
  const v = data?.columns[col]?.[i];
  return typeof v === 'number' ? v : null;
}

export function str(data: Columnar | null, col: string, i: number): string | null {
  const v = data?.columns[col]?.[i];
  return typeof v === 'string' ? v : null;
}

/** Slice a column up to (and including) index `upto` — the "drilled so far" view. */
export function series(data: Columnar, col: string, upto?: number): (number | null)[] {
  const c = (data.columns[col] ?? []) as (number | null)[];
  return upto === undefined ? c : c.slice(0, upto + 1);
}

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : Math.round(v).toLocaleString('en-IN');

export const signed = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })}`;

export const hms = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
