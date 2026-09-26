/**
 * BasinMap — landing screen. Google Maps (dark vector, Map ID) + deck.gl GoogleMapsOverlay when
 * VITE_GOOGLE_MAPS_API_KEY is set; otherwise a deck.gl-only fallback (no basemap) so the demo never blocks.
 */
import { FlyToInterpolator, type MapViewState } from '@deck.gl/core';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import DeckGL from '@deck.gl/react';
import { APIProvider, Map as GMap, useMap } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWells } from '../../api/client';
import type { WellFeature } from '../../api/types';
import { Wordmark } from '../../components/common/AppHeader';
import ProvenanceChip from '../../components/common/ProvenanceChip';
import { useScenario } from '../../state/scenarioStore';
import { useUi } from '../../state/uiStore';
import { graticule, wellLayers, offlineBasemapLayers } from './layers';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
const VIEWS = {
  basin: { longitude: 86.2, latitude: 18.6, zoom: 6.6 },
  prospect: { longitude: 87.345, latitude: 19.455, zoom: 12.2 },
} as const;

function usePulse() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => { setP(((t - t0) / 1800) % 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

function DeckOverlay({ layers }: { layers: unknown[] }) {
  const map = useMap();
  const overlay = useMemo(() => new GoogleMapsOverlay({ interleaved: true }), []);
  useEffect(() => { overlay.setMap(map); return () => overlay.setMap(null); }, [map, overlay]);
  useEffect(() => { overlay.setProps({ layers: layers as never }); }, [layers, overlay]);
  return null;
}

function CameraSync({ view }: { view: keyof typeof VIEWS }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const v = VIEWS[view];
    map.panTo({ lat: v.latitude, lng: v.longitude });
    map.setZoom(Math.round(v.zoom));
  }, [map, view]);
  return null;
}

export default function BasinMap() {
  const nav = useNavigate();
  const { bundle, load } = useScenario();
  const theme = useUi((s) => s.theme);
  const [wells, setWells] = useState<WellFeature[]>([]);
  const [view, setView] = useState<keyof typeof VIEWS>('basin');
  const [viewState, setViewState] = useState<MapViewState>(VIEWS.basin);
  const [selected, setSelected] = useState<string | null>('MN-SM-DW-01');
  const pulse = usePulse();
  useEffect(() => { void load(); getWells().then((r) => setWells(r.data.features)); }, [load]);
  useEffect(() => { setViewState({ ...VIEWS[view], transitionDuration: 1600, transitionInterpolator: new FlyToInterpolator() } as MapViewState); }, [view]);
  const layers = useMemo(() => wellLayers(wells, pulse, selected, theme === 'light'), [wells, pulse, selected, theme]);
  const onClick = (info: { object?: WellFeature }) => { if (info.object) { setSelected(info.object.properties.id); if (info.object.properties.status === 'LIVE') setView('prospect'); } };

  const f = bundle?.facts;
  const offsets = bundle?.offsets.offsets ?? [];
  const u1445 = bundle?.offsets.authenticity_markers?.[0] as { label?: string } | undefined;

  return (
    <div className="relative h-full bg-app">
      <div className="absolute inset-0">
        {KEY ? (
          <APIProvider apiKey={KEY}>
            <GMap defaultCenter={{ lat: VIEWS.basin.latitude, lng: VIEWS.basin.longitude }} defaultZoom={7} mapId={MAP_ID ?? 'DEMO_MAP_ID'}
              colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'} disableDefaultUI gestureHandling="greedy" style={{ width: '100%', height: '100%' }}>
              <DeckOverlay layers={[...layers]} />
              <CameraSync view={view} />
            </GMap>
          </APIProvider>
        ) : (
          <div className="absolute inset-0 bg-[#070D16]">
            <DeckGL
              viewState={viewState}
              onViewStateChange={(e) => setViewState(e.viewState as MapViewState)}
              controller
              layers={[...offlineBasemapLayers(theme === 'light'), graticule(), ...layers]}
              onClick={onClick as never}
              getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
            />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-app via-app/70 to-transparent" style={{ width: 560 }} />

      <div className="absolute left-6 top-6 flex w-[440px] flex-col gap-4">
        <Wordmark />
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent">{f?.well.program ?? 'Mahanadi deepwater'}</div>
          <h1 className="mt-1 text-[34px] font-semibold leading-tight tracking-tight text-fg">{f?.well.basin ?? 'Mahanadi Offshore Deepwater'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">One live deepwater well, its offsets, and everything the organisation already knows about them — watched, reasoned over and acted on by a Gemini agent, with a human approving every decision.</p>
        </div>
        {f && (
          <motion.button whileHover={{ y: -1 }} onClick={() => nav(`/well/${f.well.id}`)}
            className="pointer-events-auto panel group flex items-center justify-between gap-4 border-accent/50 p-4 text-left shadow-glow">
            <div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-accent" /><span className="num text-lg font-semibold text-fg">{f.well.id}</span><ProvenanceChip p="SYNTHETIC" /></div>
              <div className="mt-1 text-xs text-muted">{f.well.water_depth_m.toLocaleString('en-IN')} m water · {f.well.current_section.hole_size_in}-in section · drilling at {f.checkpoints[0].md_m.toLocaleString('en-IN')} m</div>
            </div>
            <span className="text-sm text-accent transition-transform group-hover:translate-x-1">Open command center →</span>
          </motion.button>
        )}
        <div className="pointer-events-auto space-y-2">
          <div className="panel-title">Offset wells · what the organisation remembers</div>
          {offsets.filter((o) => o.distance_km).map((o) => (
            <button key={o.id} onClick={() => { setSelected(o.id); setView('prospect'); }}
              className={`panel w-full px-3 py-2 text-left transition-colors hover:border-strong ${selected === o.id ? 'border-strong' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="num text-sm text-fg">{o.id} <span className="text-faint">· {o.distance_km} km</span></span>
                <span className={`chip ${o.incident?.type === 'KICK' ? 'border-risk/50 text-risk' : o.incident?.type === 'LOSSES' ? 'border-warn/50 text-warn' : 'border-strong text-muted'}`}>
                  {o.incident ? `${o.incident.type.toLowerCase()} · ${o.incident.md_m} m` : 'clean TD'}</span>
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">{o.summary ?? String(o.incident?.cause ?? o.incident?.formation ?? '')}</div>
            </button>
          ))}
          {u1445 && (
            <div className="panel flex items-center justify-between px-3 py-2">
              <span className="text-[12px] text-muted">{u1445.label}</span><ProvenanceChip p="PUBLIC" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-6 top-6 flex gap-2">
        {(['basin', 'prospect'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`btn py-1 text-xs capitalize ${view === v ? 'border-accent/60 text-accent' : ''}`}>{v}</button>
        ))}
      </div>
      <AnimatePresence>
        {!KEY && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-4 right-6 text-[10.5px] text-faint">
            Basemap off — set VITE_GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_MAP_ID in frontend/.env.local
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-4 left-6 text-[10.5px] text-faint">Illustrative scenario · well locations are not ONGC data</div>
    </div>
  );
}
