/**
 * Problem — opening "business challenge" screen shown before the basin map (route /problem).
 * Left half: the money and the person. Right half: a drilling rig at night.
 * Default: static — all beats fade in automatically; Space / → / Enter or the button go to the basin map (/map).
 * ?steps=1: presenter click-through (Space / → next beat, ← back) · ?all=1 shows every beat at once.
 * Figures are rounded, illustrative industry estimates (not from the scenario YAML) and carry that label.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wordmark } from '../../components/common/AppHeader';

const RIG_IMAGE = '/img/problem/rig_night.jpg';

const LAST_BEAT = 4; // 0 budget · 1 NPT share · 2 loss · 3 Chandrayaan scale · 4 the person

const reveal = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Stat({ value, unit, label, sub, tone }: { value: string; unit?: string; label: string; sub?: string; tone: string }) {
  return (
    <div className="flex items-baseline gap-5">
      <div className={`num w-[165px] shrink-0 text-[64px] font-semibold leading-none tracking-tight ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-[32px] font-medium">{unit}</span>}
      </div>
      <div className="min-w-0">
        <div className="text-[19px] font-medium leading-snug text-fg">{label}</div>
        {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export default function Problem() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  // Default: static page — every beat fades in automatically (~0.4 s apart). ?steps=1: presenter click-through.
  const stepMode = params.get('steps') === '1';
  const [beat, setBeat] = useState(params.get('all') === '1' ? LAST_BEAT : 0);

  useEffect(() => {
    if (stepMode || beat >= LAST_BEAT) return;
    const t = setTimeout(() => setBeat((b) => Math.min(LAST_BEAT, b + 1)), beat === 0 ? 300 : 400);
    return () => clearTimeout(t);
  }, [stepMode, beat]);

  const next = useCallback(() => {
    setBeat((b) => {
      if (!stepMode || b >= LAST_BEAT) { nav('/map'); return b; }
      return b + 1;
    });
  }, [nav, stepMode]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (stepMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); setBeat((b) => Math.max(0, b - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, stepMode]);

  const show = (n: number) => (beat >= n ? 'show' : 'hidden');

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#070B10] text-fg" onClick={stepMode ? next : undefined}>
      {/* ── Left half: the business challenge ── */}
      <section className="relative z-10 flex w-1/2 flex-col justify-between px-16 py-12">
        <Wordmark />

        <div className="max-w-[640px]">
          <div className="panel-title mb-8 text-accent">The business challenge</div>

          <div className="space-y-9">
            <motion.div variants={reveal} initial="hidden" animate={show(0)}>
              <Stat value="$10" unit="B" label="Drilling budget, next five years" sub="≈ ₹1 lakh crore · one national oil company" tone="text-fg" />
            </motion.div>
            <motion.div variants={reveal} initial="hidden" animate={show(1)}>
              <Stat value="20" unit="%" label="Lost to non-productive time" sub="Rig hours spent on problems, not drilling" tone="text-warn" />
            </motion.div>
            <motion.div variants={reveal} initial="hidden" animate={show(2)}>
              <Stat value="$2" unit="B" label="Lost by one company" sub="Kicks, losses, stuck pipe, waiting on decisions" tone="text-risk" />
            </motion.div>
            <motion.div variants={reveal} initial="hidden" animate={show(3)} className="!mt-4 pl-[185px]">
              <div className="inline-flex items-center gap-3 rounded-xl border border-strong bg-raised/60 px-4 py-2.5">
                <span className="text-[22px] leading-none">🌙</span>
                <div>
                  <div className="text-[17px] font-semibold text-fg">≈ 25 Chandrayaan-3 missions</div>
                  <div className="text-[12px] text-muted">India landed near the Moon&apos;s south pole for about $75M</div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div variants={reveal} initial="hidden" animate={show(4)} className="mt-12 border-l-2 border-accent pl-6">
            <p className="text-[26px] font-semibold leading-tight text-fg">
              Behind the real-time decision is <span className="text-accent">one person.</span>
            </p>
            <ul className="mt-4 space-y-1.5 text-[16px] text-muted">
              <li>On a <span className="num text-fg">12-hour</span> shift · 6 PM to 6 AM</li>
              <li><span className="num text-fg">4,000 m</span> below, every metre can be different — uncertainty is the norm</li>
              <li className="font-semibold text-fg">The driller never sees the rock — only telemetry data on screen</li>
            </ul>
          </motion.div>
        </div>

        <div className="flex items-end justify-between gap-6 text-[11px] text-faint">
          <span>Rounded, illustrative industry estimates for one operator&apos;s drilling programme.</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nav('/map'); }}
            className={`${beat >= LAST_BEAT ? 'btn-primary' : 'btn'} pointer-events-auto whitespace-nowrap text-[13px]`}
          >
            Meet Sagar Drishti <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      {/* ── Right half: the rig at night ── */}
      <section className="absolute inset-y-0 right-0 w-[58%]">
        <motion.img
          src={RIG_IMAGE}
          alt="Offshore drilling rig at night"
          className="h-full w-full object-cover object-right"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* fade the image into the text half */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#070B10] via-[#070B10]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#070B10]/80 to-transparent" />
        <div className="absolute bottom-10 right-12 text-right">
          <div className="num text-[44px] font-semibold leading-none text-fg/90">03:00 AM</div>
          <div className="mt-1 text-[12px] uppercase tracking-[0.18em] text-muted">Deepwater rig · night shift</div>
        </div>
      </section>
    </div>
  );
}
