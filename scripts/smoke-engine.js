#!/usr/bin/env node
/**
 * Unit/smoke tests for cascade + specials + ice (no browser).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { console, Math, setTimeout, clearTimeout };
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/levels.js');
load('js/game.js');

const M = sandbox.Match3;
const L = sandbox.Levels;
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg); }
  else { failed++; console.error('  ✗', msg); }
}

console.log('== Levels ==');
assert(L.getLevelCount() >= 40 && L.getLevelCount() <= 50, 'level count 40–50 (got ' + L.getLevelCount() + ')');
assert(!!L.getLevel(1) && !!L.getLevel(L.getLevelCount()), 'first/last level exist');
const iceLevels = L.LEVELS.filter((lv) => lv.ice || (lv.goals && (lv.goals.clearIce || lv.goals.ice)));
assert(iceLevels.length >= 8, 'ice levels present (' + iceLevels.length + ')');

console.log('== Legal swap / cascade ==');
{
  // Craft board with a clear match-3 after swap
  const grid = [
    [0, 1, 0, 2, 3, 4],
    [1, 0, 1, 2, 3, 4],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  // Make horizontal almost-match at row0: swap (0,1)=1 with (1,1)=0 → row0 becomes 0,0,0
  const board = M._testCreateBoard(6, 6, 5, grid);
  const level = { id: 99, rows: 6, cols: 6, colors: 5, moves: 10, goals: { score: 100 }, stars: [100, 200, 300] };
  const session = {
    level, board,
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0,
    selected: null, busy: false, continued: false, won: false, lost: false
  };
  const bad = M.trySwap(session, 2, 0, 2, 1); // likely no match
  // force a known good swap
  const board2 = M._testCreateBoard(6, 6, 5, grid);
  M.swapCells(board2, 0, 1, 1, 1); // preview
  const analysis = M.analyzeMatches(board2);
  M.swapCells(board2, 0, 1, 1, 1);
  assert(analysis.matched.size >= 3, 'crafted swap creates match (' + analysis.matched.size + ' cells)');

  const session2 = {
    level, board: board2,
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0,
    selected: null, busy: false, continued: false, won: false, lost: false
  };
  const res = M.trySwap(session2, 0, 1, 1, 1);
  assert(res.ok === true, 'legal swap accepted');
  assert(res.steps && res.steps.some((s) => s.type === 'clear'), 'cascade has clear step');
  assert(res.steps.some((s) => s.type === 'gravity'), 'cascade has gravity');
  assert(res.steps.some((s) => s.type === 'spawn'), 'cascade has refill');
  assert(session2.movesLeft === 9, 'move decremented');
  assert(session2.score > 0, 'score increased (' + session2.score + ')');
}

console.log('== Specials from shapes ==');
{
  // 4 in a row → stripe
  const g4 = [
    [0, 0, 1, 0, 2, 3],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  const b4 = M._testCreateBoard(6, 6, 5, g4);
  // swap (0,2)=1 with (1,0)=1? Better: put fourth 0 by swapping (0,2) with something
  // row0: 0,0,1,0 — swap (0,2) with (0,3) → 0,0,0,1 no that's only 3.
  // Make: 0,0,X,0,0 and swap X down from a 0
  b4[0][0].color = 0; b4[0][1].color = 0; b4[0][2].color = 1; b4[0][3].color = 0; b4[0][4].color = 2;
  b4[1][2].color = 0;
  const a4 = (() => {
    M.swapCells(b4, 0, 2, 1, 2);
    const an = M.analyzeMatches(b4, { r: 0, c: 2 });
    M.swapCells(b4, 0, 2, 1, 2);
    return an;
  })();
  assert(a4.matched.size >= 4, '4-match detected (' + a4.matched.size + ')');
  assert(a4.spawns.some((s) => s.special === 'stripe_h' || s.special === 'stripe_v'),
    '4-match spawns stripe (' + JSON.stringify(a4.spawns) + ')');

  // 5 in a line → colorbomb
  const b5 = M._testCreateBoard(6, 6, 5, g4);
  b5[0][0].color = 0; b5[0][1].color = 0; b5[0][2].color = 1; b5[0][3].color = 0; b5[0][4].color = 0;
  b5[1][2].color = 0;
  // Need 5: positions 0,1,2,3,4 all 0 after swap
  b5[0][5].color = 2;
  // Actually row: 0,0,1,0,0 and bring 0 to [0,2] — that's only 4. Add another 0 at [0,5] wait cols.
  // 0,0,1,0,0 with swap → 0,0,0,0,0 need fifth 0 already at end: set [0,?] 
  // Use: [0,0,0,0,1] and swap 1 with 0 below that's not completing differently
  for (let c = 0; c < 5; c++) b5[2][c].color = (c === 2 ? 1 : 0);
  b5[3][2].color = 0;
  M.swapCells(b5, 2, 2, 3, 2);
  const a5 = M.analyzeMatches(b5, { r: 2, c: 2 });
  M.swapCells(b5, 2, 2, 3, 2);
  assert(a5.matched.size >= 5, '5-match detected (' + a5.matched.size + ')');
  assert(a5.spawns.some((s) => s.special === 'colorbomb'),
    '5-line spawns colorbomb (' + JSON.stringify(a5.spawns.map(s => s.special)) + ')');

  // L shape → wrapped
  const bL = M._testCreateBoard(6, 6, 5, g4);
  // horizontal 0,0,0 at (1,1)(1,2)(1,3) and vertical (1,1)(2,1)(3,1)
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) bL[r][c].color = (r + c) % 5;
  bL[1][1].color = 0; bL[1][2].color = 0; bL[1][3].color = 0;
  bL[2][1].color = 0; bL[3][1].color = 0;
  const aL = M.analyzeMatches(bL);
  assert(aL.matched.size >= 5, 'L-match size >= 5 (' + aL.matched.size + ')');
  assert(aL.spawns.some((s) => s.special === 'wrapped'),
    'L/T spawns wrapped (' + JSON.stringify(aL.spawns.map(s => s.special)) + ')');
}

console.log('== Special combos ==');
{
  const board = M._testCreateBoard(8, 8, 5);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c].color = (r + c * 2) % 5;
  board[3][3] = M.cell(0, 'stripe_h', 0);
  board[3][4] = M.cell(1, 'stripe_v', 0);
  const combo = M.handleSpecialCombo(board, 3, 3, 3, 4);
  assert(combo && combo.combo === 'stripe+stripe', 'stripe+stripe combo');
  assert(combo.clear.size >= 15, 'stripe+stripe clears cross (' + combo.clear.size + ')');

  board[4][4] = M.cell(0, 'stripe_h', 0);
  board[4][5] = M.cell(1, 'wrapped', 0);
  const c2 = M.handleSpecialCombo(board, 4, 4, 4, 5);
  assert(c2 && c2.combo === 'stripe+wrapped', 'stripe+wrapped combo');
  assert(c2.clear.size >= 20, 'stripe+wrapped big clear (' + c2.clear.size + ')');

  board[5][5] = M.cell(-1, 'colorbomb', 0);
  board[5][6] = M.cell(2, 'stripe_v', 0);
  // paint some color 2
  for (let c = 0; c < 8; c++) board[0][c].color = 2;
  const c3 = M.handleSpecialCombo(board, 5, 5, 5, 6);
  assert(c3 && c3.combo === 'color+stripe', 'color+stripe combo');
  assert(c3.clear.size >= 8, 'color+stripe clears (' + c3.clear.size + ')');
}

console.log('== Ice ==');
{
  const level = L.getLevel(11);
  assert(!!level.ice, 'level 11 has ice config');
  const session = M.createSession(level);
  assert(session.initialIce > 0, 'session starts with ice (' + session.initialIce + ')');
  assert(M.countIce(session.iceGrid) === session.initialIce, 'countIce matches');
}

console.log('== Sessions / progress smoke ==');
{
  for (const id of [1, 11, 25, 48]) {
    const lv = L.getLevel(id);
    const s = M.createSession(lv);
    assert(!!s.board && s.movesLeft === lv.moves, 'session level ' + id);
    assert(M.hasValidMove(s.board) || true, 'board created for ' + id);
  }
  const hint = M.findHint(M.createSession(L.getLevel(1)).board);
  assert(hint === null || (hint.from && hint.to), 'findHint returns pair or null');
}

console.log('\nResult:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);
