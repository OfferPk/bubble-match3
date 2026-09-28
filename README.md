# Gem Rush Match-3 (folder: bubble-match3)

Offline Match-3 puzzle with a **fixed baked-in pack of 40 levels**.  
Vanilla HTML/CSS/JS + PWA + Capacitor scaffold. **No servers, no accounts, no live ops, no downloads.**

Swap adjacent gems, match 3+, cascades, score and/or collect-color goals, limited moves.  
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
| Levels | 40 fixed levels in `js/levels.js` |
| Goals | Score target and/or collect N of color(s) |
| Progress | Unlocked level, stars, best score → `localStorage` |
| Continue | Out of moves → rewarded ad stub → +5 moves (once) |
| Interstitial | Stub between levels (silent when ads off) |
| Input | Tap two adjacent gems or swipe |
| PWA | `manifest.webmanifest` + `sw.js` |
| Sound | Web Audio beeps (toggle on menu) |

## Layout

```
index.html
css/styles.css
js/levels.js      # 40 baked levels
js/storage.js     # localStorage progress
js/ads.js         # banner / interstitial / rewarded stubs
js/audio.js       # Web Audio FX
js/game.js        # Match-3 engine (Match3)
js/ui.js          # screens + input
manifest.webmanifest  sw.js  icons/
scripts/build-web.js → www/
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

## License

MIT — CEO BOT Games / Mia Smith
