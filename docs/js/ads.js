/*
 * Ad hooks. In a normal browser every call is a no-op and rewarded ads simply
 * grant the reward. Inside the Capacitor Android app they use
 * @capacitor-community/admob (Capacitor.Plugins.AdMob). IDs live in ads-config.js.
 * Rewarded ads are only ever started from a player tap. Interstitials only after a
 * completed level, gated by AdGate (never on launch/exit or in the first session).
 */
(function (global) {
  'use strict';
  var cfg = global.ADS_CONFIG || {};
  var CONTINUE_COST = 50, REWARD_CASH = 40;
  var levelsSince = 0, lastAt = 0, initPromise = null, busy = false;

  function isNative() { return !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform()); }
  function plugin() { return global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.AdMob; }

  function init() {
    if (initPromise) return initPromise;
    var AdMob = plugin();
    if (!isNative() || !AdMob) { initPromise = Promise.resolve(false); return initPromise; }
    initPromise = (async function () {
      try {
        await AdMob.initialize({ initializeForTesting: !!cfg.IS_TESTING });
        try {
          var info = await AdMob.requestConsentInfo();
          if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
        } catch (e) {}
        return true;
      } catch (e) { console.warn('AdMob init failed', e); return false; }
    })();
    return initPromise;
  }

  function showBanner() { return Promise.resolve({ shown: false }); }
  function hideBanner() { var el = document.getElementById('ad-banner'); if (el) el.hidden = true; return Promise.resolve(); }

  /** Call ONLY from a post-level button (Next Level / Level Select on the win card). */
  async function showInterstitial() {
    if (global.AdGate) { global.AdGate.levelDone(); if (!global.AdGate.allow()) return { shown: false, reason: 'gate' }; }
    levelsSince++;
    var now = Date.now();
    if (levelsSince < (cfg.INTERSTITIAL_EVERY_N_LEVELS || 3)) return { shown: false, reason: 'pacing' };
    if (now - lastAt < (cfg.INTERSTITIAL_MIN_INTERVAL_MS || 60000)) return { shown: false, reason: 'pacing' };
    levelsSince = 0; lastAt = now;
    if (!(await init())) return { shown: false, reason: 'web' };
    try {
      await plugin().prepareInterstitial({ adId: cfg.INTERSTITIAL_ID, isTesting: !!cfg.IS_TESTING });
      await plugin().showInterstitial();
      return { shown: true };
    } catch (e) { return { shown: false, reason: 'error' }; }
  }

  /** Resolves { rewarded } — in a browser the reward is granted immediately. */
  async function showRewarded(reason) {
    if (busy) return { rewarded: false, reason: reason };
    var native = await init();
    if (!native) return { rewarded: true, web: true, reason: reason };
    busy = true;
    var AdMob = plugin(), rewarded = false, handle = null;
    try {
      handle = await AdMob.addListener('onRewardedVideoAdReward', function () { rewarded = true; });
      await AdMob.prepareRewardVideoAd({ adId: cfg.REWARDED_ID, isTesting: !!cfg.IS_TESTING });
      var item = await AdMob.showRewardVideoAd();
      if (item) rewarded = true;
    } catch (e) { console.warn('rewarded failed', e); }
    finally { busy = false; if (handle && handle.remove) try { handle.remove(); } catch (e) {} }
    return { rewarded: rewarded, reason: reason };
  }

  global.Ads = { CONFIG: cfg, CONTINUE_COST: CONTINUE_COST, REWARD_CASH: REWARD_CASH, init: init, isNative: isNative,
    showBanner: showBanner, hideBanner: hideBanner, showInterstitial: showInterstitial, showRewarded: showRewarded };
})(window);
