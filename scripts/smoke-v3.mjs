// v3 UX tests T1–T7 (YouCam entry points + Creator Memory), driven through the real UI from a fresh demo.
// Requires `npm run dev`. T8 (regression) is scripts/smoke-journeys.mjs.
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = () => page.evaluate(() => location.hash);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('reel-agent-demo.v1')));
const mem = async (id) => (await state()).memory.find((m) => m.id === id);
const click = async (text, scope = 'button') => {
  await page.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((b) => b.offsetParent !== null && !b.closest(".presenter") && b.innerText.trim().includes(t) && !b.disabled);
      if (!el) throw new Error(`No enabled ${s} containing "${t}" on ${location.hash}`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    },
    text,
    scope,
  );
  await wait(220);
};
const clickSel = async (sel) => {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) throw new Error(`No element ${s} on ${location.hash}`);
    el.click();
  }, sel);
  await wait(220);
};
const setValue = async (sel, value, ev = 'change') => {
  await page.evaluate(
    (s, v, e) => {
      const el = document.querySelector(s);
      if (!el) throw new Error(`No element ${s}`);
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event(e, { bubbles: true }));
    },
    sel,
    value,
    ev,
  );
  await wait(150);
};
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const fresh = async () => {
  await page.goto(BASE + '#/explore', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '?scenario=fresh#/explore', { waitUntil: 'networkidle0' });
  await page.goto(BASE + '#/explore', { waitUntil: 'networkidle0' });
};
const planFromBrief = async (brief) => {
  await setValue('.promptbox textarea', brief, 'input');
  await click('Plan My Reel');
};

/* T1 — Task-first entry: Explore → Video Generator → Create Reel → Reel Agent → New Reel */
await fresh();
check('T1 four existing tabs present', (await page.$$eval('.bottomnav button', (b) => b.map((x) => x.innerText.trim()).join('|'))) === 'Explore|AI Agent|All Tools|History');
await click('Video Generator', '.feature');
check('T1 Explore → AI Video', (await hash()) === '#/video');
await click('Create Reel');
check('T1 AI Video "Create Reel" → Reel Agent', (await hash()) === '#/reel-agent');
check('T1 first-use offer shown', !!(await page.$('.personalize')));
await click('Skip for Now');
check('T1 Skip for Now → New Reel immediately', (await hash()) === '#/new' && (await page.$eval('.promptbox textarea', (t) => t.value)) === 'A cozy weekend coffee ritual.');
check('T1 skip saved nothing', (await state()).memorySetup === 'skipped' && (await state()).memory.length === 6);

/* T2 — Conversation entry: AI Agent → Reel suggestion → same flow and same Memory */
await fresh();
await click('AI Agent', '.bottomnav button');
check('T2 AI Agent tab opens chat', (await hash()) === '#/agent' && !!(await page.$('.chatbar input')));
await click('Create a complete Reel from an idea');
await click('Start Reel Agent');
check('T2 suggestion → Reel Agent', (await hash()) === '#/reel-agent');
await page.goto(BASE + '#/agent', { waitUntil: 'networkidle0' });
await setValue('.chatbar input', 'Can you make a short reel about my weekend?', 'input');
await page.evaluate(() => document.querySelector('.chatbar').requestSubmit());
await wait(250);
check('T2 typed request is understood', (await page.$$eval('.bubble--agent button', (b) => b.length)) > 0);
await click('Start Reel Agent');
await click('Start a New Reel');
const t2count = await page.$eval('.applied__head strong', (e) => e.innerText);
check('T2 lands in same New Reel with same Memory', (await hash()) === '#/new' && t2count.includes('6 defaults'), t2count);

/* T3 — Optional setup: describe → review/edit → explicit save */
await fresh();
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
await click('Set Up Creator Memory');
check('T3 setup screen opens', (await hash()) === '#/setup');
await click('Use example description');
await click('Suggest preferences');
const found = await page.$$eval('.reviewlist li', (l) => l.length);
check('T3 description → structured suggestions', found >= 5, `${found} suggested`);
check('T3 nothing saved before review', (await mem('pacing')) === undefined && (await mem('voice')).value === 'Mandarin, Neutral');
// edit one, exclude one
await page.evaluate(() => {
  const li = [...document.querySelectorAll('.reviewlist li')].find((x) => x.innerText.toUpperCase().includes('NARRATION'));
  li.querySelector('input[type=checkbox]').click();
});
await wait(150);
await page.evaluate(() => {
  const li = [...document.querySelectorAll('.reviewlist li')].find((x) => x.innerText.toUpperCase().includes('CAPTIONS'));
  const sel = li.querySelector('select');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'Traditional Chinese, Soft Cream');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(150);
await click('Save ');
let s = await state();
check(
  'T3 explicit save applies reviewed edits only',
  s.memorySetup === 'done' && (await mem('pacing'))?.value === 'Minimal transitions' && (await mem('captions'))?.value === 'Traditional Chinese, Soft Cream' && (await mem('voice'))?.value === 'Mandarin, Neutral',
);
check('T3 continues to New Reel', (await hash()) === '#/new');

/* T4 — Persistence to a second Reel, including after refresh */
await planFromBrief('A cozy weekend coffee ritual.');
const plan1 = await page.$$eval('.influence__body b', (b) => b.map((x) => x.innerText));
check('T4 first plan uses saved Memory', plan1.includes('Minimal transitions') && plan1.includes('Traditional Chinese, Soft Cream'), plan1.join(' | '));
await page.reload({ waitUntil: 'networkidle0' });
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
await click('Start a New Reel');
await planFromBrief('An evening bookstore visit');
const plan2 = await page.$$eval('.influence__body b', (b) => b.map((x) => x.innerText));
check('T4 second Reel reuses Memory after refresh, no retyping', plan2.includes('Minimal transitions') && plan2.includes('Warm Cinematic') && plan2.some((v) => v.includes('Short, under 3s')), plan2.join(' | '));

/* T5 — One-off override doesn't change saved Memory */
await click('Edit Plan');
await click('Customize for This Reel');
await setValue('.override select[aria-label="Visual style for this Reel"]', 'Cool Night Look');
await click('Plan My Reel');
const cool = await page.$eval('.scene__thumb img', (i) => i.getAttribute('src'));
check('T5 Cool Night Look applies to this Reel', cool.includes('cool'), cool);
await page.reload({ waitUntil: 'networkidle0' });
check('T5 saved Visual Style still Warm Cinematic after refresh', (await mem('visual')).value === 'Warm Cinematic');
check('T5 one-off did not create a suggestion', !(await state()).suggestions.some((x) => x.value === 'Cool Night Look'));

/* T6 — Continuous learning: repeated choice → pending suggestion; Accept / Not Now / Dismiss */
const pendingFor = async (v) => (await state()).suggestions.find((x) => x.value === v);
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
await click('Start a New Reel');
await click('Customize for This Reel');
await setValue('.override select[aria-label="Music mood for this Reel"]', 'Bright Acoustic');
await planFromBrief('A cozy weekend coffee ritual.');
check('T6 one choice in one Reel → no suggestion', !(await pendingFor('Bright Acoustic')));
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
await click('Start a New Reel');
await click('Customize for This Reel');
await setValue('.override select[aria-label="Music mood for this Reel"]', 'Bright Acoustic');
await planFromBrief('An evening bookstore visit');
let sg = await pendingFor('Bright Acoustic');
check('T6 same choice in 2 Reels → pending suggestion with reason', sg?.status === 'pending' && /2 different Reels/.test(sg.reason), sg?.reason);
check('T6 pending suggestion did not change Memory', (await mem('music')).value === 'Mellow Lo-fi');
await page.goto(BASE + '#/memory', { waitUntil: 'networkidle0' });
await click('Suggestions');
await click('Not Now', '.suggest button');
sg = await pendingFor('Bright Acoustic');
check('T6 Not Now → snoozed, Memory unchanged', sg.status === 'snoozed' && (await mem('music')).value === 'Mellow Lo-fi');
await click('Review now');
await click('Dismiss', '.suggest button');
sg = await pendingFor('Bright Acoustic');
check('T6 Dismiss → rejected, Memory unchanged', sg.status === 'rejected' && (await mem('music')).value === 'Mellow Lo-fi');
await click('Manage');
await click('Reconsider');
await click('Suggestions');
await click('Save to Creator Memory');
check('T6 Accept → Memory updated', (await mem('music')).value === 'Bright Acoustic' && (await pendingFor('Bright Acoustic')).status === 'saved');

/* T7 — Settings, Hub and creation flow stay in sync */
await page.goto(BASE + '#/settings', { waitUntil: 'networkidle0' });
await click('Creator Memory');
check('T7 Settings → Preferences → Creator Memory opens the Hub', (await hash()) === '#/memory');
await clickSel('button[aria-label="Edit Captions"]');
await setValue('.sigrow__edit select', 'Traditional Chinese, Clean Minimal');
await click('Save', '.sigrow__edit button');
await page.goto(BASE + '#/reel-agent', { waitUntil: 'networkidle0' });
await click('Start a New Reel');
await click('View Memory');
const cardHas = await page.$$eval('.applied__list b', (b) => b.map((x) => x.innerText));
check('T7 Hub edit (via Settings) shows in New Reel', cardHas.includes('Traditional Chinese, Clean Minimal'));
await click('Customize for This Reel');
await setValue('.override select[aria-label="Output format for this Reel"]', '4:5');
await click('Make default');
check('T7 "Make default" in creation flow updates Memory', (await mem('format')).value === '4:5');
await click('Manage Memory');
const hubFormat = await page.$$eval('.memcat', (c) => c.find((x) => x.innerText.includes('Output Format'))?.innerText ?? '');
check('T7 change visible in Hub', hubFormat.includes('4:5'));
await page.goto(BASE + '#/settings', { waitUntil: 'networkidle0' });
const settingsRow = await page.$eval('.setrow--proposed', (e) => e.innerText);
const n = (await state()).memory.filter((m) => m.enabled).length;
check('T7 Settings row reflects the same store', settingsRow.includes(`${n} saved`), settingsRow.replace(/\n/g, ' '));

check('No page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} FAIL of ${results.length}` : `ALL ${results.length} PASS`);
process.exit(failed ? 1 : 0);
