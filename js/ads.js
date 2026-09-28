/**
 * Cow-Cash + rewarded ad stubs. Core play never requires ads or network.
 */
(function (global) {
  'use strict';

  const CONFIG = global.ADMOB_CONFIG || {
    enabled: false,
    bannerId: null,
    interstitialId: null,
    rewardedId: null
  };

  const CONTINUE_COST = 50;
  const REWARD_CASH = 40;

  const REASON_LABELS = {
    continue_moves: 'Continue — +5 extra moves',
    cow_cash: 'Earn Cow Cash',
    double_reward: '2× level Cow Cash',
    interstitial: 'Interstitial between levels'
  };

  function showBanner() {
    if (!CONFIG.enabled || !CONFIG.bannerId) {
      const el = document.getElementById('ad-banner');
      if (el) el.hidden = true;
      return Promise.resolve({ shown: false, reason: 'stub' });
    }
    return Promise.resolve({ shown: false, reason: 'no-plugin' });
  }

  function hideBanner() {
    const el = document.getElementById('ad-banner');
    if (el) el.hidden = true;
    return Promise.resolve();
  }

  function showInterstitial() {
    return new Promise((resolve) => {
      if (!CONFIG.enabled || !CONFIG.interstitialId) {
        resolve({ shown: false, reason: 'stub' });
        return;
      }
      resolve({ shown: false, reason: 'no-plugin' });
    });
  }

  function showRewarded(reason) {
    return new Promise((resolve) => {
      const label = REASON_LABELS[reason] || ('Reward: ' + reason);
      if (!CONFIG.enabled || !CONFIG.rewardedId) {
        const host = document.getElementById('modal-ad-stub');
        if (host) {
          const title = host.querySelector('.ad-stub-title');
          const body = host.querySelector('.ad-stub-body');
          if (title) title.textContent = 'Rewarded Ad (stub)';
          if (body) {
            body.textContent =
              label +
              '\n\nNo AdMob ID configured. Cow-Cash / rewarded stub.\nGrant reward for this session?';
          }
          host.hidden = false;
          const yesBtn = host.querySelector('[data-ad-yes]');
          const noBtn = host.querySelector('[data-ad-no]');
          const onYes = () => { cleanup(); resolve({ rewarded: true, stub: true, reason: reason }); };
          const onNo = () => { cleanup(); resolve({ rewarded: false, stub: true, reason: reason }); };
          function cleanup() {
            host.hidden = true;
            yesBtn?.removeEventListener('click', onYes);
            noBtn?.removeEventListener('click', onNo);
          }
          yesBtn?.addEventListener('click', onYes);
          noBtn?.addEventListener('click', onNo);
          return;
        }
        const ok = confirm('Rewarded ad stub (no AdMob).\n\n' + label + '\n\nGrant reward?');
        resolve({ rewarded: !!ok, stub: true, reason: reason });
        return;
      }
      resolve({ rewarded: false, reason: 'no-plugin' });
    });
  }

  global.Ads = {
    CONFIG,
    CONTINUE_COST,
    REWARD_CASH,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded
  };
})(window);
