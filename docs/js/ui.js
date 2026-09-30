/**
 * UI: screens, board render (specials + ice + stone + lock + chocolate + cherry),
 * boosters (hammer/freeSwitch/colorBombStart/plusMoves + legacy), undo, settings,
 * shop, daily quests, combo meter, themes, FX, idle hint.
 */
(function (global) {
  'use strict';

  const COLOR_CLASS = ['gem-red', 'gem-blue', 'gem-green', 'gem-yellow', 'gem-purple', 'gem-orange'];
  const COLOR_MARKS = ['●', '◆', '▲', '✦', '✚', '■'];
  const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
  const HINT_IDLE_MS = 4500;
  const THEMES = ['neon', 'ocean', 'sunset'];
  const BOOSTER_META = {
    hammer: { icon: '🔨', name: 'Hammer', desc: 'Destroy 1 tile', target: true },
    freeSwitch: { icon: '🔀', name: 'Free switch', desc: 'Swap adjacent free', target: true, twoTap: true },
    colorBombStart: { icon: '★', name: 'Color bomb start', desc: 'Start with a color bomb', instant: true, preOnly: true },
    plusMoves: { icon: '➕', name: '+5 Moves', desc: 'Gain 5 moves', instant: true },
    rowBlast: { icon: '💥', name: 'Row blast', desc: 'Clear a row', target: true },
    colorBrush: { icon: '🎨', name: 'Color brush', desc: 'Clear one color', target: true }
  };
  const PRE_BOOSTER_ORDER = ['hammer', 'freeSwitch', 'colorBombStart', 'plusMoves', 'rowBlast', 'colorBrush'];
  const IN_LEVEL_BOOSTERS = ['hammer', 'freeSwitch', 'plusMoves', 'rowBlast', 'colorBrush'];

  let session = null;
  let currentLevelId = 1;
  let animating = false;
  let pointerStart = null;
  let lastCashBonus = 0;
  let hintTimer = null;
  let hintPair = null;
  let pendingBooster = null; // equipped from pre-level (type or null)
  let activeBooster = null;  // in-level targeting mode
  let freeSwitchFrom = null; // first cell for freeSwitch two-tap

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function showScreen(id) {
    $$('.screen').forEach((el) => {
      el.hidden = el.id !== id;
    });
  }

  function applyTheme(id) {
    const t = THEMES.indexOf(id) >= 0 ? id : 'neon';
    document.body.setAttribute('data-theme', t);
    Storage.setTheme(t);
  }

  function clearHint() {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    hintPair = null;
    $$('.gem.hint').forEach((el) => el.classList.remove('hint'));
  }

  function scheduleHint() {
    clearHint();
    if (!session || session.won || session.lost || animating || activeBooster) return;
    hintTimer = setTimeout(() => {
      if (!session || animating || session.won || session.lost) return;
      const h = Match3.findHint(session.board);
      if (!h) return;
      hintPair = h;
      const a = $(`.gem[data-r="${h.from.r}"][data-c="${h.from.c}"]`);
      const b = $(`.gem[data-r="${h.to.r}"][data-c="${h.to.c}"]`);
      if (a) a.classList.add('hint');
      if (b) b.classList.add('hint');
    }, HINT_IDLE_MS);
  }

  function formatGoal(level) {
    const parts = [];
    const g = level.goals || {};
    if (g.score != null) parts.push('Score ' + g.score.toLocaleString());
    if (g.collect) {
      Object.entries(g.collect).forEach(([ci, n]) => {
        parts.push((COLOR_MARKS[ci] || '?') + ' ' + (COLOR_NAMES[ci] || 'Color') + ' ×' + n);
      });
    }
    if (g.clearIce) parts.push('❄ Clear ice');
    else if (g.ice != null) parts.push('❄ ×' + g.ice);
    if (g.cherries != null) parts.push('🍒 ×' + g.cherries);
    if (g.clearStone) parts.push('🪨 Clear stone');
    if (g.clearChocolate) parts.push('🍫 Clear chocolate');
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
    if (g.score != null) bits.push(session.score + ' / ' + g.score);
    if (g.collect) {
      Object.entries(g.collect).forEach(([ci, need]) => {
        const have = session.collected[ci] || 0;
        bits.push((COLOR_MARKS[ci] || '') + ' ' + have + '/' + need);
      });
    }
    if (g.clearIce || g.ice != null) {
      const rem = Match3.countIce(session.iceGrid);
      const target = g.clearIce ? session.initialIce : g.ice;
      const done = session.initialIce - rem;
      bits.push('❄ ' + (g.clearIce ? (rem === 0 ? 'done' : rem + ' left') : (done + '/' + target)));
    }
    if (g.cherries != null) {
      bits.push('🍒 ' + (session.cherries || 0) + '/' + g.cherries);
    }
    if (g.clearStone) {
      const left = Match3.countStones(session.board);
      bits.push('🪨 ' + (left === 0 ? 'done' : left + ' left'));
    }
    if (g.clearChocolate) {
      const left = Match3.countChocolate(session.board);
      bits.push('🍫 ' + (left === 0 ? 'done' : left + ' left'));
    }
    goalEl.textContent = bits.join(' · ');
  }

  function updateComboMeter(cascade) {
    const meter = $('#combo-meter');
    const bars = $('#combo-bars');
    const count = $('#combo-count');
    if (!meter || !bars || !count) return;
    if (!cascade || cascade < 1) {
      meter.hidden = true;
      return;
    }
    meter.hidden = false;
    const n = Math.min(cascade + 1, 8);
    bars.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      if (i < n) s.className = 'on';
      bars.appendChild(s);
    }
    count.textContent = '×' + (cascade + 1);
  }

  function specialClass(special) {
    if (!special) return '';
    if (special === 'stripe_h') return ' special-stripe-h';
    if (special === 'stripe_v') return ' special-stripe-v';
    if (special === 'wrapped') return ' special-wrapped';
    if (special === 'colorbomb') return ' special-colorbomb';
    return '';
  }

  function specialLabel(special) {
    if (special === 'stripe_h') return 'striped row';
    if (special === 'stripe_v') return 'striped column';
    if (special === 'wrapped') return 'wrapped bomb';
    if (special === 'colorbomb') return 'color bomb';
    return '';
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
        const cl = board[r][c];
        const color = cl ? cl.color : -1;
        const cell = document.createElement('button');
        cell.type = 'button';
        let cls = 'gem';
        if (cl && Match3.isStone(cl)) {
          cls += ' gem-stone';
        } else if (cl && Match3.isChocolate(cl)) {
          cls += ' gem-chocolate';
        } else if (cl && Match3.isIngredient(cl)) {
          cls += ' gem-cherry';
        } else if (cl && cl.special === 'colorbomb') {
          cls += ' gem-colorbomb';
        } else if (color >= 0) {
          cls += ' ' + (COLOR_CLASS[color] || '');
        }
        cls += specialClass(cl && cl.special);
        if (cl && cl.ice > 0) cls += ' has-ice ice-' + Math.min(cl.ice, 2);
        if (cl && cl.lock > 0) cls += ' has-lock';
        cell.className = cls;
        cell.dataset.r = r;
        cell.dataset.c = c;

        if (cl && color >= 0 && !Match3.isStone(cl) && !Match3.isChocolate(cl) && !Match3.isIngredient(cl)) {
          const mark = document.createElement('span');
          mark.className = 'color-mark';
          mark.setAttribute('aria-hidden', 'true');
          mark.textContent = COLOR_MARKS[color] || '?';
          cell.appendChild(mark);
          if (cl.special) cell.classList.add('has-color-mark-special');
        }

        let label = 'empty';
        if (cl && Match3.isStone(cl)) label = 'stone ' + cl.stone;
        else if (cl && Match3.isChocolate(cl)) label = 'chocolate';
        else if (cl && Match3.isIngredient(cl)) label = 'cherry';
        else if (cl && cl.special === 'colorbomb') label = 'color bomb';
        else label = (COLOR_NAMES[color] || 'gem') + (cl && cl.special ? ' ' + specialLabel(cl.special) : '');
        if (cl && cl.lock > 0) label += ' locked';
        cell.setAttribute('aria-label', label + ' at ' + (r + 1) + ',' + (c + 1));

        if (cl && Match3.isStone(cl)) {
          const badge = document.createElement('span');
          badge.className = 'stone-badge';
          badge.textContent = '🪨' + (cl.stone > 1 ? cl.stone : '');
          cell.appendChild(badge);
        }
        if (cl && Match3.isChocolate(cl)) {
          const badge = document.createElement('span');
          badge.className = 'choc-badge';
          badge.textContent = '🍫';
          cell.appendChild(badge);
        }
        if (cl && Match3.isIngredient(cl)) {
          const badge = document.createElement('span');
          badge.className = 'cherry-badge';
          badge.textContent = '🍒';
          cell.appendChild(badge);
        }
        if (cl && cl.ice > 0) {
          const ice = document.createElement('span');
          ice.className = 'ice-overlay';
          ice.setAttribute('aria-hidden', 'true');
          cell.appendChild(ice);
        }
        if (cl && cl.lock > 0) {
          const lock = document.createElement('span');
          lock.className = 'lock-overlay';
          lock.setAttribute('aria-hidden', 'true');
          cell.appendChild(lock);
        }
        if (cl && cl.special && cl.special !== 'colorbomb' && !Match3.isStone(cl) && !Match3.isIngredient(cl)) {
          const badge = document.createElement('span');
          badge.className = 'special-badge';
          badge.setAttribute('aria-hidden', 'true');
          if (cl.special === 'stripe_h') badge.textContent = '═';
          else if (cl.special === 'stripe_v') badge.textContent = '║';
          else if (cl.special === 'wrapped') badge.textContent = '◉';
          cell.appendChild(badge);
        }
        if (cl && cl.special === 'colorbomb') {
          const badge = document.createElement('span');
          badge.className = 'special-badge bomb-badge';
          badge.setAttribute('aria-hidden', 'true');
          badge.textContent = '★';
          cell.appendChild(badge);
        }
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

  function reduceFxOn() {
    try { return !!(Storage && Storage.getReduceFx && Storage.getReduceFx()); } catch (_) { return false; }
  }

  function spawnParticles(cells) {
    if (reduceFxOn()) return;
    const wrap = $('#board-wrap');
    const boardEl = $('#board');
    if (!wrap || !boardEl) return;
    const wrapRect = wrap.getBoundingClientRect();
    cells.forEach(({ r, c, color }) => {
      const el = $(`.gem[data-r="${r}"][data-c="${c}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - wrapRect.left;
      const cy = rect.top + rect.height / 2 - wrapRect.top;
      for (let i = 0; i < 6; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
        const dist = 18 + Math.random() * 22;
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        const colors = ['#ff4d6d', '#4dabf7', '#51cf66', '#ffd43b', '#b197fc', '#ff922b'];
        p.style.background = colors[color >= 0 ? color % colors.length : i % colors.length];
        wrap.appendChild(p);
        setTimeout(() => p.remove(), 450);
      }
    });
  }

  function showScorePopup(amount, cascade) {
    if (reduceFxOn()) return;
    const wrap = $('#board-wrap');
    if (!wrap || !amount) return;
    const pop = document.createElement('div');
    pop.className = 'score-popup' + (cascade > 0 ? ' cascade' : '');
    pop.textContent = '+' + amount + (cascade > 1 ? ' ×' + cascade : '');
    wrap.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  function flashSpecialSpawns(spawns) {
    (spawns || []).forEach((s) => {
      const el = $(`.gem[data-r="${s.r}"][data-c="${s.c}"]`);
      if (el) {
        el.classList.add('special-flash');
        setTimeout(() => el.classList.remove('special-flash'), 400);
      }
    });
    if (spawns && spawns.length && global.AudioFX) global.AudioFX.special();
  }

  async function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function playResult(result) {
    if (!result || !result.ok) {
      if (result && result.swapBack) {
        if (global.AudioFX) global.AudioFX.swap();
        const a = $(`.gem[data-r="${result.from.r}"][data-c="${result.from.c}"]`);
        const b = $(`.gem[data-r="${result.to.r}"][data-c="${result.to.c}"]`);
        [a, b].forEach((el) => {
          if (el) {
            el.classList.add('shake');
            setTimeout(() => el.classList.remove('shake'), 280);
          }
        });
      }
      scheduleHint();
      return;
    }

    clearHint();
    animating = true;
    session.busy = true;

    if (result.cascades > 0) {
      Storage.recordQuestCascades(result.cascades);
    }

    if (global.AudioFX) global.AudioFX.swap();
    await wait(100);

    if (result.steps && result.steps.length) {
      for (const step of result.steps) {
        if (step.type === 'clear') {
          flashMatches(step.cells);
          spawnParticles(step.cells);
          if (step.scoreGain) showScorePopup(step.scoreGain, step.cascade || 0);
          updateComboMeter(step.cascade || 0);
          if (global.AudioFX) global.AudioFX.match(step.cascade || 0);
          await wait(200);
          if (step.spawns && step.spawns.length) {
            renderBoard(true);
            flashSpecialSpawns(step.spawns);
            await wait(160);
          }
        } else if (step.type === 'special_spawn') {
          renderBoard(true);
          flashSpecialSpawns(step.spawns);
          await wait(140);
        } else if (step.type === 'chocolate_spread') {
          renderBoard(true);
          const tip = $('#shuffle-tip');
          if (tip) {
            tip.textContent = '🍫 Chocolate spread!';
            tip.hidden = false;
            setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 900);
          }
          await wait(180);
        } else if (step.type === 'ingredient') {
          renderBoard(true);
          const tip = $('#shuffle-tip');
          if (tip) {
            tip.textContent = '🍒 Collected!';
            tip.hidden = false;
            setTimeout(() => { tip.hidden = true; }, 900);
          }
          await wait(180);
        } else if (step.type === 'gravity' || step.type === 'spawn') {
          if (global.AudioFX && step.type === 'gravity') global.AudioFX.drop();
          await wait(50);
        }
      }
    }

    renderBoard(false);
    updateHUD();
    setTimeout(() => updateComboMeter(0), 1200);

    if (result.shuffled) {
      const tip = $('#shuffle-tip');
      if (tip) {
        tip.textContent = 'Board shuffled';
        tip.hidden = false;
        setTimeout(() => { tip.hidden = true; }, 1600);
      }
    }

    if (result.combo) {
      const tip = $('#shuffle-tip');
      if (tip) {
        tip.textContent = 'Combo! ' + result.combo;
        tip.hidden = false;
        setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 1400);
      }
    }

    animating = false;
    session.busy = false;
    renderBoosterBar();
    updateUndoBtn();

    if (result.won) {
      onWin(result.stars);
    } else if (result.lost) {
      onLose();
    } else {
      scheduleHint();
    }
  }

  function updateUndoBtn() {
    const btn = $('#btn-undo');
    if (!btn) return;
    const can = !!(session && session.undoAvailable && session.undoSnapshot && !animating && !session.won);
    btn.disabled = !can;
  }

  function renderBoosterBar() {
    const bar = $('#booster-bar');
    if (!bar) return;
    const inv = Storage.getBoosters();
    bar.innerHTML = '';
    IN_LEVEL_BOOSTERS.forEach((type) => {
      const meta = BOOSTER_META[type];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booster-btn' + (activeBooster === type ? ' active' : '');
      const busy = animating || (session && (session.won || session.lost));
      btn.disabled = (inv[type] || 0) < 1 || busy;
      btn.textContent = meta.icon + ' ' + (inv[type] || 0);
      btn.title = meta.name + ' — ' + meta.desc;
      btn.addEventListener('click', () => {
        if (global.AudioFX) global.AudioFX.click();
        if (type === 'plusMoves') {
          if (!Storage.spendBooster(type)) return;
          const result = Match3.usePlusMoves(session);
          if (!result.ok) {
            Storage.addBooster(type, 1);
            return;
          }
          activeBooster = null;
          freeSwitchFrom = null;
          updateHUD();
          renderBoosterBar();
          updateUndoBtn();
          const tip = $('#shuffle-tip');
          if (tip) {
            tip.textContent = '+5 moves!';
            tip.hidden = false;
            setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 1200);
          }
          scheduleHint();
          return;
        }
        if (activeBooster === type) {
          activeBooster = null;
          freeSwitchFrom = null;
          $('#booster-hint').textContent = 'Swipe or tap adjacent bubbles to swap';
        } else {
          activeBooster = type;
          freeSwitchFrom = null;
          session.selected = null;
          clearHint();
          const hints = {
            hammer: 'Tap a tile to smash with Hammer',
            freeSwitch: 'Tap two adjacent gems to free-swap',
            rowBlast: 'Tap a row to blast',
            colorBrush: 'Tap a color to clear all of it'
          };
          $('#booster-hint').textContent = hints[type] || '';
        }
        renderBoosterBar();
        renderBoard(true);
      });
      bar.appendChild(btn);
    });
    updateUndoBtn();
  }

  function onCellTap(r, c) {
    if (!session || animating || session.won || session.lost) return;
    if (global.AudioFX) global.AudioFX.resume();
    clearHint();

    if (activeBooster) {
      const type = activeBooster;
      if (type === 'freeSwitch') {
        if (!freeSwitchFrom) {
          freeSwitchFrom = { r, c };
          session.selected = { r, c };
          if (global.AudioFX) global.AudioFX.select();
          renderBoard(true);
          $('#booster-hint').textContent = 'Tap an adjacent gem to free-swap';
          return;
        }
        const from = freeSwitchFrom;
        freeSwitchFrom = null;
        if (!Match3.areAdjacent(from.r, from.c, r, c)) {
          freeSwitchFrom = { r, c };
          session.selected = { r, c };
          renderBoard(true);
          return;
        }
        if (!Storage.spendBooster(type)) {
          activeBooster = null;
          session.selected = null;
          renderBoosterBar();
          return;
        }
        const result = Match3.useFreeSwitch(session, from.r, from.c, r, c);
        activeBooster = null;
        session.selected = null;
        $('#booster-hint').textContent = 'Swipe or tap adjacent bubbles to swap';
        renderBoosterBar();
        if (!result || !result.ok) {
          Storage.addBooster(type, 1);
          renderBoosterBar();
          scheduleHint();
          return;
        }
        playResult(result);
        return;
      }
      if (!Storage.spendBooster(type)) {
        activeBooster = null;
        renderBoosterBar();
        return;
      }
      let result = null;
      if (type === 'hammer') result = Match3.useHammer(session, r, c);
      else if (type === 'rowBlast') result = Match3.useRowBlast(session, r, c);
      else if (type === 'colorBrush') result = Match3.useColorBrush(session, r, c);
      activeBooster = null;
      freeSwitchFrom = null;
      $('#booster-hint').textContent = 'Swipe or tap adjacent bubbles to swap';
      renderBoosterBar();
      if (!result || !result.ok) {
        Storage.addBooster(type, 1);
        renderBoosterBar();
        scheduleHint();
        return;
      }
      playResult(result);
      return;
    }

    if (!session.selected) {
      session.selected = { r, c };
      if (global.AudioFX) global.AudioFX.select();
      renderBoard(true);
      scheduleHint();
      return;
    }

    const s = session.selected;
    if (s.r === r && s.c === c) {
      session.selected = null;
      renderBoard(true);
      scheduleHint();
      return;
    }

    if (!Match3.areAdjacent(s.r, s.c, r, c)) {
      session.selected = { r, c };
      if (global.AudioFX) global.AudioFX.select();
      renderBoard(true);
      scheduleHint();
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
      if (activeBooster) { pointerStart = null; return; }
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
          clearHint();
          session.selected = null;
          const result = Match3.trySwap(session, pointerStart.r, pointerStart.c, tr, tc);
          playResult(result);
        }
      }
      pointerStart = null;
    });

    grid.addEventListener('pointercancel', () => { pointerStart = null; });
  }

  function openPreLevel(id) {
    const level = Levels.getLevel(id);
    if (!level || !Storage.isUnlocked(id)) return;
    currentLevelId = id;
    pendingBooster = null;
    $('#prelevel-title').textContent = 'Lv ' + level.id + ' · ' + level.name;
    $('#prelevel-goal').textContent = formatGoal(level);
    const wrap = $('#prelevel-boosters');
    wrap.innerHTML = '';
    const inv = Storage.getBoosters();
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'booster-card selected';
    none.innerHTML = '<div class="b-icon">✋</div><div>None</div><div class="b-count">no booster</div>';
    none.addEventListener('click', () => {
      pendingBooster = null;
      $$('.booster-card', wrap).forEach((el) => el.classList.remove('selected'));
      none.classList.add('selected');
    });
    wrap.appendChild(none);
    PRE_BOOSTER_ORDER.forEach((type) => {
      const meta = BOOSTER_META[type];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booster-card';
      btn.disabled = (inv[type] || 0) < 1;
      btn.innerHTML =
        '<div class="b-icon">' + meta.icon + '</div>' +
        '<div>' + meta.name + '</div>' +
        '<div class="b-count">×' + (inv[type] || 0) + (meta.instant ? ' · auto' : '') + '</div>';
      btn.addEventListener('click', () => {
        if ((inv[type] || 0) < 1) return;
        pendingBooster = type;
        $$('.booster-card', wrap).forEach((el) => el.classList.remove('selected'));
        btn.classList.add('selected');
      });
      wrap.appendChild(btn);
    });
    showScreen('screen-prelevel');
  }

  function startLevel(id) {
    const level = Levels.getLevel(id);
    if (!level) return;
    if (!Storage.isUnlocked(id)) return;
    clearHint();
    currentLevelId = id;
    activeBooster = null;
    freeSwitchFrom = null;
    session = Match3.createSession(level);
    const equipped = pendingBooster;
    pendingBooster = null;
    if (equipped) {
      const meta = BOOSTER_META[equipped];
      if (meta && meta.instant) {
        if (Storage.spendBooster(equipped)) {
          if (equipped === 'colorBombStart') {
            Match3.placeColorBombStart(session);
          } else if (equipped === 'plusMoves') {
            Match3.usePlusMoves(session);
          }
          $('#booster-hint').textContent = meta.name + ' applied!';
        } else {
          $('#booster-hint').textContent = 'Swipe or tap adjacent bubbles to swap';
        }
      } else {
        activeBooster = equipped;
        const hints = {
          hammer: 'Tap a tile to smash with Hammer',
          freeSwitch: 'Tap two adjacent gems to free-swap',
          rowBlast: 'Tap a row to blast',
          colorBrush: 'Tap a color to clear all of it'
        };
        $('#booster-hint').textContent = hints[equipped] || '';
      }
    } else {
      $('#booster-hint').textContent = 'Swipe or tap adjacent bubbles to swap';
    }
    $('#level-title').textContent = level.name;
    updateHUD();
    updateComboMeter(0);
    renderBoard(false);
    renderBoosterBar();
    updateUndoBtn();
    showScreen('screen-game');
    $('#modal-win').hidden = true;
    $('#modal-lose').hidden = true;
    Ads.hideBanner();
    scheduleHint();
  }

  async function onWin(stars) {
    clearHint();
    if (global.AudioFX) global.AudioFX.win();
    const rec = Storage.recordWin(currentLevelId, session.score, stars);
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#win-stars').textContent = starStr;
    $('#win-score').textContent = session.score.toLocaleString();
    $('#win-best').textContent = rec.isNewBest ? 'New best!' : '';
    lastCashBonus = rec.cashBonus || 0;
    const winCash = $('#win-cash');
    if (winCash) winCash.textContent = '+' + lastCashBonus + ' Coins';
    const dbl = $('#btn-double-cash');
    if (dbl) dbl.disabled = false;
    refreshCash();
    refreshQuests();
    const nextId = currentLevelId + 1;
    const hasNext = nextId <= Levels.getLevelCount() && Storage.isUnlocked(nextId);
    $('#btn-next-level').hidden = !hasNext;
    $('#modal-win').hidden = false;
    try { await Ads.showInterstitial(); } catch (_) {}
  }

  function onLose() {
    clearHint();
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
      const hasIce = !!(lv.ice || (lv.goals && (lv.goals.clearIce || lv.goals.ice)));
      const hasCherry = !!(lv.goals && lv.goals.cherries);
      const hasStone = !!(lv.stone || (lv.goals && lv.goals.clearStone));
      const hasChoc = !!(lv.chocolate || (lv.goals && lv.goals.clearChocolate));
      btn.className = 'level-btn' + (unlocked ? '' : ' locked') + (rec.stars > 0 ? ' cleared' : '') +
        (hasIce ? ' has-ice-level' : '') + (hasCherry ? ' has-cherry-level' : '') +
        (hasStone ? ' has-stone-level' : '') + (hasChoc ? ' has-choc-level' : '');
      btn.disabled = !unlocked;
      let badges = '';
      if (hasIce && unlocked) badges += '<span class="lv-ice">❄</span>';
      if (hasCherry && unlocked) badges += '<span class="lv-cherry">🍒</span>';
      if (hasStone && unlocked) badges += '<span class="lv-ice">🪨</span>';
      if (hasChoc && unlocked) badges += '<span class="lv-choc">🍫</span>';
      btn.innerHTML =
        '<span class="lv-num">' + lv.id + '</span>' +
        '<span class="lv-stars">' + (unlocked ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : '🔒') + '</span>' +
        badges;
      btn.title = lv.name + (unlocked ? '' : ' (locked)');
      if (unlocked) {
        btn.addEventListener('click', () => {
          if (global.AudioFX) global.AudioFX.click();
          openPreLevel(lv.id);
        });
      }
      grid.appendChild(btn);
    });
    $('#progress-summary').textContent =
      'Unlocked ' + progress.unlocked + '/' + Levels.getLevelCount() +
      ' · ★ ' + (progress.totalStars || 0);
  }

  function openLevels() {
    clearHint();
    renderLevelSelect();
    refreshCash();
    showScreen('screen-levels');
  }

  function openShop() {
    const list = $('#shop-list');
    list.innerHTML = '';
    const prices = Storage.BOOSTER_PRICES;
    const inv = Storage.getBoosters();
    PRE_BOOSTER_ORDER.forEach((type) => {
      const meta = BOOSTER_META[type];
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML =
        '<div class="b-icon">' + meta.icon + '</div>' +
        '<div><strong>' + meta.name + '</strong></div>' +
        '<div class="b-count">' + meta.desc + ' · own ×' + (inv[type] || 0) + '</div>' +
        '<button type="button" class="btn btn-primary" style="margin-top:8px;padding:8px 14px;font-size:.9rem">Buy 🪙' + prices[type] + '</button>';
      const buyBtn = card.querySelector('button');
      buyBtn.addEventListener('click', () => {
        if (global.AudioFX) global.AudioFX.click();
        const r = Storage.buyBooster(type);
        if (r.ok) {
          if (global.AudioFX) global.AudioFX.cash();
          refreshCash();
          openShop();
        } else {
          const tip = document.createElement('p');
          tip.className = 'fine-print';
          tip.textContent = 'Not enough coins';
          tip.style.color = 'var(--accent)';
          card.appendChild(tip);
          setTimeout(() => tip.remove(), 1200);
        }
      });
      list.appendChild(card);
    });
    refreshCash();
    showScreen('screen-shop');
  }

  function refreshCash() {
    const p = Storage.getProgress();
    document.querySelectorAll('[data-cow-cash]').forEach((el) => {
      el.textContent = String(p.cowCash || 0);
    });
    const cashBtn = document.getElementById('btn-continue-cash');
    if (cashBtn && session) {
      const cost = (Ads && Ads.CONTINUE_COST) || Storage.CONTINUE_COST || 50;
      cashBtn.textContent = 'Continue — ' + cost + ' 🪙 (' + (p.cowCash || 0) + ')';
      cashBtn.disabled = (p.cowCash || 0) < cost || !!session.continued;
      cashBtn.hidden = !!session.continued;
    }
  }

  function refreshQuests() {
    const q = Storage.getQuest();
    const winsLabel = $('#quest-wins-label');
    const cascLabel = $('#quest-cascades-label');
    const btnW = $('#btn-claim-wins');
    const btnC = $('#btn-claim-cascades');
    if (winsLabel) winsLabel.textContent = 'Win 3 levels (' + Math.min(q.wins, 3) + '/3)';
    if (cascLabel) cascLabel.textContent = 'Make 10 cascades (' + Math.min(q.cascades, 10) + '/10)';
    if (btnW) {
      btnW.disabled = q.winClaimed || q.wins < 3;
      btnW.textContent = q.winClaimed ? 'Claimed' : 'Claim 🪙' + Storage.QUEST_REWARD;
    }
    if (btnC) {
      btnC.disabled = q.cascadeClaimed || q.cascades < 10;
      btnC.textContent = q.cascadeClaimed ? 'Claimed' : 'Claim 🪙' + Storage.QUEST_REWARD;
    }
  }

  function openSettings() {
    clearHint();
    const p = Storage.getProgress();
    const soundEl = $('#setting-sound');
    const fxEl = $('#setting-reduce-fx');
    if (soundEl) soundEl.checked = !!p.sound;
    if (fxEl) fxEl.checked = !!p.reduceFx;
    showScreen('screen-settings');
  }

  function openMenu() {
    clearHint();
    const p = Storage.getProgress();
    $('#menu-stars').textContent = '★ ' + (p.totalStars || 0);
    $('#menu-unlocked').textContent = 'Level ' + p.unlocked + '/' + Levels.getLevelCount();
    const soundBtn = $('#btn-sound');
    if (soundBtn) soundBtn.textContent = p.sound ? '🔊 Sound' : '🔇 Muted';
    const themeBtn = $('#btn-theme');
    if (themeBtn) themeBtn.textContent = '🎨 Theme: ' + (p.theme || 'neon');
    refreshCash();
    refreshQuests();
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
      openPreLevel(Math.min(p.unlocked, Levels.getLevelCount()));
    });
    $('#btn-levels-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openMenu();
    });
    $('#btn-game-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openLevels();
    });
    $('#btn-prelevel-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openLevels();
    });
    $('#btn-start-level').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      startLevel(currentLevelId);
    });
    $('#btn-shop').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openShop();
    });
    $('#btn-shop-back').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openMenu();
    });
    const settingsBtn = $('#btn-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openSettings();
    });
    const settingsBack = $('#btn-settings-back');
    if (settingsBack) settingsBack.addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      openMenu();
    });
    const settingSound = $('#setting-sound');
    if (settingSound) settingSound.addEventListener('change', () => {
      Storage.setSound(!!settingSound.checked);
      if (global.AudioFX) {
        global.AudioFX.setEnabled(!!settingSound.checked);
        if (settingSound.checked) global.AudioFX.click();
      }
    });
    const settingFx = $('#setting-reduce-fx');
    if (settingFx) settingFx.addEventListener('change', () => {
      Storage.setReduceFx(!!settingFx.checked);
      if (global.AudioFX) global.AudioFX.click();
    });
    const settingsTheme = $('#btn-settings-theme');
    if (settingsTheme) settingsTheme.addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      const cur = Storage.getTheme();
      const idx = THEMES.indexOf(cur);
      const next = THEMES[(idx + 1) % THEMES.length];
      applyTheme(next);
      settingsTheme.textContent = '🎨 Theme: ' + next;
    });
    const settingsReset = $('#btn-settings-reset');
    if (settingsReset) settingsReset.addEventListener('click', () => {
      if (confirm('Reset all level progress?')) {
        Storage.resetAll();
        openMenu();
      }
    });
    const undoBtn = $('#btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => {
      if (!session || animating) return;
      if (global.AudioFX) global.AudioFX.click();
      const r = Match3.undoOnce(session);
      if (!r.ok) return;
      freeSwitchFrom = null;
      activeBooster = null;
      session.selected = null;
      renderBoard(true);
      updateHUD();
      renderBoosterBar();
      updateUndoBtn();
      const tip = $('#shuffle-tip');
      if (tip) {
        tip.textContent = 'Undone';
        tip.hidden = false;
        setTimeout(() => { tip.hidden = true; tip.textContent = 'Board shuffled'; }, 1000);
      }
      scheduleHint();
    });
    $('#btn-theme').addEventListener('click', () => {
      if (global.AudioFX) global.AudioFX.click();
      const cur = Storage.getTheme();
      const idx = THEMES.indexOf(cur);
      const next = THEMES[(idx + 1) % THEMES.length];
      applyTheme(next);
      openMenu();
    });
    $('#btn-claim-wins').addEventListener('click', () => {
      const r = Storage.claimQuest('wins');
      if (r.ok) {
        if (global.AudioFX) global.AudioFX.cash();
        refreshCash();
        refreshQuests();
      }
    });
    $('#btn-claim-cascades').addEventListener('click', () => {
      const r = Storage.claimQuest('cascades');
      if (r.ok) {
        if (global.AudioFX) global.AudioFX.cash();
        refreshCash();
        refreshQuests();
      }
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
      if (next <= Levels.getLevelCount()) openPreLevel(next);
      else openLevels();
    });
    $('#btn-win-levels').addEventListener('click', () => {
      $('#modal-win').hidden = true;
      openLevels();
    });
    $('#btn-retry').addEventListener('click', () => {
      $('#modal-lose').hidden = true;
      if (global.AudioFX) global.AudioFX.click();
      openPreLevel(currentLevelId);
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
        scheduleHint();
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
        if (winCash) winCash.textContent = '+' + (lastCashBonus * 2) + ' Coins (2×)';
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
        scheduleHint();
      }
    });
  }

  function init() {
    applyTheme(Storage.getTheme());
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

  global.UI = { startLevel, openLevels, openMenu, openShop, openPreLevel, openSettings, formatGoal };
})(window);
