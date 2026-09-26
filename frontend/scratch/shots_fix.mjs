// Visual check for F5-fix / F7-fix. Run from frontend/: node scratch/shots_fix.mjs
import { chromium } from 'playwright';
const OUT = '/usr/local/google/home/amandeepsinghs/.gemini/jetski/brain/43e27354-7cd3-4e21-80c1-d40e7aca7de2/scratch';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(() => localStorage.setItem('sagar_drishti_agent_mode', 'SCRIPTED'));
await page.goto('http://localhost:5173/well/MN-SM-DW-01?act=1');
await page.waitForSelector('text=See the rock before the mudlog');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/fix_act1.png` });
await page.keyboard.press('Digit6');          // T5 proactive pressure alert @ 4,172
await page.waitForTimeout(9000);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/fix_t5.png` });
const txt = await page.locator('body').innerText();
console.log(JSON.stringify({
  kickLabel: /KICK SIDE/.test(txt), lossLabel: /LOSS SIDE/.test(txt),
  kickCallout: /Kick margin/.test(txt), lossCallout: /Loss margin/.test(txt), mlLine: /ML Rec/.test(txt),
}));
await browser.close();
