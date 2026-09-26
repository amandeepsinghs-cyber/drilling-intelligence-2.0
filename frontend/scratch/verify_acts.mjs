// P0-7 runtime verify: hotkeys + takeaway + board hiding. Run: node scratch/verify_acts.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/well/MN-SM-DW-01';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(() => localStorage.setItem('sagar_drishti_agent_mode', 'SCRIPTED'));
await page.goto(URL);
await page.waitForSelector('text=See the rock before the mudlog');
await page.waitForTimeout(1500);
const res = {};
const activeTitle = () => page.$eval('nav[aria-label=Acts] button.border-accent\\/60', (b) => b.textContent);
const depth = () => page.$eval('nav[aria-label=Acts] .num', (e) => e.textContent);

// 1. Board hides turn buttons + speed + dev toggles
res.boardNoSpeed = (await page.locator('text=2 m/s').count()) === 0;
res.boardNo3D = (await page.locator('header button:text-is("3D")').count()) === 0;

// 2. Shift+3 → act 3 staged at 4,172 with decision flow hero
await page.keyboard.press('Shift+Digit3');
await page.waitForTimeout(600);
res.shift3Title = await activeTitle();
res.shift3Depth = await depth();
res.shift3Hero = (await page.locator('text=Agent drafts the MOC memo').count()) > 0;

// 3. Enter toggles takeaway card
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
res.takeawayShown = (await page.locator('text=Nothing touches the well without human approval').count()) > 0;
await page.screenshot({ path: '../docs/stage/acts/act3_takeaway.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
res.takeawayHidden = (await page.locator('text=Nothing touches the well without human approval').count()) === 0;

// 4. Pressing 3 runs turn 3 only (last turn of Act 1, no act jump)
await page.keyboard.press('Digit3');
await page.waitForTimeout(1500);
res.digit3Title = await activeTitle();
res.digit3Depth = await depth();

// 5. After turn 3 (last of act 1) the takeaway auto-appears
await page.waitForTimeout(12000);
res.autoTakeaway = (await page.locator('text=ML reads the rock at the bit').count()) > 0;

console.log(JSON.stringify(res, null, 2));

// ── A-1 / A-4: role-based jumps + N / '-' hotkeys ──
const r2 = {};
await page.keyboard.press('Shift+KeyR');
await page.waitForTimeout(800);
await page.keyboard.press('Shift+Digit3');          // stage Act 3 (decision flow hero)
await page.waitForTimeout(600);
await page.keyboard.press('Digit8');                // jump to memo turn (T7)
await page.waitForTimeout(9000);
await page.keyboard.press('Escape');                // close memo overlay
await page.waitForTimeout(500);
r2.memoTurnNotPreApproved = (await page.locator('text=Approved by').count()) === 0;
r2.memoDone = (await page.locator('text=Agent drafts the MOC memo').count()) > 0;
await page.keyboard.press('KeyN');                  // next turn → approval (T8)
await page.waitForTimeout(8000);
r2.nAdvancesToApproval = (await page.locator('text=Approved by').count()) > 0;
await page.keyboard.press('Minus');                 // WCR turn
await page.waitForTimeout(12000);
r2.minusOpensWcrAct4 = (await activeTitle()).includes('Other side of the window');
r2.depthAtTd = await depth();
await page.screenshot({ path: '../docs/stage/acts/wcr_turn.png' });
console.log(JSON.stringify(r2, null, 2));
await browser.close();
