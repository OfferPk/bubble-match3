/**
 * Local progress + Cow Cash. localStorage only. No servers.
 */
(function (global) {
  'use strict';

  const KEY = 'bubble-match3-progress-v1';
  const CONTINUE_COST = 50;
  const REWARD_CASH = 40;

  function defaults() {
    return {
      unlocked: 1,
      levels: {},
      totalStars: 0,
      continuesUsed: 0,
      cowCash: 100,
      sound: true
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) {
      return defaults();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* quota / private mode */ }
  }

  function getProgress() { return load(); }
  function get() { return load(); }

  function isUnlocked(levelId) {
    return levelId <= load().unlocked;
  }

  function getLevelRecord(levelId) {
    const p = load();
    return p.levels[String(levelId)] || { stars: 0, bestScore: 0 };
  }

  function addCowCash(n) {
    const p = load();
    p.cowCash = Math.max(0, (p.cowCash || 0) + n);
    save(p);
    return p.cowCash;
  }

  function spendCowCash(n) {
    const p = load();
    if ((p.cowCash || 0) < n) return false;
    p.cowCash -= n;
    save(p);
    return true;
  }

  function recordWin(levelId, score, stars) {
    const p = load();
    const key = String(levelId);
    const prev = p.levels[key] || { stars: 0, bestScore: 0 };
    const isNewBest = score > prev.bestScore;
    const newStars = Math.max(prev.stars, stars);
    p.levels[key] = {
      stars: newStars,
      bestScore: Math.max(prev.bestScore, score)
    };
    let unlockedNext = false;
    const max = global.Levels ? global.Levels.getLevelCount() : 40;
    if (levelId >= p.unlocked && levelId < max) {
      p.unlocked = levelId + 1;
      unlockedNext = true;
    } else if (levelId === max) {
      p.unlocked = Math.max(p.unlocked, levelId);
    }
    p.totalStars = Object.values(p.levels).reduce((s, r) => s + (r.stars || 0), 0);
    const cashBonus = 10 + stars * 15;
    p.cowCash = (p.cowCash || 0) + cashBonus;
    save(p);
    return { stars: newStars, isNewBest, unlockedNext, cashBonus };
  }

  function recordContinue() {
    const p = load();
    p.continuesUsed = (p.continuesUsed || 0) + 1;
    save(p);
  }

  function setSound(on) {
    const p = load();
    p.sound = !!on;
    save(p);
  }

  function resetAll() {
    const sound = load().sound;
    const d = defaults();
    d.sound = sound;
    save(d);
  }

  global.Storage = {
    getProgress,
    get,
    isUnlocked,
    getLevelRecord,
    recordWin,
    recordContinue,
    setSound,
    resetAll,
    addCowCash,
    spendCowCash,
    KEY,
    CONTINUE_COST,
    REWARD_CASH
  };
})(window);
