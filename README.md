# 해로 크릭 · Harrow Creek

밤이 오는 작은 마을에서 10분을 버티고 구조 헬기에 올라타는 탑다운 좀비 생존 게임입니다. 혼자 해도 되고, 친구 1~3명과 온라인으로 함께 해도 됩니다.
폰은 가로로 들고 왼손 엄지로 이동, 오른손 엄지로 조준·사격합니다(원 밖까지 끌면 발사). 대시·수류탄·장전·무기 교체는 버튼으로 합니다. PC에서는 WASD와 마우스로 합니다.

- 플레이: https://aemtti.github.io/zombie-survival-mobile/
- 기본 언어는 한국어입니다. 타이틀 화면 오른쪽 위나 메뉴의 **English** 버튼으로 영어로 바꿀 수 있고, 고른 언어는 기억됩니다.
- 화면 구석에 빌드 번호(예: `v2.0`)가 보입니다. 함께 하는 사람끼리 번호가 다르면 게임이 새로고침하라고 알려 줍니다.

## 친구와 함께 (온라인 협동, 2~4명)

1. 한 명이 타이틀 왼쪽 아래 **친구와 함께 (온라인)** → **방 만들기**를 누릅니다. 방 코드와 초대 링크가 나옵니다.
2. 링크를 카톡 등으로 보냅니다. 친구는 링크를 열고 **참가**를 한 번 누르면 됩니다. 코드만 알려 줘도 됩니다.
3. 모두 들어오면 방장이 **시작하기**를 누릅니다.

- 방을 만든 사람의 브라우저가 게임 전체를 돌립니다. 그래서 방장은 그 페이지를 닫으면 안 되고, PC로 방을 만드는 게 가장 좋습니다. 방장 창이 뒤로 가려져도 게임은 계속 돌아갑니다.
- 게임 서버는 없습니다. 브라우저끼리 직접(WebRTC) 연결하고, 서로를 찾을 때만 공개 중계 서버(nostr 릴레이 여러 곳, 안 되면 토렌트 트래커)를 씁니다. 방 코드가 암호 역할도 합니다. 혼자 하기만 하면 아무 데도 연결하지 않습니다.
- 내 캐릭터의 이동·조준·사격은 내 화면에서 바로 반응하고, 좀비와 아이템은 방장이 정해서 보내 줍니다.
- 쓰러져도 바로 죽지 않습니다. 동료가 옆에 3초 서 있으면 일어나고, 35초 안에 못 일어나면 전사해서 동료 시점으로 관전합니다. 전사한 사람은 팀이 다음 보급 상자를 열 때 돌아옵니다. 모두가 쓰러져야 집니다.
- 레벨업 카드와 보급 상자 선택은 쌓아 두었다가 원할 때 엽니다(PC는 Tab, 폰은 화면의 ★ 버튼). 고르는 동안에도 게임은 계속되고, 잠깐 보호막이 생기고, 걸어서 움직일 수 있습니다.
- 보석 경험치는 주운 사람이 다 받고 나머지 동료도 조금씩 나눠 받습니다. 구급상자·탄약·수류탄은 필요한 사람에게만 날아가고, 보급 상자는 모두에게 하나씩 선택권을 줍니다. 아군 사격은 없습니다(드럼통 폭발도 터뜨린 사람만 다칩니다).
- 헬기는 착륙장 원 안에 있는 사람을 태우고, 나머지에게 10초를 더 기다려 줍니다. 결과 화면에서 모두의 기록을 보여 줍니다. 협동 점수는 혼자 하기 최고 점수를 덮어쓰지 않습니다.
- 연결이 끊긴 사람은 같은 링크로 다시 들어오면 자기 캐릭터를 그대로 돌려받습니다. 방장이 나가면 남은 사람에게 알리고 그때까지의 결과를 보여 줍니다.
- 일부 모바일 데이터나 회사 네트워크는 브라우저끼리의 직접 연결을 막습니다. 20초 안에 연결되지 않으면 화면이 해 볼 일을 알려 줍니다(와이파이↔데이터 바꾸기 등).

## 기술 메모

- 모든 것이 `index.html` 한 파일 안에 있습니다. 그래픽과 소리는 코드로 만들고, 바깥에서 불러오는 것은 Google Fonts의 Anton(영문 제목)과 Black Han Sans(한글 제목)뿐입니다. 인터넷이 없으면 기기의 굵은 기본 글꼴로 대신 보입니다.
- 온라인 기능은 [Trystero](https://github.com/dmotz/trystero) 0.26.0을 같은 파일 안에 넣어 씁니다(MIT 라이선스). 라이선스 전문은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)와 `index.html` 안의 주석에 있습니다.
- 테스트용 접근점: `window.HC`, `G.timeScale`, `G.debugSpeed`(방장 쪽에서 시간 빨리 감기), `HC.Net`.

---

A top-down zombie survival game in a single HTML file: survive 10 minutes in a small town at night and reach the rescue helicopter, alone or with 1–3 friends online.

On a phone, hold it sideways (the game turns itself if you hold it upright): the left thumb moves, the right thumb aims and fires (drag past the ring), and buttons handle dash, grenade, reload and weapon swap. On a computer, use WASD and the mouse.

- Play: https://aemtti.github.io/zombie-survival-mobile/
- The game starts in Korean. The **English / 한국어** button (title screen, top right, or the menu) switches the language, and the choice is remembered.
- The build number (for example `v2.0`) is shown on screen; players on different builds are asked to reload.

## Play with friends (online co-op, 2–4 players)

1. One player taps **Play with friends (online)** → **Make a room** on the title screen and gets a room code and an invite link.
2. Friends open the link and tap **Join** (or type the code).
3. The host taps **Start the run**.

- The host's browser runs the whole game, so the host keeps the page open; a computer is the best host. The host's world keeps running when its window is in the background.
- There is no game server. Browsers connect directly (WebRTC) and use public signalling relays (several nostr relays, with torrent trackers as a second route) only to find each other. The room code is also the room password. Solo play opens no connection at all.
- Your own movement, aim and shots respond instantly on your screen; zombies, pickups and the clock come from the host.
- A player who drops to 0 HP is down, not dead: a teammate standing next to them for 3 s brings them back. After 35 s down they are out and watch a teammate until the team opens the next supply crate. The run is lost only when everyone is down.
- Level-up cards and crate rewards are banked and opened when you choose (Tab on a computer, the ★ button on a phone). The world keeps going while you pick; you get a short shield and can still walk.
- Gems give their XP to whoever picks them up, with a share for the others. Medkits, ammo and grenades only fly to players who need them; a supply crate gives everyone a pick. No friendly fire (a barrel only hurts whoever set it off).
- The helicopter takes everyone inside the landing ring and waits 10 s for the rest. Everyone sees the whole team's results. Co-op scores never overwrite the solo best.
- A player who loses connection gets their player back by opening the same link again. If the host leaves, the others are told and see the results so far.
- Some mobile and office networks block direct browser connections; after 20 s without a connection the game says what to try.

## Notes

- Everything lives in `index.html`. The only outside resources are two Google Fonts: Anton (Latin headings) and Black Han Sans (Korean headings). Offline, headings fall back to the device's bold system fonts.
- Online play uses [Trystero](https://github.com/dmotz/trystero) 0.26.0, bundled into the page (MIT License). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the comment in `index.html` for the licence texts.
- Test hooks: `window.HC`, `G.timeScale`, `G.debugSpeed` (fast-forward on the host), `HC.Net`.
