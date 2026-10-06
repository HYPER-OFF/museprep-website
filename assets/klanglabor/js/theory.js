'use strict';
/* Musiktheorie: deutsche Tonnamen, Intervalle, Akkorde.
   Ein Ton ist { l: Stammton 0–6 (C D E F G A H), a: Vorzeichen −2…+2, o: Oktave }. */

const Theory = (() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const PC_NAMES = ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'];

  // Deutsche Namen: Cis, Es, As, B (= H erniedrigt), Heses (= H doppelt erniedrigt) …
  function spell(l, a) {
    if (a === 0) return LETTERS[l];
    if (a > 0) return LETTERS[l] + 'is'.repeat(a);
    if (l === 6) return a === -1 ? 'B' : 'Heses';
    if (l === 2 || l === 5) return LETTERS[l] + 's' + 'es'.repeat(-a - 1);
    return LETTERS[l] + 'es'.repeat(-a);
  }

  const TABLE = {};
  for (let l = 0; l < 7; l++) for (let a = -2; a <= 2; a++) TABLE[spell(l, a)] = { l, a };

  function note(name, o = 4) {
    const e = TABLE[name];
    if (!e) throw new Error('Unbekannter Ton: ' + name);
    return { l: e.l, a: e.a, o };
  }

  const midi = n => (n.o + 1) * 12 + NAT[n.l] + n.a;
  const pc = n => mod(NAT[n.l] + n.a, 12);
  const name = n => spell(n.l, n.a);
  const pcName = p => PC_NAMES[mod(p, 12)];
  const join = notes => notes.map(name).join(' – ');
  // Stammtonstufe ab C0 (C4 = 28): ein Schritt = eine Linie oder ein Zwischenraum weiter.
  const step = n => n.o * 7 + n.l;
  const fromStep = (d, a = 0) => ({ l: mod(d, 7), a, o: Math.floor(d / 7) });

  // 'C4 Es4 G4' → Töne; die Ziffer am Ende ist die Oktave (C4 = eingestrichenes C, MIDI 60).
  function notes(str) {
    return str.trim().split(/\s+/).map(t => {
      const m = /^([A-Za-z]+)(\d)$/.exec(t);
      if (!m) throw new Error('Unbekannter Ton: ' + t);
      return note(m[1], Number(m[2]));
    });
  }

  // Ton zu einer MIDI-Nummer, geschrieben als nm (z. B. 61 + 'Des' → Des4, 60 + 'His' → His3).
  function fromMidi(m, nm = pcName(m)) {
    const e = TABLE[nm];
    if (!e) throw new Error('Unbekannter Ton: ' + nm);
    return { l: e.l, a: e.a, o: Math.round((m - NAT[e.l] - e.a) / 12) - 1 };
  }

  // Tonartnamen: Dur groß, Moll klein (D-Dur, d-Moll, fis-Moll, b-Moll).
  const durName = n => name(n) + '-Dur';
  const mollName = n => name(n).charAt(0).toLowerCase() + name(n).slice(1) + '-Moll';

  // Alle Schreibweisen eines Tons (z. B. 5 → F, Eis, Geses), höchstens maxAcc Vorzeichen.
  function spellings(p, maxAcc = 2) {
    return Object.entries(TABLE)
      .filter(([, e]) => Math.abs(e.a) <= maxAcc && mod(NAT[e.l] + e.a, 12) === mod(p, 12))
      .map(([nm]) => nm);
  }

  // steps = Stammtonschritte (2 = Terz), semis = Halbtöne
  function transpose(n, steps, semis) {
    const l2 = n.l + steps;
    const o = n.o + Math.floor(l2 / 7);
    const l = mod(l2, 7);
    return { l, a: midi(n) + semis - ((o + 1) * 12 + NAT[l]), o };
  }

  // Terzenschichtung: jede Stufe springt einen Notennamen weiter.
  function stack(root, intervals) {
    const out = [root];
    let cur = root;
    for (const iv of intervals) { cur = transpose(cur, 2, iv); out.push(cur); }
    return out;
  }

  const CHORDS = {
    maj:    { name: 'Dur-Dreiklang', iv: [4, 3] },
    min:    { name: 'Moll-Dreiklang', iv: [3, 4] },
    dim:    { name: 'verminderter Dreiklang', iv: [3, 3] },
    aug:    { name: 'übermäßiger Dreiklang', iv: [4, 4] },
    dim7:   { name: 'verminderter Septakkord', iv: [3, 3, 3] },
    hdim7:  { name: 'halbverminderter Septakkord', iv: [3, 3, 4] },
    dom7:   { name: 'Dominantseptakkord', iv: [4, 3, 3] },
    m7:     { name: 'Moll-Septakkord', iv: [3, 4, 3] },
    maj7:   { name: 'großer Septakkord (maj7)', iv: [4, 3, 4] },
    mmaj7:  { name: 'Moll-Akkord mit großer Septime', iv: [3, 4, 4] },
    augmaj7:{ name: 'übermäßiger Akkord mit großer Septime', iv: [4, 4, 3] },
    dom9b:  { name: 'Dominantseptnonakkord mit kleiner None', iv: [4, 3, 3, 3] },
    dom9:   { name: 'Dominantseptnonakkord', iv: [4, 3, 3, 4] },
    maj9:   { name: 'großer Septnonakkord', iv: [4, 3, 4, 3] },
    m9:     { name: 'Moll-Septnonakkord', iv: [3, 4, 3, 4] },
  };

  const chord = (root, type) => stack(root, CHORDS[type].iv);

  function chordMidis(rootMidi, type) {
    const out = [rootMidi];
    for (const iv of CHORDS[type].iv) out.push(out[out.length - 1] + iv);
    return out;
  }

  function identify(ivs) {
    const key = ivs.join(',');
    for (const [id, c] of Object.entries(CHORDS)) if (c.iv.join(',') === key) return { id, ...c };
    return null;
  }

  const NUMBERS = ['Prime', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime'];

  // Intervall zwischen zwei geschriebenen Tönen, z. B. C → Heses = verminderte Septime.
  function interval(a, b) {
    const steps = (b.o * 7 + b.l) - (a.o * 7 + a.l);
    const semis = midi(b) - midi(a);
    const simple = mod(steps, 7);
    const rest = semis - 12 * Math.floor(steps / 7);
    let quality;
    if (simple === 0 || simple === 3 || simple === 4) {
      const d = rest - [0, 0, 0, 5, 7][simple];
      quality = { '-1': 'verminderte', 0: 'reine', 1: 'übermäßige' }[d];
    } else {
      const d = rest - { 1: 2, 2: 4, 5: 9, 6: 11 }[simple];
      quality = { '-2': 'verminderte', '-1': 'kleine', 0: 'große', 1: 'übermäßige' }[d];
    }
    const num = steps === 7 ? 'Oktave' : NUMBERS[simple];
    return { steps, semis, name: (quality || '') + ' ' + num };
  }

  return { PC_NAMES, CHORDS, note, notes, midi, pc, name, pcName, join, step, fromStep, fromMidi, durName, mollName, spellings, transpose, stack, chord, chordMidis, identify, interval };
})();
