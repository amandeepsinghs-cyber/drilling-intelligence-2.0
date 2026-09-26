import { describe, expect, it } from 'vitest';
import type { ScenarioBundle } from '../../src/api/types';
import { pressureRange, zoneAt } from '../../src/components/cockpit/pressure/PressureTrack';

describe('PressureTrack calculations', () => {
  describe('zoneAt()', () => {
    const limit = 12.10;

    it('returns "kick" when MW is less than pore pressure', () => {
      expect(zoneAt(11.2, 11.5, 11.6, limit)).toBe('kick');
    });

    it('returns "loss" when ECD meets or exceeds the limit', () => {
      expect(zoneAt(11.65, 11.48, 12.10, limit)).toBe('loss');
      expect(zoneAt(11.65, 11.48, 12.15, limit)).toBe('loss');
    });

    it('returns null when within the safe drilling window', () => {
      expect(zoneAt(11.65, 11.48, 11.90, limit)).toBeNull();
    });

    it('prioritizes kick over loss if both conditions met', () => {
      expect(zoneAt(11.2, 11.5, 12.2, limit)).toBe('kick');
    });

    it('handles null values safely', () => {
      expect(zoneAt(null, 11.5, 11.9, limit)).toBeNull();
      expect(zoneAt(11.65, null, 11.9, limit)).toBeNull();
      expect(zoneAt(11.65, 11.48, null, limit)).toBeNull();
      expect(zoneAt(null, null, null, limit)).toBeNull();
    });
  });

  describe('pressureRange()', () => {
    it('computes symmetric 18% padding around min PP/MW and shoe FIT', () => {
      const mockBundle = {
        facts: {
          mud: { initial: { mw_ppg: 11.2 } },
          pressure: { pp_shale_normal_ppg: 9.0 },
          casing: { last_shoe: { fit_ppg: 12.10 } },
        },
      } as unknown as ScenarioBundle;

      const r = pressureRange(mockBundle);
      // lo = min(11.2, 9.0) = 9.0, hi = 12.10
      // pad = (12.10 - 9.0) * 0.18 = 0.558
      // expected lo = 9.0 - 0.558 = 8.442 -> 8.4
      // expected hi = 12.10 + 0.558 = 12.658 -> 12.7
      expect(r.lo).toBe(8.4);
      expect(r.hi).toBe(12.7);
    });

    it('picks initial mw when lower than normal pore pressure', () => {
      const mockBundle = {
        facts: {
          mud: { initial: { mw_ppg: 8.5 } },
          pressure: { pp_shale_normal_ppg: 9.0 },
          casing: { last_shoe: { fit_ppg: 13.0 } },
        },
      } as unknown as ScenarioBundle;

      const r = pressureRange(mockBundle);
      // lo = 8.5, hi = 13.0, span = 4.5, pad = 0.81
      // lo = 8.5 - 0.81 = 7.69 -> 7.7
      // hi = 13.0 + 0.81 = 13.81 -> 13.8
      expect(r.lo).toBe(7.7);
      expect(r.hi).toBe(13.8);
    });
  });
});
