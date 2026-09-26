import { beforeEach, describe, expect, it } from 'vitest';
import type { ScenarioBundle } from '../../src/api/types';
import { toChannelStatus } from '../../src/state/ledgerStore';
import { useScenario } from '../../src/state/scenarioStore';
import { scriptedTurnFor } from '../../src/state/turnMachine';

describe('Act 3 / Act 4 Turn & Channel logic (P-FT-B)', () => {
  describe('toChannelStatus()', () => {
    it('maps status strings honestly (never claims delivery we cannot prove)', () => {
      expect(toChannelStatus('DELIVERED')).toBe('delivered');
      expect(toChannelStatus('FAILED')).toBe('failed');
      expect(toChannelStatus('SIMULATED')).toBe('simulated');
      expect(toChannelStatus(undefined)).toBe('simulated');
      expect(toChannelStatus('UNKNOWN')).toBe('simulated');
    });
  });

  describe('scriptedTurnFor()', () => {
    beforeEach(() => {
      useScenario.setState({
        bundle: {
          facts: {} as any,
          offsets: {} as any,
          turns: [
            { n: 4, md_m: 4145, leader: 'presenter', mode: 'voice', intent: 'eta_next_zone_query', tools: [], act: 2 },
            { n: 9, md_m: 4172, leader: 'presenter', mode: 'voice', intent: 'approve', tools: ['request_approval'], act: 3 },
            { n: 13, md_m: 4300, leader: 'presenter', mode: 'voice', intent: 'draft_shift_log', tools: ['draft_shift_log'], act: 4 },
          ],
        } as unknown as ScenarioBundle,
      });
    });

    it('matches "Approve. Team ko bhej do." to the approve turn', () => {
      const turnNum = scriptedTurnFor('Approve. Team ko bhej do.');
      expect(turnNum).toBe(9);
    });

    it('matches "Shift handover notes banao" to the draft_shift_log turn', () => {
      const turnNum = scriptedTurnFor('Shift handover notes banao');
      expect(turnNum).toBe(13);
    });

    it('matches "Agle zone tak kitna time lagega?" to the eta_next_zone_query turn', () => {
      const turnNum = scriptedTurnFor('Agle zone tak kitna time lagega?');
      expect(turnNum).toBe(4);
    });

    it('returns null for unknown phrases', () => {
      expect(scriptedTurnFor('unrecognized query statement')).toBeNull();
    });
  });
});
