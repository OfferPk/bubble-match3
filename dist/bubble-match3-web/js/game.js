/**
 * Match-3 board engine: swap, match 3+, cascade, gravity, refill.
 */
(function (global) {
  'use strict';

  const SCORE_PER_GEM = 50;
  const SCORE_MATCH4 = 80;
  const SCORE_MATCH5 = 120;
  const CASCADE_BONUS = 25;
  const CONTINUE_MOVES = 5;

  function createBoard(rows, cols, colorCount) {
    const board = [];
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) board[r][c] = -1;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        board[r][c] = randomColorAvoiding(board, r, c, colorCount);
      }
    }
    return board;
  }

  function randomColorAvoiding(board, r, c, colorCount) {
    let tries = 0;
    while (tries < 40) {
      const color = Math.floor(Math.random() * colorCount);
      let ok = true;
      if (c >= 2 && board[r][c - 1] === color && board[r][c - 2] === color) ok = false;
      if (r >= 2 && board[r - 1][c] === color && board[r - 2][c] === color) ok = false;
      if (ok) return color;
      tries++;
    }
    return Math.floor(Math.random() * colorCount);
  }

  function findMatches(board) {
    const rows = board.length;
    const cols = board[0].length;
    const matched = new Set();
    for (let r = 0; r < rows; r++) {
      let run = 1;
      for (let c = 1; c <= cols; c++) {
        if (c < cols && board[r][c] === board[r][c - 1] && board[r][c] >= 0) run++;
        else {
          if (run >= 3) for (let k = 0; k < run; k++) matched.add(r + ',' + (c - 1 - k));
          run = 1;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      let run = 1;
      for (let r = 1; r <= rows; r++) {
        if (r < rows && board[r][c] === board[r - 1][c] && board[r][c] >= 0) run++;
        else {
          if (run >= 3) for (let k = 0; k < run; k++) matched.add((r - 1 - k) + ',' + c);
          run = 1;
        }
      }
    }
    return matched;
  }

  function clearMatches(board, matched) {
    const cleared = [];
    matched.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      cleared.push({ r, c, color: board[r][c] });
      board[r][c] = -1;
    });
    return cleared;
  }

  function applyGravity(board) {
    const rows = board.length;
    const cols = board[0].length;
    const moves = [];
    for (let c = 0; c < cols; c++) {
      let write = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (board[r][c] >= 0) {
          if (write !== r) {
            board[write][c] = board[r][c];
            board[r][c] = -1;
            moves.push({ fromR: r, fromC: c, toR: write, toC: c, color: board[write][c] });
          }
          write--;
        }
      }
    }
    return moves;
  }

  function refill(board, colorCount) {
    const rows = board.length;
    const cols = board[0].length;
    const spawned = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (board[r][c] < 0) {
          board[r][c] = Math.floor(Math.random() * colorCount);
          spawned.push({ r, c, color: board[r][c] });
        }
      }
    }
    return spawned;
  }

  function areAdjacent(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  }

  function swap(board, r1, c1, r2, c2) {
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  function scoreForCleared(cleared, cascadeLevel) {
    let score = 0;
    const byColor = {};
    cleared.forEach((g) => { byColor[g.color] = (byColor[g.color] || 0) + 1; });
    const n = cleared.length;
    let base = SCORE_PER_GEM;
    if (n >= 5) base = SCORE_MATCH5;
    else if (n >= 4) base = SCORE_MATCH4;
    score += n * base;
    score += cascadeLevel * CASCADE_BONUS * n;
    return { score, byColor };
  }

  function hasValidMove(board) {
    const rows = board.length;
    const cols = board[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) {
          swap(board, r, c, r, c + 1);
          const m = findMatches(board);
          swap(board, r, c, r, c + 1);
          if (m.size > 0) return true;
        }
        if (r + 1 < rows) {
          swap(board, r, c, r + 1, c);
          const m = findMatches(board);
          swap(board, r, c, r + 1, c);
          if (m.size > 0) return true;
        }
      }
    }
    return false;
  }

  function shuffleBoard(board, colorCount) {
    const rows = board.length;
    const cols = board[0].length;
    const flat = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) flat.push(board[r][c]);
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = flat[i]; flat[i] = flat[j]; flat[j] = t;
    }
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) board[r][c] = flat[i++];
    if (!hasValidMove(board)) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          board[r][c] = randomColorAvoiding(board, r, c, colorCount);
        }
      }
    }
  }

  function resolveCascades(board, colorCount) {
    let totalScore = 0;
    const collected = {};
    const steps = [];
    let cascade = 0;
    let matched = findMatches(board);
    while (matched.size > 0) {
      const cleared = clearMatches(board, matched);
      const { score, byColor } = scoreForCleared(cleared, cascade);
      totalScore += score;
      Object.keys(byColor).forEach((k) => { collected[k] = (collected[k] || 0) + byColor[k]; });
      steps.push({ type: 'clear', cells: cleared.slice(), cascade });
      steps.push({ type: 'gravity', moves: applyGravity(board) });
      steps.push({ type: 'spawn', cells: refill(board, colorCount) });
      cascade++;
      matched = findMatches(board);
    }
    return { totalScore, collected, steps };
  }

  function goalsMet(level, score, collected) {
    const g = level.goals || {};
    if (g.score != null && score < g.score) return false;
    if (g.collect) {
      for (const [ci, need] of Object.entries(g.collect)) {
        if ((collected[ci] || 0) < need) return false;
      }
    }
    return true;
  }

  function computeStars(level, score) {
    const s = level.stars || [0, 0, 0];
    if (score >= s[2]) return 3;
    if (score >= s[1]) return 2;
    if (score >= s[0]) return 1;
    return 0;
  }

  function createSession(level) {
    const board = createBoard(level.rows, level.cols, level.colors);
    let guard = 0;
    while (!hasValidMove(board) && guard < 10) {
      shuffleBoard(board, level.colors);
      guard++;
    }
    return {
      level, board,
      movesLeft: level.moves,
      score: 0,
      collected: {},
      selected: null,
      busy: false,
      continued: false,
      won: false,
      lost: false
    };
  }

  function trySwap(session, r1, c1, r2, c2) {
    if (session.busy || session.won || session.lost) return { ok: false, reason: 'busy' };
    if (!areAdjacent(r1, c1, r2, c2)) return { ok: false, reason: 'not-adjacent' };
    if (session.movesLeft <= 0) return { ok: false, reason: 'no-moves' };

    const { board, level } = session;
    swap(board, r1, c1, r2, c2);
    const matched = findMatches(board);
    if (matched.size === 0) {
      swap(board, r1, c1, r2, c2);
      return { ok: false, reason: 'no-match', swapBack: true, from: { r: r1, c: c1 }, to: { r: r2, c: c2 } };
    }

    session.movesLeft--;
    const { totalScore, collected, steps } = resolveCascades(board, level.colors);
    session.score += totalScore;
    Object.keys(collected).forEach((k) => {
      session.collected[k] = (session.collected[k] || 0) + collected[k];
    });

    let shuffled = false;
    if (!hasValidMove(board)) {
      shuffleBoard(board, level.colors);
      shuffled = true;
    }

    if (goalsMet(level, session.score, session.collected)) session.won = true;
    else if (session.movesLeft <= 0) session.lost = true;

    return {
      ok: true,
      from: { r: r1, c: c1 },
      to: { r: r2, c: c2 },
      steps,
      score: session.score,
      collected: Object.assign({}, session.collected),
      movesLeft: session.movesLeft,
      won: session.won,
      lost: session.lost,
      stars: computeStars(level, session.score),
      shuffled
    };
  }

  function grantContinue(session) {
    session.movesLeft += CONTINUE_MOVES;
    session.lost = false;
    session.continued = true;
    return CONTINUE_MOVES;
  }

  global.Match3 = {
    CONTINUE_MOVES,
    createSession,
    trySwap,
    grantContinue,
    goalsMet,
    computeStars,
    findMatches,
    hasValidMove,
    areAdjacent
  };
})(window);
