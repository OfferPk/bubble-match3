# STATUS — Bubble Match-3 (bubble-match3)

**Path:** `/workspace/games/bubble-match3`  
**Owner:** Mia Smith  
**Updated:** 2026-09-28 ~12:40 Asia/Karachi (PKT)  
**Version:** 1.1.0

## Cascade / specials pass ✅

- [x] Legal adjacent swaps only (invalid swap reverts)
- [x] Cascades: clear → gravity → refill until stable
- [x] Specials: stripe (4), wrapped/L-T (5+), color bomb (5-line)
- [x] Combos: stripe+stripe, stripe+wrapped, color+stripe (+ color+wrapped, color+color, wrapped+wrapped)
- [x] Ice blockers (tile layer) on mid+ levels; clear-ice / ice-count goals
- [x] 48 baked levels — early score/collect, mid ice, later tighter
- [x] Stars from score + leftover moves; continue stub (+5)
- [x] Shuffle if no moves; idle hint (~4.5s)
- [x] FX: particles, cascade score popup, special spawn flash
- [x] localStorage progress + Cow Cash unchanged key
- [x] PWA cache bump `bm3-v2-20260928-cascade`
- [x] `docs/`, `www/`, `dist/` refreshed
- [x] No secrets; no git push from this agent

## Verified on this box

- `node --check` on `js/*.js`
- `node scripts/smoke-engine.js` — 34/34 (cascade, specials, combos, ice)
- HTTP 200 on port **4175**

## Remaining gaps ⏳

- [ ] Real AdMob plugin + production IDs
- [ ] Signed release APK/AAB — **blocked here** (no JDK / Android SDK)
- [ ] `npx cap add android` not run on this box (scaffold only)
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
