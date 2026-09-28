# Bubble Match-3 (folder: bubble-match3)

Offline Match-3 puzzle with a **fixed baked-in pack of 64 levels**.  
Vanilla HTML/CSS/JS + PWA + Capacitor scaffold. **No servers, no accounts, no live ops, no downloads.**

Legal adjacent swaps, cascades until stable, specials (stripe / wrapped / color bomb), special combos, ice / stone / lock / **chocolate** blockers, cherry ingredient drops, pre-level + in-level boosters, undo once/level, daily quests, local coin shop, board themes, Settings.  
Fail / out-of-moves → rewarded continue stub (+5 moves). Core play works with ads off.

## Play & download

| Platform | Link |
|----------|------|
| **Browser (PC / Android Chrome)** | https://offerpk.github.io/bubble-match3/ |
| **Windows zip** | https://github.com/OfferPk/bubble-match3/releases/latest/download/bubble-match3-web-windows.zip |
| **Android** | Same browser link in Chrome (Add to Home Screen). APK not built yet. |

Repo: https://github.com/OfferPk/bubble-match3

## Quick start

```bash
cd /workspace/games/bubble-match3
npm start
# → http://localhost:4175
# or: npx --yes serve -l 4175 .
# or: npm run start:py
```

`file://` works for play; PWA/service worker needs `http://`.

## Play & packages

| Platform | How |
|----------|-----|
| **Browser** | `npm start` → http://localhost:4175 |
| **GitHub Pages** | Static copy in `docs/` (parent publishes) |
| **Windows zip** | `dist/bubble-match3-web-windows.zip` → extract → `PLAY-WINDOWS.bat` |
| **Android** | Capacitor scaffold ready; APK needs JDK 17+ & Android SDK |

## OWNER COMPLETE checklist (v2.0.0-complete)

| Feature | Detail |
|---------|--------|
| Levels | **64** fixed levels in `js/levels.js` (score / ice / stone / lock / cherry / dual / **chocolate**) |
| Cascades | Match → clear → gravity → refill → repeat until stable |
| Specials | 4-line → stripe; L/T → wrapped (3×3); 5-line → color bomb |
| Combos | Stripe+stripe cross, stripe+wrapped big clear, color+stripe |
| Blockers | Ice 1–2, stone (2 hits), chain/lock, **chocolate** (spreads if not cleared that move) |
| Ingredients | Cherry drops — bring cherries to bottom |
| Boosters | **hammer**, **freeSwitch**, **colorBombStart**, **plusMoves** (+ legacy rowBlast / colorBrush) |
| Undo | Optional **once per level** (HUD button) |
| Shop | Soft-currency **coins** buy boosters locally |
| Daily quest | Win 3 levels / make 10 cascades → coin reward |
| Settings | Sound + reduce FX (+ theme) |
| Stars | 1–3 from score + leftover moves |
| Progress | Unlocked level, stars, best score, coins, boosters → `localStorage` |
| Continue | Out of moves → rewarded ad stub or 50 🪙 → +5 moves (once) |
| Shuffle / hint | Auto-shuffle if no moves; idle hint after ~4.5s |
| Ads stubs | Rewarded +5 / coins; interstitial between levels. **No IAP** |
| Screens | Map/Select, Pre-level, Play, Win, Fail, Shop, **Settings** |
| PWA | `manifest.webmanifest` + `sw.js` (`bm3-v4-20260928-v20-complete`) |
| Sound | Web Audio beeps (toggle in menu / Settings) |

## Layout

```
index.html
css/styles.css
js/levels.js      # 64 baked levels (+ ice/stone/lock/chocolate/cherries)
js/storage.js     # localStorage progress, boosters, quests, theme, reduceFx
js/ads.js         # banner / interstitial / rewarded stubs
js/audio.js       # Web Audio FX
js/game.js        # Match-3 engine
js/ui.js          # screens + boosters + shop + settings + undo
manifest.webmanifest  sw.js  icons/
scripts/build-web.js → www/
scripts/smoke-engine.js
docs/             # GitHub Pages static copy
dist/             # Windows zip
capacitor.config.json
```

## Capacitor / Android

```bash
npm install && npm run build:web
npx cap add android   # once
npm run cap:sync
# APK needs JDK 17+ & Android SDK:
npm run android:build
```

## Ads

Core play is offline. Optional:

```html
<script>
  window.ADMOB_CONFIG = { enabled: false, bannerId: null, interstitialId: null, rewardedId: null };
</script>
```

## Verify

```bash
node --check js/*.js
npm test   # → scripts/smoke-engine.js
```

## License

MIT
