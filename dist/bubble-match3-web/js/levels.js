/**
 * Fixed baked-in Match-3 level pack (~48 levels). No downloads.
 * Colors: 0=red 1=blue 2=green 3=yellow 4=purple 5=orange
 * Ice: array of [r,c,layers?] or { pattern, layers, rows?, cols? }
 */
(function (global) {
  'use strict';

  const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

  /**
   * Level schema:
   * id, name, rows, cols, colors, moves,
   * goals: { score?, collect?: {colorIndex: n}, ice?: n, clearIce?: bool },
   * ice?: [...]|{pattern},
   * stars: [1-star effective score, 2-star, 3-star]
   * (effective = score + leftoverMoves * 150)
   */
  const LEVELS = [
    // —— Early: easy score / collect ——
    { id: 1,  name: 'First Spark',     rows: 6, cols: 6, colors: 4, moves: 22, goals: { score: 800 },  stars: [800, 1600, 2800] },
    { id: 2,  name: 'Warm Up',         rows: 6, cols: 6, colors: 4, moves: 20, goals: { score: 1000 }, stars: [1000, 1800, 3000] },
    { id: 3,  name: 'Ruby Hunt',       rows: 6, cols: 6, colors: 4, moves: 20, goals: { collect: { 0: 12 } }, stars: [600, 1400, 2600] },
    { id: 4,  name: 'Blue Wave',       rows: 6, cols: 6, colors: 4, moves: 18, goals: { collect: { 1: 14 } }, stars: [700, 1500, 2700] },
    { id: 5,  name: 'Combo Starter',   rows: 7, cols: 7, colors: 5, moves: 24, goals: { score: 1500 }, stars: [1500, 2800, 4500] },
    { id: 6,  name: 'Green Gather',    rows: 7, cols: 7, colors: 5, moves: 22, goals: { collect: { 2: 16 } }, stars: [800, 1800, 3200] },
    { id: 7,  name: 'Score Climb',     rows: 7, cols: 7, colors: 5, moves: 20, goals: { score: 2000 }, stars: [2000, 3500, 5500] },
    { id: 8,  name: 'Yellow Yield',    rows: 7, cols: 7, colors: 5, moves: 20, goals: { collect: { 3: 18 } }, stars: [900, 2000, 3500] },
    { id: 9,  name: 'Dual Duty',       rows: 7, cols: 7, colors: 5, moves: 24, goals: { score: 1200, collect: { 0: 10 } }, stars: [1200, 2600, 4200] },
    { id: 10, name: 'Mid Gate',        rows: 7, cols: 7, colors: 5, moves: 18, goals: { score: 2500 }, stars: [2500, 4200, 6500] },

    // —— Mid: ice introduced ——
    { id: 11, name: 'Frost Bite',      rows: 7, cols: 7, colors: 5, moves: 24, goals: { clearIce: true }, ice: { pattern: 'center', layers: 1 }, stars: [800, 2000, 3800] },
    { id: 12, name: 'Purple Push',     rows: 8, cols: 8, colors: 5, moves: 24, goals: { collect: { 4: 20 } }, stars: [1000, 2200, 3800] },
    { id: 13, name: 'Icy Border',      rows: 7, cols: 7, colors: 5, moves: 22, goals: { clearIce: true, score: 1000 }, ice: { pattern: 'border', layers: 1 }, stars: [1000, 2400, 4200] },
    { id: 14, name: 'Wide Field',      rows: 8, cols: 8, colors: 5, moves: 22, goals: { score: 3000 }, stars: [3000, 5000, 7500] },
    { id: 15, name: 'Checker Chill',   rows: 8, cols: 8, colors: 5, moves: 26, goals: { ice: 16 }, ice: { pattern: 'checker', layers: 1 }, stars: [1200, 2800, 4800] },
    { id: 16, name: 'Orange Order',    rows: 8, cols: 8, colors: 6, moves: 24, goals: { collect: { 5: 18 } }, stars: [1100, 2400, 4000] },
    { id: 17, name: 'Six Spectrum',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { score: 3200 }, stars: [3200, 5200, 8000] },
    { id: 18, name: 'Twin Collect',    rows: 8, cols: 8, colors: 5, moves: 24, goals: { collect: { 1: 12, 2: 12 } }, stars: [1200, 2600, 4400] },
    { id: 19, name: 'Frozen Rows',     rows: 8, cols: 8, colors: 5, moves: 24, goals: { clearIce: true }, ice: { pattern: 'rows', rows: [2, 5], layers: 1 }, stars: [1400, 3000, 5000] },
    { id: 20, name: 'Tight Moves',     rows: 7, cols: 7, colors: 6, moves: 15, goals: { score: 2200 }, stars: [2200, 3800, 5800] },

    { id: 21, name: 'Ruby Rush II',    rows: 8, cols: 8, colors: 6, moves: 20, goals: { collect: { 0: 22 } }, stars: [1300, 2800, 4600] },
    { id: 22, name: 'Deep Freeze',     rows: 8, cols: 8, colors: 5, moves: 26, goals: { clearIce: true }, ice: { pattern: 'center', layers: 2 }, stars: [1500, 3200, 5500] },
    { id: 23, name: 'Score Storm',     rows: 8, cols: 8, colors: 6, moves: 20, goals: { score: 4000 }, stars: [4000, 6500, 9500] },
    { id: 24, name: 'Blues & Gold',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { collect: { 1: 15, 3: 15 } }, stars: [1400, 3000, 4800] },
    { id: 25, name: 'Ice & Score',     rows: 8, cols: 8, colors: 5, moves: 22, goals: { score: 2000, clearIce: true }, ice: { pattern: 'checker', layers: 1 }, stars: [2000, 4000, 6500] },
    { id: 26, name: 'Checkpoint',      rows: 8, cols: 8, colors: 6, moves: 18, goals: { score: 4500, collect: { 4: 10 } }, stars: [4500, 7000, 10000] },
    { id: 27, name: 'Narrow Path',     rows: 6, cols: 6, colors: 5, moves: 14, goals: { score: 1800 }, stars: [1800, 3200, 5000] },
    { id: 28, name: 'Green Gauntlet',  rows: 8, cols: 8, colors: 6, moves: 18, goals: { collect: { 2: 25 } }, stars: [1500, 3200, 5000] },
    { id: 29, name: 'Cascade King',    rows: 8, cols: 8, colors: 5, moves: 20, goals: { score: 5000 }, stars: [5000, 8000, 12000] },
    { id: 30, name: 'Frost Columns',   rows: 8, cols: 8, colors: 5, moves: 22, goals: { clearIce: true, collect: { 0: 10 } }, ice: { pattern: 'cols', cols: [1, 3, 5, 6], layers: 1 }, stars: [1600, 3400, 5600] },

    // —— Later: tighter moves ——
    { id: 31, name: 'Tri Collect',     rows: 8, cols: 8, colors: 6, moves: 22, goals: { collect: { 0: 10, 3: 10, 5: 10 } }, stars: [1600, 3400, 5200] },
    { id: 32, name: 'Pressure',        rows: 7, cols: 7, colors: 6, moves: 14, goals: { score: 2800 }, stars: [2800, 4500, 6800] },
    { id: 33, name: 'Violet Vault',    rows: 8, cols: 8, colors: 6, moves: 16, goals: { collect: { 4: 28 } }, stars: [1700, 3600, 5400] },
    { id: 34, name: 'Double Ice',      rows: 8, cols: 8, colors: 5, moves: 24, goals: { clearIce: true }, ice: { pattern: 'border', layers: 2 }, stars: [1800, 3800, 6200] },
    { id: 35, name: 'High Score',      rows: 8, cols: 8, colors: 6, moves: 18, goals: { score: 5500 }, stars: [5500, 8500, 12000] },
    { id: 36, name: 'Mixed Mission',   rows: 8, cols: 8, colors: 6, moves: 20, goals: { score: 2500, collect: { 1: 16 } }, stars: [2500, 4500, 7000] },
    { id: 37, name: 'Sparse Board',    rows: 6, cols: 6, colors: 6, moves: 15, goals: { score: 2000 }, stars: [2000, 3600, 5400] },
    { id: 38, name: 'Glacier',         rows: 8, cols: 8, colors: 5, moves: 20, goals: { ice: 24, score: 1500 }, ice: { pattern: 'checker', layers: 2 }, stars: [2000, 4200, 7000] },
    { id: 39, name: 'Half Mark',       rows: 8, cols: 8, colors: 6, moves: 16, goals: { score: 6000, collect: { 5: 12 } }, stars: [6000, 9500, 13000] },
    { id: 40, name: 'Expert Warm',     rows: 8, cols: 8, colors: 6, moves: 15, goals: { collect: { 0: 20, 2: 15 } }, stars: [2000, 4200, 6200] },

    { id: 41, name: 'Precision',       rows: 7, cols: 7, colors: 6, moves: 12, goals: { score: 3200 }, stars: [3200, 5200, 7800] },
    { id: 42, name: 'Rainbow Raid',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { collect: { 0: 8, 1: 8, 2: 8, 3: 8 } }, stars: [2200, 4500, 7000] },
    { id: 43, name: 'Ice Siege',       rows: 8, cols: 8, colors: 6, moves: 18, goals: { clearIce: true, score: 3000 }, ice: { pattern: 'full', layers: 1 }, stars: [3000, 5500, 9000] },
    { id: 44, name: 'Score Siege',     rows: 8, cols: 8, colors: 6, moves: 16, goals: { score: 7000 }, stars: [7000, 11000, 15500] },
    { id: 45, name: 'Color Crunch',    rows: 8, cols: 8, colors: 6, moves: 14, goals: { collect: { 3: 22, 4: 18 } }, stars: [2300, 4600, 7000] },
    { id: 46, name: 'Endgame Prep',    rows: 8, cols: 8, colors: 6, moves: 14, goals: { score: 5000, collect: { 5: 15 } }, stars: [5000, 8000, 11000] },
    { id: 47, name: 'Brutal Blues',    rows: 7, cols: 7, colors: 6, moves: 11, goals: { collect: { 1: 24 } }, stars: [2400, 4800, 7200] },
    { id: 48, name: 'Gem Master',      rows: 8, cols: 8, colors: 6, moves: 12, goals: { score: 8000, clearIce: true, collect: { 2: 12 } }, ice: { pattern: 'center', layers: 2 }, stars: [8000, 12000, 17000] }
  ];

  function getLevel(id) {
    return LEVELS.find((l) => l.id === id) || null;
  }

  function getLevelCount() {
    return LEVELS.length;
  }

  global.Levels = {
    COLORS,
    LEVELS,
    getLevel,
    getLevelCount
  };
})(typeof window !== 'undefined' ? window : global);
