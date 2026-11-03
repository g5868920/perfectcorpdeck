// Creator Memory fidelity regression: for EVERY supported preference key, the Agent Plan must show the
// correct value AND source under each precedence case, and must update live when Memory changes.
// Precedence: This Reel only → Series → Creator Identity → App default. Requires `npm run dev`.
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const KEY = 'reel-agent-demo.v1';

// key → [identity value, override value, app default, category, shown in idea plan?]
const KEYS = {
  visual: ['Cool Night Look', 'Soft Pastel', 'Natural color', 'visual', true],
  tone: ['Upbeat & playful', 'Informative & clear', 'Neutral', 'tone', 'nondefault'],
  hook: ['Countdown Teaser', 'Bold Statement', 'Statement opener', 'hook', true],
  'hook-length': ['Short, under 3s', 'Standard, about 4s', 'Standard, about 4s', 'hook', true],
  pacing: ['Minimal transitions', 'Fast, dynamic cuts', 'Standard cuts', 'pacing', true],
  voice: ['Mandarin, Warm', 'No voiceover', 'Mandarin, Neutral', 'voice', true],
  captions: ['Traditional Chinese, Clean Minimal', 'Traditional Chinese, Soft Cream', 'Traditional Chinese, Bold White', 'captions', true],
  overlay: ['Name only', 'Off', 'Off', 'captions', 'media'],
  music: ['Bright Acoustic', 'No music', 'Mellow Lo-fi', 'music', true],
  format: ['4:5', '1:1', '9:16', 'format', true],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, isMobile: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  — ' + detail : ''}`);
};

async function seedFrom(scenario) {
  await page.goto(`${BASE}?scenario=${scenario}#/explore`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 150));
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
}
async function load(state, route = 'plan') {
  await page.goto(`${BASE}#/explore`, { waitUntil: 'networkidle0' });
  await page.evaluate((k, s) => localStorage.setItem(k, JSON.stringify(s)), KEY, state);
  await page.goto(`${BASE}#/${route}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
}
async function row(key) {
  return page.evaluate((k) => {
    const li = document.querySelector(`.influence__list li[data-key="${k}"]`);
    if (!li) return null;
    return { value: li.querySelector('b').getAttribute('data-value'), source: li.querySelector('em.chip').innerText.trim() };
  }, key);
}
const setIdentity = (st, key, value, enabled = true) => {
  const [, , , category] = KEYS[key];
  const m = st.memory.filter((x) => x.id !== key);
  m.push({ id: key, category, label: key, value, enabled, source: 'creator' });
  return { ...st, memory: m };
};

// ---------------- idea mode (coffee) — identity / disabled→default / override
const coffee = await seedFrom('s3');
for (const [key, [idv, ov, def, , shown]] of Object.entries(KEYS)) {
  if (shown === 'media') continue;
  let st = setIdentity(structuredClone(coffee), key, idv);
  await load(st);
  let r = await row(key);
  check(`idea · ${key} · Creator Identity`, r && r.value === idv && r.source === 'Creator Identity', JSON.stringify(r));
  st = setIdentity(structuredClone(coffee), key, idv, false);
  await load(st);
  r = await row(key);
  if (shown === 'nondefault') check(`idea · ${key} · disabled → hidden app default`, r === null, JSON.stringify(r));
  else check(`idea · ${key} · disabled → App default`, r && r.value === def && r.source === 'App default', JSON.stringify(r));
  st = setIdentity(structuredClone(coffee), key, idv);
  st.projects[0].overrides = { [key]: ov };
  await load(st);
  r = await row(key);
  check(`idea · ${key} · This Reel only wins`, r && r.value === ov && r.source === 'This Reel only', JSON.stringify(r));
}

// ---------------- media mode (yakiniku, Travel & Food series) — series beats identity, override beats series
const media = await seedFrom('media-plan');
for (const [key, [idv, ov]] of Object.entries(KEYS)) {
  let st = setIdentity(structuredClone(media), key, idv);
  st.series = st.series.map((sr) => (sr.id === 'travel-food' ? { ...sr, items: sr.items.filter((i) => i.id !== key) } : sr));
  await load(st);
  let r = await row(key);
  const visible = !(key === 'tone' && false);
  if (visible) check(`media · ${key} · Creator Identity (no series value)`, r && r.value === idv && r.source === 'Creator Identity', JSON.stringify(r));
  // series value set for this key
  st = setIdentity(structuredClone(media), key, idv);
  st.series = st.series.map((sr) => (sr.id === 'travel-food' ? { ...sr, items: [...sr.items.filter((i) => i.id !== key), { id: key, category: KEYS[key][3], label: key, value: ov, enabled: true, source: 'creator' }] } : sr));
  await load(st);
  r = await row(key);
  check(`media · ${key} · Series beats Identity`, r && r.value === ov && r.source === 'Series: Travel & Food', JSON.stringify(r));
  // override beats series
  st.projects[0].overrides = { [key]: idv };
  await load(st);
  r = await row(key);
  check(`media · ${key} · This Reel only beats Series`, r && r.value === idv && r.source === 'This Reel only', JSON.stringify(r));
}

// ---------------- the reported bug: Memory edited AFTER the plan exists must show up immediately
{
  const st = await seedFrom('plan-mem'); // Memory says Warm / Clean Minimal / Minimal / Short
  await load(st);
  const before = { voice: await row('voice'), captions: await row('captions'), pacing: await row('pacing'), hl: await row('hook-length') };
  check('reported: plan shows Mandarin, Warm', before.voice?.value === 'Mandarin, Warm');
  check('reported: plan shows Clean Minimal captions', before.captions?.value === 'Traditional Chinese, Clean Minimal');
  check('reported: plan shows Minimal transitions', before.pacing?.value === 'Minimal transitions');
  check('reported: plan shows Short, under 3s hook', before.hl?.value === 'Short, under 3s');
  const hookHeading = await page.$$eval('.sectiontitle h2', (h) => h.map((x) => x.innerText).find((t) => t.startsWith('Hook')));
  check('reported: hook heading says 0–3s', hookHeading?.includes('0–3s'), hookHeading);
  // edit Memory in the Hub, then return to the plan without re-planning
  await page.goto(`${BASE}#/memory?tab=identity`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('button[aria-label="Edit Narration"]').click());
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate(() => {
    const sel = document.querySelector('.sigrow__edit select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'Mandarin, Neutral');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 100));
  await page.evaluate(() => [...document.querySelectorAll('.sigrow__edit button')].find((b) => b.innerText === 'Save').click());
  await new Promise((r) => setTimeout(r, 150));
  await page.goto(`${BASE}#/plan`, { waitUntil: 'networkidle0' });
  const after = await row('voice');
  check('live: Hub edit reflected in existing plan (no stale snapshot)', after?.value === 'Mandarin, Neutral' && after.source === 'Creator Identity', JSON.stringify(after));
}

await browser.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? `${failed} FAIL of ${results.length}` : `ALL ${results.length} PASS`);
process.exit(failed ? 1 : 0);
