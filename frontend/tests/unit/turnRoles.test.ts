import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { turnRoles } from '../../src/state/turnMachine';
import { actOfTurn } from '../../src/state/scenarioStore';

// Guards A-1: side effects follow turn *roles* from the served script, never hardcoded numbers.
const bundle = JSON.parse(readFileSync(new URL('../../public/mocks/scenario.json', import.meta.url), 'utf8'));
const turns = bundle.turns as { n: number; act?: number; trigger?: string; intent?: string }[];

describe('turn roles (Crescendo v2)', () => {
  it('finds every role exactly once and in show order', () => {
    const r = turnRoles(turns);
    const order = [r.watch, r.t3, r.memo, r.approve, r.fanout, r.t8, r.t9, r.wcr];
    expect(order.every((n) => n >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(r.approve).toBe(r.memo + 1); // human approves right after the memo
  });

  it('keeps roles inside their acts', () => {
    const r = turnRoles(turns);
    const act = (n: number) => actOfTurn(turns.find((t) => t.n === n)!);
    expect(act(r.t3)).toBe('act2');
    expect([act(r.memo), act(r.approve), act(r.fanout)]).toEqual(['act3', 'act3', 'act3']);
    expect([act(r.t8), act(r.t9), act(r.wcr)]).toEqual(['act4', 'act4', 'act4']);
  });
});
