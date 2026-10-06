'use strict';
/* Kurs: Der verminderte Septakkord – bauen, hören, auflösen, umdeuten. */

(() => {
  const EAR_TYPES = ['dim7', 'hdim7', 'dom7', 'm7'];
  const EAR_TIPS = {
    dim7: 'Alle Abstände sind gleich, nichts ruht: maximale Spannung.',
    hdim7: 'Unten vermindert, oben eine große Terz: gespannt, aber weicher.',
    dom7: 'Ein Dur-Dreiklang mit kleiner Septime: hell und zielstrebig.',
    m7: 'Ein Moll-Dreiklang mit kleiner Septime: weich und ruhig.',
  };

  const earQuestion = (no, type) => chordEar({
    no, type, types: EAR_TYPES, tips: EAR_TIPS,
    wrong: 'Achte auf die Quinte: Klingt sie gespannt (vermindert) oder stabil (rein)? Spiel den Akkord ruhig noch einmal gebrochen.',
  });

  /* ---------- Experimente ---------- */

  // Kapitel 3: große Sexte und verminderte Septime nebeneinander, gleich im Klang.
  function sextSeptCompare(el, api) {
    const st = Staff();
    const pairs = [
      { label: 'C – A', notes: [n('C', 4), n('A', 4)], cap: 'große Sexte',
        text: 'A liegt im **Zwischenraum** unter der Mittellinie. Von C bis A zählst du sechs Notennamen: C D E F G A. Also eine **Sexte**.' },
      { label: 'C – Heses', notes: [n('C', 4), n('Heses', 4)], cap: 'verminderte Septime',
        text: 'Heses sitzt **auf der Mittellinie**, dem Platz des H. Von C bis H zählst du sieben Notennamen. Also eine **Septime**, doppelt erniedrigt.' },
    ];
    const heard = new Set();
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf ein Intervall, um es zu hören.');
    const draw = hl => st.render(pairs.map(p => p.notes), { captions: pairs.map(p => p.cap), hl });
    draw(-1);
    const btns = pairs.map((p, i) => PlayBtn(p.label, () => {
      Sound.chord([60, 69], { arp: 0.45 });
      draw(i);
      heard.add(i);
      read.innerHTML = inline(p.text);
      if (heard.size === 2) api.ready(true);
    }));
    el.append(st.el, btnRow(...btns), read);
  }

  // Kapitel 6: H°7 löst sich nach c-Moll auf, mit Stimmführung.
  function resolutionDemo(el, api) {
    const kb = Keyboard({ from: 57, to: 76, labels: 'white' });
    const voices = [
      { from: 59, to: 60, a: 'H', b: 'C', how: 'Halbton aufwärts: der Leitton', lead: true },
      { from: 65, to: 63, a: 'F', b: 'Es', how: 'Ganzton abwärts' },
      { from: 68, to: 67, a: 'As', b: 'G', how: 'Halbton abwärts' },
      { from: 74, to: 72, a: 'D', b: 'C', how: 'Ganzton abwärts' },
    ];
    const list = h('ul', { class: 'moves' }, voices.map(v =>
      h('li', { class: v.lead ? 'is-lead' : '' }, h('b', {}, `${v.a} → ${v.b}`), h('span', {}, v.how))));
    const showDim = () => { kb.clearMarks(); voices.forEach(v => kb.mark(v.from, 'mk-ref', v.a)); };
    showDim();
    const btn = PlayBtn('Auflösen', () => {
      showDim();
      list.classList.remove('is-on');
      Sound.chord(voices.map(v => v.from), { dur: 1.1 });
      api.later(() => {
        kb.clearMarks();
        voices.forEach(v => kb.mark(v.to, 'mk-ok', v.b));
        list.classList.add('is-on');
        Sound.chord(voices.map(v => v.to), { dur: 2.4 });
        api.ready(true);
      }, 1000);
    });
    el.append(kbWrap(kb.el), btnRow(btn), list,
      h('p', { class: 'aside', html: inline('**Für Fortgeschrittene:** In der Funktionstheorie gilt dieser Akkord als *verkürzter Dominantseptnonakkord*: G – H – D – F – As, nur ohne den Grundton G.') }));
  }

  // Kapitel 7: jeder Akkordton kann Leitton sein → vier Zieltonarten.
  function leittonExplorer(el, done, api) {
    const OPTIONS = [
      { pc: 11, lead: ['H', 3], tonic: 'C', minor: 'c-Moll', major: 'C-Dur' },
      { pc: 2, lead: ['D', 4], tonic: 'Es', minor: 'es-Moll', major: 'Es-Dur' },
      { pc: 5, lead: ['Eis', 4], tonic: 'Fis', minor: 'fis-Moll', major: 'Fis-Dur' },
      { pc: 8, lead: ['Gis', 4], tonic: 'A', minor: 'a-Moll', major: 'A-Dur' },
    ];
    const found = new Set();
    let current = null, mood = 'minor', finished = false;
    const staff = Staff({ width: 250 });
    staff.render([[n('H', 3), n('D', 4), n('F', 4), n('As', 4)]], { captions: ['H – D – F – As'] });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe im Kreis auf einen der vier farbigen Töne.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...OPTIONS.map(o =>
      h('span', { class: 'chip' + (found.has(o.pc) ? ' is-on' : '') }, found.has(o.pc) ? `${o.tonic}` : '?')));
    paintChips();

    const c = PitchCircle({
      sound: false,
      onTap: p => {
        const o = OPTIONS.find(x => x.pc === p);
        if (!o) {
          Sound.piano(60 + p);
          read.innerHTML = inline(`**${T.pcName(p)}** gehört nicht zum Akkord. Tippe auf einen der vier farbigen Töne.`);
          return;
        }
        choose(o);
      },
    });
    c.poly([11, 2, 5, 8], 'f3', false);
    [11, 2, 5, 8].forEach(p => c.dot(p, 'f3'));

    function playIt(o) {
      const r = 55 + mod(o.pc - 7, 12);
      const tension = [r, r + 6, r + 9, r + 15];
      const target = mood === 'minor' ? [r + 1, r + 4, r + 8, r + 13] : [r + 1, r + 5, r + 8, r + 13];
      Sound.chord(tension, { dur: 1.1 });
      api.later(() => Sound.chord(target, { dur: 2.2 }), 950);
    }

    function choose(o) {
      current = o;
      const lead = n(o.lead[0], o.lead[1]);
      const ch = T.chord(lead, 'dim7');
      c.clearArrows();
      for (let p = 0; p < 12; p++) c.dot(p, 'is-target', false);
      c.arrow(o.pc, o.pc + 1);
      c.dot(o.pc + 1, 'is-target');
      staff.render([ch], { captions: [T.join(ch)], hl: 0 });
      read.innerHTML = inline(`**${T.name(lead)}** ist der Leitton und steigt zu **${o.tonic}**. Geschrieben heißt der Akkord jetzt ${T.join(ch)} und löst sich nach **${mood === 'minor' ? o.minor : o.major}** auf.`);
      playIt(o);
      found.add(o.pc);
      paintChips();
      if (found.size === OPTIONS.length && !finished) {
        finished = true;
        c.poly([0, 3, 6, 9], 'f1');
        done('Alle vier Ziele gefunden: **C, Es, Fis und A**. Schau in den Kreis: Sie bilden selbst wieder ein Quadrat.');
      }
    }

    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tongeschlecht der Auflösung' });
    const segBtn = (key, label) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(mood === key) }, label);
      b.addEventListener('click', () => {
        mood = key;
        seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        if (current) choose(current);
      });
      return b;
    };
    seg.append(segBtn('minor', 'nach Moll'), segBtn('major', 'nach Dur'));

    el.append(
      h('div', { class: 'explore' },
        h('div', { class: 'circle-box' }, c.el),
        h('div', { class: 'explore-side' }, staff.el, seg, read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Ziele'), chips))));
  }

  // Kopfbild: drei Quadrate im Oktavkreis, jedes ein verminderter Septakkord.
  function visual() {
    const fams = [0, 1, 2].map(f => [f, f + 3, f + 6, f + 9]);
    let polys = [];
    const c = PitchCircle({
      sound: false,
      onTap: p => {
        const f = p % 3;
        Sound.chord(fams[f].map(q => 60 + q), { arp: 0.07 });
        polys.forEach((pg, i) => pg.classList.toggle('is-on', i === f));
      },
    });
    polys = fams.map((pcs, f) => c.poly(pcs, `f${f + 1} is-line`, false));
    for (let p = 0; p < 12; p++) c.dot(p, 'f' + (p % 3 + 1));
    return { label: 'Oktavkreis · zum Anhören antippen', foot: 'Drei Akkorde decken alle zwölf Töne ab', el: c.el };
  }

  /* ---------- Blitzrunde ---------- */
  const DIM_ROOTS = ['C', 'Cis', 'D', 'Dis', 'E', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'];
  const SAFE_ROOTS = ['C', 'D', 'E', 'G', 'A', 'H'];
  const TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'Es', 'B'];

  function semis() {
    const a = randInt(0, 11), d = randInt(1, 11), b = (a + d) % 12;
    const near = [d - 3, d - 2, d - 1, d + 1, d + 2, d + 3].filter(x => x >= 1 && x <= 11).map(String);
    return {
      tag: 'Halbtöne',
      prompt: `Wie viele Halbtöne liegen von **${T.pcName(a)}** aufwärts bis **${T.pcName(b)}**?`,
      options: quizOptions(String(d), near).sort((x, y) => x - y),
      answer: String(d),
    };
  }

  function isDim() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'dim7' : pick(['hdim7', 'dom7', 'm7']);
    const notes = T.chord(T.note(pick(SAFE_ROOTS), 4), type);
    return {
      tag: 'Vermindert?',
      prompt: `Ist **${T.join(notes)}** ein verminderter Septakkord?`,
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  function complete() {
    const ch = T.chord(T.note(pick(DIM_ROOTS), 4), 'dim7');
    const k = randInt(1, 3);
    const p = T.pc(ch[k]);
    const ans = T.name(ch[k]);
    // Falle: derselbe Klang, falsch geschrieben (z. B. A statt Heses).
    const trap = [T.pcName(p), ...T.spellings(p, 1)].find(x => x !== ans);
    const near = shuffle([T.pcName(p + 1), T.pcName(p - 1), T.pcName(p + 2)].filter(x => x !== ans && x !== trap));
    return {
      tag: 'Ergänzen',
      prompt: `Ergänze den verminderten Septakkord: ${ch.map((x, i) => (i === k ? '**?**' : T.name(x))).join(' – ')}`,
      options: shuffle([ans, trap, ...near.slice(0, trap ? 2 : 3)].filter(Boolean)),
      answer: ans,
    };
  }

  function ear() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'dim7' : pick(['hdim7', 'dom7', 'm7']);
    const root = randInt(50, 60);
    return {
      tag: 'Hörprobe',
      prompt: 'Hörst du einen verminderten Septakkord?',
      key: type + root,
      play: T.chordMidis(root, type),
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  function leit() {
    const tonic = T.note(pick(TONICS), 4);
    const lead = T.transpose(tonic, -1, -1);
    const ch = T.chord(lead, 'dim7');
    const p = T.pc(lead);
    const ans = T.name(tonic);
    return {
      tag: 'Leitton',
      prompt: `**${T.name(lead)}** ist der Leitton in ${T.join(ch)}. Wohin löst sich der Akkord auf?`,
      options: quizOptions(ans, [T.pcName(p - 1), T.pcName(p + 2), T.name(ch[1]), T.pcName(p + 4)]),
      answer: ans,
    };
  }

  defineCourse({
    id: 'septakkord',
    short: 'Verminderter Septakkord',
    title: ['Der verminderte ', 'Septakkord'],
    topic: 'Harmonielehre',
    sub: 'Vier Töne, drei kleine Terzen, ein perfektes Quadrat',
    lead: 'Vier Töne, drei kleine Terzen, ein perfektes Quadrat. Du baust den Akkord selbst, hörst ihn, löst ihn auf und deutest ihn um.',
    visual,
    badge: { id: 'master', glyph: '\u{1D110}', name: 'Meister der Verminderung', desc: 'Den Kurs zum verminderten Septakkord abgeschlossen.' },
    extras: [{ id: 'symmetry', glyph: '°7', name: 'Quadratur', desc: 'Alle zwölf Töne im Oktavkreis mit Quadraten gefärbt.' }],
    arcade: [
      { id: 'semis', name: 'Halbtöne zählen', gen: semis, needs: 'halbtoene' },
      { id: 'isDim', name: 'Vermindert oder nicht', gen: isDim, needs: 'terzen' },
      { id: 'complete', name: 'Septakkord ergänzen', gen: complete, needs: 'septime' },
      { id: 'ear', name: 'Hörprobe vermindert', gen: ear, needs: 'hoeren' },
      { id: 'leit', name: 'Leitton finden', gen: leit, needs: 'aufloesung' },
    ],
    levels: [
      {
        id: 'halbtoene', fam: 1,
        title: 'Halbtöne zählen',
        sub: 'Das Maß für alle Abstände',
        takeaway: 'Ein Halbton ist der Schritt zur Nachbartaste. Eine **kleine Terz** hat 3 Halbtöne, eine **große Terz** 4.',
        steps: () => [
          Steps.info({
            title: 'Ein Halbton ist ein Schritt zur Nachbartaste',
            text: 'Auf der Klaviatur liegen alle zwölf Töne einer Oktave lückenlos nebeneinander. Von einer Taste zur direkt benachbarten, egal ob weiß oder schwarz, ist es genau **ein Halbton**.\n\nSpiel ein paar Tasten an, um dich einzuhören.',
            media: el => el.append(kbWrap(Keyboard({ from: 60, to: 76, labels: 'white' }).el)),
          }),
          Steps.task({
            title: 'Zähl mit',
            text: 'Tippe zwei Tasten nacheinander an. Die Halbtonschritte dazwischen werden durchnummeriert.\n\nFinde zwei Tasten, die genau **3 Halbtöne** auseinanderliegen.',
            mount: semitoneFinder(3, 'kleine Terz'),
          }),
          Steps.mc({
            prompt: 'Drei Halbtöne ergeben eine **kleine Terz**. Die **große Terz** ist einen Halbton größer. Wie viele Halbtöne hat sie?',
            options: ['2', '3', '4', '5'], keepOrder: true, answer: '4',
            explain: '4 Halbtöne, zum Beispiel C – E.',
            wrong: 'Die große Terz ist genau einen Halbton größer als die kleine.',
          }),
          Steps.keys({
            prompt: 'Spiele die **kleine Terz** über dem markierten **D**.',
            from: 60, to: 76, marks: [[62, 'mk-ref', 'D']],
            check: sel => {
              const d = sel[0] - 62;
              if (d === 3) return { ok: true };
              return { ok: false, msg: d <= 0 ? 'Die Terz liegt über dem D, also weiter rechts.' : `Das sind ${d} Halbtöne. Gesucht sind 3.` };
            },
            solution: [65],
            explain: 'D – F: drei Halbtöne (D → Es → E → F).',
          }),
          Steps.mc({
            prompt: 'Hör genau hin. Ist das eine kleine oder eine große Terz?',
            media: (el, api) => {
              const play = () => Sound.chord([64, 67], { arp: 0.4 });
              el.append(btnRow(PlayBtn('Anhören', play)));
              api.later(play, 350);
            },
            options: ['kleine Terz', 'große Terz'], keepOrder: true, answer: 'kleine Terz',
            explain: 'E – G sind 3 Halbtöne: E → F → Fis → G. Kleine Terzen klingen eher dunkel, große eher hell.',
            wrong: 'Zähl nach: E → F → Fis → G.',
          }),
        ],
      },
      {
        id: 'terzen', fam: 2,
        title: 'Terzen stapeln',
        sub: 'Vom Dreiklang zum Vierklang',
        takeaway: 'Drei **kleine Terzen** übereinander ergeben den verminderten Septakkord, zum Beispiel H – D – F – As.',
        steps: () => [
          Steps.info({
            title: 'Akkorde sind gestapelte Terzen',
            text: 'Fast alle Akkorde der klassischen Harmonik entstehen, indem man Terzen übereinanderschichtet.\n\n**Dur:** große Terz + kleine Terz, also C – E – G\n**Moll:** kleine Terz + große Terz, also C – Es – G',
            media: el => {
              const st = Staff();
              st.render([[n('C', 4), n('E', 4), n('G', 4)], [n('C', 4), n('Es', 4), n('G', 4)]], { captions: ['C-Dur', 'c-Moll'] });
              el.append(st.el, btnRow(
                PlayBtn('C-Dur', () => Sound.chord([60, 64, 67], { arp: 0.06 })),
                PlayBtn('c-Moll', () => Sound.chord([60, 63, 67], { arp: 0.06 }))));
            },
          }),
          Steps.task({
            title: 'Dein Akkord-Baukasten',
            text: 'Stapel Terzen auf das C und hör, was entsteht. Der Name des Akkords erscheint live.\n\n**Ziel:** ein Vierklang, der nur aus **kleinen Terzen** besteht.',
            mount: stackBuilder('3,3,3', 'C – Es – Ges – Heses: drei kleine Terzen übereinander. Das ist der **verminderte Septakkord**.'),
          }),
          Steps.mc({
            prompt: 'Du hast drei kleine Terzen gestapelt. Wie viele Halbtöne liegen zwischen dem tiefsten und dem höchsten Ton?',
            options: ['6', '7', '9', '10'], keepOrder: true, answer: '9',
            explain: '3 + 3 + 3 = 9 Halbtöne. Merk dir die 9, sie wird gleich wichtig.',
            wrong: 'Addiere die drei kleinen Terzen.',
          }),
          Steps.keys({
            prompt: 'Baue den verminderten Septakkord auf dem markierten **H**.',
            from: 59, to: 77, max: 4, marks: [[59, 'mk-ref', 'H']],
            check: pcSetCheck([11, 2, 5, 8], 'Von H aus immer 3 Halbtöne weiter, das H selbst gehört dazu.'),
            solution: [59, 62, 65, 68],
            explain: 'H – D – F – As. Drei kleine Terzen, jede genau 3 Halbtöne.',
          }),
          Steps.mc({
            prompt: 'Welcher dieser Akkorde ist ein verminderter Septakkord?',
            options: [
              'A – C – Es – Ges',
              { t: 'A – C – E – G', why: 'C – E ist eine große Terz. Das ist ein Moll-Septakkord.' },
              { t: 'A – Cis – E – G', why: 'A – Cis ist eine große Terz. Das ist ein Dominantseptakkord.' },
              { t: 'A – C – Es – G', why: 'Fast! Aber Es – G ist eine große Terz. Das ist der halbverminderte Septakkord.' },
            ],
            answer: 'A – C – Es – Ges',
            explain: 'A – C, C – Es, Es – Ges: dreimal 3 Halbtöne.',
          }),
        ],
      },
      {
        id: 'septime', fam: 3,
        title: 'Die verminderte Septime',
        sub: 'Gleicher Klang, anderer Name',
        takeaway: 'Die verminderte Septime klingt wie eine große Sexte. Weil der Akkord aus Terzen besteht, schreibt man sie als Septime: **C – Heses**.',
        steps: () => [
          Steps.info({
            title: 'Neun Halbtöne, zwei Namen',
            text: 'C – A und C – Heses umfassen beide **9 Halbtöne** und klingen auf dem Klavier gleich. In den Noten stehen sie trotzdem an verschiedenen Stellen.\n\nHör dir beide an.',
            gate: true,
            media: sextSeptCompare,
          }),
          Steps.info({
            title: 'Warum Heses?',
            text: 'In der Notenschrift überspringt jede Terz genau einen Notennamen: **C** – (D) – **E** – (F) – **G** – (A) – **H**.\n\nDer vierte Ton über C muss also ein H sein. Für 9 Halbtöne wird es doppelt erniedrigt: **Heses**. So sieht man dem Notenbild sofort an, dass hier Terzen gestapelt sind.',
            media: el => {
              const st = Staff({ width: 250 });
              st.render([[n('C', 4), n('Es', 4), n('Ges', 4), n('Heses', 4)]], { captions: ['C – Es – Ges – Heses'] });
              el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord([60, 63, 66, 69], { arp: 0.12 }))));
            },
          }),
          Steps.mc({
            prompt: 'Wie heißt die verminderte Septime über **E**?',
            options: [
              'Des',
              { t: 'Cis', why: 'Cis klingt gleich, ist aber eine große Sexte über E. Die Septime braucht den Notennamen D.' },
              { t: 'D', why: 'E – D ist eine kleine Septime mit 10 Halbtönen. Noch einen Halbton tiefer.' },
              { t: 'Es', why: 'E – Es wäre eine verminderte Oktave.' },
            ],
            answer: 'Des',
            explain: 'E – G – B – Des. Die Terzkette über E lautet E – G – H – D, und H wird zu B, D zu Des erniedrigt.',
          }),
          Steps.mc({
            prompt: 'Welche Schreibweise ist korrekt für den verminderten Septakkord auf **C**?',
            options: [
              'C – Es – Ges – Heses',
              { t: 'C – Es – Ges – A', why: 'Klingt richtig, aber Ges – A ist eine übermäßige Sekunde. Der Akkord wäre kein reiner Terzenstapel mehr.' },
              { t: 'C – Dis – Fis – A', why: 'C – Dis ist eine übermäßige Sekunde, keine Terz.' },
              { t: 'C – Es – Fis – A', why: 'Es – Fis ist eine übermäßige Sekunde, keine Terz.' },
            ],
            answer: 'C – Es – Ges – Heses',
            explain: 'Jeder Ton überspringt einen Notennamen: C, E, G, H, jeweils passend erniedrigt.',
          }),
          Steps.mc({
            prompt: 'Welcher Akkord steht hier?',
            media: el => {
              const st = Staff({ width: 250 });
              st.render([[n('Gis', 4), n('H', 4), n('D', 5), n('F', 5)]]);
              el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord([68, 71, 74, 77], { arp: 0.1 }))));
            },
            options: EAR_TYPES.map(t => CH[t].name), keepOrder: true,
            answer: CH.dim7.name,
            explain: 'Gis – H – D – F: dreimal eine kleine Terz. Von Gis bis F sind es 9 Halbtöne, eine verminderte Septime.',
            wrong: 'Zähl die Halbtöne zwischen den Nachbartönen: Gis – H, H – D, D – F.',
          }),
        ],
      },
      {
        id: 'symmetrie', fam: 1,
        title: 'Das perfekte Quadrat',
        sub: 'Symmetrie im Oktavkreis',
        takeaway: 'Der verminderte Septakkord teilt die Oktave in **vier gleiche Teile**. Deshalb gibt es nur **drei** verschiedene.',
        steps: () => [
          Steps.info({
            title: 'Der Oktavkreis',
            text: 'Leg die zwölf Töne wie ein Ziffernblatt im Kreis aus. Jeder Schritt im Uhrzeigersinn ist ein Halbton. Im Kreis zählt nur der Klang: Heses und A sind hier derselbe Punkt.\n\nVon A zurück zum C sind es wieder 3 Halbtöne. Der Akkord schließt sich also zu einem **perfekten Quadrat**: 3 + 3 + 3 + 3 = 12.',
            media: el => {
              const c = PitchCircle();
              c.poly([0, 3, 6, 9], 'f1', false);
              [0, 3, 6, 9].forEach(p => c.dot(p, 'f1'));
              el.append(h('div', { class: 'circle-box' }, c.el), btnRow(PlayBtn('Quadrat anhören', () => Sound.chord([60, 63, 66, 69], { arp: 0.12 }))));
            },
          }),
          Steps.task({
            title: 'Färbe den Kreis',
            text: 'Tippe auf einen Ton. Er wird mit seinem ganzen verminderten Septakkord eingefärbt.\n\nWie viele Akkorde brauchst du, bis alle zwölf Töne Farbe haben?',
            mount: circleColoring(3, {
                badge: 'symmetry',
                doneMsg: taps => `Mit **${taps} Akkorden** sind alle zwölf Töne abgedeckt. Mehr verschiedene verminderte Septakkorde gibt es nicht.`,
              }),
          }),
          Steps.mc({
            prompt: 'Wie viele **klanglich verschiedene** verminderte Septakkorde gibt es?',
            options: ['3', '4', '6', '12'], keepOrder: true, answer: '3',
            explain: 'Jeder Akkord belegt 4 der 12 Töne: 12 ÷ 4 = 3. Alle anderen sind nur Umkehrungen oder Umbenennungen davon.',
            wrong: 'Denk an den Kreis: Wie viele Farben hast du gebraucht?',
          }),
          Steps.mc({
            prompt: 'Verschiebe C – Es – Ges – A um eine kleine Terz nach oben. Was kommt heraus?',
            media: el => el.append(btnRow(
              PlayBtn('C – Es – Ges – A', () => Sound.chord([60, 63, 66, 69], { arp: 0.1 })),
              PlayBtn('Es – Ges – A – C', () => Sound.chord([63, 66, 69, 72], { arp: 0.1 })))),
            options: [
              'Dieselben vier Töne in anderer Lage',
              { t: 'Ein neuer verminderter Septakkord', why: 'Schau genau hin: Es, Ges und A waren schon dabei, und C auch.' },
              { t: 'Ein Dominantseptakkord', why: 'Alle Abstände bleiben 3 Halbtöne, die Akkordart ändert sich nicht.' },
              { t: 'Ein Moll-Dreiklang', why: 'Es sind weiterhin vier Töne mit lauter kleinen Terzen.' },
            ],
            answer: 'Dieselben vier Töne in anderer Lage',
            explain: 'Es – Ges – A – C enthält genau die Töne von C – Es – Ges – A. Der Akkord ist seine eigene Umkehrung.',
          }),
          Steps.mc({
            prompt: 'Der **übermäßige Dreiklang** stapelt große Terzen: 4 + 4 + 4 = 12. Im Kreis ergibt das ein gleichseitiges Dreieck. Wie viele verschiedene übermäßige Dreiklänge gibt es?',
            media: el => {
              const c = PitchCircle();
              c.poly([0, 4, 8], 'f2', false);
              [0, 4, 8].forEach(p => c.dot(p, 'f2'));
              el.append(h('div', { class: 'circle-box circle-box--sm' }, c.el));
            },
            options: ['2', '3', '4', '6'], keepOrder: true, answer: '4',
            explain: 'Jedes Dreieck belegt 3 der 12 Töne: 12 ÷ 3 = 4. Gleiche Logik wie beim Quadrat.',
            wrong: 'Ein Dreieck belegt 3 der 12 Töne. Wie oft passt das in den Kreis?',
          }),
        ],
      },
      {
        id: 'hoeren', fam: 2, ear: true,
        title: 'Hören',
        sub: 'Den Klang sicher erkennen',
        takeaway: 'Du erkennst den verminderten Septakkord am Klang, auch zwischen seinen nächsten Verwandten.',
        steps: () => {
          const types = shuffle(['dim7', 'dim7', pick(['hdim7', 'm7']), 'dom7', pick(EAR_TYPES)]);
          return [
            Steps.info({
              title: 'Wie klingt vermindert?',
              text: 'Der verminderte Septakkord klingt gespannt und unentschlossen. Im Stummfilm kündigte er gern den Bösewicht an.\n\nVergleiche ihn mit seinen drei nächsten Verwandten, alle auf dem Ton C.',
              gate: true,
              media: earCompare(EAR_TYPES, 'dim7'),
            }),
            ...types.map((t, i) => earQuestion(i + 1, t)),
            oddOneOutDim(),
          ];
        },
      },
      {
        id: 'aufloesung', fam: 3,
        title: 'Auflösung',
        sub: 'Wohin die Spannung will',
        takeaway: 'Der **Leitton** steigt einen Halbton zum Grundton, die anderen Töne fallen. So löst sich der Akkord in seine Tonika auf.',
        steps: () => [
          Steps.info({
            title: 'Spannung will sich lösen',
            text: 'In c-Moll steht der verminderte Septakkord auf der 7. Stufe, dem **Leitton** H: H – D – F – As.\n\nJeder seiner Töne liegt dicht neben einem Ton des c-Moll-Akkords. Drück auf **Auflösen** und beobachte, wohin die Töne wandern.',
            gate: true,
            media: resolutionDemo,
          }),
          Steps.mc({
            prompt: 'Welcher Ton in H – D – F – As ist der Leitton zum C?',
            options: [
              'H',
              { t: 'D', why: 'D liegt einen Ganzton über C. Ein Leitton liegt einen Halbton darunter.' },
              { t: 'F', why: 'F fällt eher zum Es.' },
              { t: 'As', why: 'As fällt zum G.' },
            ],
            keepOrder: true, answer: 'H',
            explain: 'H liegt einen Halbton unter C und steigt dorthin. Das macht ihn zum Leitton.',
          }),
          Steps.mc({
            prompt: 'Wohin löst sich **Gis – H – D – F** am natürlichsten auf?',
            options: [
              'a-Moll',
              { t: 'G-Dur', why: 'Dafür müsste Gis fallen. Ein Leitton steigt aber.' },
              { t: 'C-Dur', why: 'H führt zwar zu C, aber in dieser Schreibweise ist Gis der Grundton und damit der Leitton.' },
              { t: 'e-Moll', why: 'Kein Ton des Akkords liegt einen Halbton unter E.' },
            ],
            answer: 'a-Moll',
            explain: 'Gis ist Grundton und Leitton: Er steigt einen Halbton zum A.',
          }),
          Steps.keys({
            prompt: 'Cis – E – G – B löst sich nach **d-Moll** auf. Spiele den Zielakkord.',
            from: 60, to: 77, max: 3,
            marks: [[61, 'mk-ref', 'Cis'], [64, 'mk-ref', 'E'], [67, 'mk-ref', 'G'], [70, 'mk-ref', 'B']],
            check: pcSetCheck([2, 5, 9], 'd-Moll besteht aus D, F und A.'),
            solution: [62, 65, 69],
            explain: 'Cis steigt zum D, E und G gehen zum F, B fällt zum A.',
          }),
          Steps.mc({
            prompt: 'Und wohin geht das **As** in H – D – F – As?',
            options: [
              'Einen Halbton abwärts zum G',
              { t: 'Einen Halbton aufwärts zum A', why: 'A kommt in c-Moll nicht vor. As strebt nach unten.' },
              { t: 'Es bleibt liegen', why: 'As gehört nicht zum c-Moll-Akkord, es muss sich bewegen.' },
              { t: 'Es springt zum C', why: 'Möglich, aber nicht natürlich. Der nächste Zielton liegt einen Halbton tiefer.' },
            ],
            answer: 'Einen Halbton abwärts zum G',
            explain: 'As fällt zur Quinte G. H steigt, As fällt: Die verminderte Septime H – As löst sich nach innen auf.',
          }),
        ],
      },
      {
        id: 'umdeutung', fam: 1,
        title: 'Enharmonische Umdeutung',
        sub: 'Ein Akkord, vier Tonarten',
        takeaway: 'Jeder der vier Töne kann Leitton sein. Ein einziger verminderter Septakkord führt in **vier** Tonarten.',
        steps: () => [
          Steps.info({
            title: 'Ein Akkord, vier Ziele',
            text: 'Weil alle Abstände gleich sind, kann **jeder** der vier Töne der Leitton sein. Je nachdem, welchen Ton du als Leitton hörst, heißt der Akkord anders und löst sich in eine andere Tonart auf.\n\nDas nennt man **enharmonische Umdeutung**. Komponisten nutzen sie seit dem Barock, um überraschend in entfernte Tonarten zu wechseln.',
          }),
          Steps.task({
            title: 'Wähle den Leitton',
            text: 'Tippe nacheinander jeden Ton von H – D – F – As an. Er wird zum Leitton, der Akkord wird passend umbenannt und löst sich auf.',
            mount: leittonExplorer,
          }),
          Steps.mc({
            prompt: 'Wie viele verschiedene Grundtöne kann ein verminderter Septakkord über seinen Leitton ansteuern?',
            options: ['1', '2', '4', '12'], keepOrder: true, answer: '4',
            explain: 'Vier Töne, vier mögliche Leittöne, vier Ziele. Jedes davon in Moll oder Dur.',
            wrong: 'Wie viele Töne hat der Akkord? Jeder kann Leitton sein.',
          }),
          Steps.mc({
            prompt: 'D – F – As – Ces klingt genauso wie H – D – F – As. Wohin löst sich **D – F – As – Ces** auf?',
            options: [
              'es-Moll',
              { t: 'c-Moll', why: 'Das wäre die Lesart H – D – F – As. Hier ist D der Grundton.' },
              { t: 'd-Moll', why: 'D ist schon im Akkord. Der Leitton steigt einen Halbton.' },
              { t: 'as-Moll', why: 'As ist ein Akkordton, kein Ziel.' },
            ],
            answer: 'es-Moll',
            explain: 'In dieser Schreibweise ist D der Grundton und Leitton. D steigt zum Es.',
          }),
          Steps.mc({
            prompt: 'Welcher Ton muss der Leitton sein, damit sich H – D – F – As nach **A** auflöst?',
            options: [
              { t: 'H', why: 'H steigt zum C.' },
              { t: 'D', why: 'D steigt zum Es.' },
              { t: 'F', why: 'F, umgedeutet zu Eis, steigt zum Fis.' },
              'As',
            ],
            keepOrder: true, answer: 'As',
            explain: 'As wird zu Gis umgedeutet: Gis – H – D – F. Gis steigt einen Halbton zum A.',
          }),
          Steps.mc({
            prompt: 'Welches Ziel ist für H – D – F – As über einen Leitton **nicht** erreichbar?',
            options: ['C', 'Es', 'Fis', 'G'], keepOrder: true, answer: 'G',
            explain: 'Die Ziele liegen je einen Halbton über einem Akkordton: C, Es, Fis und A. Für G bräuchte man Fis – A – C – Es.',
            wrong: 'Suche den Ton, der keinen Akkordton einen Halbton unter sich hat.',
          }),
        ],
      },
    ],
  });

  function oddOneOutDim() {
    return oddOneOut({
      title: 'Finde den Verminderten',
      prompt: 'Drei Klänge, aber nur einer ist ein verminderter Septakkord. Welcher?',
      target: 'dim7',
      others: ['hdim7', 'dom7', 'm7'],
      wrong: 'Hör dir alle drei noch einmal an. Der verminderte klingt am unruhigsten.',
    });
  }
})();
