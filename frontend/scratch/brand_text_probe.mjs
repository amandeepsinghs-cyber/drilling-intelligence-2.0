// Screenshots the agent panel (badge + attribution) and the audit drawer line.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=1');
await p.waitForTimeout(3500);
const aside = await p.$('aside');
const box = aside ? await aside.boundingBox() : null;
console.log('aside', JSON.stringify(box));
console.log('attribution', await p.getByText('Built with Google Gemini').count());
await p.screenshot({ path: 'public/mockups/live/agent_panel_attribution.png', clip: box ?? { x: 1440, y: 0, width: 480, height: 1080 } });
await p.keyboard.press('a');
await p.waitForTimeout(1200);
console.log('audit line', await p.getByText('Gemini Enterprise Agent Platform (Live API)').count());
await p.screenshot({ path: 'public/mockups/live/audit_platform_line.png' });
await b.close();
