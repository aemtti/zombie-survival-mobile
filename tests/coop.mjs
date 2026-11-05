// Online co-op test: three isolated browser profiles (host PC, guest PC, guest phone) through the public relays.
// usage: node coop.mjs <baseUrl> <shotDir> [phases]   phases: comma list (default all)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [base = 'http://localhost:5260/', out = 'coopshots', only = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const want = p => !only || only.split(',').includes(p);
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`, ...a);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; log((c ? 'PASS ' : 'FAIL ') + m); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const mk = async (name, opts) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 300)); });
  page.label = name;
  return page;
};
const A = await mk('host', { viewport: { width: 1280, height: 720 } });
const B = await mk('guestPC', { viewport: { width: 1280, height: 720 } });
const C = await mk('guestPhone', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const ev = (p, f, arg) => p.evaluate(f, arg);
const waitFor = async (p, f, ms, arg) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* navigating */ } await new Promise(r => setTimeout(r, 250)); } return false; };
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png` });
const BOT = () => { // a small helper bot: shoots the nearest zombie, keeps some distance, heads to the LZ at the end
  if (window.__bot) return; window.__bot = true;
  setInterval(() => {
    if (!G.online || G.state !== 'play' || !G.P) { G.botInput = null; return; }
    const P = G.P; let best = null, bd = 1e9;
    for (const z of G.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - P.x, z.y - P.y); if (d < bd) { bd = d; best = z; } }
    let mx = 0, my = 0, aim = P.angle, fire = false;
    if (best) { aim = Math.atan2(best.y - P.y, best.x - P.x); fire = bd < 520; if (bd < 110) { mx = -Math.cos(aim); my = -Math.sin(aim); } }
    if (G.lz && G.lz.holdOpen) { const d = Math.hypot(G.lz.x - P.x, G.lz.y - P.y); if (d > 60) { mx = (G.lz.x - P.x) / d; my = (G.lz.y - P.y) / d; } }
    G.botInput = { mx, my, aim, fire: fire && !G.modal };
    if (G.modal && G.modal.lock <= 0 && G.modal.t > 0.4) HC.chooseOption(0);
    else if (!G.modal && typeof coopPicks === 'function' && coopPicks(P) > 0 && Math.random() < 0.05) openCoopModal();
  }, 100);
};
const state = p => ev(p, () => ({ state: G.state, online: G.online, mode: Net.mode, t: +G.t.toFixed(1), players: G.players.map(Q => [Q.id, Q.name, Q.down ? 'down' : Q.dead ? 'out' : Q.away ? 'away' : Q.boarding > 0 ? 'board' : 'up', Math.round(Q.hp)]), me: G.P && G.P.id, z: G.zombies.length, err: G.errors, view: Lobby.view, lobbyOpen: Lobby.open }));

let code = '';
// ---- 1. room and lobby
{
  await A.goto(base); await B.goto(base); await C.goto(base);
  await A.waitForTimeout(2500);
  const ws0 = await ev(A, () => performance.getEntriesByType('resource').filter(r => /^wss?:/.test(r.name)).length);
  ok(ws0 === 0 && await ev(A, () => typeof window.Trystero === 'undefined'), 'solo page opens no connection and leaves the network library asleep');
  await ev(A, () => { setNick('호스트'); Lobby.show('menu'); });
  await shot(A, 'lobby-menu-desk');
  await A.click('[data-act=create]');
  ok(await waitFor(A, () => Net.code && Net.relayCount() > 0, 15000), 'host made a room and reached the relays');
  code = await ev(A, () => Net.code);
  const link = await ev(A, () => inviteLink(Net.code));
  log('room', code, link, 'relays', await ev(A, () => Net.relayCount()));
  ok(!/debug/i.test(link) && /\?room=/.test(link) && !link.includes('#'), 'invite link uses ?room=, not the #debug hash');
  for (const [p, nick] of [[B, 'PC친구'], [C, '폰친구']]) {
    await p.goto(link); await p.waitForTimeout(1500);
    ok(await ev(p, () => Lobby.view) === 'invite', `${p.label}: invite link shows a join screen (one tap)`);
    await ev(p, n => { document.getElementById('lb-nick').value = n; }, nick);
    if (p === C) await shot(C, 'lobby-invite-phone');
    const tj = Date.now();
    await p.click('[data-act=join-invite]');
    const got = await waitFor(p, () => Lobby.view === 'lobby' && Net.hostPeer, 30000);
    ok(got, `${p.label}: connected to the host in ${((Date.now() - tj) / 1000).toFixed(1)}s`);
  }
  await A.waitForTimeout(800);
  const seats = await ev(A, () => Net.seats.map(s => [s.slot, s.nick, s.connected]));
  ok(seats.length === 3 && seats.every(s => s[2]), 'host lobby lists 3 connected players: ' + JSON.stringify(seats));
  await shot(A, 'lobby-host-desk'); await shot(C, 'lobby-guest-phone');
}
// ---- 2. start a run
if (want('run')) {
  await A.click('[data-act=start]');
  const all = await Promise.all([A, B, C].map(p => waitFor(p, () => G.state === 'play' && G.online && G.players.length === 3, 10000)));
  ok(all.every(Boolean), 'all three are in the run');
  for (const p of [A, B, C]) await ev(p, BOT);
  await A.waitForTimeout(6000);
  const s = await Promise.all([A, B, C].map(state));
  log(JSON.stringify(s.map(x => [x.mode, x.t, x.me, x.z, x.players])));
  ok(s[1].z > 0 && s[2].z > 0, `guests see zombies (B ${s[1].z}, C ${s[2].z}; host ${s[0].z})`);
  ok(Math.abs(s[0].t - s[1].t) < 1.5 && Math.abs(s[0].t - s[2].t) < 1.5, 'guests follow the host clock');
  const pos = await Promise.all([A, B, C].map(p => ev(p, () => G.players.map(Q => [Q.id, Math.round(Q.x), Math.round(Q.y)]))));
  log('positions as each sees them', JSON.stringify(pos));
  const kills = await ev(A, () => G.players.map(Q => [Q.name, Q.kills, Q.stats.shots]));
  log('kills by player on host', JSON.stringify(kills));
  ok(kills[1][1] + kills[2][1] > 0, 'guest hits reach the host and kill zombies');
  await shot(A, 'run-host-desk'); await shot(B, 'run-guest-desk'); await shot(C, 'run-guest-phone');
}
// ---- 3. a player goes down and is saved
if (want('revive')) {
  const slotB = await ev(B, () => G.P.id);
  await ev(A, s => { const Q = G.players.find(q => q.id === s); Q.iframes = 0; Q.dmgBucket = 999; damagePlayer(Q, 999, 'Shambler', Q.x - 10, Q.y); }, slotB);
  ok(await waitFor(B, () => G.P.down, 3000), 'guest PC is down on its own screen');
  await B.waitForTimeout(400); await shot(B, 'down-guest-desk'); await shot(C, 'down-seen-by-phone');
  // the host walks over (host's own player) and stands next to them
  await ev(A, s => { window.__heal = s; const Q = G.players.find(q => q.id === s); G.P.x = Q.x + 25; G.P.y = Q.y; G.botInput = { mx: 0, my: 0, aim: 0, fire: false }; window.__hold = true; }, slotB);
  await ev(A, () => { const id = setInterval(() => { if (!window.__hold) return clearInterval(id); const Q = G.players.find(q => q.id === window.__heal); if (Q) { G.P.x = Q.x + 25; G.P.y = Q.y; } }, 50); });
  ok(await waitFor(B, () => !G.P.down && !G.P.dead, 8000), 'guest PC was saved by the host standing next to them');
  await ev(A, () => { window.__hold = false; });
  const rev = await ev(A, () => G.P.stats.revives);
  ok(rev >= 1, 'the host is credited with the revive');
}
// ---- 3b. picking cards on the phone while the world runs; a player bleeds out and watches a teammate
if (want('cards')) {
  const slotC = await ev(C, () => { window.__noPick = true; return G.P.id; });
  await ev(C, () => { const t = setInterval(() => { if (!window.__noPick) return clearInterval(t); if (G.modal) G.modal.lock = 1; }, 50); }); // keep the cards open for the picture
  await ev(A, s => { const Q = G.players.find(q => q.id === s); addXp(Q, Q.xpNext * 2.2); }, slotC);
  ok(await waitFor(C, () => coopPicks(G.P) >= 1, 4000), 'level-ups reach the phone as picks to open');
  const tBefore = await ev(A, () => G.t);
  await ev(C, () => openCoopModal());
  await C.waitForTimeout(900);
  ok(await ev(C, () => !!G.modal && G.state === 'play') && (await ev(A, () => G.t)) > tBefore + 0.5, 'cards open on the phone and the world keeps running');
  await shot(C, 'cards-coop-phone');
  const shield = await ev(A, s => G.players.find(q => q.id === s).shieldT, slotC);
  ok(shield > 0, 'a short shield protects the player while they pick');
  const before = await ev(A, s => { const Q = G.players.find(q => q.id === s); return [Q.pendingLevels, Object.keys(Q.cards).length, Q.level]; }, slotC);
  await ev(C, () => { window.__noPick = false; G.modal.lock = 0; G.modal.t = 1; HC.chooseOption(0); });
  await C.waitForTimeout(800);
  const after = await ev(A, s => { const Q = G.players.find(q => q.id === s); return [Q.pendingLevels, Object.keys(Q.cards).length, Q.level]; }, slotC);
  ok(after[0] === before[0] - 1 + (after[2] - before[2]) && after[1] === before[1] + 1, `the host applied the phone's pick (pending, cards, level: ${JSON.stringify(before)} -> ${JSON.stringify(after)})`);
  await ev(C, () => { G.modal = null; });
  // bleed out: the phone player is out and watches someone else
  await ev(A, s => { const Q = G.players.find(q => q.id === s); Q.iframes = 0; Q.dmgBucket = 999; damagePlayer(Q, 999, 'Hurler', Q.x, Q.y + 10); setTimeout(() => { Q.bleed = 0.05; }, 300); }, slotC);
  ok(await waitFor(C, () => G.P.dead && camSubject() !== G.P, 5000), 'a player who bled out watches a teammate');
  await C.waitForTimeout(500); await shot(C, 'out-spectating-phone');
  await ev(A, () => dropCrate(1));
  await ev(A, () => { const c = G.crates[G.crates.length - 1]; c.drop = 0; G.P.x = c.x; G.P.y = c.y; c.progress = 0.97; });
  ok(await waitFor(C, () => !G.P.dead, 6000), 'the out player comes back when the team opens a supply crate');
  ok(await waitFor(C, () => coopPicks(G.P) >= 1, 3000), 'everyone gets a pick from the crate');
}
// ---- 4. a guest refreshes and gets their player back
if (want('rejoin')) {
  const before = await ev(C, () => ({ id: G.P.id, level: G.P.level, kills: G.P.kills, cards: Object.keys(G.P.cards).length, weapons: WORDER.filter(w => G.P.weapons[w].owned) }));
  await ev(A, () => { const Q = G.players[2]; Q.weapons.shotgun.owned = true; }); // give the phone a gun on the host's record too
  await C.reload();
  ok(await waitFor(C, () => G.state === 'play' && G.online && G.P, 25000), 'phone guest is back in the same run after a refresh');
  const after = await ev(C, () => ({ id: G.P.id, level: G.P.level, kills: G.P.kills, cards: Object.keys(G.P.cards).length, weapons: WORDER.filter(w => G.P.weapons[w].owned) }));
  log('before', JSON.stringify(before), 'after', JSON.stringify(after));
  ok(after.id === before.id && after.level >= before.level && after.kills >= before.kills, 'same player, same progress');
  await ev(C, BOT);
}
// ---- 5. skip to the helicopter, everyone extracts
if (want('heli')) {
  await ev(A, () => { window.__healer = setInterval(() => { for (const Q of G.players) { if (!Q.down) Q.hp = Q.maxHp; } }, 100); G.debugSpeed = 10; });
  ok(await waitFor(A, () => G.t > 560, 120000), 'host time skipped to the blood moon');
  await ev(A, () => { G.debugSpeed = 2; });
  await shot(C, 'late-guest-phone'); await shot(B, 'late-guest-desk');
  ok(await waitFor(A, () => G.state === 'win' || G.state === 'dead', 90000), 'the run ended');
  await A.waitForTimeout(4000);
  const ends = await Promise.all([A, B, C].map(p => ev(p, () => ({ state: G.state, res: G.coopRes, hostLost: G.hostLost }))));
  log(JSON.stringify(ends.map(e => [e.state, e.res && e.res.map(r => [r[1], r[2], r[3]])])));
  ok(ends.every(e => e.state === 'win') && ends[0].res.every(r => r[2] === 'out'), 'everyone extracted and sees the win');
  const best = await Promise.all([A, B, C].map(p => ev(p, () => [localStorage.getItem('harrowcreek_best'), localStorage.getItem('harrowcreek_coop_best')])));
  ok(best.every(b => !b[0]) && best.every(b => +b[1] > 0), 'co-op scores go to their own best, the solo best is untouched: ' + JSON.stringify(best));
  await shot(A, 'end-win-desk'); await shot(C, 'end-win-phone');
  await ev(A, () => { clearInterval(window.__healer); G.debugSpeed = 1; });
}
// ---- 6. back to the room, a second run where everyone goes down
if (want('wipe')) {
  await ev(A, () => Net.backToLobby());
  ok(await waitFor(B, () => Lobby.open && Lobby.view === 'lobby', 8000) && await waitFor(C, () => Lobby.open && Lobby.view === 'lobby', 8000), 'guests are back in the room');
  await A.click('[data-act=start]');
  ok((await Promise.all([A, B, C].map(p => waitFor(p, () => G.state === 'play' && G.online, 10000)))).every(Boolean), 'second run started');
  await A.waitForTimeout(3000);
  await ev(A, () => { window.__wipe = setInterval(() => { for (const Q of G.players) if (isActive(Q)) { Q.iframes = 0; Q.dmgBucket = 999; damagePlayer(Q, 999, 'Rammer', Q.x + 5, Q.y); } }, 200); });
  ok(await waitFor(A, () => G.state === 'dead', 15000), 'the run is lost when everyone is down');
  await A.waitForTimeout(3500);
  const ends = await Promise.all([A, B, C].map(p => ev(p, () => ({ state: G.state, res: G.coopRes && G.coopRes.map(r => r[2]) }))));
  ok(ends.every(e => e.state === 'dead' && e.res.every(s => s === 'fallen')), 'everyone sees the loss: ' + JSON.stringify(ends));
  await shot(B, 'end-wipe-desk'); await shot(C, 'end-wipe-phone');
  await ev(A, () => clearInterval(window.__wipe));
}
// ---- 7. traffic with a big horde
if (want('traffic')) {
  await ev(A, () => Net.backToLobby());
  await waitFor(B, () => Lobby.view === 'lobby', 8000); await waitFor(C, () => Lobby.view === 'lobby', 8000);
  await A.click('[data-act=start]');
  await Promise.all([A, B, C].map(p => waitFor(p, () => G.state === 'play', 10000)));
  await ev(A, () => { window.__healer = setInterval(() => { for (const Q of G.players) Q.hp = Q.maxHp; }, 100); G.t = 400; for (const e of G.events) if (e.time < 400) e.done = true; for (let i = 0; i < 420; i++) { const Q = G.players[i % 3], a = Math.random() * TAU, d = 200 + Math.random() * 600; const x = Q.x + Math.cos(a) * d, y = Q.y + Math.sin(a) * d; if (walkableAt(x, y)) makeZombie(i % 7 ? 'shambler' : 'sprinter', x, y); } });
  await A.waitForTimeout(3000);
  const samples = [];
  for (let i = 0; i < 6; i++) { await A.waitForTimeout(1000); samples.push(await Promise.all([A, B, C].map(p => ev(p, () => ({ up: Net.traffic.upRate, down: Net.traffic.downRate, z: G.zombies.length, fps: G.fps, s: Net.traffic.in_s || 0, c: Net.traffic.in_c || 0 }))))); }
  const avg = k => i => samples.reduce((s, x) => s + x[i][k], 0) / samples.length;
  const r = [0, 1, 2].map(i => ({ up: Math.round(avg('up')(i)), down: Math.round(avg('down')(i)), z: Math.round(avg('z')(i)), fps: Math.round(avg('fps')(i)) }));
  log('traffic bytes/s (host, guestPC, guestPhone):', JSON.stringify(r)); log('guest totals by channel (s=world, c=events):', JSON.stringify(samples[samples.length - 1].map(x => [x.s, x.c])));
  fs.writeFileSync(`${out}/traffic.json`, JSON.stringify(r, null, 1));
  await shot(B, 'horde-guest-desk'); await shot(C, 'horde-guest-phone');
  await ev(A, () => clearInterval(window.__healer));
}
// ---- 8. the host leaves
if (want('hostleave')) {
  if (await ev(A, () => G.state !== 'play')) {
    await ev(A, () => Net.backToLobby()); await waitFor(B, () => Lobby.view === 'lobby', 8000);
    await A.click('[data-act=start]'); await Promise.all([B, C].map(p => waitFor(p, () => G.state === 'play', 10000)));
  }
  await A.waitForTimeout(2000);
  await A.context().close();
  const lost = await Promise.all([B, C].map(p => waitFor(p, () => G.hostLost && (G.state === 'dead' || G.state === 'win'), 15000)));
  ok(lost.every(Boolean), 'both guests are told the host is gone and see the results');
  await B.waitForTimeout(2500); await shot(B, 'hostlost-desk'); await shot(C, 'hostlost-phone');
  // solo is one tap away
  await ev(C, () => Net.leave());
  ok(await ev(C, () => G.state === 'title' && Net.mode === 'solo' && !Lobby.open && !location.search), 'phone guest is back on the solo title');
}
for (const p of [A, B, C]) if (p.errs.length) log(p.label, 'errors:', JSON.stringify(p.errs.slice(0, 6)));
const gerr = await Promise.all([B, C].map(p => ev(p, () => G.errors).catch(() => -1)));
ok(gerr.every(e => e === 0) && ![A, B, C].some(p => p.errs.some(e => !/Failed to load resource|ERR_|WebSocket|relay|tracker|websocket/i.test(e))), 'no game errors on the guests: ' + JSON.stringify(gerr));
log(`done: ${pass} passed, ${fail} failed`);
await browser.close();
