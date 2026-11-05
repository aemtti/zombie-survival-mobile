# Automated checks

These scripts drive the game in headless Chrome to check that it works (they do not judge how it feels). They need Node and `playwright-core` (`npm i playwright-core`), and use the installed Chrome (set `CHROME` to another path if needed). Serve the repository folder first, for example `python -m http.server 5260`.

| Script | What it checks |
|---|---|
| `solo.mjs <url> <outDir>` | Korean by default; the language button by click and tap, remembered after reload; a whole solo run sped up to the helicopter with no errors and no untranslated text |
| `shots.mjs <url> <outDir> <ko\|en> [devices] [scenes]` | Screenshots of every screen on phone landscape, small phone, phone held upright, and two desktop sizes (set `BLOCKFONTS=1` to see the offline fonts) |
| `coop.mjs <url> <outDir> [phases]` | Three isolated browsers (host PC, guest PC, guest phone) through the public relays: lobby, a run, down and saved, picking cards while the world runs, out and back at a crate, a guest refresh, skip to the helicopter, everyone down, traffic with a big horde, the host leaving |
| `coop2.mjs <url> <outDir>` | No host after 20 s, KakaoTalk browser, full room, different versions, late arrival, debug off online |
| `stall.mjs <url>` | The host's world keeps running when its window stops drawing frames |
| `taps.mjs <url>` | Real taps on a phone: the reward badge, walking while cards are open, picking a card |
| `relays.mjs <url> nostr\|torrent <relay urls…>` | Which signalling relays connect two browsers, and how fast (uses the Trystero copy inside the game) |

Online checks need internet access to the relays. `G.debugSpeed` on the host skips time; `window.HC` and `HC.Net` give the scripts access to the game.
