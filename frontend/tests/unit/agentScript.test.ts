import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildScript } from '../../src/mocks/agentScript';

// Guards A-5b: every agent line renders from real data — no undefined / NaN / missing fields.
const read = (f: string) => JSON.parse(readFileSync(new URL(`../../public/mocks/${f}`, import.meta.url), 'utf8'));
const bundle = read('scenario.json');
const frames = read('frames.json');

describe('agentScript (Crescendo v2)', () => {
  const script = buildScript(bundle, frames);
  it('has one line per turn', () => {
    expect(Object.keys(script).map(Number).sort((a, b) => a - b)).toEqual(bundle.turns.map((t: { n: number }) => t.n));
  });
  it('renders every string without undefined / NaN', () => {
    const bad: string[] = [];
    for (const [n, line] of Object.entries(script)) {
      const texts = [line.agent.en, line.agent.hi, line.presenter?.en, line.presenter?.hi, ...(line.citations ?? []).map((c) => c.snippet)];
      for (const t of texts) if (t && /undefined|NaN|null/.test(t)) bad.push(`T${n}: ${t.slice(0, 120)}`);
    }
    expect(bad).toEqual([]);
  });
  it('computes the T4b ETA from distance ÷ ROP', () => {
    const t4b = bundle.turns.find((t: { label?: string }) => t.label === 'T4b');
    const dist = bundle.facts.reservoir.sand_top_m - t4b.md_m;
    expect(script[t4b.n].agent.en).toContain(`${dist} m to drill`);
  });
});
