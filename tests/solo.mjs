// Solo checks: language toggle (click + tap, remembered), then a whole run to the helicopter at high speed.
// usage: node solo.mjs <baseUrl> [outDir]
import { chromium } from 'playwright-core';
const [base = 'http://localhost:5260/', out = '.'] = process.argv.slice(2);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio'] });
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

// 1) desktop: click the language button, reload, still English; title did not start a run
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(base); await page.waitForTimeout(2800);
  ok(await page.evaluate(() => I18N.lang) === 'ko', 'Korean is the default on a fresh browser');
  const btn = await page.evaluate(() => { const u = UI, lw = 104 * u; return { x: W - lw - 14 * u + lw / 2, y: 12 * u + 17 * u }; });
  await page.mouse.move(btn.x, btn.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => I18N.lang) === 'en', 'clicking the button switches to English');
  ok(await page.evaluate(() => G.state) === 'title', 'the click did not start a run');
  await page.reload(); await page.waitForTimeout(2800);
  ok(await page.evaluate(() => I18N.lang) === 'en', 'English is remembered after a reload');
  await page.mouse.move(640, 500); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  ok(await page.evaluate(() => G.state) === 'play', 'clicking elsewhere on the title starts a run');
  await ctx.close();
}
// 2) phone: tap the button
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(base); await page.waitForTimeout(2800);
  const btn = await page.evaluate(() => { const u = Math.min(UI, H / 420), lw = 104 * u; return { x: W - lw - 14 * u + lw / 2, y: 12 * u + 17 * u, touch: Touch.on }; });
  await page.touchscreen.tap(btn.x, btn.y); await page.waitForTimeout(300);
  ok(btn.touch && await page.evaluate(() => I18N.lang) === 'en', 'tapping the button on a phone switches to English');
  ok(await page.evaluate(() => G.state) === 'title', 'the tap did not start a run');
  await page.touchscreen.tap(btn.x, btn.y); await page.waitForTimeout(300);
  ok(await page.evaluate(() => I18N.lang) === 'ko', 'tapping again switches back to Korean');
  await ctx.close();
}
// 3) a whole solo run, Korean, sped up: god mode, auto-picks cards and crates, walks into the LZ at the end
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(base); await page.waitForTimeout(2600);
  await page.evaluate(() => {
    HC.startGame(); G.god = true; G.debugSpeed = 12;
    window.__seen = { banners: new Set(), states: new Set(), cards: 0, crates: 0 };
    setInterval(() => {
      const S = window.__seen; S.states.add(G.state);
      for (const b of G.banners) S.banners.add(say(b.title));
      if (G.state === 'cards' && G.modal && G.modal.lock <= 0) { if (G.modal.type === 'crate') S.crates++; else S.cards++; HC.chooseOption(0); }
      const c = G.crates.find(c => c.drop <= 0); if (c && G.state === 'play') { G.P.x = c.x; G.P.y = c.y; }
      if (G.lz && G.lz.holdOpen && G.state === 'play') { G.P.x = G.lz.x; G.P.y = G.lz.y; }
    }, 100);
  });
  const t0 = Date.now();
  let st;
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(2000);
    st = await page.evaluate(() => ({ state: G.state, t: G.t.toFixed(0), z: G.zombies.length, err: G.errors }));
    if (st.state === 'win' || st.state === 'dead') break;
  }
  const seen = await page.evaluate(() => ({ banners: [...__seen.banners], cards: __seen.cards, crates: __seen.crates, level: G.level, score: G.finalScore, missing: [...I18N.missing] }));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: out + '/solo-end.png' });
  ok(st.state === 'win', `run ended in "${st.state}" at t=${st.t}s, ${(Date.now() - t0) / 1000 | 0}s real time`);
  ok(st.err === 0 && errs.length === 0, `no game errors (G.errors=${st.err}, page errors=${errs.length}${errs.length ? ': ' + errs[0] : ''})`);
  ok(seen.missing.length === 0, 'no untranslated strings met during the run' + (seen.missing.length ? ': ' + seen.missing.join(' | ') : ''));
  console.log('  level', seen.level, 'cards', seen.cards, 'crates', seen.crates, 'final score', seen.score);
  console.log('  banners seen:', seen.banners.join(' / '));
  await ctx.close();
}
await browser.close();
