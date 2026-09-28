/**
 * Web Audio beeps — no asset files. Honors Storage.sound / toggle.
 */
(function (global) {
  'use strict';

  let ctx = null;

  function enabled() {
    try {
      return !!(global.Storage && global.Storage.get().sound);
    } catch (_) {
      return true;
    }
  }

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function beep(freq, dur, type, gain) {
    if (!enabled()) return;
    const c = getCtx();
    if (!c) return;
    resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain == null ? 0.07 : gain;
    osc.connect(g);
    g.connect(c.destination);
    const now = c.currentTime;
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function select() { beep(660, 0.05, 'triangle', 0.05); }
  function swap() { beep(420, 0.04, 'square', 0.04); }
  function match(combo) {
    const base = 520 + Math.min(combo, 6) * 60;
    beep(base, 0.08, 'sine', 0.08);
  }
  function drop() { beep(280, 0.03, 'triangle', 0.03); }
  function special() {
    beep(600, 0.08, 'sawtooth', 0.05);
    setTimeout(() => beep(900, 0.1, 'sine', 0.07), 70);
  }
  function win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'sine', 0.08), i * 120));
  }
  function lose() {
    beep(400, 0.12, 'sawtooth', 0.05);
    setTimeout(() => beep(280, 0.18, 'sawtooth', 0.05), 100);
  }
  function cash() {
    beep(880, 0.06, 'square', 0.04);
    setTimeout(() => beep(1100, 0.08, 'square', 0.05), 60);
  }
  function click() { beep(500, 0.03, 'triangle', 0.04); }

  function setEnabled(on) {
    if (global.Storage) global.Storage.setSound(!!on);
  }

  function isEnabled() { return enabled(); }

  global.AudioFX = {
    select, swap, match, drop, special, win, lose, cash, click,
    setEnabled, isEnabled, resume
  };
})(window);
