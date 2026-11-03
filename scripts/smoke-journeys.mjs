// End-to-end acceptance journeys A, B, C plus the exception, driven through the real UI from a fresh demo state.
import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:5173/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text, sel = 'button') =>
  page.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((b) => b.innerText.trim().includes(t) && !b.disabled);
      if (!el) throw new Error(`No enabled ${s} with text: ${t}`);
      el.click();
    },
    text,
    sel,
  );
const setInput = (sel, value, ev = 'input') =>
  page.evaluate(
    (s, v, e) => {
      const el = document.querySelector(s);
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event(e, { bubbles: true }));
    },
    sel,
    value,
    ev,
  );
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('reel-agent-demo.v1')));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// fresh seed
await page.goto(BASE + '#/signature', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '?scenario=s1#/signature', { waitUntil: 'networkidle0' });
await page.goto(BASE + '#/signature', { waitUntil: 'networkidle0' });

// S1: suggestion requires approval
let s = await state();
check('S1 suggestion not saved before approval', !s.signature.some((x) => x.id === 'hook-length'));
await click('Save to Signature');
await wait(200);
s = await state();
check('S1 Save to Signature adds memory', s.signature.some((x) => x.id === 'hook-length'));

// First Reel
await click('Create', '.bottomnav button');
await wait(300);
check('S2 brief seeded', (await page.$eval('.promptbox textarea', (t) => t.value)) === 'A cozy weekend coffee ritual.');
await click('Plan My Reel');
await wait(300);
check('S3 plan shows 4 scenes', (await page.$$eval('.scene', (e) => e.length)) === 4);
await click('Approve & Generate Reel');
await wait(300);
await click('Confirm ·');
await wait(6000);
check('S4 reaches preview after stages', (await page.evaluate(() => location.hash)) === '#/preview');

// Journey C
await click('Refine');
await wait(400);
await setInput('input[aria-label="Caption 2"]', '讓咖啡香提醒你慢下來');
await wait(200);
await page.evaluate(() => (document.querySelector('.player video').currentTime = 5));
await wait(300);
const cap = await page.$eval('.player__caption', (e) => e.innerText).catch(() => '');
check('C caption edit visible on preview', cap === '讓咖啡香提醒你慢下來', cap);
await click('Change Music');
await wait(150);
await click('Bright Acoustic');
await wait(300);
check('C music source switched', (await page.$eval('.player audio:nth-of-type(2)', (a) => a.src)).endsWith('music-acoustic.m4a'));
await click('Replace Scene');
await wait(150);
await click('Replace Scene 02');
await wait(300);
await click('Confirm ·');
await wait(500);
check('C Scene 02 uses prepared alternate', (await page.$eval('.player video', (v) => v.src)).endsWith('preview-alt.mp4'));
await click('Original');
await wait(400);
const origOk = await page.evaluate(() => document.querySelector('.player video').src.endsWith('preview-original.mp4') && document.querySelectorAll('.player audio')[1].src.endsWith('music-lofi.m4a'));
check('C compare shows untouched original', origOk);
await click('Revised');
await wait(200);
await click('Use Revision');
await wait(400);
await click('Mark as Ready to Use');
await wait(150);
await click('Save Finished Reel');
await wait(200);
s = await state();
const coffee = s.projects.find((p) => p.original);
check('C saved finished revision; original preserved', coffee.readyToUse && coffee.saved && coffee.chosen === 'revision' && coffee.original.scene2 === 'original' && coffee.original.music === 'lofi');
const href = await page.$eval('a.btn[download]', (a) => a.href);
const head = await page.evaluate(async (h) => (await fetch(h, { method: 'HEAD' })).headers.get('content-type'), href);
check('S6 export file exists', head === 'video/mp4', href.split('/').pop());

// Journey A + B
await click('Start Another Reel');
await wait(300);
await click('An evening bookstore visit');
await wait(150);
await click('Customize for This Reel');
await wait(150);
await setInput('.override select', 'Cool Night Look', 'change');
await wait(150);
await click('Plan My Reel');
await wait(300);
const chips = await page.$$eval('.planhead .chip', (c) => c.map((x) => x.innerText.trim()));
check('A second brief reuses hook/voice/captions/music without retyping', ['Conversational, Question-first', 'Mandarin, Neutral', 'Traditional Chinese, Bold White', 'Mellow Lo-fi'].every((v) => chips.includes(v)), chips.join(' | '));
check('B Cool Night Look applied to this plan', chips.includes('Cool Night Look') && (await page.$eval('.scene__thumb img', (i) => i.src)).includes('cool'));
await click('Approve & Generate Reel');
await wait(250);
await click('Save Plan as Draft');
await wait(300);
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => (location.hash = '#/signature'));
await wait(300);
s = await state();
check('B global Signature still Warm Cinematic after refresh', s.signature.find((x) => x.id === 'visual').value === 'Warm Cinematic');
check('B override kept only on second Reel', s.projects.find((p) => p.brief.includes('bookstore')).overrides.visual === 'Cool Night Look');

// Exception
await page.evaluate(() => (location.hash = '#/library'));
await wait(300);
await page.evaluate(() => [...document.querySelectorAll('.historyrow')].find((r) => r.innerText.includes('coffee')).click());
await wait(300);
await page.evaluate(() => (location.hash = '#/refine'));
await wait(400);
await click('Replace Scene');
await wait(150);
await click('Use original Scene 02 again');
await wait(150);
await click('Set low (5)');
await wait(150);
await click('Replace Scene 02');
await wait(250);
await click('Confirm ·');
await wait(400);
const errText = await page.$eval('.errorcard h2', (e) => e.innerText).catch(() => '');
check('E exception shown, nothing charged', errText.includes("Your previous Reel is safe") && (await state()).credits === 5);
await click('Try Again (review credits)');
await wait(200);
await click('Restore demo balance');
await wait(150);
await click('Try Again ·');
await wait(400);
check('E recovery via Try Again works', (await page.evaluate(() => location.hash)) === '#/refine' && (await page.$eval('.player video', (v) => v.src)).endsWith('preview-alt.mp4'));

// Reset
await page.evaluate(() => (location.hash = '#/library'));
await wait(300);
await click('Reset Demo', '.screen button');
await wait(200);
await click('Reset Demo', '.sheet button');
await wait(300);
s = await state();
check('Reset Demo restores seed', s.projects.length === 0 && s.credits === 120 && s.signature.length === 6 && s.suggestion.status === 'pending');

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} FAIL` : `ALL ${results.length} PASS`);
process.exit(failed ? 1 : 0);
