import { describe, expect, it } from 'vitest';
import { ppgToSg, sgToPpg } from '../../src/lib/units';
import { ecdCalibrated, overbalancePsi, whatIfOffline } from '../../src/lib/physics';

describe('Physics & Unit calculations', () => {
  it('converts between ppg and SG accurately', () => {
    expect(ppgToSg(8.345)).toBeCloseTo(1.0, 3);
    expect(sgToPpg(1.0)).toBeCloseTo(8.345, 3);
    expect(ppgToSg(11.65)).toBeCloseTo(1.396, 3);
  });

  it('calculates calibrated ECD', () => {
    const ecd = ecdCalibrated(11.65, 12);
    expect(ecd).toBeGreaterThan(11.65);
    expect(ecd).toBeLessThan(12.5);
  });

  it('calculates overbalance psi', () => {
    const psi = overbalancePsi(11.65, 11.48, 4195);
    expect(psi).toBeGreaterThan(0);
    expect(psi).toBeCloseTo(122, -1);
  });

  it('evaluates what-if offline model', () => {
    const res = whatIfOffline(
      { md_m: 4195, mw_ppg: 11.65, rop_m_hr: 12 },
      { fit: 12.10, mw0: 11.20, activeBbl: 1200, ppNow: 11.48, ppMaxAhead: 11.48, resid: 0, pKickFrame: 0.05, mwFrame: 11.65 }
    );
    expect(res.ecd_ppg).toBeDefined();
    expect(res.ecd_fit_margin_ppg).toBeGreaterThan(0);
    expect(res.barite).toBeDefined();
    expect(res.barite?.mt).toBeGreaterThan(0);
  });
});
