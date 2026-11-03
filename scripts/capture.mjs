// Captures real app states at 393×852 @3x (1179×2556) using the locally installed Google Chrome.
// Usage: npm run capture [-- s1 s4 ...]   (dev server must be running on :5173)
// Each shot loads a deterministic scenario (?scenario=…) so captures are identical every run.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const OUT = process.env.OUT_DIR ?? 'screenshots';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = {
  s1: { route: 'memory', file: 'S1-creator-memory.png' },
  s2: { route: 'new', file: 'S2-new-reel.png' },
  s3: { route: 'plan', file: 'S3-agent-plan.png' },
  s4: { route: 'preview', file: 'S4-complete-reel.png', seek: 1.2 },
  s5: { route: 'refine', file: 'S5-refine.png', seek: 5.2 },
  s6: { route: 'finish', file: 'S6-finish.png' },
  library: { scenario: 's6', route: 'library', file: 'extra-history.png' },
  err: { route: 'error', file: 'extra-exception.png' },
  // v3 review set (Explore integration + Creator Memory). `clicks` press buttons by visible text first.
  'v3-explore': { scenario: 'fresh', route: 'explore', file: 'v3-review/1-explore.png' },
  'v3-video': { scenario: 'fresh', route: 'video', file: 'v3-review/1b-ai-video-create-reel.png' },
  'v3-agent': { scenario: 'fresh', route: 'agent', file: 'v3-review/2-ai-agent.png' },
  'v3-agent-reply': { scenario: 'fresh', route: 'agent', file: 'v3-review/2b-ai-agent-reel-reply.png', clicks: ['Create a complete Reel from an idea'] },
  'v3-memory': { scenario: 'memory', route: 'memory', file: 'v3-review/3-creator-memory-hub.png' },
  'v3-memory-sugg': { scenario: 'memory', route: 'memory', file: 'v3-review/3b-memory-suggestions.png', clicks: ['Pending'] },
  'v3-firstuse': { scenario: 'fresh', route: 'reel-agent', file: 'v3-review/4-first-use-offer.png' },
  'v3-setup': { scenario: 'fresh', route: 'setup', file: 'v3-review/4b-setup-review.png', clicks: ['Use example description', 'Suggest preferences'], scrollTo: '.reviewlist' },
  'v3-new': { scenario: 'brief-mem', route: 'new', file: 'v3-review/5-new-reel-memory.png', scrollTo: '.promptbox' },
  'v3-plan': { scenario: 'plan-mem', route: 'plan', file: 'v3-review/6-agent-plan-memory.png' },
  'v3-settings': { scenario: 'memory', route: 'settings', file: 'v3-review/extra-settings-preferences.png' },
  // v3.1 review set: media-first path + layered Memory
  'v31-mode': { scenario: 'mode', route: 'mode', file: 'v31-review/1-choose-creation-mode.png' },
  'v31-import-empty': { scenario: 'import-empty', route: 'new', file: 'v31-review/2a-import-empty.png' },
  'v31-import': { scenario: 'import', route: 'new', file: 'v31-review/2b-import-media.png' },
  'v31-import-spots': { scenario: 'import', route: 'new', file: 'v31-review/2c-restaurants-and-memory.png', scrollTo: '.spots' },
  'v31-plan': { scenario: 'media-plan', route: 'plan', file: 'v31-review/3a-media-agent-plan.png' },
  'v31-plan-mem': { scenario: 'media-plan', route: 'plan', file: 'v31-review/3b-media-plan-memory.png', scrollTo: '.influence' },
  'v31-preview': { scenario: 'media-preview', route: 'preview', file: 'v31-review/4-media-reel-preview.png', rangeSeek: 6.4 },
  'v31-refine': { scenario: 'media-preview', route: 'refine', file: 'v31-review/5-media-refine.png', rangeSeek: 9.6 },
  'v31-finish': { scenario: 'media-preview', route: 'finish', file: 'v31-review/6-ready-to-use.png' },
  'v31-identity': { scenario: 'memory', route: 'memory?tab=identity', file: 'v31-review/7a-memory-identity.png' },
  'v31-series': { scenario: 'memory', route: 'memory?tab=series', file: 'v31-review/7b-memory-series.png' },
  'v31-suggest': { scenario: 'memory', route: 'memory?tab=suggestions', file: 'v31-review/7c-memory-suggestions.png' },
};
const args = process.argv.slice(2);
const want = args[0] === 'v3' || args[0] === 'v31' ? Object.keys(SHOTS).filter((k) => k.startsWith(args[0] + '-')) : args.length ? args : Object.keys(SHOTS);
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/v3-review`, { recursive: true });
mkdirSync(`${OUT}/v31-review`, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
try {
  for (const key of want) {
    const shot = SHOTS[key];
    if (!shot) throw new Error(`Unknown shot ${key}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}?capture&scenario=${shot.scenario ?? key}#/${shot.route}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    for (const t of shot.clicks ?? []) {
      await page.evaluate((txt) => {
        const el = [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith(txt));
        if (!el) throw new Error('capture: no button ' + txt);
        el.click();
      }, t);
      await new Promise((r) => setTimeout(r, 250));
    }
    if (shot.scrollTo) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const sc = document.querySelector('.frame__scroll');
        if (el && sc) sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 8;
      }, shot.scrollTo);
    }
    if (shot.rangeSeek !== undefined) {
      await new Promise((r) => setTimeout(r, 900)); // let media load
      await page.evaluate((t) => {
        const el = document.querySelector('.player input[type=range]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(t));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, shot.rangeSeek);
      await new Promise((r) => setTimeout(r, 700));
    }
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
