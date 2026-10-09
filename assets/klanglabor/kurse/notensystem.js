'use strict';
/* Kurs: Das Notensystem – nach den Skripten „Das Notensystem“ #1–#7:
   Liniensystem und Schlüssel, Stammtöne, Tonhöhen, Oktaven, Tonschritte, Vorzeichen, Auflösungszeichen.
   Inhaltlich bewusst nur, was in diesen sieben Skripten steht. */

(() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
  const TREBLE = 30, BASS = 18;   // Stammtonstufe der untersten Linie: E4 bzw. G2
  const at = name => T.notes(name)[0];
  const readout = text => h('p', { class: 'readout', 'aria-live': 'polite', html: inline(text) });

  // Oktavnamen wie im Skript: große, kleine, eingestrichene … Oktave; Ziffer = Oktave der Theorie (C4 = c1).
  const OCTAVES = [
    { o: 2, name: 'große Oktave' },
    { o: 3, name: 'kleine Oktave' },
    { o: 4, name: 'eingestrichene Oktave' },
    { o: 5, name: 'zweigestrichene Oktave' },
    { o: 6, name: 'dreigestrichene Oktave' },
  ];
  const OCT_SHORT = OCTAVES.map(x => x.name.replace(' Oktave', ''));

  // Schreibweise im Skript: kleines c, c1, a1, g1 … (nur für die Oktaven, die im Kurs vorkommen).
  function scriptName(note) {
    const nm = T.name(note).toLowerCase();
    if (note.o === 3) return 'kleines ' + nm;
    if (note.o >= 4) return nm + (note.o - 3);
    return T.name(note);
  }

  // Lage einer Note in Worten, z. B. „auf der 2. Linie“ oder „auf der 1. Hilfslinie unter dem System“.
  function where(note, base = TREBLE) {
    const k = T.step(note) - base;
    if (k >= 0 && k <= 8) return k % 2 === 0 ? `auf der ${k / 2 + 1}. Linie` : `im ${(k + 1) / 2}. Zwischenraum`;
    if (k === -1) return 'direkt unter der untersten Linie';
    if (k === 9) return 'direkt über der obersten Linie';
    if (k < 0) return k % 2 === 0 ? `auf der ${-k / 2}. Hilfslinie unter dem System` : `unter der ${(-k - 1) / 2}. Hilfslinie`;
    return k % 2 === 0 ? `auf der ${(k - 8) / 2}. Hilfslinie über dem System` : `über der ${(k - 9) / 2}. Hilfslinie`;
  }

  // Eine Notenzeile, deren Noten beim Antippen klingen.
  function tapStaff(names, { width = 300, clef = 'treble', labels = false, captions = [], classes = [] } = {}) {
    const ns = names.map(at);
    const st = Staff({ width, clef });
    st.render(ns.map(x => [x]), { labels, captions, classes, onTap: gi => Sound.piano(T.midi(ns[gi])) });
    return st.el;
  }

  // Violin- und Bassschlüssel nebeneinander.
  const clefPair = (left, right) => h('div', { class: 'ns-pair' },
    h('figure', {}, h('figcaption', {}, 'Violinschlüssel'), left),
    h('figure', {}, h('figcaption', {}, 'Bassschlüssel'), right));

  // „Welcher Ton ist das?“ mit einer Note in der Notenzeile.
  function nameQuestion({ title, names, clef = 'treble' }) {
    const note = at(pick(names));
    const ans = T.name(note);
    return Steps.mc({
      title,
      prompt: `Welcher Ton ist das? (${clef === 'bass' ? 'Bassschlüssel' : 'Violinschlüssel'})`,
      media: el => {
        const st = Staff({ width: 200, clef });
        st.render([[note]], { labels: false });
        el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.piano(T.midi(note)))));
      },
      options: [ans, ...shuffle(LETTERS.filter(x => x !== ans)).slice(0, 3)],
      answer: ans,
      explain: `Das ist **${scriptName(note)}**: Die Note steht ${where(note, clef === 'bass' ? BASS : TREBLE)}.`,
      wrong: clef === 'bass'
        ? 'Geh vom kleinen c aus (dort, wo im Violinschlüssel das a1 steht) und zähl C, D, E … nach oben.'
        : 'Geh vom c1 auf der Hilfslinie aus und sag im Kopf C, D, E, F, G, A, H auf, im Wechsel Zwischenraum, Linie.',
    });
  }

  /* ---------- Experimente ---------- */

  // Kapitel 1: alle neun Plätze im Fünfliniensystem finden (ohne Notenschlüssel-Namen, nur Plätze).
  function placeCounter(el, done) {
    const SPOTS = [30, 31, 32, 33, 34, 35, 36, 37, 38];
    const found = new Set();
    let d = null, finished = false;
    const staff = Staff({ width: 220 });
    const read = readout('Tippe in die Notenzeile oder schiebe die Note mit den Pfeilen.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...SPOTS.map(x =>
      h('span', { class: 'chip' + (found.has(x) ? ' is-on' : '') }, found.has(x) ? ((x - TREBLE) % 2 === 0 ? 'Linie' : 'Raum') : '?')));
    const paint = () => staff.render(d == null ? [[]] : [[T.fromStep(d)]], { labels: false, classes: [d != null && SPOTS.includes(d) ? 'is-ok' : 'is-pick'] });
    const set = nd => {
      d = Math.max(27, Math.min(41, nd));
      paint();
      Sound.piano(T.midi(T.fromStep(d)));
      const k = d - TREBLE;
      if (SPOTS.includes(d)) {
        if (!finished) found.add(d);
        read.innerHTML = inline(k % 2 === 0 ? `**Auf der ${k / 2 + 1}. Linie.**` : `**Im ${(k + 1) / 2}. Zwischenraum.**`);
      } else if (k === -1 || k === 9) {
        read.innerHTML = inline(`**${k < 0 ? 'Unter der untersten' : 'Über der obersten'} Linie.** Das geht noch ohne Hilfslinie, liegt aber außerhalb der fünf Linien. Gesucht sind die Plätze **auf** und **zwischen** den Linien.`);
      } else {
        read.innerHTML = inline('**Dafür brauchst du eine Hilfslinie.** Bleib innerhalb der fünf Linien.');
      }
      paintChips();
      if (found.size === SPOTS.length && !finished) {
        finished = true;
        done('**5** Noten auf den Linien, **4** in den Zwischenräumen: **9** Plätze, ganz ohne Hilfslinien.');
      }
    };
    staff.el.setAttribute('tabindex', 0);
    staff.el.addEventListener('click', e => set(staff.stepAt(e.clientY)));
    staff.el.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); set(d == null ? 34 : d + 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); set(d == null ? 34 : d - 1); }
    });
    const up = h('button', { type: 'button', class: 'nudge', 'aria-label': 'Note einen Schritt höher', onclick: () => set(d == null ? 34 : d + 1) }, '▲');
    const down = h('button', { type: 'button', class: 'nudge', 'aria-label': 'Note einen Schritt tiefer', onclick: () => set(d == null ? 34 : d - 1) }, '▼');
    paint();
    paintChips();
    el.append(h('div', { class: 'pick' }, staff.el, h('div', { class: 'nudges' }, up, down)), read,
      h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Plätze'), chips));
  }

  // Knöpfe in der richtigen Reihenfolge antippen (Stammtonreihe, Oktaven). items: [{ label, midi }].
  function orderTask({ items, start, hint, doneMsg }) {
    return (el, done) => {
      let pos = 0, finished = false;
      const read = readout(start);
      const chain = h('div', { class: 'found' });
      const paintChain = () => chain.replaceChildren(...items.map((it, i) =>
        h('span', { class: 'chip' + (i < pos ? ' is-on' : '') }, i < pos ? it.label : '?')));
      const btns = shuffle(items).map(it => {
        const b = h('button', { type: 'button', class: 'btn btn--outline' }, it.label);
        b.addEventListener('click', () => {
          if (finished) return;
          Sound.piano(it.midi);
          if (it !== items[pos]) {
            read.innerHTML = inline(hint(items[pos], it, pos));
            return;
          }
          b.disabled = true;
          pos++;
          paintChain();
          if (pos === items.length) {
            finished = true;
            read.innerHTML = inline('**Geschafft.**');
            Sound.seq(items.map(x => x.midi), { step: 0.32 });
            done(doneMsg);
          } else {
            read.innerHTML = inline(`Richtig. Weiter mit dem nächsten.`);
          }
        });
        return b;
      });
      paintChain();
      el.append(h('div', { class: 'ns-order' }, btns), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Deine Reihe'), chain));
    };
  }

  // Kapitel 5: weiße Taste antippen → Abstand zur nächsten weißen Taste rechts. Ziel: beide Halbtonstellen finden.
  function whiteStepFinder(el, done) {
    const found = new Set();
    let finished = false;
    const nextWhite = m => (isBlackKey(m + 1) ? m + 2 : m + 1);
    const read = readout('Tippe eine **weiße** Taste. Du siehst den Abstand zur nächsten weißen Taste rechts daneben.');
    const kb = Keyboard({
      from: 60, to: 84, labels: 'white',
      onPress: m => {
        if (finished) return;
        if (isBlackKey(m)) { read.innerHTML = inline('Das ist eine schwarze Taste. Tippe eine **weiße**.'); return; }
        if (m >= 84) { read.innerHTML = inline('Rechts davon ist keine Taste mehr. Tippe eine andere weiße Taste.'); return; }
        const nx = nextWhite(m);
        kb.clearMarks();
        kb.mark(m, 'mk-ref');
        kb.mark(nx, 'mk-ref');
        if (nx - m === 2) kb.mark(m + 1, 'mk-step', '');
        report(m, nx);
      },
    });
    function report(m, nx) {
      const a = T.pcName(m), b = T.pcName(nx);
      if (nx - m === 1) {
        found.add(mod(m, 12));
        read.innerHTML = inline(`**${a} → ${b}: Halbtonschritt.** Dazwischen liegt keine schwarze Taste, die beiden Tasten sind direkte Nachbarn.`);
      } else {
        read.innerHTML = inline(`**${a} → ${b}: Ganztonschritt.** Dazwischen liegt eine schwarze Taste: zwei Halbtonschritte.`);
      }
      if (found.size === 2 && !finished) {
        finished = true;
        done('Nur zwischen **E und F** und zwischen **H und C** liegt keine schwarze Taste. Dort sind die weißen Tasten nur einen **Halbtonschritt** voneinander entfernt, überall sonst einen **Ganztonschritt**.');
      }
    }
    el.append(kbWrap(kb.el), read);
  }

  // Kapitel 7: alle schwarzen Tasten antippen, beide Namen erscheinen.
  function blackKeyNames(el, done) {
    const NAMES = { 1: ['Cis', 'Des'], 3: ['Dis', 'Es'], 6: ['Fis', 'Ges'], 8: ['Gis', 'As'], 10: ['Ais', 'B'] };
    const found = new Set();
    let finished = false;
    const read = readout('Tippe auf eine schwarze Taste.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...Object.entries(NAMES).map(([pc, nm]) =>
      h('span', { class: 'chip' + (found.has(Number(pc)) ? ' is-on' : '') }, found.has(Number(pc)) ? nm.join(' / ') : '?')));
    const kb = Keyboard({
      from: 60, to: 71, labels: 'white',
      onPress: m => {
        const pc = mod(m, 12);
        if (!NAMES[pc]) {
          read.innerHTML = inline(`**${T.pcName(m)}** ist eine weiße Taste, ein Stammton. Tippe auf eine schwarze.`);
          return;
        }
        const [up, dn] = NAMES[pc];
        read.innerHTML = inline(`**${up}** (${T.pcName(pc - 1)} mit Kreuz erhöht) oder **${dn}** (${T.pcName(pc + 1)} mit b erniedrigt): dieselbe Taste.`);
        kb.mark(m, 'mk-ok', '');
        found.add(pc);
        paintChips();
        if (found.size === 5 && !finished) {
          finished = true;
          done('Jede schwarze Taste ist **doppelt belegt**: einmal als erhöhter linker Nachbar, einmal als erniedrigter rechter Nachbar.');
        }
      },
    });
    paintChips();
    el.append(kbWrap(kb.el), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Tasten'), chips));
  }

  /* ---------- Tonschritte hören ---------- */
  const WHITES = [60, 62, 64, 65, 67, 69, 71];
  function stepEar(no) {
    const half = Math.random() < 0.5;
    const lo = pick(WHITES);
    const hi = lo + (half ? 1 : 2);
    const play = () => Sound.seq([lo, hi], { step: 0.7 });
    return Steps.mc({
      title: `Hörprobe ${no}`,
      prompt: 'Zwei Töne nacheinander. Ist das ein **Halbtonschritt** oder ein **Ganztonschritt**?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Nochmal hören', play)));
        api.later(play, 400);
      },
      options: ['Halbtonschritt', 'Ganztonschritt'],
      keepOrder: true,
      answer: half ? 'Halbtonschritt' : 'Ganztonschritt',
      explain: half
        ? `Ein **Halbtonschritt**: von einer Taste zur direkt benachbarten (${T.pcName(lo)} → ${T.pcName(hi)}).`
        : `Ein **Ganztonschritt**: von einer Taste zur übernächsten, also zwei Halbtonschritte (${T.pcName(lo)} → ${T.pcName(hi)}).`,
      wrong: 'Vergleich mit den beiden Beispielen von vorhin: Wie hast du den Halbtonschritt für dich beschrieben?',
    });
  }

  /* ---------- Vorzeichen ---------- */
  const spellAcc = (l, a) => T.name({ l: mod(l, 7), a, o: 4 });
  // Falsche Bildungen, die das Skript ausdrücklich ausschließt.
  const MISSPELL = { A: 'Aes', E: 'Ees', H: 'Hes' };
  const SHARP_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A'];
  const FLAT_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];

  function accidentalQuiz(forceFlat) {
    const flat = forceFlat != null ? forceFlat : Math.random() < 0.5;
    const letter = pick(flat ? FLAT_LETTERS : SHARP_LETTERS);
    const l = LETTERS.indexOf(letter);
    const a = flat ? -1 : 1;
    const ans = spellAcc(l, a);
    const cands = [spellAcc(l, -a), letter, flat && MISSPELL[letter], spellAcc(l + 1, a), spellAcc(l - 1, a)].filter(Boolean);
    const options = [ans, ...[...new Set(cands)].filter(x => x !== ans).slice(0, 3)];
    let explain;
    if (flat && letter === 'H') explain = '**B**: Ein H mit b heißt im Deutschen nicht Hes, sondern **B**.';
    else if (flat && (letter === 'A' || letter === 'E')) explain = `**${ans}**: Bei A und E wird nur ein -s angehängt, also ${ans} und nicht ${MISSPELL[letter]}.`;
    else explain = `**${ans}**: Mit ${flat ? 'einem b wird -es' : 'einem Kreuz wird -is'} an den Stammton angehängt.`;
    return { flat, letter, ans, options, explain, sym: flat ? '♭' : '♯' };
  }

  function accidentalStep() {
    const q = accidentalQuiz();
    return Steps.mc({
      prompt: `Wie heißt **${q.letter}** mit ${q.flat ? 'einem b' : 'einem Kreuz'} (${q.sym})?`,
      options: q.options,
      answer: q.ans,
      explain: q.explain,
      wrong: q.flat ? 'Bei einem b hängst du -es an. Denk an die Ausnahmen bei A, E und H.' : 'Bei einem Kreuz hängst du -is an den Stammton an.',
    });
  }

  // Ton mit Vorzeichen → nach dem Auflösungszeichen wieder der Stammton.
  const NATURAL_POOL = ['Cis', 'Dis', 'Fis', 'Gis', 'Ais', 'Des', 'Es', 'Ges', 'As', 'B'];
  function naturalQuiz(name = pick(NATURAL_POOL)) {
    const note = T.note(name);
    const ans = LETTERS[note.l];
    const others = [name, LETTERS[mod(note.l + 1, 7)], LETTERS[mod(note.l - 1, 7)]];
    return { name, ans, options: shuffle([ans, ...new Set(others)]).slice(0, 4) };
  }

  /* ---------- Kopfbild ---------- */
  function visual() {
    return {
      label: 'Zwei Schlüssel · zum Anhören antippen',
      foot: 'Der G-Schlüssel zeigt das g1, der F-Schlüssel das kleine f',
      el: clefPair(
        tapStaff(['G4'], { width: 170, captions: ['g1'] }),
        tapStaff(['F3'], { width: 170, clef: 'bass', captions: ['kleines f'] })),
    };
  }

  /* ---------- Blitzrunde ---------- */
  const CLEF_FACTS = [
    ['Wie heißt der Violinschlüssel noch?', 'G-Schlüssel', ['F-Schlüssel', 'C-Schlüssel', 'Bassschlüssel']],
    ['Wie heißt der Bassschlüssel noch?', 'F-Schlüssel', ['G-Schlüssel', 'C-Schlüssel', 'Violinschlüssel']],
    ['Welchen Ton bestimmt der Violinschlüssel?', 'g1', ['kleines f', 'c1', 'a1']],
    ['Welchen Ton bestimmt der Bassschlüssel?', 'kleines f', ['g1', 'kleines c', 'c1']],
    ['Wie viele Linien hat das Notensystem?', '5', ['4', '6', '9']],
    ['Wie viele Noten passen ohne Hilfslinien auf und zwischen die fünf Linien?', '9', ['5', '7', '11']],
  ];
  function genClef() {
    const [prompt, ans, others] = pick(CLEF_FACTS);
    return { tag: 'Notensystem', prompt, key: prompt, options: shuffle([ans, ...others]), answer: ans };
  }

  function genStamm() {
    const i = randInt(0, 6);
    const up = Math.random() < 0.5;
    const ans = LETTERS[mod(i + (up ? 1 : -1), 7)];
    return {
      tag: 'Stammtöne',
      prompt: `Welcher Stammton kommt in der Reihe C – D – E – F – G – A – H ${up ? '**nach**' : '**vor**'} **${LETTERS[i]}**?`,
      key: 'st' + i + up,
      options: quizOptions(ans, LETTERS.filter(x => x !== LETTERS[i])),
      answer: ans,
    };
  }

  function genRead() {
    const bass = Math.random() < 0.5;
    const nm = pick(bass ? ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'H3', 'C4'] : ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4']);
    const note = at(nm);
    const ans = T.name(note);
    return {
      tag: bass ? 'Bassschlüssel' : 'Violinschlüssel',
      prompt: 'Wie heißt dieser Ton?',
      key: (bass ? 'b' : 't') + nm,
      media: el => {
        const st = Staff({ width: 200, clef: bass ? 'bass' : 'treble' });
        st.render([[note]], { labels: false });
        el.append(st.el);
      },
      options: quizOptions(ans, LETTERS),
      answer: ans,
    };
  }

  function genOctave() {
    const kind = randInt(0, 2);
    if (kind === 0) {
      const i = randInt(0, 3);
      return { tag: 'Oktaven', prompt: `Welche Oktave liegt direkt **über** der **${OCTAVES[i].name}**?`, key: 'ou' + i, options: quizOptions(OCT_SHORT[i + 1], OCT_SHORT), answer: OCT_SHORT[i + 1] };
    }
    if (kind === 1) {
      const i = randInt(1, 4);
      return { tag: 'Oktaven', prompt: `Welche Oktave liegt direkt **unter** der **${OCTAVES[i].name}**?`, key: 'od' + i, options: quizOptions(OCT_SHORT[i - 1], OCT_SHORT), answer: OCT_SHORT[i - 1] };
    }
    const [nm, ans] = pick([['g1', 'eingestrichene'], ['c1', 'eingestrichene'], ['a1', 'eingestrichene'], ['kleines f', 'kleine'], ['kleines c', 'kleine']]);
    return { tag: 'Oktaven', prompt: `In welcher Oktave liegt das **${nm}**?`, key: 'oi' + nm, options: quizOptions(ans, OCT_SHORT), answer: ans };
  }

  function genStep() {
    const i = randInt(0, 6);
    const a = LETTERS[i], b = LETTERS[mod(i + 1, 7)];
    const ans = a === 'E' || a === 'H' ? 'Halbtonschritt' : 'Ganztonschritt';
    return { tag: 'Tonschritte', prompt: `Weiße Taste **${a}** zur nächsten weißen Taste **${b}**: welcher Schritt?`, key: 'sc' + a, options: ['Halbtonschritt', 'Ganztonschritt'], answer: ans };
  }

  function genAccidental() {
    const q = accidentalQuiz();
    return { tag: 'Vorzeichen', prompt: `Wie heißt **${q.letter}** mit ${q.flat ? 'einem b' : 'einem Kreuz'} (${q.sym})?`, key: 'acc' + q.ans, options: shuffle(q.options), answer: q.ans };
  }

  const SAME_KEY = [
    ['Gis', 'As', ['A', 'G', 'Fis']], ['As', 'Gis', ['Ais', 'G', 'A']], ['Dis', 'Es', ['E', 'D', 'Cis']],
    ['Es', 'Dis', ['E', 'D', 'Eis']], ['Fes', 'E', ['F', 'Es', 'Fis']], ['His', 'C', ['H', 'B', 'Cis']],
  ];
  function genNatural() {
    if (Math.random() < 0.5) {
      const q = naturalQuiz();
      return { tag: 'Auflösungszeichen', prompt: `Vor einem **${q.name}** steht ein Auflösungszeichen (♮). Welcher Ton erklingt?`, key: 'nat' + q.name, options: q.options, answer: q.ans };
    }
    const [x, ans, others] = pick(SAME_KEY);
    return { tag: 'Klaviatur', prompt: `Welcher Ton liegt auf derselben Taste wie **${x}**?`, key: 'same' + x, options: shuffle([ans, ...others]), answer: ans };
  }

  /* ---------- Kurs ---------- */
  defineCourse({
    id: 'notensystem',
    short: 'Notensystem',
    title: ['Das Noten', 'system'],
    topic: 'Grundlagen',
    sub: 'Linien, Schlüssel, Stammtöne, Oktaven und Vorzeichen',
    lead: 'Die absolute Grundlage der Musiktheorie: Fünf Linien, zwei Schlüssel, sieben Stammtöne. Du lernst, wie man Noten aufschreibt, wie sie heißen, in welcher Oktave sie liegen und wie man sie mit Vorzeichen verändert.',
    visual,
    badge: { id: 'ns-kurs', glyph: '\u{1D11E}', name: 'Fünf Linien', desc: 'Den Kurs Das Notensystem abgeschlossen.' },
    arcade: [
      { id: 'ns-a-system', name: 'Linien und Schlüssel', gen: genClef, needs: 'ns-system' },
      { id: 'ns-a-stamm', name: 'Stammtonreihe', gen: genStamm, needs: 'ns-stammtoene' },
      { id: 'ns-a-lesen', name: 'Tonhöhen lesen', gen: genRead, needs: 'ns-tonhoehen' },
      { id: 'ns-a-oktave', name: 'Oktavnamen', gen: genOctave, needs: 'ns-oktaven' },
      { id: 'ns-a-schritt', name: 'Halb- oder Ganzton', gen: genStep, needs: 'ns-vorzeichen' },
      { id: 'ns-a-vorzeichen', name: 'Namen mit Vorzeichen', gen: genAccidental, needs: 'ns-vorzeichen' },
      { id: 'ns-a-aufloesung', name: 'Auflösen und doppelt belegt', gen: genNatural, needs: 'ns-aufloesung' },
    ],
    levels: [
      /* ---------- #1 Das Notensystem ---------- */
      {
        id: 'ns-system',
        title: 'Das Notensystem',
        sub: 'Fünf Linien, Hilfslinien und zwei Schlüssel',
        takeaway: '**Fünf Linien** bestimmen Höhe und Länge einer Note. Ohne Hilfslinien passen **9** Noten hinein. Erst der **Notenschlüssel** legt die Tonhöhe fest: Der **Violinschlüssel** (G-Schlüssel) zeigt das **g1**, der **Bassschlüssel** (F-Schlüssel) das **kleine f**.',
        steps: () => [
          Steps.info({
            title: 'Fünf Linien',
            text: 'Musik wird in einem besonderen System aufgeschrieben: dem **Fünfliniensystem**. Mit seiner Hilfe bestimmen wir die **Höhe** und die **Länge** einer Note.\n\nReichen fünf Linien für eine ganze Melodie? Ja, denn Noten stehen sowohl **auf** den Linien als auch **zwischen** den Linien.',
            media: el => el.append(tapStaff(['E4', 'A4'], { width: 300, captions: ['Linie', 'Zwischenraum'] })),
          }),
          Steps.mc({
            prompt: 'Aus wie vielen Linien besteht das Notensystem?',
            options: ['3', '4', '5', '6'],
            keepOrder: true,
            answer: '5',
            explain: 'Es sind **fünf Linien**, darum heißt es auch Fünfliniensystem.',
          }),
          Steps.task({
            title: 'Wie viele Noten passen hinein?',
            text: 'Finde alle Plätze, an denen eine Note **auf** oder **zwischen** den fünf Linien stehen kann, ohne Hilfslinie.\n\nTippe in die Notenzeile oder schiebe die Note mit den Pfeilen.',
            mount: placeCounter,
          }),
          Steps.mc({
            prompt: 'Und wenn du **unter** die unterste und **über** die oberste Linie noch je eine Note setzt? Wie viele Noten sind es dann?',
            options: ['9', '10', '11', '13'],
            keepOrder: true,
            answer: '11',
            explain: '9 + 2 = **11**. Auch diese beiden Noten kommen noch ohne Hilfslinie aus.',
            wrong: 'Zu den 9 Plätzen kommt unten einer und oben einer dazu.',
          }),
          Steps.info({
            title: 'Hilfslinien',
            text: 'Mit **Hilfslinien** notieren wir noch mehr Tonhöhen, auch solche, die **besonders hoch** oder **besonders tief** sind und nicht mehr in das Fünfliniensystem passen.\n\nTippe die Noten an, um sie zu hören.',
            media: el => el.append(tapStaff(['A3', 'C4', 'A5', 'C6'], { width: 320 })),
          }),
          Steps.mc({
            prompt: 'Du siehst eine Note im Fünfliniensystem, aber **keinen Notenschlüssel**. Kannst du ihre Tonhöhe bestimmen?',
            options: [
              'Nein, dafür fehlt der Notenschlüssel',
              { t: 'Ja, an der Linie, auf der sie steht', why: 'Die Linie allein reicht nicht. Erst der Schlüssel legt fest, welcher Ton auf welcher Linie liegt.' },
              { t: 'Ja, wenn sie zwischen den Linien steht', why: 'Auch im Zwischenraum braucht es den Schlüssel, um die Tonhöhe zu bestimmen.' },
              { t: 'Nur, wenn sie eine Hilfslinie hat', why: 'Hilfslinien verlängern das System, ersetzen aber keinen Schlüssel.' },
            ],
            keepOrder: true,
            answer: 'Nein, dafür fehlt der Notenschlüssel',
            explain: 'Richtig: Ohne den passenden **Notenschlüssel** lässt sich keine Tonhöhe bestimmen.',
          }),
          Steps.info({
            title: 'Zwei Notenschlüssel',
            text: 'Wir unterscheiden zwei Schlüssel:\n\nDer **Violinschlüssel**, auch **G-Schlüssel** genannt, bestimmt immer die Tonhöhe **g1**. Sein Bauch zeigt auf diesen Ton.\n\nDer **Bassschlüssel**, auch **F-Schlüssel** genannt, zeigt das **kleine f**. Es liegt zwischen den beiden Punkten des Schlüssels.\n\nMit etwas Fantasie sieht der Bassschlüssel tatsächlich wie ein **F** aus und der Violinschlüssel wie ein **G**.',
            media: el => el.append(clefPair(
              tapStaff(['G4'], { width: 170, captions: ['g1'] }),
              tapStaff(['F3'], { width: 170, clef: 'bass', captions: ['kleines f'] }))),
          }),
          Steps.mc({
            prompt: 'Welche Tonhöhe bestimmt der **Violinschlüssel**?',
            options: ['g1', 'kleines f', 'c1', 'a1'],
            answer: 'g1',
            explain: 'Der Violinschlüssel ist der **G-Schlüssel**: Sein Bauch zeigt das **g1**.',
            wrong: 'Denk an seinen zweiten Namen: G-Schlüssel.',
          }),
          Steps.pick({
            title: 'Setze das g1',
            prompt: 'Setze das **g1** in die Notenzeile. Tipp: Schau, wohin der Bauch des Violinschlüssels zeigt.',
            target: 'G4',
            start: 'C5',
            explain: 'Das **g1** steht auf der 2. Linie, genau dort, wohin der Bauch des G-Schlüssels zeigt.',
          }),
          Steps.mc({
            prompt: 'Wie heißt der Bassschlüssel noch, und welchen Ton zeigt er?',
            options: ['F-Schlüssel, er zeigt das kleine f', 'G-Schlüssel, er zeigt das g1', 'F-Schlüssel, er zeigt das g1', 'G-Schlüssel, er zeigt das kleine f'],
            answer: 'F-Schlüssel, er zeigt das kleine f',
            explain: 'Der Bassschlüssel ist der **F-Schlüssel**. Das **kleine f** liegt zwischen seinen beiden Punkten.',
            wrong: 'Der Bassschlüssel sieht wie ein F aus.',
          }),
          Steps.pick({
            title: 'Setze das kleine f',
            prompt: 'Setze das **kleine f** in die Notenzeile. Tipp: Es liegt zwischen den beiden Punkten des Bassschlüssels.',
            target: 'F3',
            clef: 'bass',
            start: 'H2',
            explain: 'Das **kleine f** steht auf der 4. Linie, genau zwischen den beiden Punkten des F-Schlüssels.',
          }),
        ],
      },

      /* ---------- #2 Die Stammtöne ---------- */
      {
        id: 'ns-stammtoene',
        title: 'Die Stammtöne',
        sub: 'C, D, E, F, G, A, H',
        takeaway: '**Stammtöne** sind Tonhöhen, die nicht durch Vorzeichen verändert sind. Im Deutschen heißt der Stammton B **H**. Die Reihe beginnt mit C: **C – D – E – F – G – A – H**.',
        steps: () => {
          const i = randInt(0, 6);
          const after = LETTERS[mod(i + 1, 7)];
          return [
            Steps.mc({
              title: 'Die Auflösung',
              prompt: 'Welche Instrumente verwenden sowohl den **Violin-** als auch den **Bassschlüssel**?',
              options: ['Klavier, Orgel, Akkordeon und Harfe', 'Nur das Klavier', 'Nur die Orgel', 'Kein Instrument, es gibt immer nur einen Schlüssel'],
              keepOrder: true,
              answer: 'Klavier, Orgel, Akkordeon und Harfe',
              explain: 'Mehrere Antworten sind richtig: Zuerst denkt man an das **Klavier**, aber auch **Orgel**, **Akkordeon** und **Harfe** verwenden beide Schlüssel gleichzeitig.',
              wrong: 'Es ist nicht nur ein Instrument.',
            }),
            Steps.mc({
              prompt: 'Zur Erinnerung: Wo findest du das **G** im Violinschlüssel?',
              options: ['Im Bauch des Violinschlüssels', 'Zwischen den beiden Punkten', 'Auf der untersten Linie', 'Auf der ersten Hilfslinie'],
              answer: 'Im Bauch des Violinschlüssels',
              explain: 'Das G liegt im **Bauch** des Violinschlüssels, darum heißt er auch G-Schlüssel. Zwischen den beiden **Punkten** des Bassschlüssels liegt das kleine F.',
            }),
            Steps.info({
              title: 'Was sind Stammtöne?',
              text: 'F und G sind Buchstaben des Alphabets, genau wie die anderen Töne der **Stammtonreihe**.\n\n**Stammtöne** sind Tonhöhen, die **nicht durch Vorzeichen verändert** sind. Zähl einfach wie im Alphabet: A, B, C, D, E, F und G.\n\nIm Deutschen gibt es aber eine wichtige Besonderheit: Den Stammton **B** nennen wir **H**. Die deutsche Stammtonreihe lautet also: A, H, C, D, E, F, G.',
            }),
            Steps.mc({
              prompt: 'Was ist ein **Stammton**?',
              options: [
                'Eine Tonhöhe, die nicht durch Vorzeichen verändert ist',
                { t: 'Der tiefste Ton eines Musikstücks', why: 'Mit der Lage im Stück hat das nichts zu tun.' },
                { t: 'Jeder Ton, der auf einer Linie steht', why: 'Auch Töne zwischen den Linien können Stammtöne sein.' },
                { t: 'Ein Ton mit Kreuz oder b davor', why: 'Genau umgekehrt: Ein Stammton hat kein Vorzeichen.' },
              ],
              answer: 'Eine Tonhöhe, die nicht durch Vorzeichen verändert ist',
              explain: 'Stammtöne sind **nicht durch Vorzeichen verändert**.',
            }),
            Steps.mc({
              prompt: 'Wie heißt im Deutschen der Stammton, der im Alphabet **B** heißt?',
              options: ['H', 'B', 'Bis', 'C'],
              answer: 'H',
              explain: 'Im Deutschen heißt der Stammton B **H**.',
            }),
            Steps.info({
              title: 'Immer ab C',
              text: 'Um die Regeln der Musik zu lernen, beginnen wir immer mit dem Ton **C**. Die Stammtonreihe lautet also:\n\n**C – D – E – F – G – A – H**\n\nTippe die Noten an, um sie zu hören.',
              media: el => el.append(tapStaff(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4'], { width: 360, labels: true })),
            }),
            Steps.task({
              title: 'Die Stammtonreihe',
              text: 'Jetzt bist du dran: Tippe die Stammtöne in der richtigen Reihenfolge, beginnend mit **C**.',
              mount: orderTask({
                items: LETTERS.map((x, k) => ({ label: x, midi: 60 + [0, 2, 4, 5, 7, 9, 11][k] })),
                start: 'Beginne mit dem Ton, mit dem wir immer anfangen.',
                hint: (want, got, pos) => (pos === 0
                  ? `**${got.label}** ist nicht der Anfang. Wir beginnen immer mit **C**.`
                  : `Nach **${LETTERS[pos - 1]}** kommt nicht ${got.label}. Denk ans Alphabet, nur dass B im Deutschen H heißt.`),
                doneMsg: '**C – D – E – F – G – A – H**: die deutsche Stammtonreihe ab C.',
              }),
            }),
            Steps.mc({
              prompt: 'Welche Reihe ist die deutsche Stammtonreihe ab C?',
              options: ['C – D – E – F – G – A – H', 'C – D – E – F – G – A – B', 'A – B – C – D – E – F – G', 'C – D – E – G – F – A – H'],
              answer: 'C – D – E – F – G – A – H',
              explain: '**C – D – E – F – G – A – H**: wie im Alphabet, nur mit H statt B, und beginnend mit C.',
              wrong: 'Achte auf zwei Dinge: Wir beginnen mit C, und im Deutschen heißt der Stammton B H.',
            }),
            Steps.mc({
              prompt: `Welcher Stammton folgt auf **${LETTERS[i]}**?`,
              options: quizOptions(after, LETTERS.filter(x => x !== LETTERS[i])),
              answer: after,
              explain: after === 'C'
                ? 'Nach **H** beginnt die Reihe wieder mit **C**.'
                : `${LETTERS.join(' – ')}: Nach ${LETTERS[i]} kommt **${after}**.`,
            }),
          ];
        },
      },

      /* ---------- #3 Die Tonhöhen ---------- */
      {
        id: 'ns-tonhoehen',
        title: 'Die Tonhöhen',
        sub: 'Noten im Violin- und Bassschlüssel lesen',
        takeaway: 'Das **c1** steht im Violinschlüssel auf einer **Hilfslinie** unter dem System. Von dort aus geht es im Wechsel Zwischenraum, Linie nach oben. **C, E, G, H** liegen auf den Linien, **D, F, A** dazwischen. Im Bassschlüssel steht das **kleine c** dort, wo im Violinschlüssel das **a1** steht. Das **c1** verbindet beide Systeme.',
        steps: () => [
          Steps.info({
            title: 'Start beim c1',
            text: 'Um Noten flüssig zu lesen, merkst du dir, wo bestimmte Töne ihr Zuhause haben. Beginne mit dem **c1**: Es liegt im Violinschlüssel **unterhalb** der Notenlinien und braucht eine **Hilfslinie**.\n\nVon dort aus sagst du im Kopf einfach **C, D, E, F, G, A, H, C** auf. Die Töne steigen im Wechsel: **Zwischenraum, Linie, Zwischenraum, Linie** …',
            media: el => el.append(tapStaff(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4', 'C5'], { width: 380, labels: true })),
          }),
          Steps.pick({
            title: 'Setze das c1',
            prompt: 'Setze das **c1** in die Notenzeile (Violinschlüssel).',
            target: 'C4',
            start: 'G4',
            explain: 'Das **c1** steht unter den fünf Linien auf der **1. Hilfslinie**.',
          }),
          Steps.mc({
            prompt: 'Wie steigen die Töne vom c1 aus nach oben?',
            options: [
              'Im Wechsel Zwischenraum, Linie, Zwischenraum, Linie',
              { t: 'Immer von Linie zu Linie', why: 'Dann würdest du jeden zweiten Ton überspringen.' },
              { t: 'Immer von Zwischenraum zu Zwischenraum', why: 'Auch dabei fehlt jeder zweite Ton.' },
              { t: 'Zwei Linien, dann ein Zwischenraum', why: 'Linie und Zwischenraum wechseln sich immer ab.' },
            ],
            answer: 'Im Wechsel Zwischenraum, Linie, Zwischenraum, Linie',
            explain: 'Jeder nächste Stammton steht **einen Platz höher**: Zwischenraum, Linie, Zwischenraum, Linie …',
          }),
          Steps.info({
            title: 'Eine kleine Merkhilfe',
            text: 'Von **c1** bis **h1** gilt: Die Töne **C, E, G und H** sind in der Mitte **durchgestrichen**. Sie liegen also **auf** einer Linie (beim c1 ist es die Hilfslinie).\n\nDie Töne **D, F und A** sind nicht durchgestrichen und liegen **zwischen** den Linien.',
            media: el => el.append(tapStaff(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4'], {
              width: 360, labels: true, classes: ['is-ok', '', 'is-ok', '', 'is-ok', '', 'is-ok'],
            })),
          }),
          Steps.mc({
            prompt: 'Welche Töne von c1 bis h1 sind **durchgestrichen**, liegen also auf einer Linie?',
            options: ['C, E, G und H', 'D, F und A', 'C, D, E und F', 'A, H, C und D'],
            answer: 'C, E, G und H',
            explain: '**C, E, G und H** liegen auf den Linien, **D, F und A** dazwischen.',
          }),
          nameQuestion({ title: 'Lies die Note', names: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4'] }),
          nameQuestion({ names: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4'] }),
          Steps.info({
            title: 'Der Bassschlüssel',
            text: 'Für den Bassschlüssel gibt es eine Eselsbrücke. Schau dir das Wort **„Bass“** genau an: Nur ein Buchstabe darin ist ein Stammton, das **A**.\n\nUnd so merkst du dir die Lage: Wo im Violinschlüssel das **a1** steht, steht im Bassschlüssel das **kleine c**. Die anderen Stammtöne ergänzt du von dort aus genauso nach oben.',
            media: el => el.append(clefPair(
              tapStaff(['A4'], { width: 170, captions: ['a1'] }),
              tapStaff(['C3', 'D3', 'E3'], { width: 220, clef: 'bass', captions: ['kleines c', 'd', 'e'] }))),
          }),
          Steps.pick({
            title: 'Setze das kleine c',
            prompt: 'Setze das **kleine c** in den Bassschlüssel. Tipp: Es steht dort, wo im Violinschlüssel das a1 steht.',
            target: 'C3',
            clef: 'bass',
            start: 'G3',
            explain: 'Das **kleine c** steht im **2. Zwischenraum**, an derselben Stelle wie das a1 im Violinschlüssel.',
          }),
          Steps.info({
            title: 'Das gemeinsame Bindeglied',
            text: 'Im Bassschlüssel liegt das **c1** auf der **ersten Hilfslinie über** dem System. Es ist **derselbe Ton** wie das c1 im Violinschlüssel.\n\nKombiniert man wie beim Klavier zwei Notensysteme mit Violin- und Bassschlüssel, ist dieser Ton das **gemeinsame Bindeglied** zwischen den Systemen.',
            media: el => el.append(clefPair(
              tapStaff(['C4'], { width: 170, captions: ['c1'] }),
              tapStaff(['C4'], { width: 170, clef: 'bass', captions: ['c1'] }))),
          }),
          Steps.mc({
            prompt: 'Welcher Ton verbindet beim Klavier das System im Violinschlüssel mit dem im Bassschlüssel?',
            options: ['c1', 'g1', 'kleines f', 'a1'],
            answer: 'c1',
            explain: 'Das **c1**: Im Violinschlüssel liegt es auf der Hilfslinie darunter, im Bassschlüssel auf der Hilfslinie darüber.',
          }),
          Steps.mc({
            title: 'Jetzt bist du dran',
            prompt: 'Welche Töne sind das? (Violinschlüssel)',
            media: el => el.append(tapStaff(['C4', 'F4', 'A4'], { width: 260 })),
            options: ['C – F – A', 'D – G – H', 'C – E – G', 'E – A – C'],
            answer: 'C – F – A',
            explain: 'Genau, das sind **c1, f1 und a1**.',
            wrong: 'Starte beim c1 auf der Hilfslinie und zähl nach oben.',
          }),
          Steps.mc({
            prompt: 'Und welche Töne sind das im **Bassschlüssel**?',
            media: el => el.append(tapStaff(['C3', 'F3', 'A3'], { width: 260, clef: 'bass' })),
            options: ['C – F – A', 'E – A – C', 'A – D – F', 'D – G – H'],
            answer: 'C – F – A',
            explain: 'Auch hier sind es **C, F und A**: das kleine c (wo im Violinschlüssel das a1 steht), das kleine f zwischen den Punkten und das kleine a.',
            wrong: 'Denk an die Eselsbrücke: Das kleine c steht dort, wo im Violinschlüssel das a1 steht. Und das kleine f liegt zwischen den Punkten.',
          }),
          nameQuestion({ title: 'Lies im Bassschlüssel', names: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'H3'], clef: 'bass' }),
        ],
      },

      /* ---------- #4 Die Oktaven ---------- */
      {
        id: 'ns-oktaven',
        title: 'Die Oktaven',
        sub: 'Von der großen bis zur dreigestrichenen Oktave',
        takeaway: 'Eine **Oktave** reicht immer von **C bis C** und umfasst acht Töne. Von unten nach oben: **große, kleine, eingestrichene, zweigestrichene, dreigestrichene** Oktave. Die kleine Oktave steht meist im **Bassschlüssel**, die eingestrichene im **Violinschlüssel**.',
        steps: () => {
          const [nm, oct] = pick([['g1', 'eingestrichene'], ['c1', 'eingestrichene'], ['kleines f', 'kleine'], ['kleines c', 'kleine']]);
          return [
            Steps.info({
              title: 'Mehr als sieben Töne',
              text: 'In der Musik gibt es mehr als nur sieben Töne: Viele treten in **höheren oder tieferen** Lagen noch einmal auf.\n\nUm sie besser aufschreiben zu können, teilen wir die Töne in Abschnitte von **acht Stufen**, die **Oktaven**. Eine Oktave reicht immer von **C bis C**.',
              media: el => {
                const play = () => Sound.seq([60, 62, 64, 65, 67, 69, 71, 72], { step: 0.32 });
                el.append(tapStaff(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4', 'C5'], { width: 380, labels: true }),
                  btnRow(PlayBtn('C bis C anhören', play)));
              },
            }),
            Steps.mc({
              prompt: 'Wie viele Töne umfasst eine Oktave?',
              options: ['5', '7', '8', '10'],
              keepOrder: true,
              answer: '8',
              explain: 'Von C bis C sind es **acht** Töne: C, D, E, F, G, A, H, C.',
              wrong: 'Zähl von C bis zum nächsten C und vergiss das obere C nicht.',
            }),
            Steps.info({
              title: 'Die Namen der Oktaven',
              text: 'Jede Oktave hat einen Namen. Die **eingestrichene Oktave** liegt genau in der Mitte des Tonsystems. Darüber folgen die **zweigestrichene**, die **dreigestrichene** und so weiter.\n\nUnter der eingestrichenen liegt die **kleine Oktave**, darunter die **große Oktave**.\n\nHör dir jeweils das C an.',
              media: el => el.append(h('div', { class: 'ns-order' },
                OCTAVES.map(x => PlayBtn(x.name, () => Sound.piano((x.o + 1) * 12))))),
            }),
            Steps.task({
              title: 'Von unten nach oben',
              text: 'Sag es einmal laut und tippe mit: Beginne mit der **tiefsten** Oktave und arbeite dich nach oben vor.',
              mount: orderTask({
                items: OCTAVES.map(x => ({ label: x.name, midi: (x.o + 1) * 12 })),
                start: 'Welche Oktave ist die tiefste, die du kennst?',
                hint: (want, got, pos) => (pos === 0
                  ? `Die **${got.label}** ist nicht die tiefste. Ganz unten liegt die **große** Oktave.`
                  : `Die **${got.label}** kommt noch nicht. Direkt über der ${OCTAVES[pos - 1].name} liegt die nächste.`),
                doneMsg: '**Große, kleine, eingestrichene, zweigestrichene, dreigestrichene Oktave**: von tief nach hoch.',
              }),
            }),
            Steps.mc({
              prompt: 'Welche Oktave liegt genau in der **Mitte** des Tonsystems?',
              options: OCT_SHORT.map(x => x + ' Oktave'),
              keepOrder: true,
              answer: 'eingestrichene Oktave',
              explain: 'Die **eingestrichene Oktave** liegt in der Mitte.',
            }),
            Steps.mc({
              prompt: 'Welche Oktave liegt direkt **unter** der kleinen Oktave?',
              options: OCT_SHORT.filter(x => x !== 'kleine').map(x => x + ' Oktave'),
              keepOrder: true,
              answer: 'große Oktave',
              explain: 'Unter der kleinen liegt die **große Oktave**.',
              wrong: 'Die Reihe von unten: große, kleine, eingestrichene …',
            }),
            Steps.mc({
              prompt: 'In welchem Schlüssel wird die **kleine Oktave** normalerweise notiert?',
              options: ['Im Bassschlüssel', 'Im Violinschlüssel'],
              keepOrder: true,
              answer: 'Im Bassschlüssel',
              explain: 'Im **Bassschlüssel**. Er wird für tiefe Töne verwendet und markiert das **kleine f**.',
            }),
            Steps.mc({
              prompt: 'Und welcher Schlüssel eignet sich am besten für die **eingestrichene Oktave**?',
              options: ['Der Violinschlüssel', 'Der Bassschlüssel'],
              keepOrder: true,
              answer: 'Der Violinschlüssel',
              explain: 'Der **Violinschlüssel**. Er ist ideal für hohe Töne und markiert das **g1**.',
            }),
            Steps.mc({
              prompt: `In welcher Oktave liegt das **${nm}**?`,
              options: OCT_SHORT.map(x => x + ' Oktave'),
              keepOrder: true,
              answer: oct + ' Oktave',
              explain: oct === 'kleine'
                ? `Das **${nm}** liegt in der **kleinen Oktave**, unter der eingestrichenen.`
                : `Das **${nm}** liegt in der **eingestrichenen Oktave**, in der Mitte des Tonsystems.`,
            }),
          ];
        },
      },

      /* ---------- #5 Die Tonschritte ---------- */
      {
        id: 'ns-schritte',
        title: 'Die Tonschritte',
        sub: 'Halbtonschritt und Ganztonschritt',
        takeaway: 'Von einer Taste zur **direkt benachbarten** ist ein **Halbtonschritt**. Von einer Taste zur **übernächsten** ist ein **Ganztonschritt**: zwei Halbtonschritte. Vorzeichen verändern einen Ton um einen Halbton.',
        steps: () => {
          const s1 = pick(WHITES), s2 = pick(WHITES.filter(x => x !== 71));
          return [
            Steps.info({
              title: 'Töne verändern',
              text: 'Töne verändern wir mit **Vorzeichen**. Sie erhöhen oder erniedrigen eine Tonhöhe um einen **Halbton**.\n\nWas das genau bedeutet, siehst du am besten an der **Klaviertastatur**. Schau dir die Tasten einer Oktave genau an: Es gibt **weiße** und **schwarze** Tasten.',
              media: el => el.append(kbWrap(Keyboard({ from: 60, to: 72, labels: 'white' }).el)),
            }),
            Steps.mc({
              prompt: 'Sind die Abstände zwischen den weißen Tasten immer gleich?',
              options: [
                'Nein: Zwischen manchen weißen Tasten liegt eine schwarze, zwischen anderen nicht',
                { t: 'Ja, zwischen allen weißen Tasten liegt eine schwarze', why: 'Schau genau hin: An zwei Stellen fehlt die schwarze Taste.' },
                { t: 'Ja, zwischen weißen Tasten liegt nie eine schwarze', why: 'Doch, an vielen Stellen liegt eine schwarze Taste dazwischen.' },
              ],
              keepOrder: true,
              answer: 'Nein: Zwischen manchen weißen Tasten liegt eine schwarze, zwischen anderen nicht',
              explain: 'Nicht ganz gleich: Zwischen **einigen** weißen Tasten gibt es **keine** schwarze Taste, andere haben eine schwarze dazwischen.',
            }),
            Steps.info({
              title: 'Halbton und Ganzton',
              text: 'Der Abstand zwischen zwei **benachbarten Tasten** heißt **Halbtonschritt**, egal ob weiß oder schwarz.\n\nDer Abstand von einer Taste zur **übernächsten** heißt **Ganztonschritt**. Er besteht aus **zwei Halbtonschritten**.',
              media: el => {
                const kb1 = Keyboard({ from: 60, to: 67, labels: 'white' });
                kb1.mark(60, 'mk-ref', '0'); kb1.mark(61, 'mk-ref', '½');
                const kb2 = Keyboard({ from: 60, to: 67, labels: 'white' });
                kb2.mark(60, 'mk-ref', '0'); kb2.mark(61, 'mk-step', '½'); kb2.mark(62, 'mk-ref', '1');
                el.append(
                  h('p', { class: 'mono-label' }, 'Halbtonschritt'), kbWrap(kb1.el), btnRow(PlayBtn('Anhören', () => Sound.seq([60, 61], { step: 0.7 }))),
                  h('p', { class: 'mono-label' }, 'Ganztonschritt'), kbWrap(kb2.el), btnRow(PlayBtn('Anhören', () => Sound.seq([60, 62], { step: 0.7 }))));
              },
            }),
            Steps.keys({
              prompt: `Die markierte Taste ist **${T.pcName(s1)}**. Tippe die Taste einen **Halbtonschritt** höher.`,
              from: 60, to: 76, labels: 'none', marks: [[s1, 'mk-ref', '0']],
              check: sel => (sel[0] === s1 + 1 ? { ok: true } : {
                ok: false,
                msg: sel[0] === s1 + 2 ? 'Das ist die übernächste Taste, also ein Ganztonschritt. Gesucht ist die direkt benachbarte rechts.' : 'Ein Halbtonschritt geht zur direkt benachbarten Taste rechts, egal ob sie weiß oder schwarz ist.',
              }),
              solution: [s1 + 1],
              explain: `Die direkt benachbarte Taste: ein **Halbtonschritt**${isBlackKey(s1 + 1) ? ', hier eine schwarze Taste' : ', hier liegt keine schwarze Taste dazwischen'}.`,
            }),
            Steps.keys({
              prompt: `Die markierte Taste ist **${T.pcName(s2)}**. Tippe die Taste einen **Ganztonschritt** höher.`,
              from: 60, to: 76, labels: 'none', marks: [[s2, 'mk-ref', '0']],
              check: sel => (sel[0] === s2 + 2 ? { ok: true } : {
                ok: false,
                msg: sel[0] === s2 + 1 ? 'Das ist die direkt benachbarte Taste, also nur ein Halbtonschritt. Geh eine Taste weiter.' : 'Ein Ganztonschritt geht zur übernächsten Taste rechts, schwarze Tasten mitgezählt.',
              }),
              solution: [s2 + 2],
              explain: 'Die übernächste Taste: zwei Halbtonschritte, also ein **Ganztonschritt**.',
            }),
            Steps.mc({
              prompt: 'Aus wie vielen Halbtonschritten besteht ein Ganztonschritt?',
              options: ['1', '2', '3', '4'],
              keepOrder: true,
              answer: '2',
              explain: 'Zwei Halbtonschritte ergeben zusammen **einen Ganztonschritt**.',
            }),
            Steps.task({
              title: 'Wo fehlt die schwarze Taste?',
              text: 'Tippe weiße Tasten an. Du siehst jedes Mal, wie weit die nächste weiße Taste rechts entfernt ist.\n\nZiel: Finde die **beiden Stellen**, an denen zwei weiße Tasten nur einen **Halbtonschritt** auseinanderliegen.',
              mount: whiteStepFinder,
            }),
            Steps.info({
              title: 'Hör genau hin',
              text: 'Du kannst den Unterschied zwischen Halbton- und Ganztonschritt auch **hören**. Wie klingt ein Halbtonschritt für dich? Eher angenehm oder eher unangenehm? Und wie klingt ein Ganztonschritt?\n\nEs gibt hier **kein Richtig oder Falsch**. Es geht darum, dass du den Klang für dich selbst beschreiben kannst, um ihn später wiederzuerkennen.',
              gate: true,
              media: (el, api) => {
                const heard = new Set();
                const mark = k => { heard.add(k); if (heard.size === 2) api.ready(true); };
                el.append(btnRow(
                  PlayBtn('Halbtonschritt', () => { Sound.seq([64, 65], { step: 0.7 }); mark('h'); }),
                  PlayBtn('Ganztonschritt', () => { Sound.seq([64, 66], { step: 0.7 }); mark('g'); }, { variant: 'accent' })),
                h('p', { class: 'hint' }, 'Hör dir beide an, dann geht es weiter.'));
              },
            }),
            stepEar(1),
            stepEar(2),
          ];
        },
      },

      /* ---------- #6 Die Vorzeichen ---------- */
      {
        id: 'ns-vorzeichen',
        title: 'Die Vorzeichen',
        sub: 'Kreuz und b: Cis, Des, Es, B',
        takeaway: 'Ein **Kreuz** (♯) erhöht um einen Halbton: Der Name bekommt **-is** (Cis, Fis). Ein **b** (♭) erniedrigt um einen Halbton: Der Name bekommt **-es** (Des, Ces). Ausnahmen: **As** und **Es** statt Aes und Ees, und das erniedrigte H heißt im Deutschen **B**.',
        steps: () => {
          const fig = pick(['Fis4', 'Cis4', 'Gis4', 'Des4', 'As4', 'Es4', 'B4']);
          const figNote = at(fig);
          const figAns = T.name(figNote);
          const figL = LETTERS[figNote.l];
          const sharpKey = pick([['Fis', 6], ['Cis', 1], ['Gis', 8]]);
          const flatKey = pick([['B', 10], ['Es', 3], ['Des', 1]]);
          return [
            Steps.mc({
              title: 'Kurz zur Wiederholung',
              prompt: 'Wie erkennst du einen **Halbtonschritt** auf der Klaviatur?',
              options: [
                'Abstand von einer Taste zur direkt nächsten',
                { t: 'Abstand von einer Taste zur übernächsten', why: 'Das ist ein Ganztonschritt.' },
                { t: 'Abstand von einer weißen Taste zur nächsten weißen', why: 'Das kann ein Halb- oder ein Ganztonschritt sein, je nachdem, ob eine schwarze Taste dazwischenliegt.' },
              ],
              keepOrder: true,
              answer: 'Abstand von einer Taste zur direkt nächsten',
              explain: 'Genau. Ein **Ganztonschritt** dagegen geht zur übernächsten Taste, egal ob schwarz oder weiß.',
            }),
            Steps.info({
              title: 'Wo die Stammtöne nicht reichen',
              text: 'Die weißen Tasten sind die **Stammtöne** C, D, E, F, G, A, H. Wo keine schwarze Taste dazwischenliegt, ist ein **Halbtonschritt**: zwischen **E und F** und zwischen **H und C**.\n\nDie Töne zwischen den anderen Stammtönen können wir also noch nicht benennen oder notieren. Hier kommen die **Vorzeichen** ins Spiel:\n\nEin **Kreuz** (♯) **erhöht** einen Ton um einen Halbton. Ein **b** (♭) **erniedrigt** ihn um einen Halbton.',
              media: el => {
                const kb = Keyboard({ from: 60, to: 72, labels: 'white' });
                [64, 65, 71, 72].forEach(m => kb.mark(m, 'mk-ref'));
                el.append(kbWrap(kb.el));
              },
            }),
            Steps.keys({
              prompt: 'Tippe zwei **benachbarte weiße Tasten**, zwischen denen **keine** schwarze Taste liegt.',
              from: 60, to: 71, labels: 'white', max: 2,
              check: sel => {
                if (sel.length < 2) return { ok: false, msg: 'Wähle zwei Tasten.' };
                const [a, b] = sel.slice().sort((x, y) => x - y);
                if (isBlackKey(a) || isBlackKey(b)) return { ok: false, msg: 'Gesucht sind zwei **weiße** Tasten.' };
                if (b - a === 1) return { ok: true };
                return { ok: false, msg: `Zwischen ${T.pcName(a)} und ${T.pcName(b)} liegt ${b - a === 2 ? 'eine schwarze Taste' : 'mehr als ein Halbtonschritt'}. Such die Stelle ohne schwarze Taste.` };
              },
              solution: [64, 65],
              explain: 'Zwischen **E und F** (und ebenso zwischen **H und C**) liegt keine schwarze Taste: ein **Halbtonschritt**.',
            }),
            Steps.mc({
              prompt: 'Was macht ein **Kreuz** (♯) vor einer Note?',
              options: ['Es erhöht den Ton um einen Halbton', 'Es erniedrigt den Ton um einen Halbton', 'Es erhöht den Ton um einen Ganzton', 'Es macht den Ton wieder zum Stammton'],
              answer: 'Es erhöht den Ton um einen Halbton',
              explain: 'Das **Kreuz erhöht** um einen **Halbton**. Das **b** erniedrigt um einen Halbton.',
            }),
            Steps.info({
              title: 'Neue Namen',
              text: 'Steht ein Vorzeichen vor einer Note, bekommt der Ton einen **neuen Namen**:\n\nMit **Kreuz** hängst du **-is** an: **Cis, Fis, Gis** …\n\nMit **b** hängst du **-es** an: **Ces, Fes, Des** …\n\n**Ausnahmen:** Aus A mit b wird **As** (nicht A-es), aus E mit b wird **Es** (nicht E-es). Und das H mit b heißt im Deutschen nicht Hes, sondern **B**. Erhöht heißen sie ganz regulär **Ais** und **Eis**.',
              media: el => el.append(
                tapStaff(['Cis4', 'Fis4', 'Gis4'], { width: 280, labels: true }),
                tapStaff(['Des4', 'Es4', 'As4', 'B4'], { width: 320, labels: true })),
            }),
            accidentalStep(),
            accidentalStep(),
            Steps.mc({
              prompt: 'Wie heißt **H** mit einem **b** (♭)?',
              options: ['B', 'Hes', 'His', 'As'],
              answer: 'B',
              explain: 'Im Deutschen heißt das erniedrigte H nicht Hes, sondern **B**.',
              wrong: 'Hier gilt eine Ausnahme, die es nur im Deutschen gibt.',
            }),
            Steps.mc({
              prompt: 'Wie heißt **A** mit einem **b** (♭)?',
              options: ['As', 'Aes', 'Ais', 'Ges'],
              answer: 'As',
              explain: 'Aus A mit b wird **As**, also kein A-es. Genauso wird aus E mit b ein **Es**.',
            }),
            Steps.mc({
              prompt: 'Welcher Ton ist das?',
              media: el => el.append(tapStaff([fig], { width: 200 })),
              options: [figAns, figL, spellAcc(figNote.l, -figNote.a), spellAcc(figNote.l + 1, figNote.a)],
              answer: figAns,
              explain: `Das ist **${figAns}**: ${figL} mit ${figNote.a > 0 ? 'Kreuz, also -is' : figL === 'H' ? 'b, und das heißt im Deutschen B' : 'b'}.`,
              wrong: 'Lies erst den Stammton, dann schau aufs Vorzeichen davor.',
            }),
            Steps.keys({
              prompt: `Spiele ein **${sharpKey[0]}**.`,
              from: 60, to: 71, labels: 'white',
              check: pcCheck(sharpKey[1], `${sharpKey[0]} ist ${sharpKey[0][0]} mit Kreuz: die Taste einen Halbtonschritt **rechts** von ${sharpKey[0][0]}.`),
              solution: [60 + sharpKey[1]],
              explain: `**${sharpKey[0]}** liegt einen Halbton über ${sharpKey[0][0]}: die schwarze Taste direkt rechts daneben.`,
            }),
            Steps.keys({
              prompt: `Spiele ein **${flatKey[0]}**.`,
              from: 60, to: 71, labels: 'white',
              check: pcCheck(flatKey[1], flatKey[0] === 'B' ? 'B ist H mit b: die Taste einen Halbtonschritt **links** von H.' : `${flatKey[0]} ist ${flatKey[0][0]} mit b: die Taste einen Halbtonschritt **links** von ${flatKey[0][0]}.`),
              solution: [60 + flatKey[1]],
              explain: `**${flatKey[0]}** liegt einen Halbton unter ${flatKey[0] === 'B' ? 'H' : flatKey[0][0]}: die schwarze Taste direkt links daneben.`,
            }),
          ];
        },
      },

      /* ---------- #7 Das Auflösungszeichen ---------- */
      {
        id: 'ns-aufloesung',
        title: 'Das Auflösungszeichen',
        sub: 'Zurück zum Stammton und doppelt belegte Tasten',
        takeaway: 'Das **Auflösungszeichen** (♮) hebt ein Vorzeichen auf: Aus **Fis** wird wieder **F**, aus **B** wieder **H**. 7 Stammtöne, jeweils erhöht und erniedrigt, ergeben **21** Namen, aber pro Oktave gibt es nur **12** Tasten. Manche Tasten sind darum **doppelt belegt**: Gis = As, Dis = Es, Fes = E, His = C.',
        steps: () => {
          const q = naturalQuiz(pick(['Cis', 'Es', 'As', 'Gis', 'Des', 'Ais']));
          const twin = pick([[61, 'Cis oder Des'], [63, 'Dis oder Es'], [66, 'Fis oder Ges'], [68, 'Gis oder As'], [70, 'Ais oder B']]);
          return [
            Steps.info({
              title: 'Zurück zum Stammton',
              text: 'Was tust du, wenn du ein Vorzeichen nicht mehr brauchst und zum **Stammton zurückkehren** willst? Dafür gibt es das **Auflösungszeichen**.\n\nSteht es vor einem Ton, wird dieser **nicht mehr** um einen Halbton verschoben, sondern kehrt zu seiner **ursprünglichen Tonhöhe** zurück.',
              media: el => el.append(h('div', { class: 'ns-glyph', 'aria-label': 'Auflösungszeichen' }, '♮')),
            }),
            Steps.mc({
              prompt: 'Was passiert mit einem **Fis**, wenn danach ein Auflösungszeichen folgt?',
              options: ['Es wird wieder zum F', 'Es wird zum Fes', 'Es wird zum G', 'Es bleibt Fis'],
              answer: 'Es wird wieder zum F',
              explain: 'Richtig, es wird wieder zum **F**.',
            }),
            Steps.mc({
              prompt: 'Und was geschieht mit dem Ton **B**, wenn darauf ein Auflösungszeichen folgt?',
              options: ['Er wird wieder zum H', 'Er bleibt B', 'Er wird zum A', 'Er wird zum Hes'],
              answer: 'Er wird wieder zum H',
              explain: 'Genau, er wird wieder zum **H**: B ist ja das erniedrigte H.',
              wrong: 'Überleg, aus welchem Stammton das B entstanden ist.',
            }),
            Steps.mc({
              prompt: `Vor einem **${q.name}** steht ein Auflösungszeichen. Welcher Ton erklingt?`,
              options: q.options,
              answer: q.ans,
              explain: `Das Vorzeichen ist aufgehoben: Aus ${q.name} wird wieder der Stammton **${q.ans}**.`,
            }),
            Steps.mc({
              title: 'Eine letzte Frage',
              prompt: 'Es gibt 7 Stammtöne. Wenn **jeder** Ton um einen Halbton erhöht **und** erniedrigt werden kann: Wie viele Tonnamen erhältst du dann?',
              options: ['12', '14', '21', '28'],
              keepOrder: true,
              answer: '21',
              explain: '7 Stammtöne, 7 erhöhte und 7 erniedrigte: **21** Tonnamen.',
              wrong: 'Jeder Stammton gibt drei Namen: ohne Vorzeichen, mit Kreuz, mit b.',
            }),
            Steps.mc({
              prompt: 'Schau auf die Klaviatur: Wie viele Tasten liegen innerhalb der sieben Stammtöne, also von C bis H?',
              media: el => el.append(kbWrap(Keyboard({ from: 60, to: 71, labels: 'white' }).el)),
              options: ['7', '12', '14', '21'],
              keepOrder: true,
              answer: '12',
              explain: 'Es sind nur **12** Tasten: 7 weiße und 5 schwarze.',
            }),
            Steps.info({
              title: 'Doppelt belegt',
              text: 'Erhöhst du ein **G** zum **Gis**, spielst du diese schwarze Taste. Erniedrigst du aber ein **A** zum **As**, musst du **genau dieselbe Taste** spielen. Manche Tasten sind also **doppelt belegt**.\n\nIm Prinzip liegen Gis und As nicht genau auf derselben Tonhöhe. Auf einer **Geige** würdest du die beiden Töne leicht anders greifen. Auf dem Klavier muss die Zahl der Töne aber beschränkt bleiben, damit es zum Spielen nicht zu chaotisch wird: Darum gibt es nur **12 Tasten pro Oktave**.',
              media: el => {
                const kb = Keyboard({ from: 60, to: 71, labels: 'white' });
                kb.mark(68, 'mk-ref', '');
                el.append(kbWrap(kb.el), h('p', { class: 'hint' }, 'Markiert: Gis oder As'));
              },
            }),
            Steps.keys({
              prompt: 'Spiele ein **As**.',
              from: 60, to: 71, labels: 'white',
              check: pcCheck(8, 'As ist A mit b: einen Halbtonschritt links von A.'),
              solution: [68],
              explain: 'Das **As** liegt auf derselben Taste wie das **Gis**.',
            }),
            Steps.mc({
              prompt: 'Welche Töne kannst du mit der markierten Taste spielen?',
              media: el => {
                const kb = Keyboard({ from: 60, to: 71, labels: 'white' });
                kb.mark(twin[0], 'mk-ref', '');
                el.append(kbWrap(kb.el));
              },
              options: quizOptions(twin[1], ['Cis oder Des', 'Dis oder Es', 'Fis oder Ges', 'Gis oder As', 'Ais oder B']),
              answer: twin[1],
              explain: `**${twin[1]}**, je nachdem, welcher Stammton erhöht oder erniedrigt wird.`,
              wrong: 'Schau auf die beiden weißen Nachbarn: Der linke wird erhöht, der rechte erniedrigt.',
            }),
            Steps.keys({
              prompt: 'Du erniedrigst ein **F** zum **Fes**. Unter dem F liegt keine schwarze Taste. Welche Taste spielst du?',
              from: 60, to: 71, labels: 'none',
              check: pcCheck(4, 'Fes liegt einen Halbtonschritt unter F, also eine Taste weiter links.'),
              solution: [64],
              explain: 'Du spielst die Taste **E**. Fes und E liegen fast auf derselben Tonhöhe.',
            }),
            Steps.keys({
              prompt: 'Und welche Taste spielst du, wenn du ein **H** zum **His** erhöhst?',
              from: 60, to: 72, labels: 'none',
              check: pcCheck(0, 'His liegt einen Halbtonschritt über H, also eine Taste weiter rechts.'),
              solution: [72],
              explain: 'Richtig: ein **C**.',
            }),
            Steps.task({
              title: 'Alle schwarzen Tasten',
              text: 'Zum Abschluss: Tippe nacheinander alle fünf schwarzen Tasten an und sieh dir ihre beiden Namen an.',
              mount: blackKeyNames,
            }),
          ];
        },
      },
    ],
  });
})();
