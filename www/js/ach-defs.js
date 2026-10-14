/* Game-specific achievements (cosmetic coin rewards). Shared ones live in achievements.js. */
window.ACH_DEFS = [
  { "id": "bm_first", "name": "First Pop", "desc": "Clear your first level", "metric": "wins", "goal": 1, "reward": 15 },
  { "id": "bm_wins25", "name": "Bubble Hand", "desc": "Clear 25 levels", "metric": "wins", "goal": 25, "reward": 80 },
  { "id": "bm_wins100", "name": "Pop Veteran", "desc": "Clear 100 levels (replays count)", "metric": "wins", "goal": 100, "reward": 200 },
  { "id": "bm_star10", "name": "Starry Board", "desc": "Earn 3 stars on 10 levels", "metric": "stars3", "goal": 10, "reward": 90 },
  { "id": "bm_clean10", "name": "Pure Skill", "desc": "Clear 10 levels without boosters or continues", "metric": "clean_wins", "goal": 10, "reward": 70 },
  { "id": "bm_block10", "name": "Blocker Buster", "desc": "Clear 10 levels with ice, stone, moss or cherries", "metric": "blocker_wins", "goal": 10, "reward": 90 },
  { "id": "bm_spare", "name": "Moves to Spare", "desc": "Clear 5 levels with 5+ moves left", "metric": "spare_wins", "goal": 5, "reward": 60 },
  { "id": "bm_all", "name": "Grand Finale", "desc": "Reach level 64", "metric": "best_level", "goal": 64, "reward": 250 }
];
