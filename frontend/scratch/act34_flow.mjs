// Act 3 → Act 4 flow through the real UI. Usage: node scratch/act34_flow.mjs <live|scripted> <outPrefix>
import { chromium } from 'playwright';
const [mode = 'live', out = 'scratch/flow'] = process.argv.slice(2);
const wait = mode === 'live' ? 14000 : 6000;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:5173/well/MN-SM-DW-01?act=3');
await p.waitForTimeout(4000);
if (mode === 'scripted') { await p.keyboard.press('v'); await p.waitForTimeout(500); }
const pill = await p.evaluate(() => document.querySelector('aside header')?.innerText ?? '');
console.log('mode pill:', pill.replace(/\s+/g, ' '));
await p.screenshot({ path: `${out}_1_act3_empty.png` });
const main = () => p.evaluate(() => document.querySelector('main, #root')?.innerText.slice(0, 2500) ?? '');

await p.click('text=MOC memo banao — mud weight badhao');
await p.waitForTimeout(wait);
await p.screenshot({ path: `${out}_2_act3_memo.png` });
console.log('\n=== after memo ===\n', (await main()).match(/A · MOC memo[\s\S]{0,700}/)?.[0]);

const approve = p.locator('button', { hasText: /^Approve$/ }).first();
if (await approve.count()) { await approve.click(); } else console.log('!! no Approve button');
await p.waitForTimeout(wait + 4000);
await p.screenshot({ path: `${out}_3_act3_dispatched.png` });
console.log('\n=== after approve ===\n', (await main()).match(/B · Fan-out[\s\S]{0,900}/)?.[0]);

await p.keyboard.press('Shift+Digit4');
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}_4_act4_loss.png` });
await p.fill('input[placeholder="Or type a question…"]', 'Shift handover notes banao');
await p.keyboard.press('Enter');
await p.waitForTimeout(wait);
await p.screenshot({ path: `${out}_5_act4_docs.png` });
console.log('\n=== act4 ===\n', (await main()).match(/Shift handover notes[\s\S]{0,600}/)?.[0]);
console.log('\nagent:', (await p.evaluate(() => document.querySelector('aside')?.innerText ?? '')).slice(0, 600));
console.log('errors:', errs.slice(0, 6));
await b.close();
