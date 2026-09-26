import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:5173/reports/WCR-MN-SM-DW-01.html', { waitUntil: 'networkidle' });
await p.screenshot({ path: 'public/mockups/live/wcr_report_cover.png' });
console.log('banner:', await p.locator('.top-classification-banner').innerText());
await b.close();
