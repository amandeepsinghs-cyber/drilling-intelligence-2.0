/** REST client (SDD §13). Every call falls back to /mocks/* so the stage demo survives a dead backend. */
import type { Columnar, ScenarioBundle, WellFeature, WhatIfResult } from './types';
import { whatIfOffline } from '../lib/physics';

export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function getJson<T>(path: string, mock: string): Promise<{ data: T; source: 'api' | 'mock' }> {
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error(String(r.status));
    return { data: (await r.json()) as T, source: 'api' };
  } catch {
    const r = await fetch(mock);
    return { data: (await r.json()) as T, source: 'mock' };
  }
}

export const getScenario = () => getJson<ScenarioBundle>('/api/scenario', '/mocks/scenario.json');
export const getFrames = (wellId: string) =>
  getJson<Columnar>(`/api/scenario/${encodeURIComponent(wellId)}/frames`, '/mocks/frames.json');
export const getWells = () =>
  getJson<{ type: 'FeatureCollection'; features: WellFeature[] }>('/api/wells', '/mocks/wells.json');

/** Run a backend agent tool (same code the Live agent calls). null when the backend is unreachable. */
export async function postTool<T = Record<string, unknown>>(name: string, args: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}/api/tools/${encodeURIComponent(name)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function postWhatIf(
  q: { md_m: number; mw_ppg: number; rop_m_hr: number },
  ctx: Parameters<typeof whatIfOffline>[1],
): Promise<WhatIfResult> {
  try {
    const r = await fetch(`${API_BASE}/api/physics/whatif`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as WhatIfResult;
  } catch {
    return whatIfOffline(q, ctx);
  }
}
