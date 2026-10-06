'use strict';
/* Klangerzeugung mit der Web Audio API: ein kleiner Klavier-Synth, Hall und Effektklänge. */

const Sound = (() => {
  let ctx = null, bus = null;
  let enabled = true;

  // Hall: selbst erzeugte Impulsantwort aus abklingendem Rauschen.
  function impulse(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      comp.connect(ctx.destination);
      bus = ctx.createGain();
      bus.gain.value = 0.75;
      const verb = ctx.createConvolver();
      verb.buffer = impulse(ctx, 2.2, 3);
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      bus.connect(comp);
      bus.connect(verb); verb.connect(wet); wet.connect(comp);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function piano(m, when = 0, dur = 1.8, vel = 0.3) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + 0.02 + when;
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const len = dur * Math.max(0.55, Math.min(1.3, 1.25 - (m - 60) / 48));
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    env.gain.exponentialRampToValueAtTime(vel * 0.4, t + 0.22);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(f * 9, 14000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 300), t + len);
    lp.connect(env);
    env.connect(bus);
    const partials = [[1, 1, 'triangle', 0], [2, 0.32, 'sine', 3], [3, 0.12, 'sine', -4], [4.02, 0.05, 'sine', 0]];
    for (const [mult, amp, type, det] of partials) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = det;
      const g = c.createGain();
      g.gain.value = amp;
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + len + 0.05);
    }
  }

  function chord(midis, { when = 0, arp = 0, dur = 2 } = {}) {
    const vel = 0.3 / Math.sqrt(midis.length) + 0.06;
    midis.forEach((m, i) => piano(m, when + i * arp, dur, vel));
  }

  // Töne nacheinander, z. B. eine Melodie; step = Abstand in Sekunden.
  function seq(midis, { when = 0, step = 0.55, dur = 1.1, vel = 0.3 } = {}) {
    midis.forEach((m, i) => piano(m, when + i * step, dur, vel));
  }

  // Rhythmus: items = [[midi oder null für eine Pause, Schläge], …], bpm = Viertel pro Minute.
  function rhythm(items, { when = 0, bpm = 96, vel = 0.3 } = {}) {
    const beat = 60 / bpm;
    let t = when;
    for (const [m, beats] of items) {
      if (m != null) piano(m, t, Math.max(0.25, beats * beat * 0.92), vel);
      t += beats * beat;
    }
    return t - when;
  }

  // Metronom-Klick, betont auf der Eins.
  function click(when = 0, accent = false) {
    bell(accent ? 1760 : 1320, when, 0.06, accent ? 0.12 : 0.07, 'square');
  }

  function bell(freq, when, dur, vel, type = 'sine') {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + 0.01 + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const sfx = {
    ok() { bell(1318.5, 0, 0.35, 0.09); bell(1975.5, 0.07, 0.5, 0.08); },
    bad() {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime + 0.01;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.22);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 0.3);
    },
    // Das Erkennungsmotiv: H°7 löst sich nach C-Dur auf.
    fanfare() {
      chord([59, 65, 68, 74], { arp: 0.06, dur: 1.1 });
      chord([48, 60, 64, 67, 72], { when: 0.75, dur: 2.8 });
    },
  };

  return {
    piano, chord, seq, rhythm, click, sfx,
    unlock: ensure,
    get enabled() { return enabled; },
    setEnabled(v) { enabled = !!v; if (!enabled && ctx) ctx.suspend(); if (enabled && ctx) ctx.resume(); },
  };
})();
