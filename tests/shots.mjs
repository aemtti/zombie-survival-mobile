// Screenshot every screen of Harrow Creek in a few viewports.
// usage: node shots.mjs <baseUrl> <outDir> <lang:ko|en> [deviceFilter] [sceneFilter]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://localhost:5260/', out = 'shots', lang = 'ko', devF = '', sceneF = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const DEVICES = {
  desk: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  deskL: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phoneS: { viewport: { width: 740, height: 360 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// each scene: a function run in the page; returns after setting up the state
const SCENES = {
  title: `(() => { HC.toTitle(); return 'ok'; })()`,
  play: `(() => { HC.startGame(); return 'ok'; })()`,
  bannerLong: `(() => { HC.startGame(); G.banners = [{ title: 'RADIO: LZ MARKED', sub: 'Follow the blue arrow. Be in the ring for the last 20 seconds.', col: '#7fe8ff', t: 1, dur: 99 }]; return 'ok'; })()`,
  bannerHorde: `(() => { HC.startGame(); G.t = 330; G.banners = [{ title: 'THEY HEARD THE CHOPPER', sub: 'Stay in the ring!', col: '#ff4a3a', t: 1, dur: 99 }]; G.P.weapons.shotgun.owned = true; switchWeapon(G.P, 'shotgun', true); G.edgeWarn.push({ a: 0.3, t: 99, col: '255,40,30', horde: true }); dropCrate(1); G.crates[0].drop = 0; return 'ok'; })()`,
  hudLate: `(() => { HC.startGame(); G.t = 585; revealLZ(); startHeli(); G.lz.holdOpen = true; G.lz.hold = 4; spawnBoss('giant'); G.streak = 24; G.lastKillT = G.t; G.score = 48210; G.kills = 812; G.P.st.frenzy = true; G.frenzyStacks = 5; G.P.st.regen = 0.5; G.banners = []; return 'ok'; })()`,
  overtime: `(() => { HC.startGame(); G.t = 615; revealLZ(); startHeli(); G.lz.holdOpen = true; G.lz.hold = 12; G.banners = []; G.P.x = G.lz.x; G.P.y = G.lz.y; return 'ok'; })()`,
  reload: `(() => { HC.startGame(); G.banners = []; const P = G.P; P.weapons.sidearm.mag = 2; startReload(P); P.reloadT = P.reloadTotal * 0.6; G.reloadHints = 0; floater(P.x + 40, P.y - 30, 'PERFECT', '#ffd24a', 13, 99); floater(P.x - 60, P.y + 30, 'Surrounded? Tap DASH to go through them!', '#4fc3ff', 14, 99); return 'ok'; })()`,
  cards: `(() => { HC.startGame(); G.banners = []; G.level = 6; HC.openCards('level'); G.modal.options = [{ card: CARD_BY_ID.frenzy }, { card: CARD_BY_ID.medic }, { card: CARD_BY_ID.slugs }]; G.modal.t = 2; G.modal.lock = 0; return 'ok'; })()`,
  cards2: `(() => { HC.startGame(); G.banners = []; G.level = 6; G.P.weapons.smg.owned = true; HC.openCards('level'); G.modal.options = [{ card: CARD_BY_ID.spinup }, { card: CARD_BY_ID.incendiary }, { card: CARD_BY_ID.grenadier }]; G.modal.t = 2; G.modal.lock = 0; return 'ok'; })()`,
  legendary: `(() => { HC.startGame(); G.banners = []; G.level = 9; HC.openCards('legendary'); G.modal.options = [{ card: CARD_BY_ID.ricochet }, { card: CARD_BY_ID.cornered }, { card: CARD_BY_ID.chain }]; G.modal.t = 2; G.modal.lock = 0; return 'ok'; })()`,
  crate: `(() => { HC.startGame(); G.banners = []; G.P.weapons.shotgun.owned = true; openCrateChoice({ n: 3, armory: false }); G.modal.options = [{ weapon: 'rifle' }, { mastery: 'shotgun' }, { resupply: true }]; G.modal.t = 2; G.modal.lock = 0; return 'ok'; })()`,
  armory: `(() => { HC.startGame(); G.banners = []; openCrateChoice({ n: 4, armory: true }); G.modal.options = [{ weapon: 'flamer' }, { weapon: 'smg' }, { resupply: true }]; G.modal.t = 2; G.modal.lock = 0; return 'ok'; })()`,
  pause: `(() => { HC.startGame(); G.banners = []; HC.pauseGame(); return 'ok'; })()`,
  dead: `(() => { HC.startGame(); G.banners = []; G.t = 377; G.score = 23456; G.kills = 410; G.level = 11; G.killsByType = { shambler: 300, sprinter: 60, gasbag: 20, hurler: 15, rammer: 3, wailer: 6, knot: 1 }; G.stats.dmg = { sidearm: 5000, shotgun: 12000, grenade: 3000, barrel: 2000 }; G.stats.taken = { Rammer: 120, Shambler: 300, 'Barrel blast': 40 }; G.stats.shots = 900; G.stats.hits = 610; G.stats.crates = 3; G.stats.clean = 2; G.bestStreak = 37; G.timeline = [{ id: 'hollow', icon: 'hollow', t: 30, kind: 'common' }, { weapon: 'shotgun', t: 80, kind: 'crate' }, { id: 'chain', icon: 'chain', t: 320, kind: 'legendary' }, { skip: true, t: 200, kind: 'skip' }, { resupply: true, t: 260, kind: 'crate' }]; G.deathCause = 'Rammer'; HC.finishRun(false); G.endT = 4; return 'ok'; })()`,
  deadBarrel: `(() => { HC.startGame(); G.banners = []; G.t = 140; G.deathCause = 'Barrel blast'; HC.finishRun(false); G.endT = 4; return 'ok'; })()`,
  win: `(() => { HC.startGame(); G.banners = []; G.t = 604; G.score = 81234; G.kills = 1650; G.level = 19; G.killsByType = { shambler: 1200, sprinter: 300, gasbag: 60, hurler: 40, rammer: 8, wailer: 30, knot: 1, giant: 1 }; G.stats.dmg = { sidearm: 5000, shotgun: 32000, smg: 41000, rifle: 22000, flamer: 9000, grenade: 6000, gunner: 3000 }; G.stats.giant = true; G.stats.shots = 4000; G.stats.hits = 2900; G.P.hp = 64; HC.finishRun(true); G.endT = 4; return 'ok'; })()`,
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--autoplay-policy=user-gesture-required'] });
const report = [];
for (const [dname, dopt] of Object.entries(DEVICES)) {
  if (devF && !devF.split(',').includes(dname)) continue;
  const ctx = await browser.newContext(dopt);
  await ctx.addInitScript(l => { try { localStorage.setItem('harrowcreek_lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  if (process.env.BLOCKFONTS) await page.route(/fonts.(googleapis|gstatic).com/, r => r.abort());
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  for (const [sname, code] of Object.entries(SCENES)) {
    if (sceneF && !sceneF.split(',').includes(sname)) continue;
    if (dname === 'portrait' && !['title', 'play', 'cards', 'pause', 'dead'].includes(sname)) continue;
    let r;
    try { r = await page.evaluate(code); } catch (e) { r = 'ERR ' + e.message; }
    await page.waitForTimeout(sname === 'title' ? 600 : 450);
    // keep the world frozen for the shot where it matters
    const file = path.join(out, `${lang}-${dname}-${sname}.png`);
    await page.screenshot({ path: file });
    const info = await page.evaluate(() => ({ errors: G.errors, missing: window.I18N ? [...I18N.missing] : [] }));
    report.push({ dev: dname, scene: sname, r, file, ...info });
  }
  if (errs.length) report.push({ dev: dname, pageErrors: errs.slice(0, 10) });
  await ctx.close();
}
await browser.close();
const miss = new Set(); for (const r of report) for (const m of r.missing || []) miss.add(m);
console.log(JSON.stringify(report.filter(r => r.r !== 'ok' || r.errors || r.pageErrors), null, 1));
console.log('scenes', report.length, 'missing translations:', miss.size ? [...miss].join(' | ') : 'none');
