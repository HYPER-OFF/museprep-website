'use strict';
/* Kurs: Übermäßige Akkorde – zwei große Terzen, ein Dreieck im Oktavkreis, drei Auflösungsziele. */

(() => {
  const TRIADS = ['maj', 'min', 'dim', 'aug'];
  const SHORT = { maj: 'Dur', min: 'Moll', dim: 'vermindert', aug: 'übermäßig' };
  const BUILD = { maj: 'große Terz + kleine Terz, 4 + 3', min: 'kleine Terz + große Terz, 3 + 4', dim: 'zwei kleine Terzen, 3 + 3', aug: 'zwei große Terzen, 4 + 4' };
  const EAR_TIPS = {
    aug: 'Zwei große Terzen: hell, aber ohne festen Boden. Die Quinte klingt, als wolle sie weiter.',
    maj: 'Große Terz unten, reine Quinte: hell und stabil.',
    min: 'Kleine Terz unten, reine Quinte: weich und dunkler.',
    dim: 'Zwei kleine Terzen: eng, dunkel und gespannt.',
  };
  // Grundtöne, auf denen alle vier Dreiklangsarten höchstens ein Vorzeichen je Ton brauchen (gefiltert je Art).
  const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Es', 'As', 'Des', 'Ges'];
  const simple = ch => ch.every(x => Math.abs(x.a) <= 1);
  const rootsFor = type => ROOTS.filter(r => simple(T.chord(n(r, 4), type)));

  /* ---------- Fragen-Bausteine ---------- */

  // Übermäßige Quinte benennen; Fallen: gleicher Klang als Sexte, reine Quinte, große Sexte.
  const FIFTH_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Es', 'As'];
  function fifthSet(rootName) {
    const r = n(rootName, 4);
    return {
      root: rootName,
      third: T.name(T.transpose(r, 2, 4)),
      fifth: T.name(T.transpose(r, 4, 8)),
      sexte: T.name(T.transpose(r, 5, 8)),
      pure: T.name(T.transpose(r, 4, 7)),
      big6: T.name(T.transpose(r, 5, 9)),
      letter: T.name({ l: T.transpose(r, 4, 8).l, a: 0, o: 4 }),
    };
  }

  function fifthQuestion() {
    const f = fifthSet(pick(FIFTH_ROOTS));
    return Steps.mc({
      prompt: `Wie heißt die übermäßige Quinte über **${f.root}**?`,
      options: [
        f.fifth,
        { t: f.sexte, why: `${f.sexte} klingt gleich, ist aber eine kleine Sexte über ${f.root}. Die Quinte braucht den Notennamen ${f.letter}.` },
        { t: f.pure, why: `${f.pure} ist die reine Quinte mit 7 Halbtönen. Die übermäßige ist einen Halbton größer.` },
        { t: f.big6, why: `${f.root} – ${f.big6} hat 9 Halbtöne und ist eine große Sexte. Gesucht sind 8 Halbtöne.` },
      ],
      answer: f.fifth,
      explain: `${f.root} – ${f.third} – ${f.fifth}. Von ${f.root} bis ${f.letter} zählst du fünf Notennamen, also eine Quinte. Um einen Halbton erhöht hat sie 8 Halbtöne.`,
    });
  }

  // Schreibweisen mit Fallen, alle von Hand geprüft.
  const SPELL_SETS = [
    { root: 'D', right: 'D – Fis – Ais', traps: [
      { t: 'D – Fis – B', why: 'Klingt richtig, aber Fis – B ist eine verminderte Quarte. Der Akkord wäre kein reiner Terzenstapel mehr.' },
      { t: 'D – Ges – Ais', why: 'D – Ges ist eine verminderte Quarte, keine Terz.' },
      { t: 'D – Fis – A', why: 'D – Fis – A ist D-Dur. Die Quinte muss noch einen Halbton höher.' },
    ] },
    { root: 'E', right: 'E – Gis – His', traps: [
      { t: 'E – Gis – C', why: 'Klingt richtig, aber Gis – C ist eine verminderte Quarte. Der Akkord wäre kein reiner Terzenstapel mehr.' },
      { t: 'E – As – C', why: 'E – As ist eine verminderte Quarte, keine Terz.' },
      { t: 'E – Gis – H', why: 'E – Gis – H ist E-Dur. Die Quinte muss noch einen Halbton höher.' },
    ] },
    { root: 'As', right: 'As – C – E', traps: [
      { t: 'As – C – Fes', why: 'Klingt richtig, aber C – Fes ist eine verminderte Quarte. Der Akkord wäre kein reiner Terzenstapel mehr.' },
      { t: 'Gis – C – E', why: 'Gis klingt wie As, aber der Grundton heißt hier As. Außerdem ist Gis – C keine Terz.' },
      { t: 'As – C – Es', why: 'As – C – Es ist As-Dur. Die Quinte muss noch einen Halbton höher.' },
    ] },
    { root: 'F', right: 'F – A – Cis', traps: [
      { t: 'F – A – Des', why: 'Klingt richtig, aber A – Des ist eine verminderte Quarte. Der Akkord wäre kein reiner Terzenstapel mehr.' },
      { t: 'Eis – A – Cis', why: 'Eis klingt wie F, aber Eis – A ist eine verminderte Quarte, keine Terz.' },
      { t: 'F – A – C', why: 'F – A – C ist F-Dur. Die Quinte muss noch einen Halbton höher.' },
    ] },
  ];

  // Akkord im Notenbild bestimmen: Dur, Moll, vermindert oder übermäßig.
  function staffTypeQuestion() {
    const type = pick(['aug', 'aug', 'maj', 'min', 'dim']);
    const ch = T.chord(n(pick(rootsFor(type)), 4), type);
    return Steps.mc({
      prompt: 'Welcher Akkord steht hier?',
      media: el => {
        const st = Staff({ width: 250 });
        st.render([ch]);
        el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord(midisOf(ch), { arp: 0.1 }))));
      },
      options: TRIADS.map(t => CH[t].name),
      keepOrder: true,
      answer: CH[type].name,
      explain: `${T.join(ch)}: ${BUILD[type]}. Also ein **${CH[type].name}**.`,
      wrong: 'Zähl die Halbtöne zwischen den Nachbartönen: vom unteren zum mittleren und vom mittleren zum oberen Ton.',
    });
  }

  // Hörprobe: Dur oder übermäßig?
  function durOrAug() {
    const type = pick(['maj', 'aug']);
    const midis = T.chordMidis(randInt(53, 62), type);
    return Steps.mc({
      prompt: 'Hör genau hin. Ist das ein Dur-Dreiklang oder ein übermäßiger?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Anhören', () => Sound.chord(midis)), PlayBtn('Gebrochen', () => Sound.chord(midis, { arp: 0.22 }), { variant: 'quiet' })));
        api.later(() => Sound.chord(midis), 350);
      },
      options: [CH.maj.name, CH.aug.name],
      keepOrder: true,
      answer: CH[type].name,
      explain: type === 'aug'
        ? 'Das war übermäßig: zwei große Terzen. Die Quinte klingt, als wolle sie weiter.'
        : 'Das war Dur: Die reine Quinte gibt dem Klang festen Boden.',
      wrong: 'Hör auf den obersten Ton: Ruht er (Dur) oder drängt er weiter nach oben (übermäßig)?',
    });
  }

  const earQuestion = (no, type) => chordEar({
    no, type, types: TRIADS, tips: EAR_TIPS,
    wrong: 'Achte auf die Quinte: Klingt sie stabil (Dur, Moll), eng (vermindert) oder zu weit (übermäßig)? Spiel den Akkord ruhig gebrochen.',
  });

  // Drei Klänge, einer ist übermäßig (eigene Fassung wegen der Formulierung „der übermäßige“).
  function findAug() {
    const types = shuffle(['aug', ...shuffle(['maj', 'min', 'dim']).slice(0, 2)]);
    const roots = types.map(() => randInt(52, 58));
    const L = ['A', 'B', 'C'];
    const right = L[types.indexOf('aug')];
    return Steps.mc({
      title: 'Finde den Übermäßigen',
      prompt: 'Drei Klänge, aber nur einer ist ein übermäßiger Dreiklang. Welcher?',
      media: el => el.append(btnRow(types.map((t, i) => PlayBtn('Klang ' + L[i], () => Sound.chord(T.chordMidis(roots[i], t)))))),
      options: L.map(x => 'Klang ' + x),
      keepOrder: true,
      answer: 'Klang ' + right,
      explain: `Klang ${right} war der übermäßige. Die anderen beiden: ${types.filter(t => t !== 'aug').map(t => CH[t].name).join(' und ')}.`,
      wrong: 'Hör dir alle drei noch einmal an. Der übermäßige klingt am weitesten und schwebt.',
    });
  }

  /* ---------- Experimente ---------- */

  // Kapitel 2: Gis und As im Notenbild, gleich im Klang.
  function gisAsCompare(el, api) {
    const st = Staff();
    const pairs = [
      { label: 'C – Gis', notes: [n('C', 4), n('Gis', 4)], cap: 'übermäßige Quinte',
        text: 'Gis steht **auf der zweiten Linie**, dem Platz des G. Von C bis G zählst du fünf Notennamen: C D E F G. Also eine **Quinte**, um einen Halbton erhöht.' },
      { label: 'C – As', notes: [n('C', 4), n('As', 4)], cap: 'kleine Sexte',
        text: 'As steht **im Zwischenraum** über der zweiten Linie, dem Platz des A. Von C bis A zählst du sechs Notennamen. Also eine **Sexte**, und zwar eine kleine.' },
    ];
    const heard = new Set();
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf ein Intervall, um es zu hören.');
    const draw = hl => st.render(pairs.map(p => p.notes), { captions: pairs.map(p => p.cap), hl });
    draw(-1);
    const btns = pairs.map((p, i) => PlayBtn(p.label, () => {
      Sound.chord([60, 68], { arp: 0.45 });
      draw(i);
      heard.add(i);
      read.innerHTML = inline(p.text);
      if (heard.size === 2) api.ready(true);
    }));
    el.append(st.el, btnRow(...btns), read);
  }

  // Kapitel 4: C-Dur → übermäßig → F-Dur, die Quinte steigt G → Gis → A.
  function risingFifth(el, done) {
    const CHORDS = [
      { label: 'C-Dur', notes: T.notes('C4 E4 G4'), move: [], text: 'C – E – G: ein Dur-Dreiklang. Merk dir das G oben.' },
      { label: 'C – E – Gis', notes: T.notes('C4 E4 Gis4'), move: [68], text: 'C – E – Gis: Das G ist einen Halbton gestiegen. Jetzt klingt es übermäßig.' },
      { label: 'F-Dur', notes: T.notes('C4 F4 A4'), move: [65, 69], text: 'C – F – A: Gis steigt weiter zum A, E rückt zum F. F-Dur ist erreicht.' },
    ];
    let next = 0, finished = false;
    const kb = Keyboard({ from: 60, to: 72, labels: 'white' });
    const staff = Staff({ width: 300 });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Beginne mit C-Dur.');
    const draw = hl => staff.render(CHORDS.map(c => c.notes), { captions: ['C-Dur', 'übermäßig', 'F-Dur'], hl });
    draw(-1);
    const btns = CHORDS.map((c, i) => PlayBtn(c.label, () => {
      const ms = midisOf(c.notes);
      Sound.chord(ms, { dur: 1.6 });
      kb.clearMarks();
      c.notes.forEach(x => kb.mark(T.midi(x), c.move.includes(T.midi(x)) ? 'mk-ref' : 'mk-sel', T.name(x)));
      draw(i);
      if (finished) { read.innerHTML = inline(c.text); return; }
      if (i === next) {
        next++;
        read.innerHTML = inline(c.text);
      } else if (i === 0) {
        next = 1;
        read.innerHTML = inline(c.text);
      } else {
        next = 0;
        read.innerHTML = inline('Fang mit **C-Dur** an und spiele die Klänge der Reihe nach.');
      }
      if (next === CHORDS.length) {
        finished = true;
        done('G → Gis → A: Die Quinte steigt in zwei Halbtonschritten. Der übermäßige Dreiklang ist hier ein **Durchgang** zwischen C-Dur und F-Dur.');
      }
    }));
    el.append(staff.el, btnRow(...btns), kbWrap(kb.el), read);
  }

  // Kapitel 5: jeder Ton des Klangs C – E – Gis kann Grundton sein → drei Ziele.
  function augExplorer(el, done, api) {
    const OPTIONS = [
      { pc: 0, chord: 'C4 E4 Gis4', fifth: 'Gis', to: 'A', toPc: 9, target: 'F-Dur', tonic: 'F', res: 'C4 F4 A4' },
      { pc: 4, chord: 'E4 Gis4 His4', fifth: 'His', to: 'Cis', toPc: 1, target: 'A-Dur', tonic: 'A', res: 'E4 A4 Cis5' },
      { pc: 8, chord: 'As3 C4 E4', fifth: 'E', to: 'F', toPc: 5, target: 'Des-Dur', tonic: 'Des', res: 'As3 Des4 F4' },
    ];
    const found = new Set();
    let finished = false;
    const staff = Staff({ width: 250 });
    staff.render([T.notes('C4 E4 Gis4')], { captions: ['C – E – Gis'] });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe im Kreis auf einen der drei farbigen Töne. Er wird zum Grundton.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...OPTIONS.map(o =>
      h('span', { class: 'chip' + (found.has(o.pc) ? ' is-on' : '') }, found.has(o.pc) ? o.target : '?')));
    paintChips();

    const c = PitchCircle({
      sound: false,
      onTap: p => {
        const o = OPTIONS.find(x => x.pc === p);
        if (!o) {
          Sound.piano(60 + p);
          read.innerHTML = inline(`**${T.pcName(p)}** gehört nicht zum Klang. Tippe auf einen der drei farbigen Töne.`);
          return;
        }
        choose(o);
      },
    });
    c.poly([0, 4, 8], 'f2', false);
    [0, 4, 8].forEach(p => c.dot(p, 'f2'));

    function choose(o) {
      const ch = T.notes(o.chord);
      const res = T.notes(o.res);
      c.clearArrows();
      for (let p = 0; p < 12; p++) c.dot(p, 'is-target', false);
      c.arrow(mod(o.toPc - 1, 12), o.toPc);
      c.dot(o.toPc, 'is-target');
      staff.render([ch, res], { captions: [T.join(ch), o.target], hl: 1 });
      read.innerHTML = inline(`Als **${T.join(ch)}** gelesen, ist **${o.fifth}** die übermäßige Quinte. Sie steigt zu **${o.to}**, und der Klang löst sich nach **${o.target}** auf.`);
      Sound.chord(midisOf(ch), { dur: 1.1 });
      api.later(() => Sound.chord(midisOf(res), { dur: 2.2 }), 950);
      found.add(o.pc);
      paintChips();
      if (found.size === OPTIONS.length && !finished) {
        finished = true;
        c.poly([1, 5, 9], 'f1');
        done('Alle drei Ziele gefunden: **F-Dur, A-Dur und Des-Dur**. Ihre Grundtöne F, A und Des bilden im Kreis selbst wieder ein Dreieck.');
      }
    }

    el.append(
      h('div', { class: 'explore' },
        h('div', { class: 'circle-box' }, c.el),
        h('div', { class: 'explore-side' }, staff.el, read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Ziele'), chips))));
  }

  // Kopfbild: vier Dreiecke im Oktavkreis, jedes ein übermäßiger Dreiklang.
  function visual() {
    const fams = [0, 1, 2, 3].map(f => [f, f + 4, f + 8]);
    let polys = [];
    const c = PitchCircle({
      sound: false,
      onTap: p => {
        const f = p % 4;
        Sound.chord([60 + p, 64 + p, 68 + p], { arp: 0.07 });
        polys.forEach((pg, i) => pg.classList.toggle('is-on', i === f));
      },
    });
    polys = fams.map((pcs, f) => c.poly(pcs, `f${f + 1} is-line`, false));
    for (let p = 0; p < 12; p++) c.dot(p, 'f' + (p % 4 + 1));
    return { label: 'Oktavkreis · zum Anhören antippen', foot: 'Vier Dreiecke decken alle zwölf Töne ab', el: c.el };
  }

  /* ---------- Blitzrunde ---------- */
  function complete() {
    const ch = T.chord(n(pick(rootsFor('aug')), 4), 'aug');
    const k = randInt(1, 2);
    const p = T.pc(ch[k]);
    const ans = T.name(ch[k]);
    // Falle: derselbe Klang mit anderem Notennamen (z. B. As statt Gis).
    const trap = T.spellings(p, 1).find(x => x !== ans);
    return {
      tag: 'Ergänzen',
      prompt: `Ergänze den übermäßigen Dreiklang: ${ch.map((x, i) => (i === k ? '**?**' : T.name(x))).join(' – ')}`,
      options: quizOptions(ans, [trap, T.pcName(p - 1), T.pcName(p + 1), T.pcName(p + 2)]),
      answer: ans,
    };
  }

  function fifth() {
    const f = fifthSet(pick(FIFTH_ROOTS));
    return {
      tag: 'Quinte',
      prompt: `Wie heißt die übermäßige Quinte über **${f.root}**?`,
      options: shuffle([f.fifth, f.sexte, f.pure, f.big6]),
      answer: f.fifth,
    };
  }

  function triadType() {
    const type = pick(['aug', 'aug', 'maj', 'min', 'dim']);
    const ch = T.chord(n(pick(rootsFor(type)), 4), type);
    return {
      tag: 'Akkordart',
      prompt: `Welche Art von Dreiklang ist **${T.join(ch)}**?`,
      options: TRIADS.map(t => SHORT[t]),
      answer: SHORT[type],
    };
  }

  // Auflösungsziel: die übermäßige Quinte steigt, Ziel ist der Dur-Dreiklang eine Quarte über dem Grundton.
  const GOAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Es', 'As', 'Des'];
  const plainName = x => Math.abs(x.a) <= 1 && !['Eis', 'His', 'Fes', 'Ces'].includes(T.name(x));
  function goal() {
    const root = n(pick(GOAL_ROOTS), 4);
    const ch = T.chord(root, 'aug');
    const ans = T.durName(T.transpose(root, 3, 5));
    const cands = [root, T.transpose(ch[1], 3, 5), T.transpose(ch[2], 3, 5), T.transpose(root, 4, 7)]
      .filter(plainName).map(T.durName);
    return {
      tag: 'Auflösung',
      prompt: `**${T.name(ch[2])}** ist die übermäßige Quinte in ${T.join(ch)}. Wohin löst sich der Akkord auf?`,
      options: quizOptions(ans, cands),
      answer: ans,
    };
  }

  function ear() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'aug' : pick(['maj', 'min', 'dim']);
    const root = randInt(50, 60);
    return {
      tag: 'Hörprobe',
      prompt: 'Hörst du einen übermäßigen Dreiklang?',
      key: type + root,
      play: T.chordMidis(root, type),
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  defineCourse({
    id: 'uebermaessig',
    short: 'Übermäßige Akkorde',
    title: ['Übermäßige ', 'Akkorde'],
    topic: 'Harmonielehre',
    sub: 'Zwei große Terzen, ein Dreieck, drei Ziele',
    lead: 'Zwei große Terzen übereinander: ein Klang ohne Boden, schwebend und offen. Du baust den übermäßigen Dreiklang, entdeckst sein Dreieck im Oktavkreis und lernst, wohin er führt.',
    visual,
    badge: { id: 'ueb-kurs', glyph: '+', name: 'Dreiecksbeziehung', desc: 'Den Kurs zu übermäßigen Akkorden abgeschlossen.' },
    arcade: [
      { id: 'ueb-complete', name: 'Übermäßig ergänzen', gen: complete, needs: 'ueb-terzen' },
      { id: 'ueb-fifth', name: 'Übermäßige Quinte', gen: fifth, needs: 'ueb-schreibweise' },
      { id: 'ueb-type', name: 'Dreiklangsart', gen: triadType, needs: 'ueb-dreieck' },
      { id: 'ueb-goal', name: 'Auflösungsziel', gen: goal, needs: 'ueb-umdeutung' },
      { id: 'ueb-ear', name: 'Hörprobe übermäßig', gen: ear, needs: 'ueb-hoeren' },
    ],
    levels: [
      {
        id: 'ueb-terzen',
        title: 'Zwei große Terzen',
        sub: 'Die erhöhte Quinte',
        takeaway: 'Zwei **große Terzen** übereinander ergeben den übermäßigen Dreiklang. Gegenüber Dur ist nur die **Quinte** um einen Halbton erhöht: C – E – Gis.',
        steps: () => [
          Steps.info({
            title: 'Aus Dur wird übermäßig',
            text: 'Ein Dur-Dreiklang besteht aus einer großen und einer kleinen Terz: **4 + 3** Halbtöne, zum Beispiel C – E – G.\n\nErhöhst du die Quinte um einen Halbton, wird aus G ein **Gis**. Jetzt liegen zwei große Terzen übereinander: **4 + 4**. Das ist der **übermäßige Dreiklang**.',
            media: el => {
              const st = Staff();
              st.render([T.notes('C4 E4 G4'), T.notes('C4 E4 Gis4')], { captions: ['C-Dur', 'übermäßig'] });
              el.append(st.el, btnRow(
                PlayBtn('C-Dur', () => Sound.chord([60, 64, 67], { arp: 0.06 })),
                PlayBtn('C – E – Gis', () => Sound.chord([60, 64, 68], { arp: 0.06 }))));
            },
          }),
          Steps.task({
            title: 'Dein Akkord-Baukasten',
            text: 'Stapel Terzen auf das C und hör, was entsteht. Der Name des Akkords erscheint live.\n\n**Ziel:** ein Dreiklang, der nur aus **großen Terzen** besteht.',
            mount: stackBuilder('4,4', 'C – E – Gis: zwei große Terzen übereinander. Das ist der **übermäßige Dreiklang**.'),
          }),
          Steps.mc({
            prompt: 'Wie viele Halbtöne liegen zwischen dem Grundton und der Quinte eines übermäßigen Dreiklangs?',
            options: ['6', '7', '8', '9'], keepOrder: true, answer: '8',
            explain: '4 + 4 = 8 Halbtöne. Die reine Quinte hat 7, die **übermäßige Quinte** einen mehr.',
            wrong: 'Addiere die beiden großen Terzen.',
          }),
          Steps.mc({
            prompt: 'Aus **C-Dur** (C – E – G) wird der übermäßige Dreiklang C – E – Gis. Was hat sich verändert?',
            options: [
              'Die Quinte ist einen Halbton höher',
              { t: 'Die Terz ist einen Halbton höher', why: 'Die Terz E bleibt, wo sie ist. Schau auf den obersten Ton.' },
              { t: 'Der Grundton ist einen Halbton tiefer', why: 'Das C bleibt, wo es ist.' },
              { t: 'Ein vierter Ton kommt hinzu', why: 'Es bleiben drei Töne. Nur einer davon hat sich bewegt.' },
            ],
            answer: 'Die Quinte ist einen Halbton höher',
            explain: 'G wird zu Gis: Die reine Quinte mit 7 Halbtönen wird zur **übermäßigen Quinte** mit 8.',
          }),
          (() => {
            const [name, root] = pick([['C', 60], ['D', 62], ['F', 65], ['G', 67]]);
            const ch = T.chord(n(name, 4), 'aug');
            return Steps.keys({
              prompt: `Baue den übermäßigen Dreiklang auf dem markierten **${name}**.`,
              from: 60, to: 79, max: 3, marks: [[root, 'mk-ref', name]],
              check: pcSetCheck(midisOf(ch).map(m => mod(m, 12)), `Von ${name} aus zweimal 4 Halbtöne weiter, das ${name} selbst gehört dazu.`),
              solution: midisOf(ch),
              explain: `${T.join(ch)}: zweimal eine große Terz, je 4 Halbtöne.`,
            });
          })(),
          durOrAug(),
        ],
      },
      {
        id: 'ueb-schreibweise',
        title: 'Gis, nicht As',
        sub: 'Die übermäßige Quinte richtig schreiben',
        takeaway: 'Die übermäßige Quinte behält den Notennamen der Quinte: **C – E – Gis**, nicht C – E – As. Über E entsteht so **E – Gis – His**.',
        steps: () => [
          Steps.info({
            title: 'Acht Halbtöne, zwei Namen',
            text: 'C – Gis und C – As umfassen beide **8 Halbtöne** und klingen auf dem Klavier gleich. In den Noten stehen sie trotzdem an verschiedenen Stellen.\n\nHör dir beide an.',
            gate: true,
            media: gisAsCompare,
          }),
          Steps.info({
            title: 'Warum Gis?',
            text: 'In der Notenschrift überspringt jede Terz genau einen Notennamen: **C** – (D) – **E** – (F) – **G**. Der dritte Ton über C muss also ein G sein. Für 8 Halbtöne wird es erhöht: **Gis**.\n\nDas gilt auf jedem Grundton. Über E entsteht so sogar ein **His**: Es klingt wie C, steht aber auf dem Platz des H.',
            media: el => {
              const st = Staff();
              st.render([T.notes('C4 E4 Gis4'), T.notes('F4 A4 Cis5'), T.notes('E4 Gis4 His4')], { captions: ['auf C', 'auf F', 'auf E'] });
              el.append(st.el, btnRow(
                PlayBtn('C – E – Gis', () => Sound.chord([60, 64, 68], { arp: 0.1 })),
                PlayBtn('F – A – Cis', () => Sound.chord([65, 69, 73], { arp: 0.1 })),
                PlayBtn('E – Gis – His', () => Sound.chord([64, 68, 72], { arp: 0.1 }))));
            },
          }),
          fifthQuestion(),
          (() => {
            const o = pick([
              { root: 'C', where: 'auf der ersten Hilfslinie unter dem System', fifth: 'Gis', target: 'G4', letter: 'G' },
              { root: 'D', where: 'direkt unter der untersten Linie', fifth: 'Ais', target: 'A4', letter: 'A' },
              { root: 'F', where: 'im untersten Zwischenraum', fifth: 'Cis', target: 'C5', letter: 'C' },
              { root: 'G', where: 'auf der zweiten Linie', fifth: 'Dis', target: 'D5', letter: 'D' },
              { root: 'A', where: 'im zweiten Zwischenraum', fifth: 'Eis', target: 'E5', letter: 'E' },
            ]);
            return Steps.pick({
              prompt: `Der Grundton **${o.root}** steht ${o.where}. Seine übermäßige Quinte heißt **${o.fifth}**. Setze sie auf ihren Platz in der Notenzeile, das Kreuz denkst du dir dazu.`,
              target: o.target,
              explain: `${o.fifth} steht auf dem Platz des **${o.letter}**: Von ${o.root} bis ${o.letter} zählst du fünf Notennamen, also eine Quinte. Das Kreuz erhöht sie um einen Halbton.`,
            });
          })(),
          (() => {
            const set = pick(SPELL_SETS);
            return Steps.mc({
              prompt: `Welche Schreibweise ist korrekt für den übermäßigen Dreiklang auf **${set.root}**?`,
              options: [set.right, ...set.traps],
              answer: set.right,
              explain: `${set.right}: Jeder Ton überspringt einen Notennamen, und beide Terzen sind groß.`,
            });
          })(),
          staffTypeQuestion(),
          Steps.keys({
            prompt: 'Spiele den übermäßigen Dreiklang auf dem markierten **E**.',
            from: 60, to: 76, max: 3, marks: [[64, 'mk-ref', 'E']],
            check: pcSetCheck([4, 8, 0], 'Von E aus zweimal 4 Halbtöne weiter. Der oberste Ton liegt auf einer weißen Taste.'),
            solution: [64, 68, 72],
            explain: 'E – Gis – His. **His** ist das erhöhte H und liegt auf der Taste C. Geschrieben bleibt es ein H, damit der Akkord ein Terzenstapel ist.',
          }),
        ],
      },
      {
        id: 'ueb-dreieck',
        title: 'Das Dreieck',
        sub: 'Symmetrie im Oktavkreis',
        takeaway: 'Der übermäßige Dreiklang teilt die Oktave in **drei gleiche Teile**. Deshalb gibt es nur **vier** verschiedene, und jede Umkehrung klingt wieder übermäßig.',
        steps: () => [
          Steps.info({
            title: 'Ein gleichseitiges Dreieck',
            text: 'Leg die zwölf Töne wieder wie ein Ziffernblatt aus. Von C zu E sind es 4 Halbtöne, von E zu Gis 4, und von Gis zurück zum C noch einmal 4. Im Kreis zählt nur der Klang: Gis und As sind hier derselbe Punkt.\n\n4 + 4 + 4 = 12. Der übermäßige Dreiklang ist ein **gleichseitiges Dreieck**.',
            media: el => {
              const c = PitchCircle();
              c.poly([0, 4, 8], 'f2', false);
              [0, 4, 8].forEach(p => c.dot(p, 'f2'));
              el.append(h('div', { class: 'circle-box' }, c.el), btnRow(PlayBtn('Dreieck anhören', () => Sound.chord([60, 64, 68], { arp: 0.12 }))));
            },
          }),
          Steps.task({
            title: 'Färbe den Kreis',
            text: 'Tippe auf einen Ton. Er wird mit seinem ganzen übermäßigen Dreiklang eingefärbt.\n\nWie viele Dreiklänge brauchst du, bis alle zwölf Töne Farbe haben?',
            mount: circleColoring(4, {
              doneMsg: taps => `Mit **${taps} Dreiklängen** sind alle zwölf Töne abgedeckt. Mehr verschiedene übermäßige Dreiklänge gibt es nicht.`,
            }),
          }),
          Steps.mc({
            prompt: 'Wie viele **klanglich verschiedene** übermäßige Dreiklänge gibt es?',
            options: ['3', '4', '6', '12'], keepOrder: true, answer: '4',
            explain: 'Jedes Dreieck belegt 3 der 12 Töne: 12 ÷ 3 = 4. Alle anderen sind nur Umkehrungen oder Umbenennungen davon.',
            wrong: 'Denk an den Kreis: Wie viele Farben hast du gebraucht?',
          }),
          Steps.mc({
            prompt: 'Verschiebe C – E – Gis um eine große Terz nach oben. Was kommt heraus?',
            media: el => el.append(btnRow(
              PlayBtn('C – E – Gis', () => Sound.chord([60, 64, 68], { arp: 0.1 })),
              PlayBtn('E – Gis – His', () => Sound.chord([64, 68, 72], { arp: 0.1 })))),
            options: [
              'Dieselben drei Töne in anderer Lage',
              { t: 'Ein neuer übermäßiger Dreiklang', why: 'Schau genau hin: E und Gis waren schon dabei, und His klingt wie C.' },
              { t: 'Ein Dur-Dreiklang', why: 'Alle Abstände bleiben 4 Halbtöne, die Akkordart ändert sich nicht.' },
              { t: 'Ein verminderter Dreiklang', why: 'Vermindert hieße zwei kleine Terzen. Hier bleiben es große.' },
            ],
            answer: 'Dieselben drei Töne in anderer Lage',
            explain: 'E – Gis – His klingt genau wie E – Gis – C, also wie die Töne von C – E – Gis. Der Akkord ist seine eigene Umkehrung.',
          }),
          Steps.mc({
            prompt: 'Welche Lage von C – E – Gis klingt **nicht** wie ein übermäßiger Dreiklang?',
            options: [
              'Keine, jede Lage klingt übermäßig',
              { t: 'E – Gis – C', why: 'E – Gis – C klingt wie E – Gis – His: wieder zwei große Terzen.' },
              { t: 'Gis – C – E', why: 'Gis – C – E klingt wie As – C – E: wieder zwei große Terzen.' },
              { t: 'C – E – Gis', why: 'Das ist die Grundstellung, und die ist übermäßig.' },
            ],
            answer: 'Keine, jede Lage klingt übermäßig',
            explain: 'Weil alle Abstände gleich sind, ist jede Umkehrung wieder ein Stapel aus großen Terzen. Am Klang allein hörst du deshalb nicht, welcher Ton der Grundton ist.',
          }),
          (() => {
            const p = randInt(0, 11);
            const fam = [p, p + 4, p + 8];
            const ans = T.pcName(p + pick([4, 8]));
            const others = shuffle([...Array(12).keys()].filter(q => mod(q - p, 4) !== 0)).slice(0, 3).map(T.pcName);
            return Steps.mc({
              prompt: `Welcher Ton liegt im selben Dreieck wie **${T.pcName(p)}**?`,
              media: el => {
                const c = PitchCircle();
                c.dot(p, 'f2');
                el.append(h('div', { class: 'circle-box circle-box--sm' }, c.el));
              },
              options: [ans, ...others],
              answer: ans,
              explain: `${fam.map(T.pcName).join(' – ')}: je 4 Halbtöne Abstand, ein gleichseitiges Dreieck.`,
              wrong: `Zähl im Kreis von ${T.pcName(p)} aus in Schritten von 4 Halbtönen.`,
            });
          })(),
        ],
      },
      {
        id: 'ueb-herkunft',
        title: 'Wo er vorkommt',
        sub: 'Harmonisch Moll und die steigende Quinte',
        takeaway: 'Der übermäßige Dreiklang steht auf der **III. Stufe in harmonisch Moll** und entsteht als Durchgang, wenn die Quinte steigt: **G → Gis → A**.',
        steps: () => [
          Steps.info({
            title: 'Die III. Stufe in harmonisch Moll',
            text: 'In **harmonisch Moll** ist der 7. Ton erhöht. In a-Moll wird aus G ein **Gis**, der Leitton zum A: A – H – C – D – E – F – Gis – A.\n\nBaust du auf der III. Stufe, dem C, einen Dreiklang aus Tönen dieser Tonleiter, entsteht **C – E – Gis**.',
            media: el => {
              const kb = Keyboard({ from: 57, to: 69, labels: 'white' });
              const scale = [57, 59, 60, 62, 64, 65, 68, 69];
              scale.forEach(m => kb.mark(m, m === 68 ? 'mk-ref' : 'mk-step', m === 68 ? 'Gis' : T.pcName(m)));
              const st = Staff({ width: 250 });
              st.render([T.notes('C4 E4 Gis4')], { captions: ['III. Stufe in a-Moll'] });
              el.append(kbWrap(kb.el), btnRow(
                PlayBtn('Tonleiter', () => Sound.seq(scale, { step: 0.32, dur: 0.7 })),
                PlayBtn('III. Stufe', () => Sound.chord([60, 64, 68], { arp: 0.1 }))), st.el);
            },
          }),
          Steps.mc({
            prompt: 'In welcher Tonleiter steht auf der III. Stufe ein übermäßiger Dreiklang?',
            options: [
              'a-Moll harmonisch',
              { t: 'a-Moll natürlich', why: 'In natürlich Moll fehlt das Gis. Auf der III. Stufe steht dort C – E – G, ein Dur-Dreiklang.' },
              { t: 'C-Dur', why: 'In Dur stehen auf den Stufen nur Dur-, Moll- und verminderte Dreiklänge.' },
            ],
            answer: 'a-Moll harmonisch',
            explain: 'Erst das erhöhte Gis macht aus C – E – G den Klang C – E – Gis. (Auch melodisch Moll aufwärts hat ihn, weil es das Gis ebenfalls enthält.)',
          }),
          (() => {
            const o = pick([
              { key: 'a-Moll', third: 'C', lead: 'Gis', notes: 'C4 E4 Gis4' },
              { key: 'e-Moll', third: 'G', lead: 'Dis', notes: 'G4 H4 Dis5' },
              { key: 'd-Moll', third: 'F', lead: 'Cis', notes: 'F4 A4 Cis5' },
              { key: 'g-Moll', third: 'B', lead: 'Fis', notes: 'B4 D5 Fis5' },
            ]);
            const ch = T.notes(o.notes);
            return Steps.keys({
              prompt: `Baue in **${o.key} harmonisch** den Dreiklang auf der **III. Stufe**.`,
              from: 60, to: 79, max: 3,
              check: pcSetCheck(midisOf(ch).map(m => mod(m, 12)), `Die III. Stufe von ${o.key} ist ${o.third}. In harmonisch Moll ist der 7. Ton erhöht.`),
              solution: midisOf(ch),
              explain: `${T.join(ch)}: Der erhöhte 7. Ton **${o.lead}** ist hier die übermäßige Quinte.`,
            });
          })(),
          Steps.task({
            title: 'Die Quinte steigt',
            text: 'Spiele die drei Klänge der Reihe nach und beobachte die Quinte: Sie steigt in Halbtönen. Das E rückt am Ende zum F, das C bleibt liegen.',
            mount: risingFifth,
          }),
          Steps.mc({
            prompt: 'Wohin strebt das **Gis** in C – E – Gis?',
            options: [
              'Einen Halbton aufwärts zum A',
              { t: 'Einen Halbton abwärts zum G', why: 'Dann ginge die Bewegung zurück. Das Kreuz zeigt die Richtung an.' },
              { t: 'Es bleibt liegen', why: 'Gis ist der unruhigste Ton im Klang, er will sich bewegen.' },
              { t: 'Es springt zum C', why: 'Möglich, aber nicht natürlich. Der nächste Zielton liegt viel näher.' },
            ],
            answer: 'Einen Halbton aufwärts zum A',
            explain: 'Gis ist erhöht und wirkt wie ein Leitton: Es steigt einen Halbton zum A.',
          }),
          Steps.mc({
            prompt: 'Welcher Ton bleibt in der Folge C – E – G → C – E – Gis → C – F – A die ganze Zeit liegen?',
            options: [
              'C',
              { t: 'E', why: 'E bleibt nur im ersten Schritt liegen, danach steigt es zum F.' },
              { t: 'G', why: 'G steigt erst zum Gis, dann zum A.' },
              { t: 'A', why: 'A erscheint erst im letzten Akkord.' },
            ],
            keepOrder: true, answer: 'C',
            explain: 'Das C bleibt liegen. E steigt zum F, G über Gis zum A.',
          }),
        ],
      },
      {
        id: 'ueb-umdeutung',
        title: 'Ein Akkord, drei Ziele',
        sub: 'Enharmonische Umdeutung',
        takeaway: 'Jeder der drei Töne kann Grundton sein. Je nach Schreibweise steigt eine andere übermäßige Quinte, und der Klang führt nach **F-Dur, A-Dur oder Des-Dur**.',
        steps: () => [
          Steps.info({
            title: 'Drei Namen für einen Klang',
            text: 'Weil alle Abstände gleich sind, kann **jeder** der drei Töne der Grundton sein. C – E – Gis, E – Gis – His und As – C – E klingen gleich.\n\nIn jeder Schreibweise ist ein anderer Ton die **übermäßige Quinte**. Sie strebt einen Halbton nach oben, und so führt derselbe Klang in drei verschiedene Richtungen.',
            media: el => {
              const st = Staff();
              st.render([T.notes('C4 E4 Gis4'), T.notes('E4 Gis4 His4'), T.notes('As4 C5 E5')], { captions: ['auf C', 'auf E', 'auf As'] });
              el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord([60, 64, 68], { arp: 0.12 }))));
            },
          }),
          Steps.task({
            title: 'Wähle den Grundton',
            text: 'Tippe nacheinander jeden Ton von C – E – Gis an. Er wird zum Grundton, der Akkord wird passend umbenannt und löst sich auf.',
            mount: augExplorer,
          }),
          Steps.mc({
            prompt: 'In C – E – Gis steigt Gis zum A und E zum F. Das C bleibt liegen. Welcher Akkord entsteht?',
            options: [
              'F-Dur',
              { t: 'a-Moll', why: 'Für a-Moll bliebe das E liegen. Hier steigt es zum F.' },
              { t: 'A-Dur', why: 'A-Dur braucht Cis und E. Hier hast du C, F und A.' },
              { t: 'd-Moll', why: 'd-Moll braucht ein D. Hier hast du C, F und A.' },
            ],
            answer: 'F-Dur',
            explain: 'C – F – A ist F-Dur in Quartsextlage. Der Grundton F liegt eine Quarte über dem C.',
          }),
          Steps.mc({
            prompt: '**E – Gis – His** klingt genauso wie C – E – Gis. Wohin löst es sich auf?',
            options: [
              'A-Dur',
              { t: 'F-Dur', why: 'Das wäre die Lesart C – E – Gis. Hier ist E der Grundton.' },
              { t: 'E-Dur', why: 'E-Dur hätte H statt His. Die übermäßige Quinte His soll aber steigen.' },
              { t: 'Cis-Dur', why: 'Cis ist das Ziel von His, aber nicht der Grundton des neuen Akkords.' },
            ],
            answer: 'A-Dur',
            explain: 'In dieser Schreibweise ist His die übermäßige Quinte. Sie steigt zu Cis, Gis geht zum A, E bleibt: A-Dur, E – A – Cis.',
          }),
          Steps.mc({
            prompt: 'Welcher Ton muss die übermäßige Quinte sein, damit sich der Klang C – E – Gis nach **Des-Dur** auflöst?',
            options: [
              { t: 'Gis', why: 'Gis steigt zum A, das führt nach F-Dur.' },
              { t: 'C, geschrieben als His', why: 'His steigt zu Cis, das führt nach A-Dur.' },
              'E',
            ],
            keepOrder: true, answer: 'E',
            explain: 'E ist die übermäßige Quinte in As – C – E. E steigt zum F, C geht zu Des, As bleibt: Des-Dur, As – Des – F.',
          }),
          (() => {
            const o = pick([
              { chord: 'C4 E4 Gis4', target: 'F-Dur', res: [60, 65, 69], pcs: [5, 9, 0], tones: 'F, A und C', how: 'Gis steigt zum A, E zum F, C bleibt.' },
              { chord: 'E4 Gis4 His4', target: 'A-Dur', res: [64, 69, 73], pcs: [9, 1, 4], tones: 'A, Cis und E', how: 'His steigt zu Cis, Gis zum A, E bleibt.' },
              { chord: 'As3 C4 E4', target: 'Des-Dur', res: [56, 61, 65], pcs: [1, 5, 8], tones: 'Des, F und As', how: 'E steigt zum F, C zu Des, As bleibt.' },
            ]);
            const ch = T.notes(o.chord);
            return Steps.keys({
              prompt: `${T.join(ch)} löst sich nach **${o.target}** auf. Spiele den Zielakkord.`,
              from: 55, to: 76, max: 3,
              marks: ch.map(x => [T.midi(x), 'mk-ref', T.name(x)]),
              check: pcSetCheck(o.pcs, `${o.target} besteht aus ${o.tones}.`),
              solution: o.res,
              explain: `${o.how} Jeder Ton geht höchstens einen Halbton weit.`,
            });
          })(),
          Steps.mc({
            prompt: 'Welches Ziel ist für den Klang C – E – Gis auf diesem Weg **nicht** erreichbar?',
            options: ['F-Dur', 'A-Dur', 'Des-Dur', 'G-Dur'], keepOrder: true, answer: 'G-Dur',
            explain: 'Die Ziele liegen eine Quarte über den drei möglichen Grundtönen C, E und As: F, A und Des. G-Dur gehört nicht dazu.',
            wrong: 'Jedes Ziel liegt eine Quarte über einem der drei möglichen Grundtöne.',
          }),
        ],
      },
      {
        id: 'ueb-hoeren', ear: true,
        title: 'Übermäßig hören',
        sub: 'Den Klang sicher erkennen',
        takeaway: 'Du erkennst den übermäßigen Dreiklang am Klang: hell, aber **schwebend**, mit einer Quinte, die zu weit ist.',
        steps: () => {
          const types = shuffle(['aug', 'aug', pick(['maj', 'min']), 'dim', pick(TRIADS)]);
          return [
            Steps.info({
              title: 'Wie klingt übermäßig?',
              text: 'Der übermäßige Dreiklang klingt schwebend und unentschieden, wie ein Fragezeichen. Ihm fehlt die reine Quinte, die Dur und Moll ihren festen Boden gibt.\n\nVergleiche ihn mit Dur, Moll und vermindert, alle auf dem Ton C.',
              gate: true,
              media: earCompare(TRIADS, 'aug'),
            }),
            ...types.map((t, i) => earQuestion(i + 1, t)),
            findAug(),
          ];
        },
      },
    ],
  });
})();
