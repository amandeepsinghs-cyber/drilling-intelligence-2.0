import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=' + (process.argv[2] ?? '2'));
await p.waitForTimeout(3500);
for (const k of (process.argv[4] ?? '').split(',').filter(Boolean)) { await p.keyboard.press(k); await p.waitForTimeout(2500); }
const r = await p.evaluate(() => {
  const g = document.querySelector('[data-cockpit-grid]');
  const w = document.querySelector('[data-wellbore]');
  const t = [...document.querySelectorAll('[data-track]')].map((e) => [e.getAttribute('data-track'), Math.round(e.getBoundingClientRect().height)]);
  return { grid: g?.getBoundingClientRect().height, bitY: g?.getAttribute('data-bit-y'), wb: w?.getBoundingClientRect().height, t };
});
console.log(JSON.stringify(r), errs.slice(0, 5));
await p.screenshot({ path: process.argv[3] ?? 'scratch/probe.png' });
await b.close();
