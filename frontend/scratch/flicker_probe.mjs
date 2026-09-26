// Plays the well and samples the GR canvas every animation frame; counts frames where it is blank.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=1');
await p.waitForTimeout(3500);
await p.keyboard.press('Space');
const r = await p.evaluate(() => new Promise((res) => {
  const cv = document.querySelectorAll('[data-track="Gamma ray · caliper"] canvas')[1];
  let frames = 0, blank = 0;
  const t0 = performance.now();
  const f = () => {
    const ctx = cv.getContext('2d');
    const d = ctx.getImageData(0, 0, cv.width, Math.floor(cv.height * 0.5)).data;
    let any = false; for (let i = 3; i < d.length; i += 400) if (d[i] > 0) { any = true; break; }
    frames++; if (!any) blank++;
    if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ frames, blank });
  };
  requestAnimationFrame(f);
}));
console.log(JSON.stringify(r));
await b.close();
