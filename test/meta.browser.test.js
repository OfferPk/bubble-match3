// v2.1 headless test: how-to card, first-level coach, win -> achievements + challenge, daily reward,
// skin shop (preview, buy, persist), awards/stats, accessibility settings, no interstitial in session 1.
// Usage: node test/meta.browser.test.js http://localhost:8783/ [outdir]
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const URL = process.argv[2] || 'http://localhost:8783/';
const OUT = process.argv[3] || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ok(c, m) { if (!c) throw new Error(m); console.log('ok -', m); }
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'],
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'bm-meta-')) });
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|sw\.js/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' }); await sleep(500);
  ok(await page.evaluate(() => AdGate.state().sessions === 1), 'first session counted');
  ok(await page.$eval('#howto', e => !e.classList.contains('hidden')), 'how-to card on first launch');
  ok(!!(await page.$('#meta-bar #btn-skins')) && !!(await page.$('#btn-shop')), 'meta bar with Skin Shop next to the Booster Shop');
  await page.screenshot({ path: path.join(OUT, 'bm-howto.png') });
  await page.click('#howto .howto-go'); await sleep(300);
  await page.evaluate(() => window.__bubble.startLevel(1)); await sleep(900);
  ok(!!(await page.$('.coach')), 'first-level coach starts on level 1');
  for (let i = 0; i < 8 && await page.$('.coach-next'); i++) { await page.click('.coach-next'); await sleep(150); }
  ok(!(await page.$('.coach')) && await page.evaluate(() => localStorage.getItem('bubblematch3.meta.v1.coach') === '1'), 'coach finished and remembered');

  const c0 = await page.evaluate(() => Storage.getCoins());
  await page.evaluate(() => window.__bubble.winForTest(3)); await sleep(400);
  ok(await page.evaluate(() => Meta.ach().get('wins') === 1 && Meta.ach().state().done.bm_first === 1), 'First Pop achievement unlocked');
  ok(await page.evaluate(() => Meta.state().chal && Meta.state().chal.day === MetaLogic.dateKey()), 'daily challenge progress tracked');
  ok((await page.evaluate(() => Storage.getCoins())) > c0, 'win pays coins');
  const adCalls = await page.evaluate(async () => { let n = 0; const o = Ads.showInterstitial; Ads.showInterstitial = async () => { n++; return o(); };
    const r = await o(); Ads.showInterstitial = o; return r; });
  ok(adCalls && adCalls.shown === false && adCalls.reason === 'gate', 'no interstitial possible in the first session');
  ok(!(await page.$eval('#modal-win', e => e.hidden)), 'win card shown with no ad on win');
  await page.click('#btn-win-levels'); await sleep(300);
  await page.evaluate(() => window.__bubble.showScreen('screen-menu')); await sleep(200);

  await page.click('#btn-daily'); await sleep(300);
  ok((await page.$$eval('.daily-day', l => l.length)) === 7, '7-day reward calendar');
  const c1 = await page.evaluate(() => Storage.getCoins());
  await page.click('.daily-claim'); await sleep(200);
  ok((await page.evaluate(() => Storage.getCoins())) >= c1 + 10, 'day-1 reward goes into the coin wallet');
  await page.click('.daily-x'); await sleep(200);

  await page.evaluate(() => Storage.addCoins(1000));
  await page.click('#btn-skins'); await sleep(300);
  ok((await page.$$('#shop .item')).length === 14, 'shop: 7 finishes + 7 backdrops');
  await page.evaluate(() => document.querySelectorAll('#shop .shop-grid .item')[1].querySelector('.prev').click()); await sleep(100);
  ok(await page.evaluate(() => document.body.classList.contains('fin-matte')), 'finish preview applies without buying');
  await page.evaluate(() => document.querySelector('#shop [data-close]').click()); await sleep(150);
  ok(await page.evaluate(() => !document.body.classList.contains('fin-matte')), 'closing the shop ends the preview');
  await page.click('#btn-skins'); await sleep(200);
  await page.evaluate(() => document.querySelectorAll('#shop .shop-grid .item')[6].querySelector('.buy').click()); await sleep(150);
  ok(await page.evaluate(() => document.body.classList.contains('fin-glow')), 'finish bought and applied');
  await page.screenshot({ path: path.join(OUT, 'bm-shop.png') });
  await page.evaluate(() => document.querySelector('#shop [data-close]').click());
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  ok(await page.evaluate(() => document.body.classList.contains('fin-glow')), 'skins persist across launches');
  ok(await page.evaluate(() => AdGate.state().sessions === 2), 'second session counted');
  ok(await page.$eval('#howto', e => e.classList.contains('hidden')), 'how-to card only on first launch');

  await page.click('#btn-awards'); await sleep(200);
  await page.evaluate(() => document.querySelector('.ach-tabs [data-t="stats"]').click()); await sleep(100);
  ok(/Levels cleared/.test(await page.$eval('.ach-body', e => e.textContent)), 'stats tab shows level stats');
  await page.evaluate(() => document.querySelector('.ach-x').click());

  await page.click('#btn-settings'); await sleep(200);
  for (const id of ['set-large', 'set-contrast', 'set-motion']) await page.evaluate(id => document.getElementById(id).click(), id);
  ok(await page.evaluate(() => ['a11y-large', 'a11y-contrast', 'a11y-reduce'].every(c => document.documentElement.classList.contains(c))), 'accessibility settings apply');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
  ok(await page.evaluate(() => ['a11y-large', 'a11y-contrast', 'a11y-reduce'].every(c => document.documentElement.classList.contains(c))), 'accessibility settings persist');
  ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  console.log('ALL META BROWSER TESTS PASSED');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
