/**
 * Fixed baked-in Match-3 level pack (40 levels). No downloads.
 * Colors: 0=red 1=blue 2=green 3=yellow 4=purple 5=orange
 */
(function (global) {
  'use strict';

  const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

  /**
   * Level schema:
   * id, name, rows, cols, colors (count of gem types), moves,
   * goals: { score?: number, collect?: { colorIndex: count } },
   * stars: [1-star score, 2-star, 3-star]
   */
  const LEVELS = [
    { id: 1,  name: 'First Spark',     rows: 6, cols: 6, colors: 4, moves: 20, goals: { score: 800 },  stars: [800, 1400, 2200] },
    { id: 2,  name: 'Warm Up',         rows: 6, cols: 6, colors: 4, moves: 18, goals: { score: 1000 }, stars: [1000, 1600, 2400] },
    { id: 3,  name: 'Ruby Hunt',       rows: 6, cols: 6, colors: 4, moves: 18, goals: { collect: { 0: 12 } }, stars: [600, 1200, 2000] },
    { id: 4,  name: 'Blue Wave',       rows: 6, cols: 6, colors: 4, moves: 16, goals: { collect: { 1: 14 } }, stars: [700, 1300, 2100] },
    { id: 5,  name: 'Combo Starter',   rows: 7, cols: 7, colors: 5, moves: 22, goals: { score: 1500 }, stars: [1500, 2400, 3600] },
    { id: 6,  name: 'Green Gather',    rows: 7, cols: 7, colors: 5, moves: 20, goals: { collect: { 2: 16 } }, stars: [800, 1500, 2500] },
    { id: 7,  name: 'Score Climb',     rows: 7, cols: 7, colors: 5, moves: 18, goals: { score: 2000 }, stars: [2000, 3000, 4500] },
    { id: 8,  name: 'Yellow Yield',    rows: 7, cols: 7, colors: 5, moves: 18, goals: { collect: { 3: 18 } }, stars: [900, 1600, 2700] },
    { id: 9,  name: 'Dual Duty',       rows: 7, cols: 7, colors: 5, moves: 22, goals: { score: 1200, collect: { 0: 10 } }, stars: [1200, 2200, 3500] },
    { id: 10, name: 'Mid Gate',        rows: 7, cols: 7, colors: 5, moves: 16, goals: { score: 2500 }, stars: [2500, 3800, 5500] },

    { id: 11, name: 'Purple Push',     rows: 8, cols: 8, colors: 5, moves: 24, goals: { collect: { 4: 20 } }, stars: [1000, 1800, 3000] },
    { id: 12, name: 'Wide Field',      rows: 8, cols: 8, colors: 5, moves: 22, goals: { score: 3000 }, stars: [3000, 4500, 6500] },
    { id: 13, name: 'Orange Order',    rows: 8, cols: 8, colors: 6, moves: 24, goals: { collect: { 5: 18 } }, stars: [1100, 2000, 3200] },
    { id: 14, name: 'Six Spectrum',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { score: 3200 }, stars: [3200, 4800, 7000] },
    { id: 15, name: 'Twin Collect',    rows: 8, cols: 8, colors: 5, moves: 24, goals: { collect: { 1: 12, 2: 12 } }, stars: [1200, 2200, 3600] },
    { id: 16, name: 'Tight Moves',     rows: 7, cols: 7, colors: 6, moves: 14, goals: { score: 2200 }, stars: [2200, 3400, 5000] },
    { id: 17, name: 'Ruby Rush II',    rows: 8, cols: 8, colors: 6, moves: 20, goals: { collect: { 0: 22 } }, stars: [1300, 2400, 3800] },
    { id: 18, name: 'Score Storm',     rows: 8, cols: 8, colors: 6, moves: 20, goals: { score: 4000 }, stars: [4000, 6000, 8500] },
    { id: 19, name: 'Blues & Gold',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { collect: { 1: 15, 3: 15 } }, stars: [1400, 2600, 4000] },
    { id: 20, name: 'Checkpoint',      rows: 8, cols: 8, colors: 6, moves: 18, goals: { score: 4500, collect: { 4: 10 } }, stars: [4500, 6500, 9000] },

    { id: 21, name: 'Narrow Path',     rows: 6, cols: 6, colors: 5, moves: 12, goals: { score: 1800 }, stars: [1800, 2800, 4200] },
    { id: 22, name: 'Green Gauntlet',  rows: 8, cols: 8, colors: 6, moves: 18, goals: { collect: { 2: 25 } }, stars: [1500, 2800, 4200] },
    { id: 23, name: 'Cascade King',    rows: 8, cols: 8, colors: 5, moves: 20, goals: { score: 5000 }, stars: [5000, 7500, 10500] },
    { id: 24, name: 'Tri Collect',     rows: 8, cols: 8, colors: 6, moves: 24, goals: { collect: { 0: 10, 3: 10, 5: 10 } }, stars: [1600, 3000, 4500] },
    { id: 25, name: 'Pressure',        rows: 7, cols: 7, colors: 6, moves: 14, goals: { score: 2800 }, stars: [2800, 4200, 6000] },
    { id: 26, name: 'Violet Vault',    rows: 8, cols: 8, colors: 6, moves: 16, goals: { collect: { 4: 28 } }, stars: [1700, 3200, 4800] },
    { id: 27, name: 'High Score',      rows: 8, cols: 8, colors: 6, moves: 18, goals: { score: 5500 }, stars: [5500, 8000, 11000] },
    { id: 28, name: 'Mixed Mission',   rows: 8, cols: 8, colors: 6, moves: 20, goals: { score: 2500, collect: { 1: 16 } }, stars: [2500, 4000, 6000] },
    { id: 29, name: 'Sparse Board',    rows: 6, cols: 6, colors: 6, moves: 15, goals: { score: 2000 }, stars: [2000, 3200, 4800] },
    { id: 30, name: 'Half Mark',       rows: 8, cols: 8, colors: 6, moves: 16, goals: { score: 6000, collect: { 5: 12 } }, stars: [6000, 9000, 12000] },

    { id: 31, name: 'Expert Warm',     rows: 8, cols: 8, colors: 6, moves: 15, goals: { collect: { 0: 20, 2: 15 } }, stars: [2000, 3800, 5500] },
    { id: 32, name: 'Precision',       rows: 7, cols: 7, colors: 6, moves: 12, goals: { score: 3200 }, stars: [3200, 4800, 7000] },
    { id: 33, name: 'Rainbow Raid',    rows: 8, cols: 8, colors: 6, moves: 22, goals: { collect: { 0: 8, 1: 8, 2: 8, 3: 8 } }, stars: [2200, 4000, 6000] },
    { id: 34, name: 'Score Siege',     rows: 8, cols: 8, colors: 6, moves: 16, goals: { score: 7000 }, stars: [7000, 10000, 14000] },
    { id: 35, name: 'Color Crunch',    rows: 8, cols: 8, colors: 6, moves: 14, goals: { collect: { 3: 22, 4: 18 } }, stars: [2300, 4200, 6200] },
    { id: 36, name: 'Endgame Prep',    rows: 8, cols: 8, colors: 6, moves: 14, goals: { score: 5000, collect: { 5: 15 } }, stars: [5000, 7500, 10000] },
    { id: 37, name: 'Brutal Blues',    rows: 7, cols: 7, colors: 6, moves: 11, goals: { collect: { 1: 24 } }, stars: [2400, 4500, 6500] },
    { id: 38, name: 'Mega Cascade',    rows: 8, cols: 8, colors: 5, moves: 15, goals: { score: 8000 }, stars: [8000, 12000, 16000] },
    { id: 39, name: 'Final Trial',     rows: 8, cols: 8, colors: 6, moves: 13, goals: { score: 4500, collect: { 0: 12, 4: 12 } }, stars: [4500, 7000, 10000] },
    { id: 40, name: 'Gem Master',      rows: 8, cols: 8, colors: 6, moves: 12, goals: { score: 9000, collect: { 2: 20 } }, stars: [9000, 13500, 18000] }
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
})(window);
