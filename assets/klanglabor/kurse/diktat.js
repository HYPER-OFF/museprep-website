'use strict';
/* Kurs: Melodie-Diktate – Richtung, Schritte und Sprünge, Stufen, Intervalle, Diktate. */

(() => {
  // C-Dur-Tonleiter von C4 bis G5 als MIDI-Nummern; der Index ist die Tonleiterstufe ab C4.
  const SC = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  const UP = '↗', DOWN = '↘', SAME = '→';
  const STEP = 0.62;
  const arrowOf = d => (d > 0 ? UP : d < 0 ? DOWN : SAME);
  const nameOf = m => T.pcName(m);
  const joinM = ms => ms.map(nameOf).join(' – ');
  const playMel = ms => Sound.seq(ms, { step: STEP });
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const halbtoene = k => `${k} ${k === 1 ? 'Halbton' : 'Halbtöne'}`;

  // Melodie aus Stufenschritten; null, wenn sie die Tonleiter verlässt.
  function walk(start, moves) {
    const idx = [start];
    for (const d of moves) idx.push(idx[idx.length - 1] + d);
    return idx.every(i => i >= 0 && i < SC.length) ? idx.map(i => SC[i]) : null;
  }

  // Zufallsmelodie mit len Tönen zwischen den Stufen lo und hi; choices = mögliche Stufenschritte.
  function randomWalk(len, choices, lo = 0, hi = SC.length - 1) {
    for (;;) {
      const moves = Array.from({ length: len - 1 }, () => pick(choices));
      const mel = walk(randInt(lo, hi), moves);
      if (mel && mel.every(m => m >= SC[lo] && m <= SC[hi])) return { mel, moves };
    }
  }

  const contourGen = () => {
    const { mel, moves } = randomWalk(4, [-2, -1, 0, 1, 2, -1, 1], 1, 8);
    return { mel, moves: moves.map(arrowOf) };
  };
  const stepLeapGen = () => {
    const { mel, moves } = randomWalk(4, [-1, 1, -1, 1, -2, 2, -3, 3, -4, 4], 0, 11);
    return { mel, moves: moves.map(d => (Math.abs(d) === 1 ? 'Schritt' : 'Sprung')) };
  };

  // Alle Pfeilfolgen mit drei Bewegungen (für Ablenker).
  const ALL_CONTOURS = [];
  for (const a of [UP, DOWN, SAME]) for (const b of [UP, DOWN, SAME]) for (const c of [UP, DOWN, SAME]) ALL_CONTOURS.push(`${a} ${b} ${c}`);

  const staffOf = (ms, width = 240) => {
    const st = Staff({ width });
    st.render(ms.map(m => [T.fromMidi(m)]), { labels: false });
    return st.el;
  };

  // Intervall zwischen zwei Tönen der Tonleiter, z. B. „große Terz“.
  const ivName = (a, b) => T.interval(T.fromMidi(Math.min(a, b)), T.fromMidi(Math.max(a, b))).name;

  const IVS = [
    { semis: 2, name: 'große Sekunde', song: '„Alle meine Entchen“ beginnt mit einer großen Sekunde aufwärts.' },
    { semis: 3, name: 'kleine Terz', song: 'Abwärts kennst du sie vom Kuckucksruf: „Kuckuck, Kuckuck, ruft’s aus dem Wald“.' },
    { semis: 4, name: 'große Terz', song: 'Sie ist der untere Teil des Dur-Dreiklangs, wie C – E.' },
    { semis: 5, name: 'Quarte', song: '„O Tannenbaum“ beginnt mit einer Quarte aufwärts.' },
    { semis: 7, name: 'Quinte', song: '„Morgen kommt der Weihnachtsmann“ springt gleich zu Beginn eine Quinte hinauf.' },
    { semis: 12, name: 'Oktave', song: 'Der zweite Ton hat denselben Namen und klingt wie der erste, nur heller.' },
  ];
  const IV_NAMES = IVS.map(x => x.name);
  const byIvOrder = (x, y) => IV_NAMES.indexOf(x) - IV_NAMES.indexOf(y);

  const SONGS = [
    { title: '„Alle meine Entchen“', notes: 'C4 D4 E4 F4 G4 G4', iv: 'große Sekunde', dat: 'großen Sekunde', dir: 'aufwärts' },
    { title: '„Kuckuck, Kuckuck, ruft’s aus dem Wald“', notes: 'G4 E4 G4 E4', iv: 'kleine Terz', dat: 'kleinen Terz', dir: 'abwärts' },
    { title: '„O Tannenbaum“', notes: 'D4 G4 G4 G4', iv: 'Quarte', dat: 'Quarte', dir: 'aufwärts' },
    { title: '„Morgen kommt der Weihnachtsmann“', notes: 'C4 C4 G4 G4', iv: 'Quinte', dat: 'Quinte', dir: 'aufwärts' },
  ];

  /* ---------- Fragen ---------- */

  // Hörfrage: spielt beim Öffnen einmal von selbst.
  function earMc({ title, prompt, play, options, answer, explain, wrong, keepOrder = true }) {
    return Steps.mc({
      title, prompt, options, answer, explain, wrong, keepOrder,
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Nochmal hören', play)));
        api.later(play, 400);
      },
    });
  }

  function higherLower(title, lo, hi) {
    const a = randInt(57, 72);
    const d = randInt(lo, hi) * sign();
    const up = d > 0;
    return earMc({
      title,
      prompt: 'Zwei Töne nacheinander. Ist der zweite **höher** oder **tiefer** als der erste?',
      play: () => playMel([a, a + d]),
      options: ['höher', 'tiefer'],
      answer: up ? 'höher' : 'tiefer',
      explain: `${nameOf(a)} – ${nameOf(a + d)}: ${halbtoene(Math.abs(d))} ${up ? 'aufwärts' : 'abwärts'}.`,
      wrong: 'Sing die beiden Töne leise nach. Geht deine Stimme nach oben oder nach unten?',
    });
  }

  function contourEar() {
    const { mel, moves } = contourGen();
    const ans = moves.join(' ');
    return earMc({
      title: 'Welche Kontur?',
      prompt: 'Vier Töne. Welche Pfeilfolge beschreibt die drei Bewegungen? **→** heißt: Der Ton wird wiederholt.',
      play: () => playMel(mel),
      options: quizOptions(ans, ALL_CONTOURS),
      keepOrder: false,
      answer: ans,
      explain: `Die Töne: ${joinM(mel)}. Also ${ans}.`,
      wrong: 'Hör die Melodie noch einmal und achte auf jede Bewegung einzeln: hoch, runter oder gleich?',
    });
  }

  function contourStaff() {
    const { mel, moves } = contourGen();
    const ans = moves.join(' ');
    return Steps.mc({
      prompt: 'Welche Pfeilfolge passt zu diesem Notenbild?',
      media: el => el.append(staffOf(mel, 260), btnRow(PlayBtn('Anhören', () => playMel(mel), { variant: 'quiet' }))),
      options: quizOptions(ans, ALL_CONTOURS),
      answer: ans,
      explain: `Steht die nächste Note höher, ist das ein ${UP}, tiefer ein ${DOWN}, auf gleicher Höhe ein ${SAME}. Hier: ${ans}.`,
      wrong: 'Vergleiche immer zwei benachbarte Noten: Liegt die zweite höher, tiefer oder auf derselben Linie?',
    });
  }

  function stepLeapEar(title) {
    const leap = Math.random() < 0.5;
    const d = (leap ? randInt(2, 4) : 1) * sign();
    const i = randInt(Math.max(0, -d), Math.min(SC.length - 1, SC.length - 1 - d));
    const a = SC[i], b = SC[i + d];
    const skipped = SC.slice(Math.min(i, i + d) + 1, Math.max(i, i + d)).map(nameOf);
    return earMc({
      title,
      prompt: 'Zwei Töne aus der C-Dur-Tonleiter. Ist das ein **Schritt** oder ein **Sprung**?',
      play: () => playMel([a, b]),
      options: ['Schritt', 'Sprung'],
      answer: leap ? 'Sprung' : 'Schritt',
      explain: leap
        ? `${nameOf(a)} – ${nameOf(b)} überspringt ${skipped.join(skipped.length > 2 ? ', ' : ' und ').replace(/, ([^,]*)$/, ' und $1')}: ein **Sprung** (${ivName(a, b)}).`
        : `${nameOf(a)} – ${nameOf(b)} sind Nachbartöne der Tonleiter: ein **Schritt** (${ivName(a, b)}).`,
      wrong: 'Ein Schritt klingt wie ein kleiner Gang zur Nachbarstufe, ein Sprung wie ein Satz über mindestens einen Ton hinweg.',
    });
  }

  function onlyStepsQuestion() {
    const steps = randomWalk(4, [-1, 1], 1, 9).mel;
    const leapy = () => {
      for (;;) {
        const r = randomWalk(4, [-1, 1, -2, 2, -3, 3], 1, 9);
        if (r.moves.some(d => Math.abs(d) > 1)) return r.mel;
      }
    };
    const mels = shuffle([{ mel: steps, ok: true }, { mel: leapy() }, { mel: leapy() }]);
    const L = ['A', 'B', 'C'];
    const right = L[mels.findIndex(x => x.ok)];
    return Steps.mc({
      prompt: 'Welche Melodie besteht **nur aus Schritten**?',
      media: el => el.append(h('div', { class: 'ear-grid' }, mels.map((x, i) =>
        h('div', { style: 'display:grid;gap:8px;justify-items:start' },
          h('p', { class: 'mono-label' }, 'Melodie ' + L[i]),
          staffOf(x.mel, 220),
          PlayBtn('Anhören', () => playMel(x.mel), { variant: 'quiet' }))))),
      options: L.map((x, i) => (mels[i].ok ? 'Melodie ' + x : { t: 'Melodie ' + x, why: `In Melodie ${x} springt mindestens eine Note über einen Platz in der Notenzeile hinweg.` })),
      keepOrder: true,
      answer: 'Melodie ' + right,
      explain: `In Melodie ${right} sitzt jede Note direkt neben der vorigen, von der Linie in den Zwischenraum oder umgekehrt: ${joinM(mels.find(x => x.ok).mel)}.`,
    });
  }

  function leapCountEar() {
    const k = randInt(0, 3);
    const pos = shuffle([0, 1, 2, 3]).slice(0, k);
    let mel, moves;
    do {
      moves = [0, 1, 2, 3].map(i => (pos.includes(i) ? randInt(2, 4) : 1) * sign());
      mel = walk(randInt(0, SC.length - 1), moves);
    } while (!mel);
    const parts = moves.map((d, i) => `${nameOf(mel[i])} – ${nameOf(mel[i + 1])} ${Math.abs(d) === 1 ? 'Schritt' : 'Sprung'}`);
    return earMc({
      title: 'Sprünge zählen',
      prompt: 'Fünf Töne, also vier Bewegungen. Wie viele davon sind **Sprünge**?',
      play: () => playMel(mel),
      options: ['0', '1', '2', '3'],
      answer: String(k),
      explain: `${k} ${k === 1 ? 'Sprung' : 'Sprünge'}: ${parts.join(', ')}.`,
      wrong: 'Hör die Melodie noch einmal und zähle bei jeder Bewegung mit: Nachbarton oder Satz?',
    });
  }

  // Melodie hören, dann aus drei bis vier Tonfolgen die richtige wählen.
  function seqQuiz() {
    const { mel } = randomWalk(4, [-1, 1, -1, 1, -2, 2], 0, 7);
    const idx = mel.map(m => SC.indexOf(m));
    const ans = joinM(mel);
    const others = new Set();
    for (let guard = 0; others.size < 3 && guard < 60; guard++) {
      const v = idx.slice();
      const p = randInt(1, v.length - 1);
      v[p] += pick([-2, -1, 1, 2]);
      if (v[p] < 0 || v[p] > 7) continue;
      const str = joinM(v.map(i => SC[i]));
      if (str !== ans) others.add(str);
    }
    return { mel, ans, options: shuffle([ans, ...others]) };
  }

  const ENDINGS = ['G4 F4 E4 D4 C4', 'E4 F4 D4 C4', 'C4 E4 D4 H3 C4', 'C4 D4 F4 E4', 'G4 F4 D4 E4', 'C4 G4 F4 E4', 'C4 D4 E4 G4', 'E4 F4 A4 G4', 'C4 E4 A4 G4'];
  const END_DEG = { 0: '1. Stufe (C)', 4: '3. Stufe (E)', 7: '5. Stufe (G)' };

  function endingQuestion() {
    const mel = midisOf(T.notes(pick(ENDINGS)));
    const last = mel[mel.length - 1];
    const ans = END_DEG[mod(last, 12)];
    const play = () => {
      Sound.chord([60, 64, 67], { dur: 1.2 });
      Sound.seq(mel, { when: 1.3, step: STEP });
    };
    return earMc({
      title: 'Wo endet die Melodie?',
      prompt: 'Erst klingt der C-Dur-Dreiklang, dann eine kurze Melodie. Auf welcher Stufe endet sie?',
      play,
      options: Object.values(END_DEG),
      answer: ans,
      explain: `Die Melodie ${joinM(mel)} endet auf **${nameOf(last)}**, der ${ans.slice(0, 2)} Stufe. ${mod(last, 12) === 0 ? 'Sie ist beim Grundton angekommen und klingt abgeschlossen.' : 'Das klingt ruhig, aber weniger abgeschlossen als der Grundton.'}`,
      wrong: 'Vergleiche den letzten Ton mit dem Dreiklang am Anfang: Ist es der tiefste, der mittlere oder der höchste Ton des Dreiklangs?',
    });
  }

  function degreeEar() {
    const k = randInt(1, 7);
    const m = SC[k - 1];
    const label = x => `${x}. Stufe`;
    return earMc({
      title: 'Welche Stufe?',
      prompt: 'Erst klingt der C-Dur-Dreiklang, dann ein einzelner Ton. Welche Stufe ist der Ton?',
      play: () => { Sound.chord([60, 64, 67], { dur: 1.2 }); Sound.piano(m, 1.3, 1.6, 0.34); },
      options: quizOptions(label(k), [1, 2, 3, 4, 5, 6, 7].map(label)).sort((x, y) => parseInt(x, 10) - parseInt(y, 10)),
      answer: label(k),
      explain: `Das war **${nameOf(m)}**, die ${k}. Stufe von C-Dur.`,
      wrong: 'Sing vom C aus die Tonleiter leise aufwärts, bis du den Ton triffst.',
    });
  }

  function intervalEar(no) {
    const r = randInt(55, 65);
    const iv = pick(IVS);
    return earMc({
      title: `Hörprobe ${no}`,
      prompt: 'Zwei Töne, der zweite liegt höher. Welches Intervall hörst du?',
      play: () => playMel([r, r + iv.semis]),
      options: quizOptions(iv.name, IV_NAMES).sort(byIvOrder),
      answer: iv.name,
      explain: `Das war eine **${iv.name}**: ${iv.semis} Halbtöne. ${iv.song}`,
      wrong: 'Denk an die Merklieder. Welcher Liedanfang passt zu diesem Sprung?',
    });
  }

  /* ---------- Experimente ---------- */

  // Kapitel 1: Beispiele für steigende, fallende und gleichbleibende Melodien.
  function directionDemo(el, api) {
    const staff = Staff({ width: 260 });
    const demos = [
      { label: 'Steigt', mel: 'C4 D4 E4 F4', text: 'Jeder Ton liegt **höher** als der vorige. In der Notenzeile wandern die Noten nach oben.' },
      { label: 'Fällt', mel: 'A4 G4 F4 E4', text: 'Jeder Ton liegt **tiefer** als der vorige. Die Noten wandern nach unten.' },
      { label: 'Bleibt', mel: 'E4 E4 E4 E4', text: 'Derselbe Ton wird **wiederholt**. Die Noten bleiben auf einer Höhe.' },
    ];
    const heard = new Set();
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf ein Beispiel, um es zu hören.');
    staff.render([]);
    const btns = demos.map((d, i) => PlayBtn(d.label, () => {
      const ns = T.notes(d.mel);
      playMel(midisOf(ns));
      staff.render(ns.map(x => [x]), { labels: false });
      heard.add(i);
      read.innerHTML = inline(d.text);
      if (heard.size === demos.length) api.ready(true);
    }));
    el.append(staff.el, btnRow(...btns), read);
  }

  // Kapitel 1 und 2: Melodie hören und ihre Bewegungen per Knopf nachbauen.
  function moveGame({ buttons, gen, goal, intro, doneMsg }) {
    return (el, done, api) => {
      let mel = null, moves = [], input = [], hits = 0, finished = false, busy = false;
      const chips = h('div', { class: 'found', 'aria-live': 'polite' });
      const read = h('p', { class: 'readout', 'aria-live': 'polite' }, intro);
      const score = h('p', { class: 'hint' });
      const play = () => { if (mel) playMel(mel); };
      const paint = () => {
        chips.replaceChildren(...moves.map((_, i) => h('span', { class: 'chip' + (input[i] ? ' is-on' : '') }, input[i] || '?')));
        score.textContent = `${hits} von ${goal} richtig`;
      };
      const fresh = () => {
        ({ mel, moves } = gen());
        input = [];
        busy = false;
        paint();
        api.later(play, 300);
      };
      function evaluate() {
        const p = input.findIndex((x, i) => x !== moves[i]);
        if (p < 0) {
          hits++;
          busy = true;
          paint();
          Sound.sfx.ok();
          if (hits >= goal) {
            finished = true;
            read.innerHTML = inline(`**${moves.join(' ')}** stimmt.`);
            done(doneMsg);
            return;
          }
          read.innerHTML = inline(`**${moves.join(' ')}** stimmt: ${joinM(mel)}. Gleich kommt die nächste Melodie.`);
          api.later(fresh, 1600);
        } else {
          input = input.slice(0, p);
          read.innerHTML = inline(`${p ? `Bis Bewegung ${p} stimmt alles, ` : ''}Bewegung ${p + 1} noch nicht. Hör noch einmal genau hin.`);
          paint();
          api.later(play, 700);
        }
      }
      const btns = buttons.map(b => h('button', {
        type: 'button', class: 'btn btn--outline',
        onclick: () => {
          if (finished || busy || !mel || input.length >= moves.length) return;
          input.push(b);
          paint();
          if (input.length === moves.length) evaluate();
        },
      }, b));
      const undo = h('button', { type: 'button', class: 'link-btn', onclick: () => { if (!finished && !busy) { input.pop(); paint(); } } }, 'Rückgängig');
      el.append(btnRow(PlayBtn('Melodie anhören', play)), chips, btnRow(...btns, undo), read, score);
      fresh();
    };
  }

  // Kapitel 3: Dreiklang, dann ein Ton – auf der Klaviatur finden.
  function degreeDetective(el, done, api) {
    const GOAL = 4;
    const scale = SC.slice(0, 8);
    let target = null, hits = 0, finished = false, wait = true;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Hör zu: erst der C-Dur-Dreiklang, dann ein einzelner Ton. Es ist immer eine weiße Taste.');
    const score = h('p', { class: 'hint' });
    const paintScore = () => { score.textContent = `${hits} von ${GOAL} Treffern`; };
    const play = () => {
      if (target == null) return;
      Sound.chord([60, 64, 67], { dur: 1.2 });
      Sound.piano(target, 1.3, 1.6, 0.34);
    };
    const kb = Keyboard({
      from: 60, to: 72, labels: 'white',
      onPress: m => {
        if (finished || wait) return;
        if (m !== target) {
          read.innerHTML = inline(`Das ist **${nameOf(m)}**. Der gesuchte Ton liegt ${m < target ? 'höher' : 'tiefer'}.`);
          return;
        }
        hits++;
        wait = true;
        paintScore();
        kb.mark(m, 'mk-ok', nameOf(m));
        const deg = scale.indexOf(target) + 1;
        if (hits >= GOAL) {
          finished = true;
          read.innerHTML = inline(`**${nameOf(m)}**, die ${deg}. Stufe. Treffer.`);
          done(`${GOAL} Töne gefunden. Wer die Stufen kennt, findet jeden Ton über seinen Abstand zum Grundton.`);
          return;
        }
        read.innerHTML = inline(`**${nameOf(m)}**, die ${deg}. Stufe. Treffer. Gleich kommt der nächste Ton.`);
        api.later(next, 1500);
      },
    });
    function next() {
      kb.clearMarks();
      let t;
      do { t = pick(scale); } while (t === target);
      target = t;
      wait = false;
      read.textContent = 'Welcher Ton war das? Tippe ihn auf der Klaviatur.';
      play();
    }
    paintScore();
    el.append(btnRow(PlayBtn('Nochmal hören', play)), kbWrap(kb.el), read, score);
    api.later(next, 500);
  }

  // Kapitel 4: alle Intervalle aufwärts von C anhören.
  function intervalCompare(el, done) {
    const staff = Staff({ width: 220 });
    const heard = new Set();
    let finished = false;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf ein Intervall, um es zu hören.');
    staff.render([[n('C', 4)], []], { placeholder: true });
    const btns = IVS.map(iv => PlayBtn(iv.name, () => {
      playMel([60, 60 + iv.semis]);
      staff.render([[n('C', 4)], [T.fromMidi(60 + iv.semis)]]);
      heard.add(iv.semis);
      read.innerHTML = inline(`**${iv.name}**: ${iv.semis} Halbtöne. ${iv.song}`);
      if (heard.size === IVS.length && !finished) {
        finished = true;
        done('Alle sechs Intervalle gehört. Präg dir die Merklieder ein, sie helfen dir bei den nächsten Aufgaben.');
      }
    }));
    el.append(staff.el, h('div', { class: 'ear-grid' }, btns), read);
  }

  // Kopfbild: eine kurze Melodie, jede Note antippbar.
  function visual() {
    const st = Staff({ width: 360 });
    const mel = T.notes('C4 E4 G4 F4 E4 D4 E4 C4');
    const draw = hl => st.render(mel.map(x => [x]), {
      labels: false, hl,
      onTap: gi => { Sound.piano(T.midi(mel[gi])); draw(gi); },
    });
    draw(-1);
    return { label: 'Notenzeile · zum Anhören antippen', foot: 'Hören, merken, aufschreiben', el: st.el };
  }

  /* ---------- Diktate ---------- */
  const SHORT = [
    'C4 D4 E4 D4 C4', 'E4 F4 G4 E4', 'G4 F4 E4 D4 C4', 'C4 E4 D4 C4', 'E4 D4 E4 F4 G4',
    'G4 A4 G4 F4 E4', 'C4 D4 E4 G4', 'A4 G4 F4 E4 D4', 'E4 G4 F4 E4 D4', 'C5 H4 A4 G4', 'D4 E4 F4 E4 D4',
  ];
  const LONG = {
    C: ['C4 E4 G4 E4 F4 D4 C4', 'G4 E4 C4 D4 E4 F4 G4', 'E4 G4 C5 H4 A4 G4', 'C5 G4 E4 G4 F4 D4 C4', 'C4 D4 E4 C4 G4 E4 D4 C4'],
    G: ['G4 H4 D5 C5 H4 A4 G4', 'D4 G4 Fis4 G4 A4 H4 G4', 'G4 Fis4 E4 D4 G4 H4 A4 G4', 'H4 D5 C5 A4 Fis4 G4'],
    F: ['F4 A4 C5 B4 A4 G4 F4', 'C4 F4 E4 F4 G4 A4 F4', 'A4 B4 C5 A4 F4 G4 F4', 'F4 G4 A4 B4 C5 A4 G4 F4'],
  };
  const KEY_TEXT = { C: '**C-Dur**', G: '**G-Dur** (mit Fis)', F: '**F-Dur** (mit B)' };

  function longDictation(no, key, melody) {
    const given = melody.split(' ').length >= 8 ? 2 : 1;
    return Steps.dictation({
      title: `Diktat ${no}`,
      prompt: `Melodie in ${KEY_TEXT[key]}. ${given === 1 ? 'Der erste Ton ist' : 'Die ersten zwei Töne sind'} vorgegeben. Hör zu und spiele den Rest auf der Klaviatur nach.`,
      melody, given, from: 60, to: 77,
    });
  }

  /* ---------- Blitzrunde ---------- */
  function arcHoehe() {
    const a = randInt(57, 72);
    const d = randInt(1, 7) * sign();
    return { tag: 'Richtung', prompt: 'Ist der zweite Ton **höher** oder **tiefer**?', play: () => playMel([a, a + d]), options: ['höher', 'tiefer'], answer: d > 0 ? 'höher' : 'tiefer', key: `hoehe:${a}:${d}` };
  }

  function arcSchritt() {
    const leap = Math.random() < 0.5;
    const d = (leap ? randInt(2, 4) : 1) * sign();
    const i = randInt(Math.max(0, -d), Math.min(SC.length - 1, SC.length - 1 - d));
    return { tag: 'Schritt oder Sprung', prompt: 'Zwei Töne aus C-Dur: **Schritt** oder **Sprung**?', play: () => playMel([SC[i], SC[i + d]]), options: ['Schritt', 'Sprung'], answer: leap ? 'Sprung' : 'Schritt', key: `schritt:${i}:${d}` };
  }

  function arcStufe() {
    const k = randInt(1, 7);
    const m = SC[k - 1];
    const label = x => `${x}. Stufe`;
    return {
      tag: 'Stufe',
      prompt: 'C-Dur-Dreiklang, dann ein Ton. Welche Stufe?',
      play: () => { Sound.chord([60, 64, 67], { dur: 1.2 }); Sound.piano(m, 1.3, 1.6, 0.34); },
      options: quizOptions(label(k), [1, 2, 3, 4, 5, 6, 7].map(label)).sort((x, y) => parseInt(x, 10) - parseInt(y, 10)),
      answer: label(k),
      key: 'stufe:' + k,
    };
  }

  function arcIntervall() {
    const r = randInt(55, 65);
    const iv = pick(IVS);
    return {
      tag: 'Intervall',
      prompt: 'Welches Intervall hörst du? Der zweite Ton liegt höher.',
      play: () => playMel([r, r + iv.semis]),
      options: quizOptions(iv.name, IV_NAMES).sort(byIvOrder),
      answer: iv.name,
      key: `iv:${r}:${iv.semis}`,
    };
  }

  function arcFolge() {
    const q = seqQuiz();
    return { tag: 'Tonfolge', prompt: 'Welche Tonfolge hörst du? Sie liegt in C-Dur.', play: () => playMel(q.mel), options: q.options, answer: q.ans, key: 'folge:' + q.ans };
  }

  defineCourse({
    id: 'diktat',
    short: 'Melodie-Diktate',
    title: ['Melodie-', 'Diktate'],
    topic: 'Gehörbildung',
    sub: 'Hören, merken, aufschreiben',
    lead: 'Hören, merken, aufschreiben. Du trainierst Richtung, Schritte und Sprünge, findest Töne über die Tonleiter und schreibst kurze Melodien Ton für Ton auf.',
    visual,
    badge: { id: 'dikt-kurs', glyph: '\u{1D162}', name: 'Notengedächtnis', desc: 'Den Kurs Melodie-Diktate abgeschlossen.' },
    arcade: [
      { id: 'dikt-hoehe', name: 'Höher oder tiefer', gen: arcHoehe, needs: 'dikt-richtung' },
      { id: 'dikt-schritt', name: 'Schritt oder Sprung', gen: arcSchritt, needs: 'dikt-schritte' },
      { id: 'dikt-stufe', name: 'Stufe hören', gen: arcStufe, needs: 'dikt-tonleiter' },
      { id: 'dikt-intervall', name: 'Intervall hören', gen: arcIntervall, needs: 'dikt-intervalle' },
      { id: 'dikt-folge', name: 'Tonfolge erkennen', gen: arcFolge, needs: 'dikt-kurz' },
    ],
    levels: [
      {
        id: 'dikt-richtung',
        title: 'Auf oder ab?',
        sub: 'Die Richtung einer Melodie',
        takeaway: 'Zuerst die Richtung: **steigt**, **fällt** oder **bleibt** die Melodie? Wer die Kontur kennt, hat schon das halbe Diktat.',
        steps: () => [
          Steps.info({
            title: 'Melodien haben eine Richtung',
            text: 'Eine Melodie kann **steigen**, **fallen** oder auf einem Ton **bleiben**. Bevor du einzelne Töne bestimmst, hörst du zuerst diese Richtung.\n\nHör dir alle drei Beispiele an.',
            gate: true,
            media: directionDemo,
          }),
          higherLower('Höher oder tiefer?', 3, 7),
          Steps.task({
            title: 'Kontur-Spiel',
            text: 'Hör dir die Melodie an und baue ihre Bewegungen mit den Pfeilen nach: **↗** aufwärts, **↘** abwärts, **→** derselbe Ton noch einmal.\n\nSchaffst du **drei Melodien** richtig?',
            mount: moveGame({
              buttons: [UP, DOWN, SAME], gen: contourGen, goal: 3,
              intro: 'Vier Töne, also drei Bewegungen. Tippe für jede Bewegung einen Pfeil.',
              doneMsg: 'Drei Konturen richtig erkannt. Die Richtung ist das Gerüst jeder Melodie.',
            }),
          }),
          contourEar(),
          contourStaff(),
          higherLower('Jetzt enger', 1, 2),
        ],
      },
      {
        id: 'dikt-schritte',
        title: 'Schritt oder Sprung?',
        sub: 'Nachbartöne und größere Abstände',
        takeaway: 'Ein **Schritt** geht zum Nachbarton der Tonleiter (Sekunde), ein **Sprung** überspringt mindestens einen Ton. Im Notenbild führt ein Schritt von der Linie in den Zwischenraum.',
        steps: () => [
          Steps.info({
            title: 'Schritte und Sprünge',
            text: 'Ein **Schritt** führt zum Nachbarton der Tonleiter, das Intervall heißt **Sekunde**. In der Notenzeile geht es von einer Linie in den nächsten Zwischenraum oder umgekehrt.\n\nEin **Sprung** überspringt mindestens einen Ton: von Linie zu Linie oder noch weiter. Melodien bestehen meist aus vielen Schritten und wenigen Sprüngen.',
            media: el => {
              const steps = midisOf(T.notes('C4 D4 E4 F4'));
              const leaps = midisOf(T.notes('C4 E4 G4 C5'));
              el.append(
                h('div', { class: 'ear-grid' },
                  h('div', { style: 'display:grid;gap:8px;justify-items:start' }, h('p', { class: 'mono-label' }, 'Schritte'), staffOf(steps, 220), PlayBtn('C – D – E – F', () => playMel(steps))),
                  h('div', { style: 'display:grid;gap:8px;justify-items:start' }, h('p', { class: 'mono-label' }, 'Sprünge'), staffOf(leaps, 220), PlayBtn('C – E – G – C', () => playMel(leaps)))));
            },
          }),
          stepLeapEar('Hörprobe'),
          Steps.task({
            title: 'Schritte und Sprünge sortieren',
            text: 'Hör dir die Melodie an und sag für jede Bewegung, ob sie ein **Schritt** oder ein **Sprung** ist.\n\nZiel: **zwei Melodien** richtig.',
            mount: moveGame({
              buttons: ['Schritt', 'Sprung'], gen: stepLeapGen, goal: 2,
              intro: 'Vier Töne, also drei Bewegungen. Tippe für jede Bewegung Schritt oder Sprung.',
              doneMsg: 'Zwei Melodien richtig sortiert. Schritte klingen fließend, Sprünge setzen Akzente.',
            }),
          }),
          onlyStepsQuestion(),
          Steps.dictation({
            title: 'Kleines Diktat',
            prompt: 'Drei Töne, nur Schritte. Der erste Ton ist vorgegeben. Hör zu und spiele die anderen beiden auf der Klaviatur nach.',
            melody: pick(['C4 D4 E4', 'E4 D4 C4', 'G4 F4 E4', 'E4 F4 G4', 'A4 G4 F4', 'D4 E4 F4', 'F4 E4 D4', 'G4 A4 H4', 'C5 H4 A4']),
          }),
          leapCountEar(),
        ],
      },
      {
        id: 'dikt-tonleiter',
        title: 'Die Tonleiter als Landkarte',
        sub: 'Stufen hören in C-Dur',
        takeaway: 'Die Stufen der Tonleiter sind deine Landkarte. Der **Grundton** ist die Heimat, die **7. Stufe** zieht als Leitton zu ihm zurück.',
        steps: () => [
          Steps.info({
            title: 'Acht Stufen bis nach Hause',
            text: 'Die C-Dur-Tonleiter hat sieben Töne, die **Stufen** 1 bis 7. Die 8. Stufe ist wieder C, eine Oktave höher.\n\nDer **Grundton** C ist die Heimat: Dort klingt eine Melodie angekommen. Jeden anderen Ton kannst du über seinen Abstand zum Grundton finden. Tippe auf die Noten.',
            media: el => {
              const st = Staff({ width: 380 });
              const scale = SC.slice(0, 8).map(m => T.fromMidi(m));
              const draw = hl => st.render(scale.map(x => [x]), {
                labels: false, hl, captions: scale.map((_, i) => String(i + 1)),
                onTap: gi => { Sound.piano(T.midi(scale[gi])); draw(gi); },
              });
              draw(-1);
              el.append(st.el, btnRow(PlayBtn('Tonleiter anhören', () => Sound.seq(SC.slice(0, 8), { step: 0.42 }))));
            },
          }),
          endingQuestion(),
          Steps.task({
            title: 'Stufen-Detektiv',
            text: 'Erst klingt der C-Dur-Dreiklang, dann ein einzelner Ton. Finde ihn auf der Klaviatur.\n\nZiel: **vier Treffer**.',
            mount: degreeDetective,
          }),
          (() => {
            const k = randInt(2, 7);
            const m = SC[k - 1];
            const count = SC.slice(0, k).map((x, i) => `${nameOf(x)} (${i + 1})`).join(' – ');
            return Steps.keys({
              prompt: `Spiele die **${k}. Stufe** von C-Dur.`,
              from: 60, to: 72, marks: [[60, 'mk-ref', 'C']],
              check: pcCheck(m, 'Zähle die weißen Tasten vom C aus: C ist die 1. Stufe.'),
              solution: [m],
              explain: `${nameOf(m)} ist die ${k}. Stufe: ${count}.`,
            });
          })(),
          degreeEar(),
          earMc({
            title: 'Kurz vor dem Ziel',
            prompt: 'Die Tonleiter bleibt einen Ton vor dem Ziel stehen. Auf welcher Stufe hört sie auf?',
            play: () => Sound.seq(SC.slice(0, 7), { step: 0.42 }),
            options: [
              { t: '2. Stufe (D)', why: 'Die Tonleiter läuft weiter als bis zum D.' },
              { t: '4. Stufe (F)', why: 'Nach dem F kommen noch G und A.' },
              { t: '6. Stufe (A)', why: 'Nach dem A kommt noch ein Ton.' },
              '7. Stufe (H)',
            ],
            answer: '7. Stufe (H)',
            explain: 'H, die 7. Stufe. Sie liegt nur einen Halbton unter dem C und will unbedingt dorthin: Sie ist der **Leitton**.',
          }),
        ],
      },
      {
        id: 'dikt-intervalle',
        title: 'Intervalle in Melodien',
        sub: 'Von der Sekunde bis zur Oktave',
        takeaway: 'Merklieder machen Intervalle greifbar: **große Sekunde** wie „Alle meine Entchen“, **Quarte** wie „O Tannenbaum“, **Quinte** wie „Morgen kommt der Weihnachtsmann“.',
        steps: () => [
          Steps.info({
            title: 'Jeder Sprung hat einen Namen',
            text: 'Der Abstand zwischen zwei Melodietönen ist ein **Intervall**. Du zählst ihn in Halbtönen oder über die Notennamen: C – E umfasst drei Notennamen, also eine **Terz**.\n\nViele Intervalle kennst du schon aus Liedern. Solche **Merklieder** helfen beim Hören: Klingt der Sprung wie der Anfang von „O Tannenbaum“, ist es eine Quarte.',
          }),
          Steps.task({
            title: 'Intervalle vergleichen',
            text: 'Hör dir alle sechs Intervalle an, jeweils vom C aufwärts. Achte darauf, wie weit der zweite Ton springt.',
            mount: intervalCompare,
          }),
          intervalEar(1),
          intervalEar(2),
          (() => {
            const melody = pick(['C4 E4', 'C4 F4', 'C4 G4', 'C4 C5', 'D4 F4', 'E4 A4', 'D4 A4', 'G4 A4', 'E4 G4', 'F4 A4']);
            const [a, b] = T.notes(melody);
            return Steps.dictation({
              title: 'Intervall-Diktat',
              prompt: `Der erste Ton ist **${T.name(a)}**. Hör dir das Intervall an und spiele den zweiten Ton.`,
              melody,
              explain: `${T.name(a)} – ${T.name(b)}: eine **${T.interval(a, b).name}** aufwärts.`,
            });
          })(),
          (() => {
            const song = pick(SONGS);
            const mel = midisOf(T.notes(song.notes));
            return Steps.mc({
              prompt: `Mit welchem Intervall beginnt ${song.title}?`,
              media: el => el.append(btnRow(PlayBtn('Liedanfang', () => playMel(mel)))),
              options: SONGS.map(x => x.iv),
              keepOrder: true,
              answer: song.iv,
              explain: `${song.title} beginnt mit einer **${song.dat}** ${song.dir}.`,
              wrong: 'Hör dir den Liedanfang an und vergleiche ihn mit den Intervallen von eben.',
            });
          })(),
        ],
      },
      {
        id: 'dikt-kurz', ear: true,
        title: 'Erste Diktate',
        sub: 'Vier bis fünf Töne in C-Dur',
        takeaway: 'Diktieren in drei Durchgängen: **Richtung**, **Schritt oder Sprung**, dann die **Stufe**. Richtige Töne bleiben stehen, so arbeitest du dich Ton für Ton vor.',
        steps: () => [
          Steps.info({
            title: 'Nicht alles auf einmal',
            text: 'Beim Diktat musst du nicht jeden Ton sofort wissen. Hör die Melodie mehrmals und achte jedes Mal auf etwas anderes:\n\n**1. Richtung:** Steigt sie, fällt sie, bleibt sie?\n**2. Schritt oder Sprung:** Nachbarton oder größerer Abstand?\n**3. Stufe:** Wo liegt der Ton in der Tonleiter, wie weit ist er vom Grundton entfernt?\n\nSpiele die Töne auf der Klaviatur nach. Mit **Deine Fassung** hörst du, was du eingegeben hast.',
          }),
          ...shuffle(SHORT).slice(0, 4).map((melody, i) => Steps.dictation({ title: `Diktat ${i + 1}`, melody })),
          (() => {
            const q = seqQuiz();
            return earMc({
              title: 'Welche Tonfolge?',
              prompt: 'Diesmal ohne Klaviatur: Welche Tonfolge hörst du? Sie liegt in C-Dur.',
              play: () => playMel(q.mel),
              options: q.options,
              keepOrder: false,
              answer: q.ans,
              explain: `Gehört hast du ${q.ans}.`,
              wrong: 'Vergleiche Ton für Ton: Wo steigt oder fällt die Melodie anders als gehört?',
            });
          })(),
        ],
      },
      {
        id: 'dikt-lang', ear: true,
        title: 'Längere Diktate',
        sub: 'Sechs bis acht Töne mit Sprüngen',
        takeaway: 'Auch lange Melodien bestehen aus kurzen Stücken. **Dreiklangssprünge** und die **Tonart** helfen dir, jeden Ton einzuordnen.',
        steps: () => {
          const keyQ = pick([
            {
              key: 'G-Dur', ans: 'Fis',
              opts: ['Fis', { t: 'F', why: 'F gehört zu C-Dur. In G-Dur wird es erhöht.' }, { t: 'B', why: 'B gehört zu F-Dur, nicht zu G-Dur.' }, { t: 'Cis', why: 'Cis kommt in G-Dur nicht vor.' }],
              explain: 'G-Dur hat ein Kreuz: **Fis**. So liegt die 7. Stufe einen Halbton unter dem G, genau wie H unter C in C-Dur.',
            },
            {
              key: 'F-Dur', ans: 'B',
              opts: ['B', { t: 'H', why: 'H gehört zu C-Dur. In F-Dur wird es erniedrigt.' }, { t: 'Fis', why: 'Fis gehört zu G-Dur, nicht zu F-Dur.' }, { t: 'Es', why: 'Es kommt in F-Dur nicht vor.' }],
              explain: 'F-Dur hat ein Be: **B**. So liegt von A nach B ein Halbton, genau wie von E nach F in C-Dur.',
            },
          ]);
          const mels = shuffle([
            ...shuffle(LONG.C).slice(0, 2).map(m => ['C', m]),
            ['G', pick(LONG.G)],
            ['F', pick(LONG.F)],
          ]);
          return [
            Steps.info({
              title: 'Längere Melodien',
              text: 'Längere Melodien hörst du in Abschnitten: Merke dir zuerst den Anfang, schreibe ihn auf und hör dann weiter.\n\n**Dreiklangssprünge** wie C – E – G sind leicht zu erkennen, weil sie immer einen Ton überspringen. Neu sind zwei Tonarten mit Vorzeichen: **G-Dur** hat Fis statt F, **F-Dur** hat B statt H.',
              media: el => {
                const st = Staff({ width: 380 });
                const scales = { G: T.notes('G4 A4 H4 C5 D5 E5 Fis5 G5'), F: T.notes('F4 G4 A4 B4 C5 D5 E5 F5') };
                const show = k => { st.render(scales[k].map(x => [x])); Sound.seq(midisOf(scales[k]), { step: 0.42 }); };
                st.render(scales.G.map(x => [x]));
                el.append(st.el, btnRow(PlayBtn('G-Dur-Tonleiter', () => show('G')), PlayBtn('F-Dur-Tonleiter', () => show('F'))));
              },
            }),
            Steps.mc({
              prompt: `Welcher Ton gehört zu **${keyQ.key}**, aber nicht zu C-Dur?`,
              options: keyQ.opts,
              answer: keyQ.ans,
              explain: keyQ.explain,
            }),
            ...mels.map(([key, melody], i) => longDictation(i + 1, key, melody)),
          ];
        },
      },
    ],
  });
})();
