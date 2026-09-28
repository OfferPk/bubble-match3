# STATUS — Gem Rush Match-3 (bubble-match3)

**Path:** `/workspace/games/bubble-match3`  
**Owner:** Mia Smith  
**Updated:** 2026-09-28 ~12:30 Asia/Karachi (PKT)  
**Version:** 1.0.0

## MVP shipped ✅

- [x] Match-3 core: adjacent swap, match 3+, cascade, gravity, refill
- [x] 40 baked-in levels (`js/levels.js`) — score and/or collect goals
- [x] Stars (1–3) from score thresholds; unlock next on win
- [x] localStorage progress (unlocked, stars, best score, sound)
- [x] Fail → rewarded continue stub (+5 moves, once per attempt)
- [x] Interstitial stub between levels (no-op when ads off)
- [x] Core play works with ads off (`ADMOB_CONFIG.enabled: false`)
- [x] Mobile-friendly touch UI (tap + swipe)
- [x] PWA: manifest + service worker
- [x] Capacitor scaffold: `package.json`, `capacitor.config.json`, `build:web` → `www/`
- [x] `docs/` static copy for GitHub Pages
- [x] `dist/bubble-match3-web-windows.zip` + `PLAY-WINDOWS.bat`
- [x] README.md + STATUS.md
- [x] No secrets; no GitHub push from this agent

## Verified on this box

- Node `--check` on all `js/*.js`
- Engine smoke: 40 levels, valid swap scores, unlock persists
- HTTP 200 for `index.html`, `js/game.js`, `js/ui.js`, `js/levels.js` on port **4175**

## Remaining gaps ⏳

- [ ] Real AdMob plugin + production IDs
- [ ] Signed release APK/AAB — **blocked here** (no JDK / Android SDK)
- [ ] `npx cap add android` not run on this box (scaffold only)
- [ ] Special gems (line/bomb) — out of MVP scope
- [ ] iOS Capacitor target

## How to open

```bash
cd /workspace/games/bubble-match3
npm start
# → http://localhost:4175
```

## Packages for parent publish

| Artifact | Path |
|----------|------|
| GitHub Pages | `docs/` |
| Windows zip | `dist/bubble-match3-web-windows.zip` (also copied into `docs/`) |
| Capacitor webDir | `www/` (via `npm run build:web`) |

**Do not git push from executor** — parent publishes.

## Blockers

1. APK not built on this box (no Java/SDK).  
2. AdMob stubs only until real app IDs are provided.
