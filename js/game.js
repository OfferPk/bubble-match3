/**
 * Match-3 engine: legal adjacent swaps, cascades, specials, ice, stone, lock,
 * chocolate, ingredient drops, boosters, undo, shuffle, hint.
 * Specials: stripe (4), wrapped/bomb (L/T), color bomb (5-line).
 * Combos: stripe+stripe, stripe+wrapped, color+stripe.
 * Boosters: hammer, rowBlast, colorBrush, freeSwitch, colorBombStart, plusMoves.
 */
(function (global) {
  'use strict';

  const SCORE_PER_GEM = 50;
  const SCORE_MATCH4 = 80;
  const SCORE_MATCH5 = 120;
  const CASCADE_BONUS = 25;
  const SPECIAL_BONUS = 200;
  const ICE_BONUS = 30;
  const CONTINUE_MOVES = 5;
  const LEFTOVER_MOVE_SCORE = 150;

  const SP = {
    STRIPE_H: 'stripe_h',
    STRIPE_V: 'stripe_v',
    WRAPPED: 'wrapped',
    COLORBOMB: 'colorbomb'
  };

  const STONE_HITS = 2;
  const ING_CHERRY = 'cherry';

  function cell(color, special, ice, opts) {
    opts = opts || {};
    return {
      color: color,
      special: special || null,
      ice: ice || 0,
      stone: opts.stone || 0,
      lock: opts.lock || 0,
      ingredient: opts.ingredient || null,
      chocolate: opts.chocolate || 0
    };
  }

  function cloneCell(c) {
    if (!c) return null;
    return cell(c.color, c.special, c.ice, {
      stone: c.stone || 0,
      lock: c.lock || 0,
      ingredient: c.ingredient || null,
      chocolate: c.chocolate || 0
    });
  }

  function isStone(c) { return !!(c && c.stone > 0); }
  function isChocolate(c) { return !!(c && c.chocolate > 0); }
  function isIngredient(c) { return !!(c && c.ingredient); }
  function isBlocker(c) { return isStone(c) || isChocolate(c); }
  function canSwapCell(c) {
    if (!c) return false;
    if (isStone(c)) return false;
    if (isChocolate(c)) return false;
    if (isIngredient(c)) return false;
    return true;
  }

  function key(r, c) { return r + ',' + c; }
  function parseKey(k) {
    const p = k.split(',');
    return { r: +p[0], c: +p[1] };
  }

  function createBoard(rows, cols, colorCount) {
    const board = [];
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) board[r][c] = null;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = randomColorAvoiding(board, r, c, colorCount);
        board[r][c] = cell(color, null, 0);
      }
    }
    return board;
  }

  function createIceGrid(rows, cols, iceMap) {
    const ice = [];
    for (let r = 0; r < rows; r++) {
      ice[r] = [];
      for (let c = 0; c < cols; c++) {
        ice[r][c] = (iceMap && iceMap[key(r, c)]) ? iceMap[key(r, c)] : 0;
      }
    }
    return ice;
  }

  function buildIceMap(level) {
    const map = {};
    if (!level.ice) return map;
    if (Array.isArray(level.ice)) {
      level.ice.forEach((entry) => {
        if (Array.isArray(entry)) {
          const [r, c, layers] = entry;
          map[key(r, c)] = layers == null ? 1 : layers;
        } else if (entry && typeof entry === 'object') {
          map[key(entry.r, entry.c)] = entry.layers == null ? 1 : entry.layers;
        }
      });
      return map;
    }
    if (typeof level.ice === 'object' && level.ice.pattern) {
      const rows = level.rows;
      const cols = level.cols;
      const layers = level.ice.layers || 1;
      const pat = level.ice.pattern;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let put = false;
          if (pat === 'checker' && (r + c) % 2 === 0) put = true;
          else if (pat === 'border' && (r === 0 || c === 0 || r === rows - 1 || c === cols - 1)) put = true;
          else if (pat === 'center') {
            const mr = Math.floor(rows / 2);
            const mc = Math.floor(cols / 2);
            if (Math.abs(r - mr) <= 1 && Math.abs(c - mc) <= 1) put = true;
          } else if (pat === 'rows' && level.ice.rows && level.ice.rows.indexOf(r) >= 0) put = true;
          else if (pat === 'cols' && level.ice.cols && level.ice.cols.indexOf(c) >= 0) put = true;
          else if (pat === 'full') put = true;
          if (put) map[key(r, c)] = layers;
        }
      }
    }
    return map;
  }

  function fillPatternMap(level, cfg, defaultVal) {
    const map = {};
    if (!cfg) return map;
    if (Array.isArray(cfg)) {
      cfg.forEach((entry) => {
        if (Array.isArray(entry)) {
          const [r, c, v] = entry;
          map[key(r, c)] = v == null ? defaultVal : v;
        } else if (entry && typeof entry === 'object') {
          map[key(entry.r, entry.c)] = entry.hits != null ? entry.hits : (entry.layers != null ? entry.layers : defaultVal);
        }
      });
      return map;
    }
    if (typeof cfg === 'object' && cfg.pattern) {
      const rows = level.rows;
      const cols = level.cols;
      const val = cfg.hits != null ? cfg.hits : (cfg.layers != null ? cfg.layers : defaultVal);
      const pat = cfg.pattern;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let put = false;
          if (pat === 'checker' && (r + c) % 2 === 0) put = true;
          else if (pat === 'border' && (r === 0 || c === 0 || r === rows - 1 || c === cols - 1)) put = true;
          else if (pat === 'center') {
            const mr = Math.floor(rows / 2);
            const mc = Math.floor(cols / 2);
            if (Math.abs(r - mr) <= 1 && Math.abs(c - mc) <= 1) put = true;
          } else if (pat === 'rows' && cfg.rows && cfg.rows.indexOf(r) >= 0) put = true;
          else if (pat === 'cols' && cfg.cols && cfg.cols.indexOf(c) >= 0) put = true;
          else if (pat === 'full') put = true;
          if (put) map[key(r, c)] = val;
        }
      }
    }
    return map;
  }

  function buildStoneMap(level) {
    return fillPatternMap(level, level.stone, STONE_HITS);
  }

  function buildLockMap(level) {
    return fillPatternMap(level, level.lock, 1);
  }

  function buildChocolateMap(level) {
    return fillPatternMap(level, level.chocolate, 1);
  }

  function countIce(iceGrid) {
    if (!iceGrid) return 0;
    let n = 0;
    for (let r = 0; r < iceGrid.length; r++) {
      for (let c = 0; c < iceGrid[0].length; c++) n += iceGrid[r][c] || 0;
    }
    return n;
  }

  function countStones(board) {
    let n = 0;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (isStone(board[r][c])) n++;
      }
    }
    return n;
  }

  function countChocolate(board) {
    let n = 0;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (isChocolate(board[r][c])) n++;
      }
    }
    return n;
  }

  /** Sync cell.ice from iceGrid for UI convenience */
  function syncIceToCells(board, iceGrid) {
    if (!iceGrid) return;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (board[r][c]) board[r][c].ice = iceGrid[r][c] || 0;
      }
    }
  }

  function randomColorAvoiding(board, r, c, colorCount) {
    let tries = 0;
    while (tries < 50) {
      const color = Math.floor(Math.random() * colorCount);
      let ok = true;
      if (c >= 2 && board[r][c - 1] && board[r][c - 2] &&
          board[r][c - 1].color === color && board[r][c - 2].color === color &&
          !board[r][c - 1].special && !board[r][c - 2].special) ok = false;
      if (r >= 2 && board[r - 1][c] && board[r - 2][c] &&
          board[r - 1][c].color === color && board[r - 2][c].color === color &&
          !board[r - 1][c].special && !board[r - 2][c].special) ok = false;
      if (ok) return color;
      tries++;
    }
    return Math.floor(Math.random() * colorCount);
  }

  function sameColor(a, b) {
    if (!a || !b) return false;
    if (isStone(a) || isStone(b) || isChocolate(a) || isChocolate(b) || isIngredient(a) || isIngredient(b)) return false;
    if (a.special === SP.COLORBOMB || b.special === SP.COLORBOMB) return false;
    return a.color === b.color && a.color >= 0;
  }

  /** Find horizontal & vertical runs of length >= 3 */
  function findRuns(board) {
    const rows = board.length;
    const cols = board[0].length;
    const runs = [];
    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const cur = board[r][c];
        if (!cur || isStone(cur) || isChocolate(cur) || isIngredient(cur) || cur.special === SP.COLORBOMB || cur.color < 0) { c++; continue; }
        let end = c + 1;
        while (end < cols && sameColor(board[r][end], cur)) end++;
        if (end - c >= 3) {
          const cells = [];
          for (let k = c; k < end; k++) cells.push({ r, c: k });
          runs.push({ cells, color: cur.color, dir: 'h', len: end - c });
        }
        c = end;
      }
    }
    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const cur = board[r][c];
        if (!cur || isStone(cur) || isChocolate(cur) || isIngredient(cur) || cur.special === SP.COLORBOMB || cur.color < 0) { r++; continue; }
        let end = r + 1;
        while (end < rows && sameColor(board[end][c], cur)) end++;
        if (end - r >= 3) {
          const cells = [];
          for (let k = r; k < end; k++) cells.push({ r: k, c });
          runs.push({ cells, color: cur.color, dir: 'v', len: end - r });
        }
        r = end;
      }
    }
    return runs;
  }

  /**
   * Analyze runs → matched cells + specials to spawn.
   * preferPos = {r,c} preferred spawn (swap destination).
   */
  function analyzeMatches(board, preferPos) {
    const runs = findRuns(board);
    if (!runs.length) {
      return { matched: new Set(), spawns: [], activations: [] };
    }

    const matched = new Set();
    const cellRuns = {}; // key -> runs containing it
    runs.forEach((run, idx) => {
      run.cells.forEach((p) => {
        const k = key(p.r, p.c);
        matched.add(k);
        if (!cellRuns[k]) cellRuns[k] = [];
        cellRuns[k].push(idx);
      });
    });

    // Group runs by color into components via shared cells
    const used = new Array(runs.length).fill(false);
    const groups = [];
    for (let i = 0; i < runs.length; i++) {
      if (used[i]) continue;
      const queue = [i];
      used[i] = true;
      const gRuns = [];
      const gCells = new Set();
      while (queue.length) {
        const ri = queue.shift();
        gRuns.push(runs[ri]);
        runs[ri].cells.forEach((p) => {
          const k = key(p.r, p.c);
          gCells.add(k);
          (cellRuns[k] || []).forEach((oj) => {
            if (!used[oj] && runs[oj].color === runs[ri].color) {
              used[oj] = true;
              queue.push(oj);
            }
          });
        });
      }
      groups.push({ runs: gRuns, cells: gCells, color: gRuns[0].color });
    }

    const spawns = [];
    const spawnKeys = new Set();

    groups.forEach((g) => {
      const hasH = g.runs.some((r) => r.dir === 'h');
      const hasV = g.runs.some((r) => r.dir === 'v');
      const maxLen = Math.max.apply(null, g.runs.map((r) => r.len));
      const line5 = g.runs.find((r) => r.len >= 5);
      let specialType = null;
      let dirHint = null;

      if (line5) {
        specialType = SP.COLORBOMB;
        dirHint = line5.dir;
      } else if (hasH && hasV && g.cells.size >= 5) {
        specialType = SP.WRAPPED;
      } else if (maxLen >= 4) {
        const run4 = g.runs.find((r) => r.len >= 4);
        specialType = run4.dir === 'h' ? SP.STRIPE_V : SP.STRIPE_H;
        // stripe clears perpendicular to the match line (Candy Crush style)
        dirHint = run4.dir;
      }

      if (!specialType) return;

      let spawnAt = null;
      if (preferPos && g.cells.has(key(preferPos.r, preferPos.c))) {
        spawnAt = preferPos;
      } else {
        // pick center-ish cell
        const arr = Array.from(g.cells).map(parseKey);
        arr.sort((a, b) => a.r - b.r || a.c - b.c);
        spawnAt = arr[Math.floor(arr.length / 2)];
      }
      const sk = key(spawnAt.r, spawnAt.c);
      if (spawnKeys.has(sk)) return;
      spawnKeys.add(sk);
      spawns.push({
        r: spawnAt.r,
        c: spawnAt.c,
        special: specialType,
        color: specialType === SP.COLORBOMB ? -1 : g.color
      });
    });

    // Specials sitting in matched cells activate (except the spawn cell being created)
    const activations = [];
    matched.forEach((k) => {
      const { r, c } = parseKey(k);
      const cl = board[r][c];
      if (!cl || !cl.special) return;
      if (spawnKeys.has(k)) return;
      activations.push({ r, c, special: cl.special, color: cl.color });
    });

    return { matched, spawns, activations };
  }

  function collectBlast(board, r, c, special, partnerColor, visited) {
    const rows = board.length;
    const cols = board[0].length;
    const out = new Set();
    const v = visited || new Set();
    const k0 = key(r, c);
    if (v.has(k0 + ':' + special)) return out;
    v.add(k0 + ':' + special);

    function addCell(rr, cc) {
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return;
      if (!board[rr][cc]) return;
      out.add(key(rr, cc));
    }

    if (special === SP.STRIPE_H) {
      for (let cc = 0; cc < cols; cc++) addCell(r, cc);
    } else if (special === SP.STRIPE_V) {
      for (let rr = 0; rr < rows; rr++) addCell(rr, c);
    } else if (special === SP.WRAPPED) {
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) addCell(rr, cc);
      }
    } else if (special === SP.COLORBOMB) {
      const target = partnerColor;
      if (target == null || target < 0) {
        // fallback: clear most common color
        const counts = {};
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            const cl = board[rr][cc];
            if (cl && cl.color >= 0 && cl.special !== SP.COLORBOMB) {
              counts[cl.color] = (counts[cl.color] || 0) + 1;
            }
          }
        }
        let best = 0; let bestN = -1;
        Object.keys(counts).forEach((ck) => {
          if (counts[ck] > bestN) { bestN = counts[ck]; best = +ck; }
        });
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            const cl = board[rr][cc];
            if (cl && cl.color === best) addCell(rr, cc);
          }
        }
      } else {
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            const cl = board[rr][cc];
            if (cl && cl.color === target) addCell(rr, cc);
          }
        }
      }
      addCell(r, c);
    }

    // Chain: if blast hits another special, activate it too
    Array.from(out).forEach((kk) => {
      const p = parseKey(kk);
      if (p.r === r && p.c === c) return;
      const cl = board[p.r][p.c];
      if (cl && cl.special && cl.special !== SP.COLORBOMB) {
        const nested = collectBlast(board, p.r, p.c, cl.special, partnerColor, v);
        nested.forEach((x) => out.add(x));
      }
    });

    return out;
  }

  function clearCells(board, keysSet, spawnMap, iceGrid) {
    const cleared = [];
    const iceHit = [];
    const stoneHit = [];
    const unlocked = [];
    const rows = board.length;
    const cols = board[0].length;

    // Unlock locks adjacent to matched cells
    const adjDirs = [[0,1],[0,-1],[1,0],[-1,0]];
    keysSet.forEach((k) => {
      const { r, c } = parseKey(k);
      adjDirs.forEach(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return;
        const adj = board[rr][cc];
        if (adj && adj.lock > 0 && !keysSet.has(key(rr, cc))) {
          adj.lock -= 1;
          unlocked.push({ r: rr, c: cc, lock: adj.lock });
        }
      });
    });

    keysSet.forEach((k) => {
      const { r, c } = parseKey(k);
      const cl = board[r][c];
      if (!cl) return;

      // Stone: take a hit instead of clearing (unless HP reaches 0)
      if (isStone(cl)) {
        cl.stone -= 1;
        stoneHit.push({ r, c, after: cl.stone });
        if (cl.stone <= 0) {
          cleared.push({ r, c, color: -2, special: null, stone: true });
          board[r][c] = null;
        }
        return;
      }

      // Chocolate: one hit clears
      if (isChocolate(cl)) {
        cleared.push({ r, c, color: -4, special: null, chocolate: true });
        board[r][c] = null;
        return;
      }

      // Locked gem: match unlocks instead of clearing
      if (cl.lock > 0) {
        cl.lock -= 1;
        unlocked.push({ r, c, lock: cl.lock });
        const iceBefore = iceGrid ? (iceGrid[r][c] || 0) : 0;
        if (iceGrid && iceBefore > 0) {
          iceGrid[r][c] = iceBefore - 1;
          iceHit.push({ r, c, before: iceBefore, after: iceGrid[r][c] });
          cl.ice = iceGrid[r][c];
        }
        return;
      }

      if (isIngredient(cl)) {
        // ingredients only clear via bottom collect, not matches
        return;
      }

      const iceBefore = iceGrid ? (iceGrid[r][c] || 0) : 0;
      if (iceGrid && iceBefore > 0) {
        iceGrid[r][c] = iceBefore - 1;
        iceHit.push({ r, c, before: iceBefore, after: iceGrid[r][c] });
      }
      if (spawnMap && spawnMap[k]) {
        cleared.push({ r, c, color: cl.color, special: cl.special, becameSpecial: spawnMap[k].special });
        board[r][c] = cell(
          spawnMap[k].color >= 0 ? spawnMap[k].color : 0,
          spawnMap[k].special,
          iceGrid ? iceGrid[r][c] : 0
        );
        if (spawnMap[k].special === SP.COLORBOMB) board[r][c].color = -1;
        return;
      }
      cleared.push({ r, c, color: cl.color, special: cl.special });
      board[r][c] = null;
    });
    return { cleared, iceHit, stoneHit, unlocked };
  }

  function applyGravity(board) {
    const rows = board.length;
    const cols = board[0].length;
    const moves = [];
    for (let c = 0; c < cols; c++) {
      // Stones & chocolate are immobile pillars — fall into gaps between them
      const segments = [];
      let start = 0;
      for (let r = 0; r < rows; r++) {
        if (isStone(board[r][c]) || isChocolate(board[r][c])) {
          if (start < r) segments.push([start, r - 1]);
          start = r + 1;
        }
      }
      if (start < rows) segments.push([start, rows - 1]);

      segments.forEach(([lo, hi]) => {
        let write = hi;
        for (let r = hi; r >= lo; r--) {
          if (board[r][c] && !isStone(board[r][c]) && !isChocolate(board[r][c])) {
            if (write !== r) {
              board[write][c] = board[r][c];
              board[r][c] = null;
              moves.push({
                fromR: r, fromC: c, toR: write, toC: c,
                color: board[write][c].color,
                special: board[write][c].special,
                ingredient: board[write][c].ingredient
              });
            }
            write--;
          }
        }
      });
    }
    return moves;
  }

  /** Collect ingredients that reached the bottom row */
  function collectIngredientsAtBottom(board) {
    const rows = board.length;
    const cols = board[0].length;
    const collected = [];
    for (let c = 0; c < cols; c++) {
      const cl = board[rows - 1][c];
      if (cl && isIngredient(cl)) {
        collected.push({ r: rows - 1, c, ingredient: cl.ingredient });
        board[rows - 1][c] = null;
      }
    }
    return collected;
  }

  function refill(board, colorCount) {
    const rows = board.length;
    const cols = board[0].length;
    const spawned = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (!board[r][c]) {
          const color = Math.floor(Math.random() * colorCount);
          board[r][c] = cell(color, null, 0);
          spawned.push({ r, c, color });
        }
      }
    }
    return spawned;
  }

  function scoreForCleared(cleared, iceHit, cascadeLevel, specialSpawns) {
    let score = 0;
    const byColor = {};
    cleared.forEach((g) => {
      if (g.color >= 0) byColor[g.color] = (byColor[g.color] || 0) + 1;
    });
    const n = cleared.length;
    let base = SCORE_PER_GEM;
    if (n >= 5) base = SCORE_MATCH5;
    else if (n >= 4) base = SCORE_MATCH4;
    score += n * base;
    score += cascadeLevel * CASCADE_BONUS * Math.max(1, n);
    score += (specialSpawns || 0) * SPECIAL_BONUS;
    score += (iceHit || []).length * ICE_BONUS;
    return { score, byColor };
  }

  function areAdjacent(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  }

  function swapCells(board, r1, c1, r2, c2) {
    const t = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = t;
  }

  function hasMatchOrSpecialSwap(board, r1, c1, r2, c2) {
    const a = board[r1][c1];
    const b = board[r2][c2];
    if (!a || !b) return false;
    if (a.special && b.special) return true;
    if (a.special === SP.COLORBOMB || b.special === SP.COLORBOMB) return true;
    const m = analyzeMatches(board);
    return m.matched.size > 0;
  }

  function hasValidMove(board) {
    const rows = board.length;
    const cols = board[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) {
          if (canSwapCell(board[r][c]) && canSwapCell(board[r][c + 1])) {
            swapCells(board, r, c, r, c + 1);
            const ok = hasMatchOrSpecialSwap(board, r, c, r, c + 1);
            swapCells(board, r, c, r, c + 1);
            if (ok) return true;
          }
        }
        if (r + 1 < rows) {
          if (canSwapCell(board[r][c]) && canSwapCell(board[r + 1][c])) {
            swapCells(board, r, c, r + 1, c);
            const ok = hasMatchOrSpecialSwap(board, r, c, r + 1, c);
            swapCells(board, r, c, r + 1, c);
            if (ok) return true;
          }
        }
      }
    }
    return false;
  }

  function findHint(board) {
    const rows = board.length;
    const cols = board[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols && canSwapCell(board[r][c]) && canSwapCell(board[r][c + 1])) {
          swapCells(board, r, c, r, c + 1);
          const ok = hasMatchOrSpecialSwap(board, r, c, r, c + 1);
          swapCells(board, r, c, r, c + 1);
          if (ok) return { from: { r, c }, to: { r, c: c + 1 } };
        }
        if (r + 1 < rows && canSwapCell(board[r][c]) && canSwapCell(board[r + 1][c])) {
          swapCells(board, r, c, r + 1, c);
          const ok = hasMatchOrSpecialSwap(board, r, c, r + 1, c);
          swapCells(board, r, c, r + 1, c);
          if (ok) return { from: { r, c }, to: { r: r + 1, c } };
        }
      }
    }
    return null;
  }

  function shuffleBoard(board, colorCount) {
    const rows = board.length;
    const cols = board[0].length;
    const gems = [];
    const fixed = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cl = board[r][c];
        if (isStone(cl) || isChocolate(cl) || isIngredient(cl)) {
          fixed[key(r, c)] = cloneCell(cl);
        } else {
          gems.push({
            color: cl ? cl.color : 0,
            special: cl ? cl.special : null,
            lock: cl ? (cl.lock || 0) : 0,
            ice: cl ? (cl.ice || 0) : 0
          });
        }
      }
    }
    for (let i = gems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = gems[i]; gems[i] = gems[j]; gems[j] = t;
    }
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (fixed[key(r, c)]) {
          board[r][c] = fixed[key(r, c)];
          continue;
        }
        const g = gems[i++];
        board[r][c] = cell(g.color, g.special, g.ice, { lock: g.lock });
      }
    }
    let guard = 0;
    while (!hasValidMove(board) && guard < 12) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] && !board[r][c].special) {
            board[r][c].color = Math.floor(Math.random() * colorCount);
          }
        }
      }
      const m = analyzeMatches(board);
      if (m.matched.size) {
        m.matched.forEach((k) => {
          const p = parseKey(k);
          if (board[p.r][p.c] && !board[p.r][p.c].special) {
            board[p.r][p.c].color = (board[p.r][p.c].color + 1) % colorCount;
          }
        });
      }
      guard++;
    }
  }

  function resolveMatchWave(board, colorCount, preferPos, extraClear, partnerColor, iceGrid) {
    const steps = [];
    let totalScore = 0;
    const collected = {};
    let iceCleared = 0;
    let cherries = 0;
    let chocolateCleared = 0;
    let cascade = 0;

    let pendingExtra = extraClear ? new Set(extraClear) : new Set();
    let prefer = preferPos;

    function settleIngredients() {
      let got = 0;
      for (let guard = 0; guard < 20; guard++) {
        const dropped = collectIngredientsAtBottom(board);
        if (!dropped.length) break;
        got += dropped.length;
        steps.push({ type: 'ingredient', cells: dropped.slice() });
        steps.push({ type: 'gravity', moves: applyGravity(board) });
      }
      return got;
    }

    for (let safety = 0; safety < 40; safety++) {
      const analysis = analyzeMatches(board, prefer);
      prefer = null;

      const toClear = new Set(analysis.matched);
      pendingExtra.forEach((k) => toClear.add(k));
      pendingExtra = new Set();

      analysis.activations.forEach((act) => {
        const blast = collectBlast(board, act.r, act.c, act.special, partnerColor);
        blast.forEach((k) => toClear.add(k));
      });

      // Also damage stones / chocolate adjacent to matched cells
      const rows = board.length, cols = board[0].length;
      const adjDirs = [[0,1],[0,-1],[1,0],[-1,0]];
      Array.from(toClear).forEach((k) => {
        const p = parseKey(k);
        adjDirs.forEach(([dr, dc]) => {
          const rr = p.r + dr, cc = p.c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return;
          if (isStone(board[rr][cc]) || isChocolate(board[rr][cc])) toClear.add(key(rr, cc));
        });
      });

      if (toClear.size === 0) {
        // still try ingredient settle
        const got = settleIngredients();
        cherries += got;
        if (got > 0) {
          steps.push({ type: 'spawn', cells: refill(board, colorCount) });
          syncIceToCells(board, iceGrid);
          cascade++;
          continue;
        }
        break;
      }

      const spawnMap = {};
      analysis.spawns.forEach((s) => {
        const sk = key(s.r, s.c);
        if (toClear.has(sk)) spawnMap[sk] = s;
      });

      const { cleared, iceHit, stoneHit, unlocked } = clearCells(board, toClear, spawnMap, iceGrid);
      iceCleared += iceHit.length;
      chocolateCleared += cleared.filter((g) => g.chocolate).length;
      const { score, byColor } = scoreForCleared(cleared, iceHit, cascade, analysis.spawns.length);
      totalScore += score;
      Object.keys(byColor).forEach((k) => {
        collected[k] = (collected[k] || 0) + byColor[k];
      });

      syncIceToCells(board, iceGrid);

      steps.push({
        type: 'clear',
        cells: cleared.slice(),
        iceHit: iceHit.slice(),
        stoneHit: (stoneHit || []).slice(),
        unlocked: (unlocked || []).slice(),
        spawns: analysis.spawns.slice(),
        cascade,
        scoreGain: score
      });

      if (analysis.spawns.length) {
        steps.push({ type: 'special_spawn', spawns: analysis.spawns.slice() });
      }

      steps.push({ type: 'gravity', moves: applyGravity(board) });
      cherries += settleIngredients();
      steps.push({ type: 'spawn', cells: refill(board, colorCount) });
      syncIceToCells(board, iceGrid);
      cascade++;
      partnerColor = null;
    }

    return { totalScore, collected, iceCleared, cherries, chocolateCleared, steps, cascades: cascade };
  }

  function handleSpecialCombo(board, r1, c1, r2, c2) {
    const a = board[r1][c1];
    const b = board[r2][c2];
    const clear = new Set();
    const rows = board.length;
    const cols = board[0].length;
    const sa = a.special;
    const sb = b.special;

    function addRow(r) {
      for (let c = 0; c < cols; c++) clear.add(key(r, c));
    }
    function addCol(c) {
      for (let r = 0; r < rows; r++) clear.add(key(r, c));
    }
    function add3x3(r, c) {
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) clear.add(key(rr, cc));
        }
      }
    }

    const isStripe = (s) => s === SP.STRIPE_H || s === SP.STRIPE_V;
    const isWrapped = (s) => s === SP.WRAPPED;
    const isBomb = (s) => s === SP.COLORBOMB;

    // stripe + stripe → cross at both
    if (isStripe(sa) && isStripe(sb)) {
      addRow(r1); addCol(c1);
      addRow(r2); addCol(c2);
      return { clear, combo: 'stripe+stripe', partnerColor: null };
    }

    // stripe + wrapped → 3 rows + 3 cols centered on swap
    if ((isStripe(sa) && isWrapped(sb)) || (isWrapped(sa) && isStripe(sb))) {
      const cr = r2; const cc = c2;
      for (let d = -1; d <= 1; d++) {
        if (cr + d >= 0 && cr + d < rows) addRow(cr + d);
        if (cc + d >= 0 && cc + d < cols) addCol(cc + d);
      }
      return { clear, combo: 'stripe+wrapped', partnerColor: null };
    }

    // color + stripe → all of stripe's color become stripes then fire (approx: clear all of that color + their rows/cols)
    if ((isBomb(sa) && isStripe(sb)) || (isStripe(sa) && isBomb(sb))) {
      const stripe = isStripe(sa) ? a : b;
      const color = stripe.color;
      const stripeDir = stripe.special;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cl = board[r][c];
          if (cl && cl.color === color) {
            clear.add(key(r, c));
            if (stripeDir === SP.STRIPE_H) addRow(r);
            else addCol(c);
          }
        }
      }
      clear.add(key(r1, c1));
      clear.add(key(r2, c2));
      return { clear, combo: 'color+stripe', partnerColor: color };
    }

    // color + wrapped → clear all of wrapped color + 3x3 blasts on each (approx clear all of color + big area)
    if ((isBomb(sa) && isWrapped(sb)) || (isWrapped(sa) && isBomb(sb))) {
      const wrapped = isWrapped(sa) ? a : b;
      const color = wrapped.color;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cl = board[r][c];
          if (cl && cl.color === color) {
            add3x3(r, c);
          }
        }
      }
      clear.add(key(r1, c1));
      clear.add(key(r2, c2));
      return { clear, combo: 'color+wrapped', partnerColor: color };
    }

    // color + color → clear board
    if (isBomb(sa) && isBomb(sb)) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) clear.add(key(r, c));
      }
      return { clear, combo: 'color+color', partnerColor: null };
    }

    // wrapped + wrapped → large double blast
    if (isWrapped(sa) && isWrapped(sb)) {
      for (let rr = Math.min(r1, r2) - 2; rr <= Math.max(r1, r2) + 2; rr++) {
        for (let cc = Math.min(c1, c2) - 2; cc <= Math.max(c1, c2) + 2; cc++) {
          if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) clear.add(key(rr, cc));
        }
      }
      return { clear, combo: 'wrapped+wrapped', partnerColor: null };
    }

    // color + normal gem
    if (isBomb(sa) || isBomb(sb)) {
      const bombIsA = isBomb(sa);
      const other = bombIsA ? b : a;
      const br = bombIsA ? r1 : r2;
      const bc = bombIsA ? c1 : c2;
      const blast = collectBlast(board, br, bc, SP.COLORBOMB, other.color);
      blast.forEach((k) => clear.add(k));
      return { clear, combo: 'color+gem', partnerColor: other.color };
    }

    return null;
  }

  function goalsMet(level, score, collected, iceRemaining, initialIce, cherries, stonesLeft, chocolateLeft) {
    const g = level.goals || {};
    if (g.score != null && score < g.score) return false;
    if (g.collect) {
      for (const [ci, need] of Object.entries(g.collect)) {
        if ((collected[ci] || 0) < need) return false;
      }
    }
    if (g.ice != null) {
      const cleared = (initialIce || 0) - (iceRemaining || 0);
      if (cleared < g.ice) return false;
    }
    if (g.clearIce) {
      if ((iceRemaining || 0) > 0) return false;
    }
    if (g.cherries != null) {
      if ((cherries || 0) < g.cherries) return false;
    }
    if (g.clearStone) {
      if ((stonesLeft || 0) > 0) return false;
    }
    if (g.clearChocolate) {
      if ((chocolateLeft || 0) > 0) return false;
    }
    return true;
  }

  function computeStars(level, score, movesLeft) {
    const effective = score + Math.max(0, movesLeft || 0) * LEFTOVER_MOVE_SCORE;
    const s = level.stars || [0, 0, 0];
    if (effective >= s[2]) return 3;
    if (effective >= s[1]) return 2;
    if (effective >= s[0]) return 1;
    // still won → at least 1
    return 1;
  }

  function createSession(level) {
    const iceMap = buildIceMap(level);
    const stoneMap = buildStoneMap(level);
    const lockMap = buildLockMap(level);
    const chocMap = buildChocolateMap(level);
    const board = createBoard(level.rows, level.cols, level.colors);
    const iceGrid = createIceGrid(level.rows, level.cols, iceMap);

    // Place stones (replace gems)
    Object.keys(stoneMap).forEach((k) => {
      const p = parseKey(k);
      if (p.r >= 0 && p.c >= 0 && p.r < level.rows && p.c < level.cols) {
        board[p.r][p.c] = cell(-2, null, 0, { stone: stoneMap[k] || STONE_HITS });
      }
    });

    // Place chocolate (replace gems)
    Object.keys(chocMap).forEach((k) => {
      const p = parseKey(k);
      if (p.r >= 0 && p.c >= 0 && p.r < level.rows && p.c < level.cols) {
        if (!isStone(board[p.r][p.c])) {
          board[p.r][p.c] = cell(-4, null, 0, { chocolate: 1 });
        }
      }
    });

    // Place locks on gems
    Object.keys(lockMap).forEach((k) => {
      const p = parseKey(k);
      const cl = board[p.r] && board[p.r][p.c];
      if (cl && !isStone(cl) && !isChocolate(cl)) cl.lock = lockMap[k] || 1;
    });

    // Place ingredients
    const ingList = level.ingredients || [];
    ingList.forEach((entry) => {
      let r, c;
      if (Array.isArray(entry)) { r = entry[0]; c = entry[1]; }
      else { r = entry.r; c = entry.c; }
      if (r >= 0 && c >= 0 && r < level.rows && c < level.cols) {
        if (!isStone(board[r][c]) && !isChocolate(board[r][c])) {
          board[r][c] = cell(-3, null, 0, { ingredient: ING_CHERRY });
        }
      }
    });

    let guard = 0;
    while ((!hasValidMove(board) || analyzeMatches(board).matched.size > 0) && guard < 15) {
      if (analyzeMatches(board).matched.size > 0) {
        const m = analyzeMatches(board);
        m.matched.forEach((k) => {
          const p = parseKey(k);
          const cl = board[p.r][p.c];
          if (cl && !isStone(cl) && !isIngredient(cl) && !cl.special) {
            cl.color = (cl.color + 1 + Math.floor(Math.random() * (level.colors - 1))) % level.colors;
          }
        });
      }
      if (!hasValidMove(board)) shuffleBoard(board, level.colors);
      guard++;
    }
    syncIceToCells(board, iceGrid);
    const initialIce = countIce(iceGrid);
    const initialStones = countStones(board);
    return {
      level,
      board,
      iceGrid,
      movesLeft: level.moves,
      score: 0,
      collected: {},
      iceCleared: 0,
      initialIce,
      initialStones,
      initialChocolate: countChocolate(board),
      cherries: 0,
      selected: null,
      busy: false,
      continued: false,
      won: false,
      lost: false,
      boosterMode: null,
      undoAvailable: true,
      undoSnapshot: null
    };
  }

  /** Expand one chocolate onto an adjacent empty/gem cell if possible */
  function spreadChocolate(board) {
    const rows = board.length;
    const cols = board[0].length;
    const choc = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isChocolate(board[r][c])) choc.push({ r, c });
      }
    }
    if (!choc.length) return null;
    const adjDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const candidates = [];
    choc.forEach(({ r, c }) => {
      adjDirs.forEach(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return;
        const cl = board[rr][cc];
        if (!cl) {
          candidates.push({ r: rr, c: cc });
          return;
        }
        if (isStone(cl) || isChocolate(cl) || isIngredient(cl)) return;
        candidates.push({ r: rr, c: cc });
      });
    });
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    board[pick.r][pick.c] = cell(-4, null, board[pick.r][pick.c] ? (board[pick.r][pick.c].ice || 0) : 0, { chocolate: 1 });
    return pick;
  }

  function snapshotSession(session) {
    return {
      board: session.board.map((row) => row.map(cloneCell)),
      iceGrid: session.iceGrid.map((row) => row.slice()),
      movesLeft: session.movesLeft,
      score: session.score,
      collected: Object.assign({}, session.collected),
      iceCleared: session.iceCleared,
      cherries: session.cherries || 0,
      won: session.won,
      lost: session.lost
    };
  }

  function restoreSnapshot(session, snap) {
    if (!snap) return false;
    session.board = snap.board.map((row) => row.map(cloneCell));
    session.iceGrid = snap.iceGrid.map((row) => row.slice());
    session.movesLeft = snap.movesLeft;
    session.score = snap.score;
    session.collected = Object.assign({}, snap.collected);
    session.iceCleared = snap.iceCleared;
    session.cherries = snap.cherries;
    session.won = snap.won;
    session.lost = snap.lost;
    session.selected = null;
    syncIceToCells(session.board, session.iceGrid);
    return true;
  }

  function undoOnce(session) {
    if (!session || !session.undoAvailable || !session.undoSnapshot) return { ok: false, reason: 'none' };
    if (session.busy || session.won) return { ok: false, reason: 'busy' };
    restoreSnapshot(session, session.undoSnapshot);
    session.undoAvailable = false;
    session.undoSnapshot = null;
    session.lost = false;
    return { ok: true, undone: true };
  }

  function trySwap(session, r1, c1, r2, c2) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    if (!areAdjacent(r1, c1, r2, c2)) return { ok: false, reason: 'not-adjacent' };
    if (session.movesLeft <= 0) return { ok: false, reason: 'no-moves' };

    const { board, level } = session;
    const a = board[r1][c1];
    const b = board[r2][c2];
    if (!a || !b) return { ok: false, reason: 'empty' };
    if (!canSwapCell(a) || !canSwapCell(b)) return { ok: false, reason: 'blocked' };

    swapCells(board, r1, c1, r2, c2);

    let extraClear = null;
    let partnerColor = null;
    let comboName = null;
    let legal = false;

    const bothSpecial = a.special && b.special;
    const hasBomb = a.special === SP.COLORBOMB || b.special === SP.COLORBOMB;

    if (bothSpecial || hasBomb) {
      const combo = handleSpecialCombo(board, r1, c1, r2, c2);
      if (combo && combo.clear.size) {
        legal = true;
        extraClear = combo.clear;
        partnerColor = combo.partnerColor;
        comboName = combo.combo;
      }
    }

    if (!legal) {
      const analysis = analyzeMatches(board, { r: r2, c: c2 });
      if (analysis.matched.size > 0) {
        legal = true;
      }
    }

    if (!legal) {
      swapCells(board, r1, c1, r2, c2);
      return {
        ok: false,
        reason: 'no-match',
        swapBack: true,
        from: { r: r1, c: c1 },
        to: { r: r2, c: c2 }
      };
    }

    if (session.undoAvailable) {
      session.undoSnapshot = snapshotSession(session);
    }
    session.movesLeft--;
    const preferPos = { r: r2, c: c2 };
    const result = resolveMatchWave(board, level.colors, preferPos, extraClear, partnerColor, session.iceGrid);
    session.score += result.totalScore;
    Object.keys(result.collected).forEach((k) => {
      session.collected[k] = (session.collected[k] || 0) + result.collected[k];
    });
    session.iceCleared += result.iceCleared;
    session.cherries = (session.cherries || 0) + (result.cherries || 0);
    syncIceToCells(board, session.iceGrid);

    let chocolateSpread = null;
    if (!(result.chocolateCleared > 0) && countChocolate(board) > 0) {
      chocolateSpread = spreadChocolate(board);
      if (chocolateSpread) {
        result.steps.push({ type: 'chocolate_spread', cell: chocolateSpread });
      }
    }

    let shuffled = false;
    if (!hasValidMove(board)) {
      shuffleBoard(board, level.colors);
      syncIceToCells(board, session.iceGrid);
      shuffled = true;
    }

    const iceRemaining = countIce(session.iceGrid);
    const stonesLeft = countStones(board);
    const chocolateLeft = countChocolate(board);
    if (goalsMet(level, session.score, session.collected, iceRemaining, session.initialIce, session.cherries, stonesLeft, chocolateLeft)) {
      session.won = true;
    } else if (session.movesLeft <= 0) {
      session.lost = true;
    }

    const stars = computeStars(level, session.score, session.movesLeft);

    return {
      ok: true,
      from: { r: r1, c: c1 },
      to: { r: r2, c: c2 },
      steps: result.steps,
      score: session.score,
      collected: Object.assign({}, session.collected),
      iceCleared: session.iceCleared,
      iceRemaining,
      cherries: session.cherries,
      stonesLeft,
      chocolateLeft,
      chocolateCleared: result.chocolateCleared || 0,
      chocolateSpread,
      movesLeft: session.movesLeft,
      won: session.won,
      lost: session.lost,
      stars,
      shuffled,
      combo: comboName,
      cascades: result.cascades
    };
  }

  function finalizeAfterBooster(session, result) {
    session.score += result.totalScore;
    Object.keys(result.collected).forEach((k) => {
      session.collected[k] = (session.collected[k] || 0) + result.collected[k];
    });
    session.iceCleared += result.iceCleared;
    session.cherries = (session.cherries || 0) + (result.cherries || 0);
    syncIceToCells(session.board, session.iceGrid);
    let shuffled = false;
    if (!hasValidMove(session.board)) {
      shuffleBoard(session.board, session.level.colors);
      syncIceToCells(session.board, session.iceGrid);
      shuffled = true;
    }
    const iceRemaining = countIce(session.iceGrid);
    const stonesLeft = countStones(session.board);
    const chocolateLeft = countChocolate(session.board);
    if (goalsMet(session.level, session.score, session.collected, iceRemaining, session.initialIce, session.cherries, stonesLeft, chocolateLeft)) {
      session.won = true;
    } else if (session.movesLeft <= 0) {
      session.lost = true;
    }
    return {
      ok: true,
      steps: result.steps,
      score: session.score,
      collected: Object.assign({}, session.collected),
      iceCleared: session.iceCleared,
      iceRemaining,
      cherries: session.cherries,
      stonesLeft,
      chocolateLeft,
      chocolateCleared: result.chocolateCleared || 0,
      movesLeft: session.movesLeft,
      won: session.won,
      lost: session.lost,
      stars: computeStars(session.level, session.score, session.movesLeft),
      shuffled,
      cascades: result.cascades,
      booster: true
    };
  }

  /** Hammer: destroy one tile (or hit stone/chocolate once) */
  function useHammer(session, r, c) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    const cl = session.board[r] && session.board[r][c];
    if (!cl) return { ok: false, reason: 'empty' };
    if (isIngredient(cl)) return { ok: false, reason: 'ingredient' };
    if (session.undoAvailable) session.undoSnapshot = snapshotSession(session);
    const extra = new Set([key(r, c)]);
    const result = resolveMatchWave(session.board, session.level.colors, null, extra, null, session.iceGrid);
    return finalizeAfterBooster(session, result);
  }

  /** Row blast: clear entire row */
  function useRowBlast(session, r, c) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    if (r < 0 || r >= session.level.rows) return { ok: false, reason: 'oob' };
    if (session.undoAvailable) session.undoSnapshot = snapshotSession(session);
    const extra = new Set();
    for (let cc = 0; cc < session.level.cols; cc++) {
      const cl = session.board[r][cc];
      if (cl && !isIngredient(cl)) extra.add(key(r, cc));
    }
    if (!extra.size) return { ok: false, reason: 'empty' };
    const result = resolveMatchWave(session.board, session.level.colors, null, extra, null, session.iceGrid);
    return finalizeAfterBooster(session, result);
  }

  /** Color brush: clear all gems of tapped color */
  function useColorBrush(session, r, c) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    const cl = session.board[r] && session.board[r][c];
    if (!cl || isStone(cl) || isChocolate(cl) || isIngredient(cl) || cl.special === SP.COLORBOMB || cl.color < 0) {
      return { ok: false, reason: 'bad-target' };
    }
    if (session.undoAvailable) session.undoSnapshot = snapshotSession(session);
    const color = cl.color;
    const extra = new Set();
    for (let rr = 0; rr < session.level.rows; rr++) {
      for (let cc = 0; cc < session.level.cols; cc++) {
        const x = session.board[rr][cc];
        if (x && x.color === color && !isStone(x) && !isIngredient(x)) extra.add(key(rr, cc));
      }
    }
    const result = resolveMatchWave(session.board, session.level.colors, null, extra, color, session.iceGrid);
    return finalizeAfterBooster(session, result);
  }

  /** Free switch: swap any two adjacent without using a move */
  function useFreeSwitch(session, r1, c1, r2, c2) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    if (!areAdjacent(r1, c1, r2, c2)) return { ok: false, reason: 'not-adjacent' };
    const { board, level } = session;
    const a = board[r1][c1];
    const b = board[r2][c2];
    if (!a || !b) return { ok: false, reason: 'empty' };
    if (!canSwapCell(a) || !canSwapCell(b)) return { ok: false, reason: 'blocked' };
    if (session.undoAvailable) session.undoSnapshot = snapshotSession(session);
    swapCells(board, r1, c1, r2, c2);
    let extraClear = null;
    let partnerColor = null;
    let comboName = null;
    let legal = false;
    const bothSpecial = a.special && b.special;
    const hasBomb = a.special === SP.COLORBOMB || b.special === SP.COLORBOMB;
    if (bothSpecial || hasBomb) {
      const combo = handleSpecialCombo(board, r1, c1, r2, c2);
      if (combo && combo.clear.size) {
        legal = true;
        extraClear = combo.clear;
        partnerColor = combo.partnerColor;
        comboName = combo.combo;
      }
    }
    if (!legal) {
      const analysis = analyzeMatches(board, { r: r2, c: c2 });
      if (analysis.matched.size > 0) legal = true;
    }
    if (!legal) {
      // Free switch allows non-matching adjacent swaps (stay swapped)
      syncIceToCells(board, session.iceGrid);
      return {
        ok: true,
        from: { r: r1, c: c1 },
        to: { r: r2, c: c2 },
        steps: [],
        score: session.score,
        movesLeft: session.movesLeft,
        won: session.won,
        lost: session.lost,
        stars: computeStars(level, session.score, session.movesLeft),
        freeSwitch: true,
        cascades: 0
      };
    }
    const result = resolveMatchWave(board, level.colors, { r: r2, c: c2 }, extraClear, partnerColor, session.iceGrid);
    const out = finalizeAfterBooster(session, result);
    out.from = { r: r1, c: c1 };
    out.to = { r: r2, c: c2 };
    out.combo = comboName;
    out.freeSwitch = true;
    return out;
  }

  /** Place a color bomb on a random gem at level start */
  function placeColorBombStart(session) {
    const rows = session.level.rows;
    const cols = session.level.cols;
    const candidates = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cl = session.board[r][c];
        if (cl && !isStone(cl) && !isChocolate(cl) && !isIngredient(cl) && !cl.special && cl.lock <= 0) {
          candidates.push({ r, c });
        }
      }
    }
    if (!candidates.length) return { ok: false, reason: 'no-cell' };
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    session.board[pick.r][pick.c] = cell(-1, SP.COLORBOMB, session.board[pick.r][pick.c].ice || 0);
    syncIceToCells(session.board, session.iceGrid);
    return { ok: true, r: pick.r, c: pick.c };
  }

  /** +5 moves booster */
  function usePlusMoves(session) {
    if (session.busy || session.won) return { ok: false, reason: 'busy' };
    if (session.undoAvailable) session.undoSnapshot = snapshotSession(session);
    session.movesLeft += CONTINUE_MOVES;
    session.lost = false;
    return {
      ok: true,
      plusMoves: CONTINUE_MOVES,
      movesLeft: session.movesLeft,
      steps: [],
      won: session.won,
      lost: session.lost,
      stars: computeStars(session.level, session.score, session.movesLeft),
      cascades: 0,
      booster: true
    };
  }

  function grantContinue(session) {
    session.movesLeft += CONTINUE_MOVES;
    session.lost = false;
    session.continued = true;
    return CONTINUE_MOVES;
  }

  function getBoardSnapshot(session) {
    return session.board.map((row) => row.map(cloneCell));
  }

  // --- Test helpers (also usable from smoke script) ---
  function _testCreateBoard(rows, cols, colors, grid) {
    // grid: 2d of color ints; optional specials overlay later
    const board = [];
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        const color = grid ? grid[r][c] : Math.floor(Math.random() * colors);
        board[r][c] = cell(color, null, 0);
      }
    }
    return board;
  }

  global.Match3 = {
    CONTINUE_MOVES,
    SP,
    STONE_HITS,
    ING_CHERRY,
    cell,
    createSession,
    trySwap,
    grantContinue,
    useHammer,
    useRowBlast,
    useColorBrush,
    useFreeSwitch,
    placeColorBombStart,
    usePlusMoves,
    undoOnce,
    snapshotSession,
    spreadChocolate,
    goalsMet,
    computeStars,
    hasValidMove,
    findHint,
    areAdjacent,
    analyzeMatches,
    findRuns,
    countIce,
    countStones,
    countChocolate,
    buildIceMap,
    buildStoneMap,
    buildLockMap,
    buildChocolateMap,
    createIceGrid,
    syncIceToCells,
    resolveMatchWave,
    handleSpecialCombo,
    collectBlast,
    shuffleBoard,
    getBoardSnapshot,
    _testCreateBoard,
    swapCells,
    applyGravity,
    refill,
    clearCells,
    collectIngredientsAtBottom,
    isStone,
    isChocolate,
    isIngredient,
    canSwapCell,
    key
  };
})(typeof window !== 'undefined' ? window : global);
