import { chromium } from 'playwright';
// Header overlap probe: screenshot the top bar at common widths and report any overlapping header children.
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const w of [1536, 1920]) {
  for (const act of ['1', '3']) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(`http://localhost:5173/well/MN-SM-DW-01?act=${act}`);
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => {
      const h = document.querySelector('header');
      const kids = [...(h?.children ?? [])].map((e) => e.getBoundingClientRect());
      let overlaps = 0;
      for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 1) overlaps++;
      const nav = h?.querySelector('nav');
      const clipped = nav ? nav.scrollWidth > nav.clientWidth + 1 : false;
      return { overlaps, navClipped: clipped };
    });
    console.log(w, 'act' + act, JSON.stringify(r));
    await p.screenshot({ path: `scratch/hdr_${w}_act${act}.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
    await p.close();
  }
}
await b.close();
