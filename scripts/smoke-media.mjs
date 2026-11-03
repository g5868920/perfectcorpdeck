// Media-first path, end to end through the real UI: real file uploads → storyboard shows them →
// footage reassignment → Memory + series applied with sources → refresh persistence (IndexedDB) →
// generate → canvas preview really draws the footage → targeted re-cut + compare → Ready to Use →
// real recorded export → series-scoped learning → guardrail on campaign/claims text.
// Usage: UPLOAD_DIR=/path/with/files node scripts/smoke-media.mjs   (needs `npm run dev`)
import puppeteer from 'puppeteer-core';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const UPLOAD_DIR = process.env.UPLOAD_DIR;
if (!UPLOAD_DIR) throw new Error('Set UPLOAD_DIR to a folder with a few .jpg/.mp4 files');
const files = readdirSync(UPLOAD_DIR).filter((f) => /\.(jpe?g|png|mp4|mov|webm)$/i.test(f)).map((f) => join(UPLOAD_DIR, f));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = () => page.evaluate(() => location.hash);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('reel-agent-demo.v1')));
const current = async () => {
  const s = await state();
  return s.projects.find((p) => p.id === s.currentId);
};
const click = async (text, scope = 'button') => {
  await page.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((b) => b.offsetParent !== null && !b.closest('.presenter') && b.innerText.trim().includes(t) && !b.disabled);
      if (!el) throw new Error(`No enabled ${s} containing "${t}" on ${location.hash}`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    },
    text,
    scope,
  );
  await wait(250);
};
const setValue = async (sel, value, ev = 'input', nth = 0) => {
  await page.evaluate(
    (s, v, e, n) => {
      const el = document.querySelectorAll(s)[n];
      if (!el) throw new Error(`No element ${s}[${n}]`);
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event(e, { bubbles: true }));
    },
    sel,
    value,
    ev,
    nth,
  );
  await wait(80);
};
const results = [];
const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// fresh demo
await page.goto(BASE + '#/explore', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '?scenario=fresh#/explore', { waitUntil: 'networkidle0' });
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
const identityBefore = JSON.stringify((await state()).memory);

await click('Skip for Now');
check('first-time creator can skip setup → Choose Creation Mode', (await hash()) === '#/mode');
await click('Use My Photos & Videos');
check('media mode opens Import screen', (await hash()) === '#/new' && !!(await page.$('.dropzone')));

// real uploads through the file input
const input = await page.$('input[type=file]');
await input.uploadFile(...files);
await page.waitForFunction((n) => document.querySelectorAll('.mediagrid li').length === n, { timeout: 15000 }, files.length);
await wait(400);
const thumbs = await page.$$eval('.mediagrid .mthumb img, .mediagrid .mthumb video', (els) => els.map((e) => e.getAttribute('src')));
check(`${files.length} uploaded files appear in the project`, thumbs.length === files.length && thumbs.every((s) => s.startsWith('blob:')), thumbs.join(','));
check('uploads are labelled "Yours"', (await page.$$eval('.mthumb__src--upload', (e) => e.length)) === files.length);
let p = await current();
check('video upload detected with duration', p.media.some((m) => m.kind === 'video' && m.duration > 1));

// names typed by the creator
const names = ['炙燒小館', '牛舌研究所', '夜燒肉', '炭香食堂', '巷口燒肉'];
for (let i = 0; i < 5; i++) await setValue(`input[aria-label="Restaurant ${i + 1} name"]`, names[i]);
await setValue('input[aria-label="Restaurant 1 note"]', '厚切牛舌');
check('Travel & Food series pre-selected for a restaurant brief', p.series === 'travel-food');

// a one-off override for this Reel
await click('Customize for This Reel');
await setValue('.override select[aria-label="Visual style for this Reel"]', 'Cool Night Look', 'change');
await click('Plan My Reel');
check('plan opens', (await hash()) === '#/plan');

// storyboard shows the creator's actual footage
const story = await page.$$eval('.mstory__item', (items) => items.map((li) => ({ src: (li.querySelector('img,video') || {}).getAttribute?.('src') ?? '', file: li.querySelector('.mstory__file').innerText, line: li.querySelector('.mstory__line').innerText })));
check('storyboard has 7 segments', story.length === 7);
check('storyboard uses uploaded media (blob URLs + file names)', story.every((s) => s.src.startsWith('blob:') && /IMG_\d+/.test(s.file)), story.map((s) => s.file).join(' | '));
check('captions use the names the creator typed', names.every((n, i) => story[i + 1].line.includes(n)) && story[1].line.includes('厚切牛舌'));
const src = async (k) => page.$eval(`.influence__list li[data-key="${k}"] em.chip`, (e) => e.innerText.trim());
check('plan applies series pacing (Travel & Food)', (await src('pacing')) === 'Series: Travel & Food');
check('plan applies identity narration', (await src('voice')) === 'Creator Identity');
check('plan shows the one-off override', (await src('visual')) === 'This Reel only');

// creator re-assigns footage for SPOT 2
const beforeSlot = (await current()).slots[2];
await page.evaluate(() => document.querySelector('.mstory__item[data-seg="2"] .mstory__thumb').click());
await wait(200);
await page.evaluate(() => [...document.querySelectorAll('.mstory__item[data-seg="2"] .mpicker button')].find((b) => b.getAttribute('aria-selected') !== 'true').click());
await wait(200);
p = await current();
check('footage reassignment is under creator control', p.slots[2] !== beforeSlot);

// refresh: imports survive (IndexedDB), plan still shows them
await page.reload({ waitUntil: 'networkidle0' });
await wait(500);
const afterReload = await page.$$eval('.mstory__item .mthumb img, .mstory__item .mthumb video', (els) => els.map((e) => e.getAttribute('src')));
check('uploads persist after refresh (on-device)', afterReload.length === 7 && afterReload.every((s) => s.startsWith('blob:')));
check('one-off override did not change Creator Identity', JSON.stringify((await state()).memory) === identityBefore);

// generate → preview really draws the footage
await click('Approve & Generate Reel');
await click('Confirm ·');
await wait(6000);
check('generation → preview', (await hash()) === '#/preview');
await wait(1200);
const lit = await page.evaluate(() => {
  const c = document.querySelector('.player__canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let bright = 0;
  for (let i = 0; i < d.length; i += 4 * 997) if (d[i] + d[i + 1] + d[i + 2] > 60) bright++;
  return bright;
});
check('canvas preview renders the footage (non-black frame)', lit > 50, `${lit} lit samples`);
await page.click('.player__bigplay');
await wait(1800);
const tdisp = await page.$eval('.player__time', (e) => e.innerText);
check('preview plays (clock advances)', !tdisp.startsWith('0:00'), tdisp);

// targeted refinement + compare
await click('Refine');
await wait(400);
const firstPick = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.mpicker--wide button')];
  const b = btns.find((x) => !x.classList.contains('is-on'));
  b.click();
  return true;
});
await wait(250);
await click('Fix Captions');
await page.evaluate(() => [...document.querySelectorAll('.segmented button')].find((b) => b.innerText.includes('Soft Cream')).click());
await wait(200);
p = await current();
check('re-cut changes only the revision (original preserved)', firstPick && p.mRevision.slots[1] !== p.mOriginal.slots[1] && p.mOriginal.slots[1] === p.slots[1]);
check('revision diff is shown', (await page.$eval('.diffs', (e) => e.innerText)).includes('re-cut'));
await click('Original');
check('compare: Original badge', (await page.$eval('.player__badge', (e) => e.innerText)) === 'ORIGINAL');
await click('Revised');
await click('Use Revision');
check('Use Revision → Ready to Use screen', (await hash()) === '#/finish');

// Ready to Use is separate from publishing; real export
check('starts as Draft, not published', (await page.$eval('.status', (e) => e.innerText)) === 'Draft' && (await page.$eval('.publish', (e) => e.innerText)).includes('Not published'));
await click('Mark as Ready to Use');
await click('Save Finished Reel');
await click('Export Video');
await page.waitForFunction(() => [...document.querySelectorAll('a.btn')].some((a) => a.innerText.includes('Download')), { timeout: 60000 });
const dl = await page.$$eval('a.btn', (as) => as.map((a) => ({ t: a.innerText, href: a.href })).find((x) => x.t.includes('Download')));
const blobInfo = await page.evaluate(async (h) => {
  const b = await fetch(h).then((r) => r.blob());
  return { size: b.size, type: b.type };
}, dl.href);
check('export produces a real recorded video file', blobInfo.size > 200000 && /video\//.test(blobInfo.type), `${(blobInfo.size / 1e6).toFixed(2)} MB ${blobInfo.type}`);

// a second Travel & Food Reel with the same caption choice → series-scoped suggestion
await click('Start Another Reel');
await click('Use My Photos & Videos');
await click('Use sample media');
await click('Fill fictional names');
await click('Customize for This Reel');
await setValue('.override select[aria-label="Captions for this Reel"]', 'Traditional Chinese, Soft Cream', 'change');
await click('Plan My Reel');
let s = await state();
const sg = s.suggestions.find((x) => x.value === 'Traditional Chinese, Soft Cream' && x.status === 'pending');
check('repeated choice across 2 Travel & Food Reels → pending series suggestion', sg?.scope === 'travel-food' && sg.provenance.length === 2, JSON.stringify(sg?.provenance));
check('pending suggestion changed nothing yet', s.memory.find((m) => m.id === 'captions').value === 'Traditional Chinese, Bold White' && !s.series.find((x) => x.id === 'travel-food').items.some((i) => i.id === 'captions'));
await page.goto(BASE + '#/memory?tab=suggestions', { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const card = [...document.querySelectorAll('.suggest')].find((c) => c.innerText.includes('Soft Cream'));
  [...card.querySelectorAll('button')].find((b) => b.innerText.includes('Accept')).click();
});
await wait(250);
s = await state();
check('Accept saves to the series only', s.series.find((x) => x.id === 'travel-food').items.find((i) => i.id === 'captions')?.value === 'Traditional Chinese, Soft Cream' && s.memory.find((m) => m.id === 'captions').value === 'Traditional Chinese, Bold White');
const memJson = JSON.stringify({ memory: s.memory, series: s.series, signals: s.signals.map((x) => x.value) });
check('restaurant names never enter Memory or signals', names.every((n) => !memJson.includes(n)));

// guardrail: campaign / claims text refused
await page.goto(BASE + '#/memory?tab=identity', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.querySelector('button[aria-label="Add to Exclusions / Things to Avoid"]').click());
await wait(150);
await setValue('.addform input', 'Always mention promo code GLOW20');
await click('Add to Memory');
const err = await page.$eval('.formerr', (e) => e.innerText).catch(() => '');
check('campaign/promo text is refused from Memory', err.includes('Not saved') && !(await state()).memory.some((m) => m.value.includes('GLOW20')), err);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? `${failed} FAIL of ${results.length}` : `ALL ${results.length} PASS`);
process.exit(failed ? 1 : 0);
