/** Design tokens — mirrors SDD §12.3 and docs/design/design_system.md. */
export const tokens = {
  dark: {
    bgApp: '#0B0F14', bgPanel: '#111821', lineSubtle: '#1E2A36',
    textPrimary: '#E6EDF3', textMuted: '#8B9BAB',
    accent: '#22D3EE', ok: '#34D399', warn: '#F59E0B', risk: '#EF4444', ghost: 'rgba(148,163,184,0.45)',
    window: 'rgba(52,211,153,0.07)', hazard: 'rgba(239,68,68,0.10)',
  },
  light: {
    bgApp: '#F5F7FA', bgPanel: '#FFFFFF', lineSubtle: '#D8E0E8',
    textPrimary: '#0B1520', textMuted: '#4A5B6B',
    accent: '#0891B2', ok: '#059669', warn: '#D97706', risk: '#DC2626', ghost: 'rgba(71,85,105,0.45)',
    window: 'rgba(5,150,105,0.08)', hazard: 'rgba(220,38,38,0.08)',
  },
  motion: { durationMs: 180, easing: [0.2, 0.8, 0.2, 1] as const },
  type: { kpiPx: 56, bodyPx: 16 },
  curves: {
    pp: '#EF4444', fg: '#F59E0B', fit: '#F59E0B', obg: '#64748B', mwPlanned: '#8B9BAB', mw: '#22D3EE', ecd: '#34D399',
    mlBand: '#C084FC', gr: '#34D399', rdep: '#F472B6', rmed: '#60A5FA', rhob: '#F87171', nphi: '#60A5FA',
    dt: '#FBBF24', nct: '#64748B', dxc: '#A78BFA', gas: '#F59E0B', conn: '#EF4444',
  },
  litho: { SHALE: '#4B5A4A', SILTSTONE: '#7C7456', SAND: '#D9B45A', LIMESTONE: '#5B7EA6', DOLOMITE: '#7A6AA6' },
} as const;
