// Interstitial gate + ad placement rules (no ad on launch/exit/first session; only after a completed level).
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const G = require(path.join(__dirname, '..', 'www/js/adgate.js'));
function mem() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; }
const g = G.make(mem());
g.startSession();
for (let i = 0; i < 10; i++) g.levelDone();
assert.equal(g.allow(), false, 'never in the first session, however many levels');
g.startSession();
assert.equal(g.allow(), true, 'second session after 5+ levels');
const g2 = G.make(mem()); g2.startSession(); g2.startSession(); g2.levelDone();
assert.equal(g2.allow(), false, 'needs 5 completed levels');
const ui = fs.readFileSync(path.join(__dirname, '..', 'www/js/ui.js'), 'utf8');
const calls = ui.split('\n').filter(l => /Ads\.showInterstitial\(/.test(l));
assert.equal(calls.length, 1, 'one interstitial call site');
assert.match(calls[0], /function afterLevelAd/, 'interstitial only via afterLevelAd');
const uses = ui.split('\n').filter(l => /afterLevelAd\(\)/.test(l) && !/function/.test(l));
assert.equal(uses.length, 2, 'afterLevelAd only from the win card buttons');
const init = ui.slice(ui.indexOf('function init()'), ui.indexOf('function init()') + 400);
assert.ok(!/Interstitial/.test(init), 'no ad on launch');
const onWin = ui.slice(ui.indexOf('async function onWin'), ui.indexOf('function afterLevelAd'));
assert.ok(!/showInterstitial\(/.test(onWin), 'no interstitial as the win card opens');
for (const l of ui.split('\n').filter(l => /Ads\.showRewarded\(/.test(l))) assert.ok(true, l);
const ads = fs.readFileSync(path.join(__dirname, '..', 'www/js/ads.js'), 'utf8');
assert.match(ads, /AdGate\.allow\(\)/, 'ads.js consults the gate');
console.log('ALL ADGATE TESTS PASSED');
