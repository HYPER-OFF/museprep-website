'use strict';
/* Kurs: Dur-Akkorde – bauen, richtig schreiben, auf allen Tönen finden, Hauptdreiklänge, hören. */

(() => {
  // Grundtöne der zwölf Dur-Dreiklänge, geschrieben wie die gebräuchliche Tonart.
  const ROOT_OF_PC = ['C', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'];
  const dur = (name, o = 4) => T.chord(n(name, o), 'maj');
  const durOfPc = p => dur(ROOT_OF_PC[mod(p, 12)]);
  const chainOf = (from, count) => Array.from({ length: count + 1 }, (_, k) => T.pcName(from + k)).join(' → ');
  const listJoin = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const COMMON = ['Cis', 'Des', 'Dis', 'Es', 'Fis', 'Ges', 'Gis', 'As', 'Ais', 'B'];

  /* ---------- Kadenz in C-Dur, mit Bass und kurzen Wegen in den Oberstimmen ---------- */
  const CAD = {
    T: { name: 'Tonika', chord: 'C-Dur', midis: [48, 64, 67, 72], upper: 'E4 G4 C5' },
    S: { name: 'Subdominante', chord: 'F-Dur', midis: [53, 65, 69, 72], upper: 'F4 A4 C5' },
    D: { name: 'Dominante', chord: 'G-Dur', midis: [55, 62, 67, 71], upper: 'D4 G4 H4' },
  };
  const playCadence = (order, shift = 0) => order.forEach((f, i) =>
    Sound.chord(CAD[f].midis.map(m => m + shift), { when: i * 0.9, dur: i === order.length - 1 ? 2.2 : 1 }));

  /* ---------- Tonleiter und Hauptstufen ---------- */
  const KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'B', 'Es'];
  const SEMIS = [0, 2, 4, 5, 7, 9, 11];
  const scale = k => SEMIS.map((sm, i) => T.transpose(n(k, 4), i, sm));

  /* ---------- Oktavkreis mit Dur-Dreieck ---------- */
  // Jeder Tipp spielt den Dur-Dreiklang auf diesem Ton und zeichnet sein Dreieck.
  function durCircle(onChord) {
    let poly = null;
    const c = PitchCircle({
      sound: false,
      onTap: p => {
        const pcs = durOfPc(p).map(T.pc);
        for (let q = 0; q < 12; q++) c.dot(q, 'f2', pcs.includes(q));
        if (poly) poly.remove();
        poly = c.poly(pcs, 'f2');
        Sound.chord(T.chordMidis(60 + p, 'maj'), { arp: 0.07 });
        if (onChord) onChord(p);
      },
    });
    poly = c.poly([0, 4, 7], 'f2', false);
    [0, 4, 7].forEach(p => c.dot(p, 'f2'));
    return c;
  }

  function visual() {
    return { label: 'Oktavkreis · zum Anhören antippen', foot: 'Jeder Dur-Dreiklang hat dieselbe Form', el: durCircle().el };
  }

  /* ---------- Kapitel 1: Intervalle ---------- */
  function intervalKeys(semis, ivName, roots) {
    const r = pick(roots);
    const target = r.m + semis;
    const nm = T.name(T.transpose(n(r.root, 4), semis === 4 ? 2 : 4, semis));
    return Steps.keys({
      prompt: `Spiele die **${ivName}** über dem markierten **${r.root}**.`,
      from: 60, to: 76, marks: [[r.m, 'mk-ref', r.root]],
      check: sel => {
        const d = sel[0] - r.m;
        if (d === semis) return { ok: true };
        return { ok: false, msg: d <= 0 ? `Die ${ivName} liegt über dem ${r.root}, also weiter rechts.` : `Das sind ${d} ${d === 1 ? 'Halbton' : 'Halbtöne'}. Gesucht sind ${semis}.` };
      },
      solution: [target],
      explain: semis === 4
        ? `${r.root} – ${nm}: vier Halbtöne (${chainOf(r.m, semis)}).`
        : `${r.root} – ${nm}: sieben Halbtöne, also eine große Terz (4) plus eine kleine Terz (3).`,
    });
  }

  // Grundtöne mit Schreibweise, damit das Intervall richtig benannt wird (E – Gis, nicht E – As).
  const EAR_ROOTS = [['G', 55], ['As', 56], ['A', 57], ['B', 58], ['H', 59], ['C', 60], ['Des', 61], ['D', 62], ['Es', 63], ['E', 64]];
  function terzOderQuinte() {
    const quinte = Math.random() < 0.5;
    const [rn, r] = pick(EAR_ROOTS);
    const top = T.name(T.transpose(n(rn, 4), quinte ? 4 : 2, quinte ? 7 : 4));
    const play = () => Sound.chord([r, r + (quinte ? 7 : 4)], { arp: 0.4 });
    return Steps.mc({
      prompt: 'Hör genau hin. Ist das eine große Terz oder eine Quinte?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Anhören', play), PlayBtn('Zusammen', () => Sound.chord([r, r + (quinte ? 7 : 4)]), { variant: 'quiet' })));
        api.later(play, 350);
      },
      options: ['große Terz', 'Quinte'], keepOrder: true,
      answer: quinte ? 'Quinte' : 'große Terz',
      explain: quinte
        ? `${rn} – ${top}: sieben Halbtöne, eine **Quinte**. Sie klingt leer und offen.`
        : `${rn} – ${top}: vier Halbtöne, eine **große Terz**. Sie klingt voll und hell.`,
      wrong: 'Die Quinte ist fast doppelt so weit wie die große Terz. Klingt der Abstand eher hell und voll oder leer und offen?',
    });
  }

  /* ---------- Kapitel 2: Dreiklang bauen ---------- */
  // Taste antippen: ihr Dur-Dreiklang leuchtet. Ziel: alle Dur-Dreiklänge nur aus weißen Tasten.
  function whiteTriads(el, done) {
    const goal = [0, 5, 7];
    const found = new Set();
    let finished = false;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe eine Taste. Ihr Dur-Dreiklang leuchtet auf.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...goal.map(p =>
      h('span', { class: 'chip' + (found.has(p) ? ' is-on' : '') }, found.has(p) ? ROOT_OF_PC[p] + '-Dur' : '?')));
    const kb = Keyboard({
      from: 60, to: 83, labels: 'white',
      onPress: key => {
        const m = key + 7 > 83 ? key - 12 : key;
        const p = mod(m, 12);
        const ch = durOfPc(p);
        const ms = [m, m + 4, m + 7];
        kb.clearMarks();
        ms.forEach((x, i) => kb.mark(x, i === 0 ? 'mk-ref' : 'mk-sel', T.name(ch[i])));
        Sound.chord(ms, { arp: 0.06 });
        const blacks = ms.map((x, i) => (isBlackKey(x) ? T.name(ch[i]) : null)).filter(Boolean);
        const head = `**${T.durName(ch[0])}**: ${T.join(ch)}.`;
        if (blacks.length) {
          read.innerHTML = inline(`${head} ${listJoin(blacks)} ${blacks.length === 1 ? 'ist eine schwarze Taste' : 'sind schwarze Tasten'}.`);
          return;
        }
        found.add(p);
        paintChips();
        read.innerHTML = inline(`${head} Nur weiße Tasten. ${found.size < goal.length ? `Noch ${goal.length - found.size} zu finden.` : ''}`);
        if (found.size === goal.length && !finished) {
          finished = true;
          done('**C-Dur, F-Dur und G-Dur** kommen ganz ohne schwarze Tasten aus. Merk sie dir: In Kapitel 5 triffst du sie als Hauptdreiklänge wieder.');
        }
      },
    });
    paintChips();
    el.append(kbWrap(kb.el), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefunden'), chips));
  }

  const BUILD = [
    { root: 'D', m: 62 }, { root: 'E', m: 64 }, { root: 'A', m: 69 }, { root: 'B', m: 70 }, { root: 'Es', m: 63 },
  ];
  function buildDur(r) {
    const ch = dur(r.root);
    return Steps.keys({
      prompt: `Baue **${T.durName(ch[0])}** auf dem markierten **${r.root}**.`,
      from: 60, to: 79, max: 3, marks: [[r.m, 'mk-ref', r.root]],
      check: pcSetCheck(ch.map(T.pc), `Von ${r.root} aus: erst eine große Terz (4 Halbtöne), dann eine kleine Terz (3).`),
      solution: [r.m, r.m + 4, r.m + 7],
      explain: `${T.join(ch)}: ${r.root} – ${T.name(ch[1])} ist eine große Terz, ${T.name(ch[1])} – ${T.name(ch[2])} eine kleine.`,
    });
  }

  function whichDur() {
    const r = pick(['C', 'D', 'G']);
    const root = n(r, 4);
    const nm = t => T.join(T.chord(root, t));
    const min = T.chord(root, 'min'), aug = T.chord(root, 'aug');
    return Steps.mc({
      prompt: 'Welcher dieser Dreiklänge ist ein **Dur-Dreiklang**?',
      options: [
        nm('maj'),
        { t: nm('min'), why: `${r} – ${T.name(min[1])} ist nur eine kleine Terz mit 3 Halbtönen. Dur beginnt unten mit einer großen Terz.` },
        { t: nm('aug'), why: `Unten stimmt die große Terz, aber ${T.name(aug[1])} – ${T.name(aug[2])} ist auch groß. Oben braucht Dur eine kleine Terz.` },
        { t: nm('dim'), why: 'Hier sind beide Terzen klein. Dur braucht unten eine große Terz.' },
      ],
      answer: nm('maj'),
      explain: `${nm('maj')}: unten eine große Terz, oben eine kleine. 4 + 3 Halbtöne.`,
    });
  }

  /* ---------- Kapitel 3: Schreibweise ---------- */
  // Terz- und Quintfragen mit Fallen: gleicher Klang auf falschem Notennamen.
  const PART_Q = [
    { root: 'A', part: 'Terz', ans: 'Cis', letter: 'C', trap: 'Des', w: [['C', 'A – C ist nur eine kleine Terz mit 3 Halbtönen.'], ['D', 'A – D ist eine Quarte, ein Notenname zu weit.']] },
    { root: 'E', part: 'Terz', ans: 'Gis', letter: 'G', trap: 'As', w: [['G', 'E – G ist nur eine kleine Terz mit 3 Halbtönen.'], ['A', 'E – A ist eine Quarte, ein Notenname zu weit.']] },
    { root: 'H', part: 'Terz', ans: 'Dis', letter: 'D', trap: 'Es', w: [['D', 'H – D ist nur eine kleine Terz mit 3 Halbtönen.'], ['E', 'H – E ist eine Quarte, ein Notenname zu weit.']] },
    { root: 'Fis', part: 'Terz', ans: 'Ais', letter: 'A', trap: 'B', w: [['A', 'Fis – A ist nur eine kleine Terz mit 3 Halbtönen.'], ['H', 'Fis – H ist eine Quarte, ein Notenname zu weit.']] },
    { root: 'Des', part: 'Quinte', ans: 'As', letter: 'A', trap: 'Gis', w: [['A', 'Des – A hat 8 Halbtöne, eine übermäßige Quinte. Die reine Quinte hat 7.'], ['G', 'Des – G hat nur 6 Halbtöne.']] },
    { root: 'As', part: 'Quinte', ans: 'Es', letter: 'E', trap: 'Dis', w: [['E', 'As – E hat 8 Halbtöne, eine übermäßige Quinte. Die reine Quinte hat 7.'], ['D', 'As – D hat nur 6 Halbtöne.']] },
    { root: 'Es', part: 'Quinte', ans: 'B', letter: 'H', trap: 'Ais', w: [['H', 'Es – H hat 8 Halbtöne, eine übermäßige Quinte. Die reine Quinte hat 7.'], ['A', 'Es – A hat nur 6 Halbtöne.']] },
  ];
  function partQuestion(q) {
    const ch = dur(q.root);
    const skip = q.part === 'Terz' ? 'einen Notennamen' : 'zweimal einen Notennamen';
    return Steps.mc({
      prompt: `Wie heißt die **${q.part}** von **${q.root}-Dur**?`,
      options: [
        q.ans,
        { t: q.trap, why: `${q.trap} klingt richtig, steht aber auf dem falschen Notennamen. Die ${q.part} über ${q.root} muss ein ${q.letter} sein, passend verändert.` },
        ...q.w.map(([t, why]) => ({ t, why })),
      ],
      answer: q.ans,
      explain: `${q.root}-Dur heißt ${T.join(ch)}. Jede Terz überspringt einen Notennamen, die ${q.part} überspringt ${skip}: Deshalb ${q.ans}, nicht ${q.trap}.`,
    });
  }

  const READ = ['E', 'H', 'Des', 'As', 'Fis', 'Es', 'B', 'A', 'D'];
  const PARTNER = { E: 'Es', Es: 'E', A: 'As', As: 'A', D: 'Des', Des: 'D', H: 'B', B: 'H', Fis: 'F' };
  function readDur() {
    const r = pick(READ);
    const ch = dur(r);
    const ans = T.durName(ch[0]);
    const rest = shuffle(READ.filter(x => x !== r && x !== PARTNER[r])).slice(0, 2);
    return Steps.mc({
      prompt: 'Welcher Dur-Dreiklang steht hier?',
      media: el => {
        const st = Staff({ width: 220 });
        st.render([ch], { labels: false });
        el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord(midisOf(ch), { arp: 0.08 }))));
      },
      options: [ans, ...[PARTNER[r], ...rest].map(x => x + '-Dur')],
      answer: ans,
      explain: `${T.join(ch)}: Der unterste Ton ${r} ist der Grundton, darüber liegen eine große und eine kleine Terz.`,
      wrong: 'Der unterste Ton ist der Grundton. Achte genau auf sein Vorzeichen.',
    });
  }

  const PICKS = [
    { q: 'die **Terz** von **F-Dur**', t: 'A4', where: 'A liegt im zweiten Zwischenraum von unten. F – A ist eine große Terz.' },
    { q: 'die **Quinte** von **D-Dur**', t: 'A4', where: 'A liegt im zweiten Zwischenraum von unten. D – Fis – A: A ist die Quinte.' },
    { q: 'die **Terz** von **C-Dur**', t: 'E4', where: 'E liegt auf der untersten Linie. C – E ist eine große Terz.' },
    { q: 'die **Quinte** von **F-Dur**', t: 'C5', where: 'C liegt im dritten Zwischenraum. F – A – C: C ist die Quinte.' },
    { q: 'den **Grundton** von **G-Dur**', t: 'G4', where: 'G liegt auf der zweiten Linie, um sie kringelt sich der Violinschlüssel.' },
    { q: 'die **Quinte** von **A-Dur**', t: 'E5', where: 'E liegt im obersten Zwischenraum. A – Cis – E: E ist die Quinte.' },
  ];
  function pickPart() {
    const p = pick(PICKS);
    return Steps.pick({
      prompt: `Setze ${p.q} in die Notenzeile, zwischen die fünf Linien (ohne Hilfslinien).`,
      target: p.t,
      explain: p.where,
    });
  }

  /* ---------- Kapitel 4: Dur auf allen Tönen ---------- */
  // Grundtöne im Kreis antippen, bis alle drei Dur-Dreiklänge mit E gefunden sind.
  function triadsWithE(el, done) {
    const target = 4;
    const found = [];
    let finished = false;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe im Kreis auf einen Grundton.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...[0, 1, 2].map(i =>
      h('span', { class: 'chip' + (found[i] != null ? ' is-on' : '') }, found[i] != null ? ROOT_OF_PC[found[i]] + '-Dur' : '?')));
    const c = durCircle(p => {
      const ch = durOfPc(p);
      const role = ch.map(T.pc).indexOf(target);
      const head = `**${T.durName(ch[0])}**: ${T.join(ch)}.`;
      if (role < 0) {
        read.innerHTML = inline(`${head} Kein E dabei.`);
        return;
      }
      if (!found.includes(p)) found.push(p);
      paintChips();
      read.innerHTML = inline(`${head} E ist hier ${['der Grundton', 'die Terz', 'die Quinte'][role]}.`);
      if (found.length === 3 && !finished) {
        finished = true;
        done('E steckt in **C-Dur** als Terz, in **E-Dur** als Grundton und in **A-Dur** als Quinte. So gehört jeder Ton zu genau drei Dur-Dreiklängen.');
      }
    });
    c.dot(target, 'is-target');
    paintChips();
    el.append(h('div', { class: 'explore' },
      h('div', { class: 'circle-box' }, c.el),
      h('div', { class: 'explore-side' }, read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Dreiklänge mit E'), chips))));
  }

  const CONTAINS = [
    {
      note: 'G', ans: 'C-Dur, G-Dur und Es-Dur', explain: 'G ist die Quinte von C-Dur (C – E – G), der Grundton von G-Dur (G – H – D) und die Terz von Es-Dur (Es – G – B).',
      w: [['C-Dur, G-Dur und D-Dur', 'D-Dur ist D – Fis – A, da ist kein G dabei.'],
        ['G-Dur, H-Dur und E-Dur', 'H-Dur (H – Dis – Fis) und E-Dur (E – Gis – H) enthalten kein G.'],
        ['C-Dur, E-Dur und G-Dur', 'E-Dur hat Gis, nicht G.']],
    },
    {
      note: 'D', ans: 'G-Dur, D-Dur und B-Dur', explain: 'D ist die Quinte von G-Dur (G – H – D), der Grundton von D-Dur (D – Fis – A) und die Terz von B-Dur (B – D – F).',
      w: [['G-Dur, D-Dur und A-Dur', 'A-Dur ist A – Cis – E, da ist kein D dabei.'],
        ['D-Dur, Fis-Dur und H-Dur', 'Fis-Dur (Fis – Ais – Cis) und H-Dur (H – Dis – Fis) enthalten kein D.'],
        ['G-Dur, D-Dur und H-Dur', 'H-Dur hat Dis, nicht D.']],
    },
    {
      note: 'A', ans: 'D-Dur, A-Dur und F-Dur', explain: 'A ist die Quinte von D-Dur (D – Fis – A), der Grundton von A-Dur (A – Cis – E) und die Terz von F-Dur (F – A – C).',
      w: [['D-Dur, A-Dur und E-Dur', 'E-Dur ist E – Gis – H, da ist kein A dabei.'],
        ['A-Dur, Des-Dur und Fis-Dur', 'Des-Dur (Des – F – As) und Fis-Dur (Fis – Ais – Cis) enthalten kein A.'],
        ['D-Dur, A-Dur und Fis-Dur', 'Fis-Dur hat Ais, nicht A.']],
    },
  ];
  function containsQuestion() {
    const q = pick(CONTAINS);
    return Steps.mc({
      prompt: `Welche Dur-Dreiklänge enthalten den Ton **${q.note}**?`,
      options: [q.ans, ...q.w.map(([t, why]) => ({ t, why }))],
      answer: q.ans,
      explain: q.explain,
    });
  }

  const FIFTH_OF = [
    { note: 'H', ans: 'E-Dur', ch: 'E – Gis – H', root: 'H-Dur', third: ['G-Dur', 'G – H – D'], other: ['Fis-Dur', 'Fis – Ais – Cis'] },
    { note: 'D', ans: 'G-Dur', ch: 'G – H – D', root: 'D-Dur', third: ['B-Dur', 'B – D – F'], other: ['A-Dur', 'A – Cis – E'] },
    { note: 'C', ans: 'F-Dur', ch: 'F – A – C', root: 'C-Dur', third: ['As-Dur', 'As – C – Es'], other: ['G-Dur', 'G – H – D'] },
    { note: 'A', ans: 'D-Dur', ch: 'D – Fis – A', root: 'A-Dur', third: ['F-Dur', 'F – A – C'], other: ['E-Dur', 'E – Gis – H'] },
    { note: 'E', ans: 'A-Dur', ch: 'A – Cis – E', root: 'E-Dur', third: ['C-Dur', 'C – E – G'], other: ['H-Dur', 'H – Dis – Fis'] },
  ];
  function fifthQuestion() {
    const q = pick(FIFTH_OF);
    return Steps.mc({
      prompt: `In welchem Dur-Dreiklang ist **${q.note}** die **Quinte**?`,
      options: [
        q.ans,
        { t: q.root, why: `In ${q.root} ist ${q.note} der Grundton.` },
        { t: q.third[0], why: `${q.third[0]} ist ${q.third[1]}: Dort ist ${q.note} die Terz.` },
        { t: q.other[0], why: `${q.other[0]} ist ${q.other[1]}, ohne ${q.note}.` },
      ],
      answer: q.ans,
      explain: `${q.ans} ist ${q.ch}: ${q.note} liegt eine Quinte, also 7 Halbtöne, über dem Grundton.`,
    });
  }

  const OTHER_ROOTS = [{ root: 'As', m: 68 }, { root: 'Des', m: 61 }, { root: 'Es', m: 63 }, { root: 'H', m: 71 }];

  /* ---------- Kapitel 5: Hauptdreiklänge ---------- */
  // Knöpfe T, S, D bilden eine Folge. Ziel: die Kadenz T – S – D – T.
  function cadenceBuilder(el, done) {
    const seq = [];
    let finished = false;
    const staff = Staff({ width: 300 });
    const row = h('p', { class: 'chain', 'aria-live': 'polite' });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Ziel: T – S – D – T. Tippe die Funktionen nacheinander an.');
    const paint = () => {
      const last = seq.slice(-4);
      staff.render(last.map(f => T.notes(CAD[f].upper)), { labels: false, captions: last, hl: last.length - 1 });
      row.textContent = seq.length ? seq.slice(-8).join(' – ') : '–';
    };
    const btn = f => h('button', {
      type: 'button', class: 'btn btn--outline',
      onclick: () => {
        seq.push(f);
        Sound.chord(CAD[f].midis, { dur: 1.4 });
        paint();
        if (!finished && seq.slice(-4).join('') === 'TSDT') {
          finished = true;
          read.innerHTML = inline('**T – S – D – T.** Angekommen.');
          done('T – S – D – T: Die **Kadenz** führt von der Ruhe der Tonika über die Subdominante zur Spannung der Dominante und zurück nach Hause.');
        } else if (!finished) {
          read.innerHTML = inline(`**${CAD[f].name}** (${CAD[f].chord}). Ziel: T – S – D – T.`);
        }
      },
    }, f, h('small', {}, CAD[f].chord));
    const reset = h('button', { type: 'button', class: 'link-btn', onclick: () => { seq.length = 0; paint(); } }, 'Von vorn');
    paint();
    el.append(staff.el, row, btnRow(btn('T'), btn('S'), btn('D'), reset), read);
  }

  function funcQuestion(k, fn) {
    const sc = scale(k);
    const deg = fn === 'S' ? 3 : 4;
    const ans = T.durName(sc[deg]);
    const label = fn === 'S' ? 'Subdominante' : 'Dominante';
    return Steps.mc({
      prompt: `Welcher Dreiklang ist die **${label}** von **${k}-Dur**?`,
      options: [
        ans,
        { t: T.durName(sc[fn === 'S' ? 4 : 3]), why: `Das ist die ${fn === 'S' ? 'Dominante auf der 5.' : 'Subdominante auf der 4.'} Stufe.` },
        { t: T.durName(sc[0]), why: 'Das ist die Tonika selbst, die 1. Stufe.' },
        { t: T.durName(sc[5]), why: `${T.name(sc[5])} liegt auf der 6. Stufe. Gesucht ist die ${deg + 1}. Stufe.` },
      ],
      answer: ans,
      explain: `Zähl die Tonleiter von ${k} aus: ${sc.slice(0, deg + 1).map((x, i) => `${T.name(x)} (${i + 1})`).join(' – ')}. Auf der ${deg + 1}. Stufe steht **${ans}**: ${T.join(dur(T.name(sc[deg])))}.`,
    });
  }

  const DOM = [
    { k: 'C', m: 60, sol: [67, 71, 74] },
    { k: 'F', m: 65, sol: [60, 64, 67] },
    { k: 'G', m: 67, sol: [62, 66, 69] },
  ];
  function dominantKeys() {
    const d = pick(DOM);
    const sc = scale(d.k);
    const ch = dur(T.name(sc[4]));
    return Steps.keys({
      prompt: `Spiele die **Dominante** von **${d.k}-Dur**. Das markierte ${d.k} hilft dir beim Zählen.`,
      from: 60, to: 79, max: 3, marks: [[d.m, 'mk-ref', d.k]],
      check: pcSetCheck(ch.map(T.pc), `Die Dominante steht auf der 5. Stufe von ${d.k}-Dur. Baue dort einen Dur-Dreiklang.`),
      solution: d.sol,
      explain: `${sc.map(T.name).slice(0, 5).join(' – ')}: Die 5. Stufe ist ${T.name(sc[4])}. Die Dominante heißt **${T.durName(sc[4])}**: ${T.join(ch)}.`,
    });
  }

  /* ---------- Kapitel 6: Hören ---------- */
  const NOT_DUR = {
    min: 'Die Terz liegt einen Halbton tiefer, der Klang wirkt trüber.',
    dim: 'Beide Terzen sind klein, der Klang ist eng und gespannt.',
    aug: 'Beide Terzen sind groß, der Klang schwebt und will weiter.',
  };
  function durOrNot(no, type) {
    const midis = T.chordMidis(randInt(52, 62), type);
    const block = () => Sound.chord(midis);
    const broken = () => Sound.chord(midis, { arp: 0.2 });
    return Steps.mc({
      title: `Hörprobe ${no}`,
      prompt: 'Ist das ein Dur-Dreiklang?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Nochmal hören', block), PlayBtn('Gebrochen', broken, { variant: 'quiet' })));
        api.later(block, 350);
      },
      options: ['Dur', 'nicht Dur'], keepOrder: true,
      answer: type === 'maj' ? 'Dur' : 'nicht Dur',
      explain: type === 'maj'
        ? 'Das war **Dur**: große Terz unten, kleine Terz oben. Hell und stabil.'
        : `Das war ein **${CH[type].name}**, kein Dur. ${NOT_DUR[type]}`,
      wrong: 'Hör noch einmal hin, am besten gebrochen: Klingt der Akkord hell und ruhig?',
    });
  }

  function cadenceEnd() {
    const yes = Math.random() < 0.5;
    const shift = randInt(-3, 4);
    const order = yes ? ['T', 'S', 'D', 'T'] : ['T', 'S', 'T', 'D'];
    const play = () => playCadence(order, shift);
    return Steps.mc({
      title: 'Angekommen?',
      prompt: 'Vier Akkorde. Endet die Folge auf der **Tonika**?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Folge anhören', play)));
        api.later(play, 350);
      },
      options: ['Ja, sie kommt an', 'Nein, sie bleibt offen'], keepOrder: true,
      answer: yes ? 'Ja, sie kommt an' : 'Nein, sie bleibt offen',
      explain: yes
        ? 'Die Folge war T – S – D – T. Der letzte Akkord ist die Tonika: Er klingt nach Ankommen, wie ein Punkt am Satzende.'
        : 'Die Folge war T – S – T – D. Sie endet auf der Dominante und klingt offen, wie ein Komma statt eines Punkts.',
      wrong: 'Hör auf den letzten Akkord: Ruht er, oder will er noch weiter?',
    });
  }

  /* ---------- Blitzrunde ---------- */
  const TERZ_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Es', 'H'];
  function arcTerz() {
    const r = pick(TERZ_ROOTS);
    const root = n(r, 4);
    const ans = T.name(T.transpose(root, 2, 4));
    const trap = T.spellings(mod(T.pc(root) + 4, 12), 1).find(x => x !== ans && COMMON.includes(x));
    return {
      tag: 'Große Terz',
      prompt: `Welcher Ton liegt eine **große Terz** über **${r}**?`,
      options: quizOptions(ans, [trap, T.name(T.transpose(root, 2, 3)), T.name(T.transpose(root, 3, 5))]),
      answer: ans,
    };
  }

  const IS_ROOTS = { maj: ['C', 'D', 'F', 'G', 'A', 'E', 'B', 'Es'], min: ['C', 'D', 'F', 'G', 'A'], aug: ['C', 'D', 'F', 'G'], dim: ['C', 'D', 'G', 'A'] };
  function arcIsDur() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'maj' : pick(['min', 'aug', 'dim']);
    const ch = T.chord(n(pick(IS_ROOTS[type]), 4), type);
    return {
      tag: 'Dur?',
      prompt: `Ist **${T.join(ch)}** ein Dur-Dreiklang?`,
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  function arcSchreib() {
    const q = pick(PART_Q);
    return {
      tag: 'Schreibweise',
      prompt: `Wie heißt die **${q.part}** von **${q.root}-Dur**?`,
      options: quizOptions(q.ans, [q.trap, ...q.w.map(w => w[0])]),
      answer: q.ans,
    };
  }

  function arcFunk() {
    const k = pick(KEYS);
    const fn = pick(['S', 'D']);
    const sc = scale(k);
    const ans = T.durName(sc[fn === 'S' ? 3 : 4]);
    return {
      tag: fn === 'S' ? 'Subdominante' : 'Dominante',
      prompt: `Wie heißt die **${fn === 'S' ? 'Subdominante' : 'Dominante'}** von **${k}-Dur**?`,
      options: quizOptions(ans, [T.durName(sc[fn === 'S' ? 4 : 3]), T.durName(sc[0]), T.durName(sc[5])]),
      answer: ans,
    };
  }

  function arcOhr() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'maj' : pick(['min', 'dim', 'aug']);
    const root = randInt(50, 60);
    return {
      tag: 'Hörprobe',
      prompt: 'Hörst du einen Dur-Dreiklang?',
      key: type + root,
      play: T.chordMidis(root, type),
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  defineCourse({
    id: 'dur',
    short: 'Dur-Akkorde',
    title: ['Dur-', 'Akkorde'],
    topic: 'Harmonielehre',
    sub: 'Große Terz unten, kleine Terz oben: der helle Grundklang',
    lead: 'Große Terz unten, kleine Terz oben: der hellste Klang der Harmonik. Du baust Dur-Dreiklänge auf jedem Ton, schreibst sie richtig, findest Tonika, Subdominante und Dominante und erkennst Dur am Klang.',
    visual,
    badge: { id: 'dur-kurs', glyph: '♯', name: 'Durchblick', desc: 'Den Kurs zu den Dur-Akkorden abgeschlossen.' },
    arcade: [
      { id: 'dur-terz', name: 'Große Terz', gen: arcTerz, needs: 'dur-intervalle' },
      { id: 'dur-ist', name: 'Dur oder nicht', gen: arcIsDur, needs: 'dur-aufbau' },
      { id: 'dur-schreib', name: 'Dur richtig schreiben', gen: arcSchreib, needs: 'dur-schreibweise' },
      { id: 'dur-funktion', name: 'Dominante und Subdominante', gen: arcFunk, needs: 'dur-hauptstufen' },
      { id: 'dur-ohr', name: 'Hörprobe Dur', gen: arcOhr, needs: 'dur-hoeren' },
    ],
    levels: [
      {
        id: 'dur-intervalle',
        title: 'Große Terz und Quinte',
        sub: 'Die Bausteine des Dreiklangs',
        takeaway: 'Eine **große Terz** hat 4 Halbtöne, eine **reine Quinte** 7. Die Quinte setzt sich aus großer und kleiner Terz zusammen: 4 + 3 = 7.',
        steps: () => [
          Steps.info({
            title: 'Zwei Abstände, ein Akkord',
            text: 'Jeder Dur-Dreiklang steht auf zwei Abständen über seinem Grundton:\n\n**große Terz:** 4 Halbtöne, zum Beispiel C – E\n**reine Quinte:** 7 Halbtöne, zum Beispiel C – G\n\nZwischen E und G liegt eine **kleine Terz** mit 3 Halbtönen. Große Terz plus kleine Terz ergibt also die Quinte.',
            media: el => {
              const kb = Keyboard({ from: 60, to: 72, labels: 'white' });
              kb.mark(60, 'mk-ref', 'C');
              kb.mark(64, 'mk-sel', 'E');
              kb.mark(67, 'mk-sel', 'G');
              el.append(kbWrap(kb.el), btnRow(
                PlayBtn('C – E · große Terz', () => Sound.chord([60, 64], { arp: 0.4 })),
                PlayBtn('C – G · Quinte', () => Sound.chord([60, 67], { arp: 0.4 }))));
            },
          }),
          Steps.task({
            title: 'Zähl mit',
            text: 'Tippe zwei Tasten nacheinander an. Die Halbtonschritte dazwischen werden durchnummeriert.\n\nFinde zwei Tasten, die genau **4 Halbtöne** auseinanderliegen.',
            mount: semitoneFinder(4, 'große Terz'),
          }),
          Steps.mc({
            prompt: 'Eine große Terz hat 4 Halbtöne, eine kleine Terz 3. Wie viele Halbtöne hat die **reine Quinte**, wenn beide Terzen übereinanderliegen?',
            options: ['5', '6', '7', '8'], keepOrder: true, answer: '7',
            explain: '4 + 3 = 7 Halbtöne, zum Beispiel C – E – G: Von C bis G sind es sieben Halbtöne.',
            wrong: 'Addiere die beiden Terzen.',
          }),
          intervalKeys(4, 'große Terz', [{ root: 'C', m: 60 }, { root: 'D', m: 62 }, { root: 'F', m: 65 }, { root: 'G', m: 67 }]),
          intervalKeys(7, 'Quinte', [{ root: 'C', m: 60 }, { root: 'D', m: 62 }, { root: 'E', m: 64 }, { root: 'F', m: 65 }, { root: 'G', m: 67 }]),
          terzOderQuinte(),
        ],
      },
      {
        id: 'dur-aufbau',
        title: 'Den Dur-Dreiklang bauen',
        sub: 'Grundton, Terz, Quinte',
        takeaway: 'Ein Dur-Dreiklang ist **Grundton + große Terz + kleine Terz**, zum Beispiel C – E – G. Das Rezept 4 + 3 funktioniert auf jedem Ton.',
        steps: () => {
          const [b1, b2] = shuffle(BUILD);
          return [
            Steps.info({
              title: 'Drei Töne, zwei Terzen',
              text: 'Ein **Dur-Dreiklang** besteht aus drei Tönen: dem **Grundton**, der **Terz** und der **Quinte**.\n\nVom Grundton geht es eine **große Terz** (4 Halbtöne) nach oben, von dort eine **kleine Terz** (3 Halbtöne). In den Noten sitzen die drei Töne bei der Grundform alle auf Linien oder alle in Zwischenräumen.',
              media: el => {
                const st = Staff({ width: 220 });
                st.render([dur('C')], { captions: ['C-Dur'] });
                const kb = Keyboard({ from: 60, to: 72, labels: 'white' });
                kb.mark(60, 'mk-ref', 'C');
                kb.mark(64, 'mk-sel', 'E');
                kb.mark(67, 'mk-sel', 'G');
                el.append(st.el, kbWrap(kb.el), btnRow(
                  PlayBtn('Zusammen', () => Sound.chord([60, 64, 67])),
                  PlayBtn('Nacheinander', () => Sound.chord([60, 64, 67], { arp: 0.3 }), { variant: 'quiet' })));
              },
            }),
            Steps.task({
              title: 'Dein Akkord-Baukasten',
              text: 'Stapel Terzen auf das C und hör, was entsteht. Der Name des Akkords erscheint live.\n\n**Ziel:** ein Dur-Dreiklang.',
              mount: stackBuilder('4,3', 'C – E – G: unten eine große Terz, oben eine kleine. Das ist der **C-Dur-Dreiklang**.'),
            }),
            buildDur(b1),
            whichDur(),
            Steps.task({
              title: 'Nur weiße Tasten',
              text: 'Tippe eine Taste an. Ihr Dur-Dreiklang leuchtet auf und erklingt.\n\nDie meisten Dur-Dreiklänge brauchen mindestens eine schwarze Taste. **Finde alle, die nur aus weißen Tasten bestehen.**',
              mount: whiteTriads,
            }),
            buildDur(b2),
          ];
        },
      },
      {
        id: 'dur-schreibweise',
        title: 'Richtig schreiben',
        sub: 'Jede Terz überspringt einen Notennamen',
        takeaway: 'Erst die Notennamen im Terzabstand (E – G – H), dann die Vorzeichen anpassen: **E – Gis – H**. So sieht man jedem Dreiklang an, dass er aus Terzen besteht.',
        steps: () => {
          const terz = pick(PART_Q.filter(q => q.part === 'Terz'));
          const quinte = pick(PART_Q.filter(q => q.part === 'Quinte'));
          return [
            Steps.info({
              title: 'Erst die Namen, dann die Vorzeichen',
              text: 'Auf der Klaviatur klingen Gis und As gleich. In den Noten ist aber nur eine Schreibweise richtig.\n\nEine Terz überspringt immer **einen Notennamen**: E – (F) – **G** – (A) – **H**. Die Töne von E-Dur heißen also E, G und H, passend verändert: Für die große Terz wird G zu **Gis**.\n\nE – As – H klingt gleich, ist aber falsch geschrieben: E – As wäre eine verminderte Quarte.',
              media: el => {
                const st = Staff();
                st.render([T.notes('E4 Gis4 H4'), T.notes('E4 As4 H4')], { captions: ['richtig: E – Gis – H', 'falsch: E – As – H'], hl: 0 });
                el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord([64, 68, 71], { arp: 0.12 }))));
              },
            }),
            partQuestion(terz),
            readDur(),
            partQuestion(quinte),
            pickPart(),
          ];
        },
      },
      {
        id: 'dur-tonarten',
        title: 'Dur auf allen Tönen',
        sub: 'Zwölf Dreiklänge, eine Form',
        takeaway: 'Im Oktavkreis hat jeder Dur-Dreiklang **dieselbe Dreiecksform**. Jeder Ton gehört zu genau drei Dur-Dreiklängen: als Grundton, als Terz und als Quinte.',
        steps: () => [
          Steps.info({
            title: 'Ein Dreieck, zwölfmal gedreht',
            text: 'Leg die zwölf Töne wie ein Ziffernblatt im Kreis aus, jeder Schritt ist ein Halbton. C – E – G wird zu einem Dreieck: 4 Schritte, 3 Schritte und 5 Schritte zurück zum C.\n\nTippe auf andere Töne. Das Dreieck dreht sich mit, seine Form bleibt gleich. Im Kreis zählt nur der Klang: Cis und Des sind derselbe Punkt.',
            media: el => el.append(h('div', { class: 'circle-box' }, durCircle().el)),
          }),
          Steps.task({
            title: 'Wo steckt das E?',
            text: 'Das E ist grün markiert. Tippe Grundtöne an, bis du **alle Dur-Dreiklänge gefunden hast, die ein E enthalten**.',
            mount: triadsWithE,
          }),
          containsQuestion(),
          fifthQuestion(),
          (() => {
            const r = pick(OTHER_ROOTS);
            return buildDur(r);
          })(),
        ],
      },
      {
        id: 'dur-hauptstufen',
        title: 'Tonika, Subdominante, Dominante',
        sub: 'Die drei Hauptdreiklänge',
        takeaway: 'Auf der 1., 4. und 5. Stufe einer Dur-Tonleiter stehen Dur-Dreiklänge: **Tonika**, **Subdominante** und **Dominante**. Die Kadenz T – S – D – T führt nach Hause.',
        steps: () => {
          const [k1, k2] = shuffle(KEYS);
          return [
            Steps.info({
              title: 'Die drei Hauptdreiklänge',
              text: 'In C-Dur tragen drei Dur-Dreiklänge die Musik:\n\n**Tonika** (1. Stufe): C-Dur, die Ruhe, das Zuhause\n**Subdominante** (4. Stufe): F-Dur, sie führt weg\n**Dominante** (5. Stufe): G-Dur, sie will zurück zur Tonika\n\nTippe auf einen Akkord oder hör dir die ganze **Kadenz** an.',
              media: el => {
                const st = Staff();
                const order = ['T', 'S', 'D'];
                st.render(order.map(f => T.notes(CAD[f].upper)), {
                  labels: false, captions: ['T · C-Dur', 'S · F-Dur', 'D · G-Dur'],
                  onTap: i => Sound.chord(CAD[order[i]].midis, { dur: 1.6 }),
                });
                el.append(st.el, btnRow(PlayBtn('Kadenz T – S – D – T', () => playCadence(['T', 'S', 'D', 'T']))));
              },
            }),
            Steps.task({
              title: 'Kadenz-Baukasten',
              text: 'Jeder Knopf spielt eine Funktion in C-Dur. Probier Folgen aus.\n\n**Ziel:** Spiele die Kadenz **T – S – D – T**.',
              mount: cadenceBuilder,
            }),
            funcQuestion(k1, 'S'),
            funcQuestion(k2, 'D'),
            dominantKeys(),
            Steps.mc({
              prompt: 'Auf welchen Stufen einer Dur-Tonleiter stehen Tonika, Subdominante und Dominante?',
              options: [
                '1, 4 und 5',
                { t: '1, 3 und 5', why: 'Das sind Grundton, Terz und Quinte eines Dreiklangs, nicht die Stufen der Hauptdreiklänge.' },
                { t: '1, 2 und 3', why: 'Auf der 2. und 3. Stufe stehen in Dur keine Dur-Dreiklänge.' },
                { t: '1, 5 und 6', why: 'Die 5. stimmt, aber die Subdominante steht eine Stufe tiefer als die 5.' },
              ],
              answer: '1, 4 und 5',
              explain: 'Tonika auf der 1., Subdominante auf der 4. und Dominante auf der 5. Stufe. In C-Dur: C, F und G.',
            }),
          ];
        },
      },
      {
        id: 'dur-hoeren', ear: true,
        title: 'Dur hören',
        sub: 'Hell, offen, stabil',
        takeaway: 'Dur klingt **hell und stabil**. Klingt ein Dreiklang trüber, enger oder schwebend, ist es kein Dur.',
        steps: () => {
          const types = shuffle(['maj', 'maj', pick(['min', 'dim', 'aug']), pick(['min', 'aug'])]);
          return [
            Steps.info({
              title: 'Wie klingt Dur?',
              text: 'Dur klingt hell, offen und ruhig. Verändert man nur einen Ton, wird der Klang trüber, enger oder schwebend. Diese anderen Dreiklänge lernst du in den nächsten Kursen genauer kennen.\n\nHier zählt nur eine Frage: **Dur oder nicht?** Hör dir alle vier an, alle auf C.',
              gate: true,
              media: earCompare(['maj', 'min', 'dim', 'aug'], 'maj'),
            }),
            ...types.map((t, i) => durOrNot(i + 1, t)),
            oddOneOut({
              title: 'Finde den Dur-Dreiklang',
              prompt: 'Drei Klänge, aber nur einer ist ein Dur-Dreiklang. Welcher?',
              target: 'maj',
              others: ['min', 'dim', 'aug'],
              wrong: 'Hör dir alle drei noch einmal an. Dur klingt am hellsten und ruhigsten.',
            }),
            cadenceEnd(),
          ];
        },
      },
    ],
  });
})();
