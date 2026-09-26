// Screenshots the header (logo) in dark and light themes; reports logo natural size.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=1');
await p.waitForTimeout(3000);
for (const theme of ['dark', 'light']) {
  if (theme === 'light') { await p.keyboard.press('t'); await p.waitForTimeout(1200); }
  const info = await p.evaluate(() => { const i = document.querySelector('img[alt="Google Cloud"]'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight, shownH: i.getBoundingClientRect().height, ok: i.complete && i.naturalWidth > 0 } : null; });
  console.log(theme, JSON.stringify(info));
  await p.screenshot({ path: `public/mockups/live/logo_${theme}_header.png`, clip: { x: 0, y: 0, width: 960, height: 120 } });
  await p.screenshot({ path: `public/mockups/live/logo_${theme}_full.png` });
}
await b.close();
