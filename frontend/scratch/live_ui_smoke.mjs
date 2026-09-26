// Live agent through the real UI: type questions, wait for the agent answer, screenshot.
import { chromium } from 'playwright';
const [act = '2', out = 'scratch/live_ui.png', ...qs] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=' + act);
await p.waitForSelector('text=Gemini Live', { timeout: 20000 });
for (const q of (qs.length ? qs : ['Agle zone tak kitna time lagega?'])) {
  const t0 = Date.now();
  await p.fill('input[placeholder="Or type a question…"]', q);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.body.innerText.includes('● speaking') && document.querySelectorAll('.devanagari').length > 0, null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(12000);
  const txt = await p.evaluate(() => document.querySelector('aside')?.innerText ?? '');
  console.log(`\n=== Q: ${q} (${((Date.now() - t0) / 1000).toFixed(1)} s)\n` + txt.slice(0, 900));
}
await p.screenshot({ path: out });
console.log('errors:', errs.slice(0, 5));
await b.close();
