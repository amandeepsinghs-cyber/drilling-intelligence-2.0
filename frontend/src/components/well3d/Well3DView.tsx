/**
 * Well3DView (optional, lazy-loaded) — live well + offsets in local km, 4,000–4,460 m interval,
 * sand-top surface, and offset incidents at true depth. Restrained: slow orbit, no bloom, no particles.
 */
import { Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { tokens } from '../../design/tokens';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';

const KM = 2;          // scene units per km (horizontal)
const V = 1 / 100;     // scene units per metre (vertical)

export default function Well3DView() {
  const { bundle, md } = useScenario();
  const theme = useUi((s) => s.theme);
  if (!bundle) return null;
  const f = bundle.facts, t = tokens[theme];
  const top = f.stratigraphy[0].top_m, td = f.well.live_interval_m.td;
  const y = (d: number) => -(d - top) * V;
  const here = f.well.location;
  const pos = (lat: number, lon: number): [number, number] => [
    (lon - here.lon) * 111 * Math.cos((here.lat * Math.PI) / 180) * KM, -(lat - here.lat) * 111 * KM];
  const offsets = bundle.offsets.offsets.filter((o) => Math.abs(o.location.lon - here.lon) < 1);
  const surfaces = f.stratigraphy.slice(1).map((u) => ({ id: u.id, d: u.top_m, color: tokens.litho[u.litho_class] }));

  return (
    <Canvas camera={{ position: [9, 2.5, 9], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={[t.bgPanel]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      {surfaces.map((s) => (
        <mesh key={s.id} position={[0, y(s.d), 0]} rotation={[-Math.PI / 2 + 0.03, 0, 0]}>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial color={s.color} transparent opacity={s.id === 'U3' ? 0.35 : 0.14} side={2} />
        </mesh>
      ))}
      <Html position={[-7, y(f.pressure.sand_top_m as number), -7]} className="pointer-events-none">
        <span className="num whitespace-nowrap text-[10px] text-muted">U3 sand top {(f.pressure.sand_top_m as number).toLocaleString('en-IN')} m</span>
      </Html>
      {/* live well */}
      <Line points={[[0, 0.6, 0], [0, y(td), 0]]} color={t.lineSubtle} lineWidth={1} dashed dashSize={0.1} gapSize={0.1} />
      <Line points={[[0, 0.6, 0], [0, y(md), 0]]} color={t.accent} lineWidth={3} />
      <mesh position={[0, y(md), 0]}><sphereGeometry args={[0.09, 24, 24]} /><meshStandardMaterial color={t.accent} emissive={t.accent} emissiveIntensity={0.6} /></mesh>
      <Html position={[0, 0.9, 0]} center className="pointer-events-none"><span className="num whitespace-nowrap text-[11px] font-semibold text-accent">{f.well.id}</span></Html>
      {offsets.map((o) => {
        const [x, z] = pos(o.location.lat, o.location.lon);
        const inc = o.incident;
        const col = inc?.type === 'KICK' ? t.risk : inc?.type === 'LOSSES' ? t.warn : t.textMuted;
        return (
          <group key={o.id}>
            <Line points={[[x, 0.6, z], [x, y(td), z]]} color={t.textMuted} lineWidth={1.5} />
            <Html position={[x, 0.9, z]} center className="pointer-events-none"><span className="num whitespace-nowrap text-[10px] text-muted">{o.id} · {o.distance_km} km</span></Html>
            {inc?.md_m && (
              <>
                <mesh position={[x, y(inc.md_m), z]}><sphereGeometry args={[0.14, 24, 24]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} /></mesh>
                <Html position={[x + 0.25, y(inc.md_m), z]} className="pointer-events-none">
                  <span className="num whitespace-nowrap rounded bg-black/40 px-1 text-[10px]" style={{ color: col }}>{inc.type.toLowerCase()} · {inc.md_m.toLocaleString('en-IN')} m</span>
                </Html>
              </>
            )}
          </group>
        );
      })}
      <OrbitControls autoRotate autoRotateSpeed={0.35} enablePan={false} minDistance={6} maxDistance={20} target={[0, -2.2, 0]} />
    </Canvas>
  );
}
