// Captures real app states at 393×852 @3x (1179×2556) using the locally installed Google Chrome.
// Usage: npm run capture [-- s1 s4 ...]   (dev server must be running on :5173)
// Each shot loads a deterministic scenario (?scenario=…) so captures are identical every run.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const OUT = process.env.OUT_DIR ?? 'screenshots';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = {
  s1: { route: 'signature', file: 'S1-creator-signature.png' },
  s2: { route: 'new', file: 'S2-new-reel.png' },
  s3: { route: 'plan', file: 'S3-agent-plan.png' },
  s4: { route: 'preview', file: 'S4-complete-reel.png', seek: 1.2 },
  s5: { route: 'refine', file: 'S5-refine.png', seek: 5.2 },
  s6: { route: 'finish', file: 'S6-finish.png' },
  library: { scenario: 's6', route: 'library', file: 'extra-history.png' },
  err: { route: 'error', file: 'extra-exception.png' },
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
try {
  for (const key of want) {
    const shot = SHOTS[key];
    if (!shot) throw new Error(`Unknown shot ${key}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}?capture&scenario=${shot.scenario ?? key}#/${shot.route}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    if (shot.seek !== undefined) {
      await page.evaluate(async (t) => {
        const v = document.querySelector('.player video');
        if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
        await new Promise((r) => {
          v.addEventListener('seeked', r, { once: true });
          v.currentTime = t;
        });
      }, shot.seek);
    }
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/${shot.file}` });
    console.log('saved', `${OUT}/${shot.file}`);
    await page.close();
  }
} finally {
  await browser.close();
}
