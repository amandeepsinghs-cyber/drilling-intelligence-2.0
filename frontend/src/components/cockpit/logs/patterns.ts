/** Canvas fill patterns for lithology (SPWLA-style): shale dashes, sand dots, limestone bricks, in-transit hatch. */
import { tokens } from '../../../design/tokens';

type Kind = 'SHALE' | 'SAND' | 'SILTSTONE' | 'LIMESTONE' | 'PORE' | 'HATCH';
const cache = new Map<string, CanvasPattern | null>();

function tile(kind: Kind): HTMLCanvasElement {
  const t = document.createElement('canvas');
  const S = kind === 'LIMESTONE' ? 12 : 8;
  t.width = S; t.height = S;
  const g = t.getContext('2d')!;
  const L = tokens.litho;
  switch (kind) {
    case 'SHALE':
      g.fillStyle = L.SHALE; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(20,30,20,0.75)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 2.5); g.lineTo(5, 2.5); g.moveTo(3, 6.5); g.lineTo(8, 6.5); g.stroke();
      break;
    case 'SAND':
      g.fillStyle = '#E3BE5C'; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(120,70,10,0.8)';
      g.fillRect(1, 1, 1.4, 1.4); g.fillRect(5, 4, 1.4, 1.4); g.fillRect(2, 6, 1.2, 1.2);
      break;
    case 'SILTSTONE':
      g.fillStyle = L.SILTSTONE; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(40,35,20,0.7)'; g.fillRect(2, 2, 1, 1); g.fillRect(6, 6, 1, 1);
      break;
    case 'LIMESTONE':
      g.fillStyle = L.LIMESTONE; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(15,30,55,0.8)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 0.5); g.lineTo(S, 0.5); g.moveTo(0, 6.5); g.lineTo(S, 6.5);
      g.moveTo(0.5, 0); g.lineTo(0.5, 6); g.moveTo(6.5, 6); g.lineTo(6.5, S); g.stroke();
      break;
    case 'PORE':
      g.fillStyle = 'rgba(59,130,246,0.55)'; g.fillRect(0, 0, S, S);
      break;
    case 'HATCH':
      g.fillStyle = 'rgba(100,116,139,0.18)'; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(148,163,184,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, S); g.lineTo(S, 0); g.stroke();
      break;
  }
  return t;
}

export function pattern(ctx: CanvasRenderingContext2D, kind: Kind): CanvasPattern | string {
  const key = kind;
  if (!cache.has(key)) cache.set(key, ctx.createPattern(tile(kind), 'repeat'));
  return cache.get(key) ?? '#888';
}
