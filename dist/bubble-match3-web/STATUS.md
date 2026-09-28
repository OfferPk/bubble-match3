# STATUS — Bubble Match-3 (bubble-match3)

**Path:** `/workspace/games/bubble-match3`  
**Owner:** Mia Smith  
**Updated:** 2026-09-28 ~13:05 Asia/Karachi (PKT)  
**Version:** 2.0.0-complete

## OWNER COMPLETE ✅

- [x] Core: adjacent swap → match ≥3; gravity cascade; fill from top; goals; limited moves
- [x] Specials: 3 clear / 4 stripe / 5 L-T wrapped / 5-line color bomb + combos
- [x] Blockers: ice 1–2, lock/cage, stone, **chocolate** (spreads if not cleared that turn)
- [x] **64 levels** mixing score / ice / stone / lock / cherry / dual / chocolate
- [x] Boosters: **hammer**, **freeSwitch**, **colorBombStart**, **plusMoves** (+ rowBlast, colorBrush)
- [x] Pre-level arm + in-level use; shop prices; storage
- [x] Undo once per level (HUD)
- [x] Hint idle + shuffle no-moves
- [x] Stars 1–3; level select; local coins; daily quest; Settings (sound, reduce FX)
- [x] Monetization stubs: rewarded +5/continue, rewarded coins, interstitial. No IAP
- [x] Screens: Map/Select, Pre-level, Play, Win, Fail, Shop, Settings
- [x] Offline / cascades / specials / PWA / Capacitor / ads stubs kept
- [x] Version **2.0.0-complete**; SW cache `bm3-v4-20260928-v20-complete`
- [x] README + STATUS; `www/`, `docs/`, `dist/bubble-match3-web-windows.zip` refreshed
- [x] No secrets; no git push from this agent

## Verified on this box

- `node --check` on `js/*.js`
- `node scripts/smoke-engine.js` — 65/65 (cascade, specials, combos, ice, stone, lock, cherries, chocolate, undo, boosters)
- HTTP serve on port **4175** (`npm start`)

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
