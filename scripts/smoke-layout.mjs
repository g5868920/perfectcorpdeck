// Checks every screen renders without horizontal overflow or console errors at phone, tablet and desktop sizes.
import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CASES = [['fresh', 'explore'], ['fresh', 'agent'], ['fresh', 'tools'], ['fresh', 'video'], ['memory', 'settings'], ['fresh', 'reel-agent'], ['fresh', 'setup'], ['memory', 'memory'], ['brief-mem', 'new'], ['plan-mem', 'plan'], ['s4', 'preview'], ['s5', 'refine'], ['s6', 'finish'], ['s6', 'library'], ['err', 'error']];
const SIZES = [[375, 667, 'phone-small'], [430, 932, 'phone-large'], [768, 1024, 'tablet'], [1440, 900, 'desktop']];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let fail = 0;
for (const [w, h, label] of SIZES) {
  for (const [sc, route] of CASES) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewport({ width: w, height: h });
    await page.goto(`http://127.0.0.1:5173/?scenario=${sc}#/${route}`, { waitUntil: 'networkidle0' });
    const r = await page.evaluate(() => {
      const f = document.querySelector('.frame').getBoundingClientRect();
      return { overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, frameFits: f.right <= window.innerWidth + 1 && f.bottom <= window.innerHeight + 1, screen: !!document.querySelector('.screen') };
    });
    const ok = !r.overflowX && r.frameFits && r.screen && errors.length === 0;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${route}${ok ? '' : ' ' + JSON.stringify({ ...r, errors })}`);
    await page.close();
  }
}
await browser.close();
console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
