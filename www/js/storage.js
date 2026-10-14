/**
 * Local progress + Cow Cash/coins + boosters + daily quests + theme.
 * localStorage only. No servers.
 */
(function (global) {
  'use strict';

  const KEY = 'bubble-match3-progress-v1';
  const CONTINUE_COST = 50;
  const REWARD_CASH = 40;

  const BOOSTER_PRICES = { hammer: 80, rowBlast: 100, colorBrush: 120, freeSwitch: 100, colorBombStart: 150, plusMoves: 90 };
  const BOOSTER_START = { hammer: 2, rowBlast: 1, colorBrush: 1, freeSwitch: 1, colorBombStart: 1, plusMoves: 1 };
  const QUEST_REWARD = 60;

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function defaults() {
    return {
      unlocked: 1,
      levels: {},
      totalStars: 0,
      continuesUsed: 0,
      cowCash: 100,
      sound: true,
      boosters: Object.assign({}, BOOSTER_START),
      theme: 'neon',
      reduceFx: false,
      quest: {
        date: todayKey(),
        wins: 0,
        cascades: 0,
        winClaimed: false,
        cascadeClaimed: false
      }
    };
  }

  function migrate(p) {
    if (!p.boosters) p.boosters = Object.assign({}, BOOSTER_START);
    ['hammer', 'rowBlast', 'colorBrush', 'freeSwitch', 'colorBombStart', 'plusMoves'].forEach((k) => {
      if (typeof p.boosters[k] !== 'number') p.boosters[k] = BOOSTER_START[k] || 0;
    });
    if (!p.theme) p.theme = 'neon';
    if (typeof p.reduceFx !== 'boolean') p.reduceFx = false;
    if (!p.quest || p.quest.date !== todayKey()) {
      p.quest = {
        date: todayKey(),
        wins: 0,
        cascades: 0,
        winClaimed: false,
        cascadeClaimed: false
      };
    }
    return p;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return migrate(Object.assign(defaults(), JSON.parse(raw)));
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

  function getCoins() { return load().cowCash || 0; }
  function addCoins(n) { return addCowCash(n); }
  function spendCoins(n) { return spendCowCash(n); }

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

  function getBoosters() {
    return Object.assign({}, load().boosters);
  }

  function addBooster(type, n) {
    const p = load();
    p.boosters[type] = Math.max(0, (p.boosters[type] || 0) + (n || 1));
    save(p);
    return p.boosters[type];
  }

  function spendBooster(type) {
    const p = load();
    if ((p.boosters[type] || 0) < 1) return false;
    p.boosters[type] -= 1;
    save(p);
    return true;
  }

  function buyBooster(type) {
    const price = BOOSTER_PRICES[type];
    if (!price) return { ok: false, reason: 'unknown' };
    const p = load();
    if ((p.cowCash || 0) < price) return { ok: false, reason: 'broke' };
    p.cowCash -= price;
    p.boosters[type] = (p.boosters[type] || 0) + 1;
    save(p);
    return { ok: true, boosters: p.boosters, coins: p.cowCash };
  }

  function getTheme() { return load().theme || 'neon'; }

  function setTheme(id) {
    const p = load();
    p.theme = id;
    save(p);
    return p.theme;
  }

  function getQuest() {
    return load().quest;
  }

  function recordQuestWin() {
    const p = load();
    migrate(p);
    p.quest.wins = (p.quest.wins || 0) + 1;
    save(p);
    return p.quest;
  }

  function recordQuestCascades(n) {
    if (!n) return getQuest();
    const p = load();
    migrate(p);
    p.quest.cascades = (p.quest.cascades || 0) + n;
    save(p);
    return p.quest;
  }

  function claimQuest(kind) {
    const p = load();
    migrate(p);
    const q = p.quest;
    if (kind === 'wins') {
      if (q.winClaimed || q.wins < 3) return { ok: false };
      q.winClaimed = true;
      p.cowCash = (p.cowCash || 0) + QUEST_REWARD;
      save(p);
      return { ok: true, reward: QUEST_REWARD, coins: p.cowCash };
    }
    if (kind === 'cascades') {
      if (q.cascadeClaimed || q.cascades < 10) return { ok: false };
      q.cascadeClaimed = true;
      p.cowCash = (p.cowCash || 0) + QUEST_REWARD;
      save(p);
      return { ok: true, reward: QUEST_REWARD, coins: p.cowCash };
    }
    return { ok: false };
  }

  function recordWin(levelId, score, stars) {
    const p = load();
    migrate(p);
    const key = String(levelId);
    const prev = p.levels[key] || { stars: 0, bestScore: 0 };
    const isNewBest = score > prev.bestScore;
    const newStars = Math.max(prev.stars, stars);
    p.levels[key] = {
      stars: newStars,
      bestScore: Math.max(prev.bestScore, score)
    };
    let unlockedNext = false;
    const max = global.Levels ? global.Levels.getLevelCount() : 64;
    if (levelId >= p.unlocked && levelId < max) {
      p.unlocked = levelId + 1;
      unlockedNext = true;
    } else if (levelId === max) {
      p.unlocked = Math.max(p.unlocked, levelId);
    }
    p.totalStars = Object.values(p.levels).reduce((s, r) => s + (r.stars || 0), 0);
    const cashBonus = 10 + stars * 15;
    p.cowCash = (p.cowCash || 0) + cashBonus;
    p.quest.wins = (p.quest.wins || 0) + 1;
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

  function getReduceFx() { return !!load().reduceFx; }

  function setReduceFx(on) {
    const p = load();
    p.reduceFx = !!on;
    save(p);
  }

  function resetAll() {
    const sound = load().sound;
    const theme = load().theme;
    const reduceFx = load().reduceFx;
    const d = defaults();
    d.sound = sound;
    d.theme = theme;
    d.reduceFx = reduceFx;
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
    getReduceFx,
    setReduceFx,
    resetAll,
    addCowCash,
    spendCowCash,
    getCoins,
    addCoins,
    spendCoins,
    getBoosters,
    addBooster,
    spendBooster,
    buyBooster,
    getTheme,
    setTheme,
    getQuest,
    recordQuestWin,
    recordQuestCascades,
    claimQuest,
    KEY,
    CONTINUE_COST,
    REWARD_CASH,
    BOOSTER_PRICES,
    QUEST_REWARD
  };
})(window);
