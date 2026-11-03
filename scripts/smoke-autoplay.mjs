// Verifies the sound-blocked fallback. Browsers may reject audio.play() with NotAllowedError
// when there is no user gesture (e.g. Safari/iOS). We emulate exactly that rejection, then check:
// 1) the muted visual track still plays, 2) the player shows "tap to enable" instead of failing,
// 3) tapping it starts narration + music in sync.
import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  const real = HTMLMediaElement.prototype.play;
  window.__blockAudio = true;
  HTMLMediaElement.prototype.play = function () {
    if (this instanceof HTMLAudioElement && window.__blockAudio) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    return real.call(this);
  };
});
await page.setViewport({ width: 393, height: 852 });
await page.goto('http://127.0.0.1:5173/?capture&scenario=s4#/preview', { waitUntil: 'networkidle0' });
await page.click('.player__bigplay');
await new Promise((r) => setTimeout(r, 1200));
const blocked = await page.evaluate(() => ({
  videoPlaying: !document.querySelector('.player video').paused,
  banner: document.querySelector('.player__soundblocked')?.innerText ?? null,
}));
await page.evaluate(() => (window.__blockAudio = false));
await page.click('.player__soundblocked');
await new Promise((r) => setTimeout(r, 1200));
const after = await page.evaluate(() => {
  const v = document.querySelector('.player video');
  const [vo, mu] = [...document.querySelectorAll('.player audio')];
  return { v: +v.currentTime.toFixed(2), vo: +vo.currentTime.toFixed(2), mu: +mu.currentTime.toFixed(2), voPlaying: !vo.paused, muPlaying: !mu.paused, banner: !!document.querySelector('.player__soundblocked') };
});
console.log(JSON.stringify({ blocked, after }));
await browser.close();
const ok = blocked.videoPlaying && blocked.banner && after.voPlaying && after.muPlaying && !after.banner && Math.abs(after.v - after.vo) < 0.3;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
