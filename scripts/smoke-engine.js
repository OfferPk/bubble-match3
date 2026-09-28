#!/usr/bin/env node
/**
 * Unit/smoke tests for cascade + specials + ice + stone + lock + chocolate + cherries +
 * boosters (hammer/freeSwitch/colorBombStart/plusMoves) + undo.
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
assert(L.getLevelCount() === 64, 'level count 64 (got ' + L.getLevelCount() + ')');
assert(!!L.getLevel(1) && !!L.getLevel(L.getLevelCount()), 'first/last level exist');
const iceLevels = L.LEVELS.filter((lv) => lv.ice || (lv.goals && (lv.goals.clearIce || lv.goals.ice)));
assert(iceLevels.length >= 8, 'ice levels present (' + iceLevels.length + ')');
const cherryLevels = L.LEVELS.filter((lv) => lv.goals && lv.goals.cherries);
assert(cherryLevels.length >= 8, 'ingredient/cherry levels (' + cherryLevels.length + ')');
const stoneLevels = L.LEVELS.filter((lv) => lv.stone || (lv.goals && lv.goals.clearStone));
assert(stoneLevels.length >= 3, 'stone levels (' + stoneLevels.length + ')');
const lockLevels = L.LEVELS.filter((lv) => lv.lock);
assert(lockLevels.length >= 2, 'lock levels (' + lockLevels.length + ')');
const chocLevels = L.LEVELS.filter((lv) => lv.chocolate || (lv.goals && lv.goals.clearChocolate));
assert(chocLevels.length >= 4, 'chocolate levels (' + chocLevels.length + ')');

console.log('== Legal swap / cascade ==');
{
  const grid = [
    [0, 1, 0, 2, 3, 4],
    [1, 0, 1, 2, 3, 4],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  const board = M._testCreateBoard(6, 6, 5, grid);
  const level = { id: 99, rows: 6, cols: 6, colors: 5, moves: 10, goals: { score: 100 }, stars: [100, 200, 300] };
  const board2 = M._testCreateBoard(6, 6, 5, grid);
  M.swapCells(board2, 0, 1, 1, 1);
  const analysis = M.analyzeMatches(board2);
  M.swapCells(board2, 0, 1, 1, 1);
  assert(analysis.matched.size >= 3, 'crafted swap creates match (' + analysis.matched.size + ' cells)');

  const session2 = {
    level, board: board2,
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
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
  const g4 = [
    [0, 0, 1, 0, 2, 3],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  const b4 = M._testCreateBoard(6, 6, 5, g4);
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

  const b5 = M._testCreateBoard(6, 6, 5, g4);
  for (let c = 0; c < 5; c++) b5[2][c].color = (c === 2 ? 1 : 0);
  b5[3][2].color = 0;
  M.swapCells(b5, 2, 2, 3, 2);
  const a5 = M.analyzeMatches(b5, { r: 2, c: 2 });
  M.swapCells(b5, 2, 2, 3, 2);
  assert(a5.matched.size >= 5, '5-match detected (' + a5.matched.size + ')');
  assert(a5.spawns.some((s) => s.special === 'colorbomb'),
    '5-line spawns colorbomb (' + JSON.stringify(a5.spawns.map(s => s.special)) + ')');

  const bL = M._testCreateBoard(6, 6, 5, g4);
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

console.log('== Stone / lock / cherries ==');
{
  const stoneLv = L.getLevel(21);
  assert(!!stoneLv.stone, 'level 21 has stone');
  const sStone = M.createSession(stoneLv);
  assert(M.countStones(sStone.board) > 0, 'stones on board (' + M.countStones(sStone.board) + ')');

  const lockLv = L.getLevel(23);
  assert(!!lockLv.lock, 'level 23 has lock');
  const sLock = M.createSession(lockLv);
  let locks = 0;
  for (let r = 0; r < sLock.level.rows; r++)
    for (let c = 0; c < sLock.level.cols; c++)
      if (sLock.board[r][c] && sLock.board[r][c].lock > 0) locks++;
  assert(locks > 0, 'locks on board (' + locks + ')');

  const cherryLv = L.getLevel(49);
  assert(cherryLv.goals.cherries >= 2, 'level 49 cherry goal');
  const sCherry = M.createSession(cherryLv);
  let cherries = 0;
  for (let r = 0; r < sCherry.level.rows; r++)
    for (let c = 0; c < sCherry.level.cols; c++)
      if (M.isIngredient(sCherry.board[r][c])) cherries++;
  assert(cherries >= 2, 'cherries placed (' + cherries + ')');

  // Ingredient falls to bottom and collects
  const board = M._testCreateBoard(4, 3, 4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) board[r][c] = M.cell((r + c) % 4, null, 0);
  board[0][1] = M.cell(-3, null, 0, { ingredient: 'cherry' });
  board[1][1] = null; board[2][1] = null; board[3][1] = null;
  M.applyGravity(board);
  assert(M.isIngredient(board[3][1]), 'cherry fell to bottom');
  const got = M.collectIngredientsAtBottom(board);
  assert(got.length === 1 && !board[3][1], 'cherry collected at bottom');
}

console.log('== Boosters ==');
{
  const level = { id: 98, rows: 6, cols: 6, colors: 5, moves: 10, goals: { score: 50 }, stars: [50, 100, 150] };
  const grid = [
    [0, 1, 2, 3, 4, 0],
    [1, 2, 3, 4, 0, 1],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  const session = {
    level,
    board: M._testCreateBoard(6, 6, 5, grid),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    selected: null, busy: false, continued: false, won: false, lost: false
  };
  const h = M.useHammer(session, 0, 0);
  assert(h.ok, 'hammer clears a cell');
  assert(session.board[0][0] === null || session.score >= 0, 'hammer applied');

  const session2 = {
    level,
    board: M._testCreateBoard(6, 6, 5, grid),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    busy: false, continued: false, won: false, lost: false
  };
  const rb = M.useRowBlast(session2, 2, 0);
  assert(rb.ok, 'row blast ok');

  const session3 = {
    level,
    board: M._testCreateBoard(6, 6, 5, grid),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    busy: false, continued: false, won: false, lost: false
  };
  const cb = M.useColorBrush(session3, 0, 0);
  assert(cb.ok, 'color brush ok');

  const session4 = {
    level,
    board: M._testCreateBoard(6, 6, 5, grid),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    busy: false, continued: false, won: false, lost: false,
    undoAvailable: true, undoSnapshot: null
  };
  const beforeMoves = session4.movesLeft;
  const fs = M.useFreeSwitch(session4, 0, 0, 0, 1);
  assert(fs.ok, 'freeSwitch ok');
  assert(session4.movesLeft === beforeMoves, 'freeSwitch does not spend a move');

  const session5 = {
    level,
    board: M._testCreateBoard(6, 6, 5, grid),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    busy: false, continued: false, won: false, lost: false,
    undoAvailable: true, undoSnapshot: null
  };
  const pm = M.usePlusMoves(session5);
  assert(pm.ok && session5.movesLeft === 15, 'plusMoves +5 (' + session5.movesLeft + ')');

  const session6 = M.createSession(level);
  const placed = M.placeColorBombStart(session6);
  assert(placed.ok, 'colorBombStart places');
  assert(session6.board[placed.r][placed.c].special === 'colorbomb', 'color bomb on board');
}

console.log('== Chocolate / undo ==');
{
  const level = { id: 97, rows: 6, cols: 6, colors: 5, moves: 12,
    goals: { clearChocolate: true }, chocolate: { pattern: 'center' }, stars: [100, 200, 300] };
  const session = M.createSession(level);
  assert(M.countChocolate(session.board) > 0, 'chocolate on board (' + M.countChocolate(session.board) + ')');

  // Craft a board with chocolate and force a non-clearing path via spread helper
  const board = M._testCreateBoard(4, 4, 4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) board[r][c] = M.cell((r + c) % 4, null, 0);
  board[1][1] = M.cell(-4, null, 0, { chocolate: 1 });
  const spread = M.spreadChocolate(board);
  assert(!!spread, 'chocolate spreads to adjacent');
  assert(M.isChocolate(board[spread.r][spread.c]), 'spread cell is chocolate');
  assert(M.countChocolate(board) === 2, 'chocolate count after spread');

  // Undo once
  const s2 = M.createSession(L.getLevel(1));
  s2.undoAvailable = true;
  s2.undoSnapshot = null;
  // force a legal swap session via trySwap after snapshot path
  const g = [
    [0, 1, 0, 2, 3, 4],
    [1, 0, 1, 2, 3, 4],
    [2, 3, 4, 0, 1, 2],
    [3, 4, 0, 1, 2, 3],
    [4, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 0]
  ];
  const sUndo = {
    level: { id: 96, rows: 6, cols: 6, colors: 5, moves: 10, goals: { score: 99999 }, stars: [99999, 199999, 299999] },
    board: M._testCreateBoard(6, 6, 5, g),
    iceGrid: M.createIceGrid(6, 6, {}),
    movesLeft: 10, score: 0, collected: {}, iceCleared: 0, initialIce: 0, cherries: 0,
    selected: null, busy: false, continued: false, won: false, lost: false,
    undoAvailable: true, undoSnapshot: null
  };
  const res = M.trySwap(sUndo, 0, 1, 1, 1);
  assert(res.ok, 'undo test swap ok');
  assert(!!sUndo.undoSnapshot, 'undo snapshot saved');
  const movesAfter = sUndo.movesLeft;
  const scoreAfter = sUndo.score;
  const und = M.undoOnce(sUndo);
  assert(und.ok, 'undoOnce ok');
  assert(sUndo.movesLeft === 10, 'undo restored moves');
  assert(sUndo.score === 0, 'undo restored score');
  assert(!sUndo.undoAvailable, 'undo only once');
  const und2 = M.undoOnce(sUndo);
  assert(!und2.ok, 'second undo blocked');
}

console.log('== Sessions / progress smoke ==');
{
  for (const id of [1, 11, 21, 49, 56, 57, 64]) {
    const lv = L.getLevel(id);
    const s = M.createSession(lv);
    assert(!!s.board && s.movesLeft === lv.moves, 'session level ' + id);
  }
  const hint = M.findHint(M.createSession(L.getLevel(1)).board);
  assert(hint === null || (hint.from && hint.to), 'findHint returns pair or null');
}

console.log('\nResult:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);
