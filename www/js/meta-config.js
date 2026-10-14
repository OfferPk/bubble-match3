/* Bubble Match-3 v2.1 meta wiring: daily reward + challenge, skin shop, achievements + stats, first-level coach, accessibility.
   Coins are earned only by playing; they are never sold and can't be cashed out. */
(function () {
  'use strict';
  var B = window.__bubble;
  if (!B || !window.Meta) return;
  var COLORS = ['red', 'blue', 'green', 'yellow'];
  function gemThumb(it) {
    var w = document.createElement('div'); w.className = 'gem-prev fin-' + it.id;
    COLORS.forEach(function (c) { var g = document.createElement('div'); g.className = 'gem gem-' + c; w.appendChild(g); });
    return w;
  }
  function bgThumb(it) { var e = document.createElement('div'); e.className = 'bg-swatch bgx-' + it.id; return e; }
  function sfx(k) { var A = window.AudioFX; if (!A) return; if (k === 'coin') A.cash(); else if (k === 'error') A.lose && A.lose(); else A.click(); }
  var toastTimer = null;
  function toast(msg, ms) {
    var t = document.getElementById('toast'); if (!t || !msg) return;
    t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
  }
  window.BUBBLE_META = {
    key: 'bubblematch3.meta.v1', salt: 'bubblematch3', barAfter: '#screen-menu .hero', settingsAnchor: '#screen-settings .menu-actions',
    shopBtnId: 'btn-skins', previewBar: false,
    row: function (label, id, sub) { return '<label class="settings-row a11y-row"><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><input type="checkbox" id="' + id + '" /></label>'; },
    sfx: sfx, toast: toast,
    rewarded: function (ok, fail) { window.Ads.showRewarded('skin_trial').then(function (r) { if (r && r.rewarded) ok(); else if (fail) fail(); }); },
    wallet: { get: function () { return window.Storage.getCoins(); }, add: function (n) { window.Storage.addCoins(n); B.refreshCash(); } },
    winCoins: function () { return 0; }, // level coins are already paid by Storage.recordWin
    closeSettings: function () {},
    isFirstLevel: function () { return B.isFirstLevel(); },
    beforeCoach: function () {},
    onA11y: function () { B.renderBoard(); },
    howtoNote: 'Coins are earned only by playing. Spend them on boosters or cosmetic skins. They can never be bought with money or cashed out.',
    howto: [
      'Swipe a bubble, or tap two neighbours, to swap them. Line up 3 or more of the same colour to pop them.',
      'Match 4 in a row for a Line bubble, an L or T shape for a Burst, and 5 in a row for a Prism that clears a whole colour.',
      'Each level has a goal shown under the board: a score, ice, stone, moss or cherries to bring down, before you run out of moves.',
      'Boosters (Hammer, Free switch, +5 Moves and more) help on tough boards. Undo works once per level.',
      'Wins pay coins and up to 3 stars. Spare moves count towards your stars.',
      'Claim the Daily reward each day and finish the Daily challenge for bonus coins. Skins in the Shop are cosmetic.'
    ],
    coach: [
      { target: '#board', text: 'Swipe a bubble into its neighbour (or tap one, then the other) to make a line of 3.' },
      { target: '#hud-goal', text: 'This is your goal for the level. Reach it before your moves run out.' },
      { target: '#hud-moves', text: 'Moves left. Bubbles you leave unused add to your stars.' },
      { target: '#booster-bar', text: 'Boosters live here. Tap one, then tap the board to use it.' },
      { target: '#btn-undo', text: 'Undo takes back one swap per level. Have fun!' }
    ],
    challenges: [
      { id: 'triple', title: 'Triple Star', desc: 'Earn 3 stars on any level', count: 1, test: function (d) { return d.stars >= 3; } },
      { id: 'three', title: 'Pop Trio', desc: 'Clear 3 levels', count: 3, test: function () { return true; } },
      { id: 'clean', title: 'Bare Hands', desc: 'Clear a level without boosters or continues', count: 1, test: function (d) { return d.clean; } },
      { id: 'blocker', title: 'Blocker Day', desc: 'Clear 2 levels with ice, stone, moss or cherries', count: 2, test: function (d) { return d.blockers; } },
      { id: 'spare', title: 'Moves to Spare', desc: 'Clear a level with 5 or more moves left', count: 1, test: function (d) { return d.movesLeft >= 5; } }
    ],
    playChallenge: function () { B.openLevels(); },
    achDefs: window.ACH_DEFS || [],
    onWinStats: function (ach, d) {
      if (d.blockers) ach.bump('blocker_wins');
      if (d.movesLeft >= 5) ach.bump('spare_wins');
    },
    stats: function (st) {
      var g = function (k) { return st.m[k] || 0; };
      var p = window.Storage.getProgress ? window.Storage.getProgress() : {};
      return [['Levels cleared', String(g('wins'))], ['Highest level', String(Math.max(g('best_level'), (p.unlocked || 1) - 1))],
        ['3-star clears', String(g('stars3'))], ['Booster-free clears', String(g('clean_wins'))], ['Blocker levels cleared', String(g('blocker_wins'))]];
    },
    shop: [
      { title: 'Bubble finishes', kind: 'gem', prefix: 'fin-', thumb: gemThumb, items: [
        { id: 'classic', name: 'Classic Shine', price: 0 }, { id: 'matte', name: 'Soft Matte', price: 150 },
        { id: 'stripe', name: 'Ribbon Stripe', price: 250 }, { id: 'facet', name: 'Cut Facet', price: 300 },
        { id: 'ring', name: 'Ringed Orb', price: 350 }, { id: 'glass', name: 'Clear Glass', price: 400 },
        { id: 'glow', name: 'Neon Glow', price: 500 }] },
      { title: 'Backdrops', kind: 'bg', prefix: 'bgx-', thumb: bgThumb, items: [
        { id: 'none', name: 'Theme colour', price: 0 }, { id: 'lagoon', name: 'Lagoon', price: 150 },
        { id: 'meadow', name: 'Meadow', price: 200 }, { id: 'ember', name: 'Ember Dusk', price: 250 },
        { id: 'blossom', name: 'Blossom', price: 300 }, { id: 'slate', name: 'Calm Slate', price: 300 },
        { id: 'starlit', name: 'Starlit', price: 400 }] }
    ]
  };
  window.Meta.init(window.BUBBLE_META);
})();
