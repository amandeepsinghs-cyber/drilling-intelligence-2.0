/** Alert chime (≤ 400 ms, SDD §12.3): two soft sine partials via WebAudio — no audio asset needed. */
let ctx: AudioContext | null = null;

export function chime(kind: 'alert' | 'info' = 'alert') {
  try {
    ctx = ctx ?? new AudioContext();
    const t = ctx.currentTime;
    const notes = kind === 'alert' ? [880, 660] : [660];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.14);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 0.24);
      o.connect(g).connect(ctx!.destination);
      o.start(t + i * 0.14);
      o.stop(t + i * 0.14 + 0.26);
    });
  } catch {
    /* audio blocked until first user gesture — silent is acceptable */
  }
}
