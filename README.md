# Bubble Match-3 (folder: bubble-match3)

Offline Match-3 puzzle with a **fixed baked-in pack of 48 levels**.  
Vanilla HTML/CSS/JS + PWA + Capacitor scaffold. **No servers, no accounts, no live ops, no downloads.**

Legal adjacent swaps, cascades until stable, specials (stripe / wrapped / color bomb), special combos, ice blockers, score & collect goals, limited moves.  
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

## Features

| Feature | Detail |
|---------|--------|
| Levels | **48** fixed levels in `js/levels.js` |
| Cascades | Match → clear → gravity → refill → repeat until stable |
| Specials | 4-line → stripe; L/T → wrapped (3×3); 5-line → color bomb |
| Combos | Stripe+stripe cross, stripe+wrapped big clear, color+stripe |
| Goals | Score, collect N of color(s), clear ice (mid+ levels) |
| Stars | 1–3 from score + leftover moves |
| Progress | Unlocked level, stars, best score, Cow Cash → `localStorage` |
| Continue | Out of moves → rewarded ad stub or 50 🐄 → +5 moves (once) |
| Shuffle / hint | Auto-shuffle if no moves; idle hint after ~4.5s |
| FX | Pop particles, cascade score popups, special spawn flash |
| Interstitial | Stub between levels (silent when ads off) |
| Input | Tap two adjacent gems or swipe |
| PWA | `manifest.webmanifest` + `sw.js` |
| Sound | Web Audio beeps (toggle on menu) |

## Layout

```
index.html
css/styles.css
js/levels.js      # 48 baked levels (+ ice configs)
js/storage.js     # localStorage progress
js/ads.js         # banner / interstitial / rewarded stubs
js/audio.js       # Web Audio FX
js/game.js        # Match-3 engine (cascades, specials, ice)
js/ui.js          # screens + input + FX + hint
manifest.webmanifest  sw.js  icons/
scripts/build-web.js → www/
scripts/smoke-engine.js  # cascade/specials unit smoke
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
  window.ADMOB_CONFIG = {
    enabled: true,
    bannerId: 'ca-app-pub-xxx/yyy',
    interstitialId: 'ca-app-pub-xxx/yyy',
    rewardedId: 'ca-app-pub-xxx/yyy'
  };
</script>
```

Without IDs, rewarded continue shows a stub modal (Grant / Cancel).

## Verify

```bash
node scripts/smoke-engine.js   # cascade + specials + ice
npm start                      # http://localhost:4175
```

## License

MIT — CEO BOT Games / Mia Smith

## Cow Cash

Soft currency stored in `localStorage` (`bubble-match3-progress-v1`):

| Action | Effect |
|--------|--------|
| Clear a level | +10 + 15×stars Cow Cash |
| Home → Watch ad (stub) | +40 |
| Win → 2× Cash (stub) | doubles that level’s cash award |
| Fail → Continue (stub) | +5 moves (once) |
| Fail → Continue 50 🐄 | +5 moves if balance allows |

Ads are stubs only (`ADMOB_CONFIG.enabled: false` by default). No network required.
