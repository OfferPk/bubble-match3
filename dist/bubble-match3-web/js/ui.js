/**
 * UI controller: screens, board render, touch/mouse input, modals.
 */
(function (global) {
  'use strict';

  const COLOR_CLASS = ['gem-red', 'gem-blue', 'gem-green', 'gem-yellow', 'gem-purple', 'gem-orange'];
  const COLOR_EMOJI = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
  const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

  let session = null;
  let currentLevelId = 1;
  let animating = false;
  let pointerStart = null;
  let lastCashBonus = 0;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function showScreen(id) {
    $$('.screen').forEach((el) => {
      el.hidden = el.id !== id;
    });
  }

  function formatGoal(level) {
    const parts = [];
    const g = level.goals || {};
    if (g.score != null) parts.push('Score ' + g.score.toLocaleString());
    if (g.collect) {
      Object.entries(g.collect).forEach(([ci, n]) => {
        parts.push((COLOR_EMOJI[ci] || '?') + ' ×' + n);
      });
    }
    return parts.join(' · ');
  }

  function updateHUD() {
    if (!session) return;
    const level = session.level;
    $('#hud-level').textContent = 'Lv ' + level.id;
    $('#hud-moves').textContent = String(session.movesLeft);
    $('#hud-score').textContent = session.score.toLocaleString();
    const goalEl = $('#hud-goal');
    const g = level.goals || {};
    const bits = [];
    if (g.score != null) {
      bits.push(session.score + ' / ' + g.score);
    }
    if (g.collect) {
      Object.entries(g.collect).forEach(([ci, need]) => {
        const have = session.collected[ci] || 0;
        bits.push((COLOR_EMOJI[ci] || '') + ' ' + have + '/' + need);
      });
    }
    goalEl.textContent = bits.join(' · ');
  }

  function renderBoard(instant) {
    const grid = $('#board');
    if (!session) return;
    const { board, level } = session;
    const rows = level.rows;
    const cols = level.cols;
    grid.style.setProperty('--rows', rows);
    grid.style.setProperty('--cols', cols);
    grid.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = board[r][c];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gem ' + (COLOR_CLASS[color] || '');
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('aria-label', (COLOR_NAMES[color] || 'gem') + ' at ' + (r + 1) + ',' + (c + 1));
        if (session.selected && session.selected.r === r && session.selected.c === c) {
          cell.classList.add('selected');
        }
        if (!instant) cell.classList.add('spawn');
        grid.appendChild(cell);
      }
    }
  }

  function flashMatches(cells) {
    cells.forEach(({ r, c }) => {
      const el = $(`.gem[data-r="${r}"][data-c="${c}"]`);
      if (el) el.classList.add('matched');
    });
  }

  async function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function playResult(result) {
    if (!result || !result.ok) {
      if (result && result.swapBack) {
        if (global.AudioFX) global.AudioFX.swap();
        // brief visual shake on attempted gems
        const a = $(`.gem[data-r="${result.from.r}"][data-c="${result.from.c}"]`);
        const b = $(`.gem[data-r="${result.to.r}"][data-c="${result.to.c}"]`);
        [a, b].forEach((el) => { if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 280); } });
      }
      return;
    }

    animating = true;
    session.busy = true;

    // Show swap selection clear then re-render after cascades (engine already resolved)
    if (global.AudioFX) global.AudioFX.swap();
    await wait(120);

    // Animate clear steps if present
    if (result.steps && result.steps.length) {
      for (const step of result.steps) {
        if (step.type === 'clear') {
          flashMatches(step.cells);
          if (global.AudioFX) global.AudioFX.match(step.cascade || 0);
          await wait(180);
        } else if (step.type === 'gravity' || step.type === 'spawn') {
          if (global.AudioFX && step.type === 'drop') global.AudioFX.drop();
          // board already final; skip mid-step board states for simplicity
          await wait(40);
        }
      }
    }

    renderBoard(false);
    updateHUD();

    if (result.shuffled) {
      const tip = $('#shuffle-tip');
      if (tip) {
        tip.hidden = false;
        setTimeout(() => { tip.hidden = true; }, 1600);
      }
    }

    animating = false;
    session.busy = false;

    if (result.won) {
      onWin(result.stars);
    } else if (result.lost) {
      onLose();
    }
  }

  function onCellTap(r, c) {
    if (!session || animating || session.won || session.lost) return;
    if (global.AudioFX) global.AudioFX.resume();

    if (!session.selected) {
      session.selected = { r, c };
      if (global.AudioFX) global.AudioFX.select();
      renderBoard(true);
      return;
    }

    const s = session.selected;
    if (s.r === r && s.c === c) {
      session.selected = null;
      renderBoard(true);
      return;
    }

    if (!Match3.areAdjacent(s.r, s.c, r, c)) {
      session.selected = { r, c };
      if (global.AudioFX) global.AudioFX.select();
      renderBoard(true);
      return;
    }

    const from = { r: s.r, c: s.c };
    session.selected = null;
    const result = Match3.trySwap(session, from.r, from.c, r, c);
    playResult(result);
  }

  function bindBoardInput() {
    const grid = $('#board');
    grid.addEventListener('click', (e) => {
      const gem = e.target.closest('.gem');
      if (!gem) return;
      onCellTap(+gem.dataset.r, +gem.dataset.c);
    });

    grid.addEventListener('pointerdown', (e) => {
      const gem = e.target.closest('.gem');
      if (!gem) return;
      pointerStart = { r: +gem.dataset.r, c: +gem.dataset.c, x: e.clientX, y: e.clientY, id: e.pointerId };
      try { grid.setPointerCapture(e.pointerId); } catch (_) {}
    });

    grid.addEventListener('pointerup', (e) => {
      if (!pointerStart) return;
      const dx = e.clientX - pointerStart.x;
      const dy = e.clientY - pointerStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const TH = 24;
      if (absX > TH || absY > TH) {
        let tr = pointerStart.r;
        let tc = pointerStart.c;
        if (absX > absY) tc += dx > 0 ? 1 : -1;
        else tr += dy > 0 ? 1 : -1;
        if (tr >= 0 && tc >= 0 && session && tr < session.level.rows && tc < session.level.cols) {
          session.selected = null;
          const result = Match3.trySwap(session, pointerStart.r, pointerStart.c, tr, tc);
          playResult(result);
        }
      }
      pointerStart = null;
    });

    grid.addEventListener('pointercancel', () => { pointerStart = null; });
  }

  function startLevel(id) {
    const level = Levels.getLevel(id);
    if (!level) return;
    if (!Storage.isUnlocked(id)) return;
    currentLevelId = id;
    session = Match3.createSession(level);
    $('#level-title').textContent = level.name;
    updateHUD();
    renderBoard(false);
    showScreen('screen-game');
    $('#modal-win').hidden = true;
    $('#modal-lose').hidden = true;
    Ads.hideBanner();
  }

  async function onWin(stars) {
    if (global.AudioFX) global.AudioFX.win();
    const rec = Storage.recordWin(currentLevelId, session.score, stars);
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#win-stars').textContent = starStr;
    $('#win-score').textContent = session.score.toLocaleString();
    $('#win-best').textContent = rec.isNewBest ? 'New best!' : '';
    lastCashBonus = rec.cashBonus || 0;
    const winCash = $('#win-cash');
    if (winCash) winCash.textContent = '+' + lastCashBonus + ' Cow Cash';
    const dbl = $('#btn-double-cash');
    if (dbl) dbl.disabled = false;
    refreshCash();
    const nextId = currentLevelId + 1;
    const hasNext = nextId <= Levels.getLevelCount() && Storage.isUnlocked(nextId);
    $('#btn-next-level').hidden = !hasNext;
    $('#modal-win').hidden = false;

    // Optional interstitial stub between levels (silent when ads off)
    try { await Ads.showInterstitial(); } catch (_) {}
  }

  function onLose() {
    if (global.AudioFX) global.AudioFX.lose();
    $('#lose-score').textContent = session.score.toLocaleString();
    const continueBtn = $('#btn-continue');
    continueBtn.hidden = !!session.continued;
    refreshCash();
    $('#modal-lose').hidden = false;
  }

  function renderLevelSelect() {
    const grid = $('#level-grid');
    const progress = Storage.getProgress();
    grid.innerHTML = '';
    Levels.LEVELS.forEach((lv) => {
      const unlocked = lv.id <= progress.unlocked;
      const rec = progress.levels[String(lv.id)] || { stars: 0 };
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn' + (unlocked ? '' : ' locked') + (rec.stars > 0 ? ' cleared' : '');
      btn.disabled = !unlocked;
      btn.innerHTML =
        '<span class="lv-num">' + lv.id + '</span>' +
        '<span class="lv-stars">' + (unlocked ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : '🔒') + '</span>';
      btn.title = lv.name + (unlocked ? '' : ' (locked)');
      if (unlocked) {
        btn.addEventListener('click', () => {
          if (global.AudioFX) global.AudioFX.click();
          startLevel(lv.id);
        });
      }
      grid.appendChild(btn);
    });
    $('#progress-summary').textContent =
      'Unlocked ' + progress.unlocked + '/' + Levels.getLevelCount() +
      ' · ★ ' + (progress.totalStars || 0);
  }

  function openLevels() {
    renderLevelSelect();
    refreshCash();
    showScreen('screen-levels');
  }


  function refreshCash() {
    const p = Storage.getProgress();
    document.querySelectorAll('[data-cow-cash]').forEach((el) => {
      el.textContent = String(p.cowCash || 0);
    });
    const cashBtn = document.getElementById('btn-continue-cash');
    if (cashBtn && session) {
      const cost = (Ads && Ads.CONTINUE_COST) || Storage.CONTINUE_COST || 50;
      cashBtn.textContent = 'Continue — ' + cost + ' 🐄 (' + (p.cowCash || 0) + ')';
      cashBtn.disabled = (p.cowCash || 0) < cost || !!session.continued;
      cashBtn.hidden = !!session.continued;
    }
  }

  function openMenu() {
    const p = Storage.getProgress();
    $('#menu-stars').textContent = '★ ' + (p.totalStars || 0);
    $('#menu-unlocked').textContent = 'Level ' + p.unlocked;
    const soundBtn = $('#btn-sound');
    if (soundBtn) soundBtn.textContent = p.sound ? '🔊 Sound' : '🔇 Muted';
    refreshCash();
    showScreen('screen-menu');
  }

  function bindChrome() {
    $('#btn-play').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openLevels();
    });
    $('#btn-continue-campaign').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      const p = Storage.getProgress();
      startLevel(Math.min(p.unlocked, Levels.getLevelCount()));
    });
    $('#btn-levels-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openMenu();
    });
    $('#btn-game-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openLevels();
    });
    $('#btn-sound').addEventListener('click', () => {
      const p = Storage.getProgress();
      Storage.setSound(!p.sound);
      if (global.AudioFX) {
        global.AudioFX.setEnabled(!p.sound);
        global.AudioFX.click();
      }
      openMenu();
    });
    $('#btn-reset-progress').addEventListener('click', () => {
      if (confirm('Reset all level progress?')) {
        Storage.resetAll();
        openMenu();
      }
    });

    $('#btn-next-level').addEventListener('click', async () => {
      $('#modal-win').hidden = true;
      if (global.AudioFX) global.AudioFX.click();
      const next = currentLevelId + 1;
      if (next <= Levels.getLevelCount()) startLevel(next);
      else openLevels();
    });
    $('#btn-win-levels').addEventListener('click', () => {
      $('#modal-win').hidden = true;
      openLevels();
    });
    $('#btn-retry').addEventListener('click', () => {
      $('#modal-lose').hidden = true;
      if (global.AudioFX) global.AudioFX.click();
      startLevel(currentLevelId);
    });
    $('#btn-lose-levels').addEventListener('click', () => {
      $('#modal-lose').hidden = true;
      openLevels();
    });

    const earnBtn = $('#btn-earn-cash');
    if (earnBtn) earnBtn.addEventListener('click', async () => {
      if (global.AudioFX) global.AudioFX.click();
      const r = await Ads.showRewarded('cow_cash');
      if (r && r.rewarded) {
        Storage.addCowCash(Ads.REWARD_CASH || Storage.REWARD_CASH || 40);
        if (global.AudioFX) global.AudioFX.cash();
        refreshCash();
      }
    });
    const cashContinue = $('#btn-continue-cash');
    if (cashContinue) cashContinue.addEventListener('click', () => {
      if (!session || session.continued) return;
      if (global.AudioFX) global.AudioFX.click();
      const cost = Ads.CONTINUE_COST || Storage.CONTINUE_COST || 50;
      if (Storage.spendCowCash(cost)) {
        const n = Match3.grantContinue(session);
        Storage.recordContinue();
        $('#modal-lose').hidden = true;
        updateHUD();
        refreshCash();
        const tip = $('#shuffle-tip');
        if (tip) {
          tip.textContent = '+' + n + ' moves!';
          tip.hidden = false;
          setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 1600);
        }
        if (global.AudioFX) global.AudioFX.cash();
      }
    });
    const dblCash = $('#btn-double-cash');
    if (dblCash) dblCash.addEventListener('click', async () => {
      if (global.AudioFX) global.AudioFX.click();
      const r = await Ads.showRewarded('double_reward');
      if (r && r.rewarded && lastCashBonus > 0) {
        Storage.addCowCash(lastCashBonus);
        if (global.AudioFX) global.AudioFX.cash();
        const winCash = $('#win-cash');
        if (winCash) winCash.textContent = '+' + (lastCashBonus * 2) + ' Cow Cash (2×)';
        dblCash.disabled = true;
        refreshCash();
      }
    });

    $('#btn-continue').addEventListener('click', async () => {
      if (!session || session.continued) return;
      const res = await Ads.showRewarded('continue_moves');
      if (res && res.rewarded) {
        const n = Match3.grantContinue(session);
        Storage.recordContinue();
        $('#modal-lose').hidden = true;
        updateHUD();
        const tip = $('#shuffle-tip');
        if (tip) {
          tip.textContent = '+' + n + ' moves!';
          tip.hidden = false;
          setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 1600);
        }
        if (global.AudioFX) global.AudioFX.cash();
      }
    });
  }

  function init() {
    bindBoardInput();
    bindChrome();
    openMenu();
    Ads.showBanner();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.UI = { startLevel, openLevels, openMenu };
})(window);
