// Which signalling relays connect two isolated browsers through Trystero, and how fast?
// usage: node relays.mjs <gameUrl> nostr|torrent [url ...]   (uses the Trystero copy inside the game page)
import { chromium } from 'playwright-core';
const [page0, kind, ...urls] = process.argv.slice(2);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio'] });
const one = async (url, i) => {
  const pages = [];
  for (let k = 0; k < 2; k++) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(page0); await p.evaluate(() => loadTrystero());
    pages.push(p);
  }
  const room = 'hc-relaytest-' + Date.now() + '-' + i;
  const res = await Promise.all(pages.map(p => p.evaluate(([url, room, kind]) => new Promise(done => {
    const t0 = performance.now();
    const join = kind === 'torrent' ? Trystero.joinRoomTorrent : Trystero.joinRoom;
    const r = join({ appId: 'hc-relaytest', password: 'pw-' + room, relayConfig: { urls: [url], warnOnRelayFailure: false } }, room, { onJoinError: d => done('joinError ' + String(d.error).slice(0, 80)) });
    r.onPeerJoin = () => done(Math.round(performance.now() - t0));
    setTimeout(() => done('timeout'), 20000);
  }), [url, room, kind])));
  for (const p of pages) await p.context().close();
  return res;
};
const all = await Promise.all(urls.map((u, i) => one(u, i).then(r => [u, r])));
for (const [u, r] of all) console.log(String(r[0]).padEnd(10), String(r[1]).padEnd(10), u);
await browser.close();
