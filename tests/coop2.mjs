// Online edge cases: nobody home (20 s), KakaoTalk browser, different versions, a full room, a late arrival, no debug online.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [base = 'http://localhost:5260/', out = 'coop2shots'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`, ...a);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; log((c ? 'PASS ' : 'FAIL ') + m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const mk = async (opts = {}) => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts })).newPage(); return p; };
const phone = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const waitFor = async (p, f, ms, arg) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* navigating */ } await new Promise(r => setTimeout(r, 250)); } return false; };

// 1. a room nobody is in: after 20 s the guest is told what to try, and can still go solo
{
  const p = await mk(phone);
  await p.goto(base + '?room=ZZZZ22'); await p.waitForTimeout(1500);
  await p.click('[data-act=join-invite]');
  await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/connecting-phone.png` });
  ok(await waitFor(p, () => Lobby.view === 'connecting' && document.querySelector('.lb-warn ul'), 24000), 'after 20 s with no host the help appears');
  const txt = await p.evaluate(() => document.querySelector('.lb-card').innerText);
  log(txt.replace(/\n+/g, ' | ').slice(0, 400));
  await p.screenshot({ path: `${out}/timeout-phone.png` });
  await p.click('[data-act=solo]');
  ok(await p.evaluate(() => G.state === 'title' && Net.mode === 'solo' && !Lobby.open), 'one tap from there to solo');
  await p.context().close();
}
// 2. KakaoTalk's in-app browser: the join screen offers the phone's normal browser
{
  const p = await mk({ ...phone, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KAKAOTALK 10.8.5' });
  await p.goto(base + '?room=ABCDEF'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => InApp.kakao && !!document.querySelector('[data-act=external]')), 'KakaoTalk: an "open in my browser" button on the invite');
  await p.screenshot({ path: `${out}/kakao-invite-phone.png` });
  let nav = '';
  p.on('request', r => { if (!nav && r.url().startsWith('kakaotalk:')) nav = r.url(); });
  await p.evaluate(() => { window.__go = []; const d = Object.getOwnPropertyDescriptor(Location.prototype, 'href'); }); // can't follow the scheme headless; check the address it builds
  const target = await p.evaluate(() => 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href));
  ok(/^kakaotalk:\/\/web\/openExternal\?url=http/.test(target), 'it opens ' + target.slice(0, 70) + '…');
  await p.context().close();
}
// 3. host + full room + late arrival + version mismatch
{
  const H = await mk();
  await H.goto(base + '#debug'); await H.waitForTimeout(2000);
  ok(await H.evaluate(() => G.debug), 'the #debug page has debug on (solo)');
  await H.evaluate(() => Net.host());
  await waitFor(H, () => Net.relayCount() > 0, 15000);
  const code = await H.evaluate(() => Net.code);
  const guests = [];
  for (let i = 0; i < 3; i++) { const g = await mk(); await g.goto(base + '?room=' + code); await g.waitForTimeout(800); await g.click('[data-act=join-invite]'); guests.push(g); }
  ok((await Promise.all(guests.map(g => waitFor(g, () => Lobby.view === 'lobby' && Net.hostPeer, 30000)))).every(Boolean), 'three guests in the room (4 players)');
  const fifth = await mk(phone);
  await fifth.goto(base + '?room=' + code); await fifth.waitForTimeout(800); await fifth.click('[data-act=join-invite]');
  ok(await waitFor(fifth, () => Lobby.view === 'full', 30000), 'a fifth player is told the room is full');
  await fifth.screenshot({ path: `${out}/full-phone.png` });
  await fifth.context().close();
  // a different version
  const old = await mk();
  await old.goto(base + '?room=' + code); await old.waitForTimeout(800);
  await old.evaluate(() => { const pj = Net.peerJoin.bind(Net); Net.peerJoin = (id, r) => { const p = Net.peers.get(id); pj(id, r); if (!p) Net.send('c', ['hello', Me.pid, 'old', 'v1.9', 700], id); }; });
  await old.evaluate(c => Net.join(c), code);
  ok(await waitFor(old, () => Lobby.view === 'version', 30000), 'an older version is told to refresh');
  await old.screenshot({ path: `${out}/version-desk.png` });
  await old.context().close();
  // start, then a late arrival waits for the next run
  await guests[2].context().close(); // free a seat (the third guest leaves the lobby)
  await H.waitForTimeout(1500);
  await H.evaluate(() => Net.startRun());
  ok(await H.evaluate(() => G.online && !G.debug && G.state === 'play'), 'debug is off in the online run even with #debug');
  await H.keyboard.press('BracketLeft'); await H.keyboard.press('BracketRight');
  ok(await H.evaluate(() => !G.god && G.t < 30), 'debug keys (god mode, time skip) do nothing online');
  const late = await mk(phone);
  await late.goto(base + '?room=' + code); await late.waitForTimeout(800); await late.click('[data-act=join-invite]');
  ok(await waitFor(late, () => Lobby.view === 'wait', 30000), 'a late arrival waits for the next run');
  await late.screenshot({ path: `${out}/wait-phone.png` });
  await H.evaluate(() => { for (const Q of G.players) { Q.iframes = 0; Q.dmgBucket = 999; } const t = setInterval(() => { for (const Q of G.players) if (isActive(Q)) { Q.dmgBucket = 999; Q.iframes = 0; damagePlayer(Q, 999, 'Rammer', Q.x + 3, Q.y); } if (G.state !== 'play') clearInterval(t); }, 200); });
  await waitFor(H, () => G.state === 'dead', 15000);
  await H.waitForTimeout(2500);
  await H.evaluate(() => Net.backToLobby());
  const lv = await waitFor(late, () => Lobby.view === 'lobby', 8000); log('late view', await late.evaluate(() => [Lobby.view, Net.hostPeer, G.state])); log('host seats', JSON.stringify(await H.evaluate(() => [Net.seats.map(s => [s.slot, s.nick, s.connected]), [...Net.waiting.values()].map(w => w.nick), G.state, Net.inRun])));
  ok(lv && await H.evaluate(() => Net.seats.length === 4), 'when the run ends the late arrival takes a seat for the next one');
  await late.screenshot({ path: `${out}/late-lobby-phone.png` });
  for (const g of [H, late, guests[0], guests[1]]) await g.context().close();
}
log(`done: ${pass} passed, ${fail} failed`);
await browser.close();
