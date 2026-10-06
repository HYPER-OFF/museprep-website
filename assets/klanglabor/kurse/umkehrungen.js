'use strict';
/* Kurs: Umkehrungen der Akkorde – Grundstellung, Sextakkord, Quartsextakkord, Grundton finden, Stimmführung, hören. */

(() => {
  const POS = ['Grundstellung', 'Sextakkord', 'Quartsextakkord'];
  const ROLE = ['Grundton', 'Terz', 'Quinte'];
  const ROLE_ART = ['der Grundton', 'die Terz', 'die Quinte'];
  const PLACE = ['unten', 'in der Mitte', 'oben'];

  // Geprüfte Dreiklänge [Grundton, Art]; die Schreibweise entsteht durch Terzenschichtung.
  const POOL = [
    ['C', 'maj'], ['D', 'maj'], ['E', 'maj'], ['F', 'maj'], ['G', 'maj'], ['A', 'maj'], ['B', 'maj'], ['Es', 'maj'],
    ['A', 'min'], ['D', 'min'], ['E', 'min'], ['H', 'min'], ['C', 'min'], ['G', 'min'], ['F', 'min'], ['Fis', 'min'],
  ];
  const C_DUR = ['C', 'maj'];

  const rootPos = c => T.chord(n(c[0], 4), c[1]);
  const nameOf = (root, q) => (q === 'maj' ? T.durName(root) : T.mollName(root));
  const cname = c => nameOf(n(c[0], 4), c[1]);
  const same = (a, b) => a.l === b.l && a.a === b.a;
  const roleOf = (c, x) => rootPos(c).findIndex(r => same(r, x));
  const pcsOf = notes => notes.map(T.pc);
  const onLine = x => mod(T.step(x) - 30, 2) === 0;
  const as = inv => (inv === 0 ? 'in Grundstellung' : `als ${POS[inv]}`);
  const inPos = inv => (inv === 0 ? 'In der Grundstellung' : `Im ${POS[inv]}`);
  const posPhrase = inv => ['die **Grundstellung**', 'ein **Sextakkord**', 'ein **Quartsextakkord**'][inv];
  const pickOther = prev => { let c; do { c = pick(POOL); } while (c === prev); return c; };

  // Enge Lage: inv 0 = Grundstellung, 1 = Sextakkord, 2 = Quartsextakkord; tiefster Ton zwischen C4 und H4.
  function voicing(c, inv) {
    const ns = rootPos(c);
    for (let i = 0; i < inv; i++) { const lo = ns.shift(); ns.push({ ...lo, o: lo.o + 1 }); }
    const shift = Math.floor((T.midi(ns[0]) - 60) / 12);
    return ns.map(x => ({ ...x, o: x.o - shift }));
  }

  function staffMedia(v, opts = {}) {
    return el => {
      const st = Staff({ width: 220 });
      st.render([v], opts);
      el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord(midisOf(v), { arp: 0.06 }))));
    };
  }

  /* ---------- Fragen, die mehrere Kapitel nutzen ---------- */

  // Akkord in einer Stellung auf der Klaviatur greifen.
  function keysVoicing(c, inv) {
    const v = voicing(c, inv);
    const rp = rootPos(c);
    const name = cname(c);
    const how = [
      `Unten liegt der Grundton **${T.name(rp[0])}**, darüber zwei Terzen.`,
      `Unten liegt die Terz **${T.name(rp[1])}**, der Grundton ${T.name(rp[0])} ist nach oben gewandert.`,
      `Unten liegt die Quinte **${T.name(rp[2])}**, der Grundton ${T.name(rp[0])} liegt in der Mitte.`,
    ][inv];
    return Steps.keys({
      prompt: inv === 0
        ? `Spiele **${name}** in Grundstellung.`
        : `Spiele **${name}** als ${POS[inv]}: ${ROLE_ART[inv]} liegt unten.`,
      from: 60, to: 81, max: 3,
      check: bassCheck(pcsOf(rp), T.pc(v[0]), `${name} besteht aus ${T.join(rp)}.`),
      solution: midisOf(v),
      explain: `${T.join(v)}. ${how}`,
    });
  }

  // Welcher Ton liegt im Bass?
  function bassToneQuestion(c, inv) {
    const rp = rootPos(c);
    const name = cname(c);
    const v = voicing(c, inv);
    return Steps.mc({
      prompt: `Welcher Ton liegt im Bass, wenn **${name}** ${as(inv)} steht?`,
      options: rp.map((x, j) => (j === inv ? T.name(x) : {
        t: T.name(x),
        why: `${T.name(x)} ist ${ROLE_ART[j]} von ${name}. ${inPos(inv)} liegt ${j === 0 ? 'er' : 'sie'} ${PLACE[(j - inv + 3) % 3]}.`,
      })),
      answer: T.name(rp[inv]),
      explain: `${inPos(inv)} liegt ${ROLE_ART[inv]} unten: **${T.join(v)}**.`,
    });
  }

  // Stellung im Notenbild bestimmen (count = 2: nur Grundstellung und Sextakkord).
  function positionStaffQuestion(c, inv, count = 3) {
    const v = voicing(c, inv);
    const name = cname(c);
    return Steps.mc({
      prompt: 'Welche Stellung zeigt die Notenzeile?',
      media: staffMedia(v),
      options: POS.slice(0, count),
      keepOrder: true,
      answer: POS[inv],
      explain: `Unten liegt **${T.name(v[0])}**, ${ROLE_ART[inv]} von ${name}: ${posPhrase(inv)}.`,
      wrong: 'Finde zuerst den Grundton. Dann schau, welcher Akkordton unten liegt.',
    });
  }

  /* ---------- Kapitel 1: Grundstellung ---------- */

  function snowmanIntro(el) {
    const chords = [['C', 'maj'], ['A', 'min'], ['G', 'maj']].map(c => voicing(c, 0));
    const st = Staff({ width: 300 });
    st.render(chords, {
      captions: ['C-Dur', 'a-Moll', 'G-Dur'],
      onTap: i => Sound.chord(midisOf(chords[i]), { arp: 0.06 }),
    });
    el.append(st.el, h('p', { class: 'hint' }, 'Tippe auf einen Akkord, um ihn zu hören.'));
  }

  function inStaffRootQuestion(c, inv) {
    const v = voicing(c, inv);
    const name = cname(c);
    return Steps.mc({
      prompt: 'Steht dieser Akkord in Grundstellung?',
      media: staffMedia(v),
      options: ['Ja', 'Nein'],
      keepOrder: true,
      answer: inv === 0 ? 'Ja' : 'Nein',
      explain: inv === 0
        ? `Ja. Alle drei Noten sitzen ${onLine(v[0]) ? 'auf Linien' : 'in Zwischenräumen'}, eng übereinander: ein Schneemann. Unten liegt der Grundton **${T.name(v[0])}**, der Akkord ist ${name}.`
        : `Nein. Die Noten sitzen nicht alle auf Linien oder alle in Zwischenräumen. Unten liegt **${T.name(v[0])}**, ${ROLE_ART[inv]} von ${name}.`,
      wrong: 'Schau, ob alle drei Noten auf Linien oder alle in Zwischenräumen sitzen.',
    });
  }

  function spellRootQuestion(c) {
    const rp = rootPos(c);
    const name = cname(c);
    const other = [c[0], c[1] === 'maj' ? 'min' : 'maj'];
    const orp = rootPos(other);
    const v1 = voicing(c, 1), v2 = voicing(c, 2);
    return Steps.mc({
      prompt: `Welche Töne bilden **${name}** in Grundstellung, von unten gelesen?`,
      options: [
        T.join(rp),
        { t: T.join(v1), why: `Die Töne stimmen, aber unten liegt ${T.name(v1[0])}, die Terz. Das ist eine Umkehrung.` },
        { t: T.join(v2), why: `Die Töne stimmen, aber unten liegt ${T.name(v2[0])}, die Quinte. Das ist eine Umkehrung.` },
        { t: T.join(orp), why: `${T.name(orp[0])} – ${T.name(orp[1])} ist eine ${T.interval(orp[0], orp[1]).name.trim()}. Das wäre ${cname(other)}.` },
      ],
      answer: T.join(rp),
      explain: `${T.join(rp)}: der Grundton ${T.name(rp[0])} unten, darüber ${T.interval(rp[0], rp[1]).name.trim()} und ${T.interval(rp[1], rp[2]).name.trim()}.`,
    });
  }

  /* ---------- Kapitel 2: Sextakkord ---------- */

  function firstInversionIntro(el, api) {
    const ch = [voicing(C_DUR, 0), voicing(C_DUR, 1)];
    const st = Staff({ width: 260 });
    const draw = hl => st.render(ch, { captions: ['C – E – G', 'E – G – C'], hl });
    draw(-1);
    const heard = new Set();
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Hör dir beide Fassungen an.');
    const texts = [
      '**Grundstellung:** Unten liegt der Grundton C.',
      '**Erste Umkehrung:** Das C ist eine Oktave nach oben gewandert. Unten liegt jetzt die Terz E.',
    ];
    const btns = ['Grundstellung', 'Erste Umkehrung'].map((label, i) => PlayBtn(label, () => {
      Sound.chord(midisOf(ch[i]), { arp: 0.08 });
      draw(i);
      read.innerHTML = inline(texts[i]);
      heard.add(i);
      if (heard.size === 2) api.ready(true);
    }));
    el.append(st.el, btnRow(...btns), read);
  }

  // Umkehr-Maschine: Töne von unten nach oben oder von oben nach unten verlegen, Stellung live.
  function inversionMachine(el, done) {
    const LO = 55, HI = 79;
    const base = rootPos(C_DUR);
    let ns = base.slice();
    const seen = new Set([0]);
    let finished = false;
    const kb = Keyboard({ from: LO, to: HI, labels: 'white' });
    const staff = Staff({ width: 250 });
    const nameEl = h('p', { class: 'chord-name', 'aria-live': 'polite' });
    const read = h('p', { class: 'readout' });
    const bUp = h('button', { type: 'button', class: 'btn btn--outline' }, 'Untersten Ton nach oben');
    const bDown = h('button', { type: 'button', class: 'btn btn--outline' }, 'Obersten Ton nach unten');
    const NAMES = ['Grundstellung', 'Erste Umkehrung: Sextakkord', 'Zweite Umkehrung: Quartsextakkord'];
    bUp.addEventListener('click', () => { const lo = ns[0]; ns = [ns[1], ns[2], { ...lo, o: lo.o + 1 }]; update(true); });
    bDown.addEventListener('click', () => { const hi = ns[2]; ns = [{ ...hi, o: hi.o - 1 }, ns[0], ns[1]]; update(true); });

    function update(withSound) {
      const p = roleOf(C_DUR, ns[0]);
      kb.clearMarks();
      ns.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : 'mk-sel', T.name(x)));
      staff.render([ns], { captions: [T.join(ns)] });
      nameEl.innerHTML = inline(`**${NAMES[p]}**`);
      const ivs = ns.slice(1).map(x => T.interval(ns[0], x).name.trim()).join(' und ');
      read.innerHTML = inline(`Unten liegt **${T.name(ns[0])}**, ${ROLE_ART[p]}. Vom Bass aus: ${ivs}.`);
      bUp.disabled = T.midi(ns[0]) + 12 > HI;
      bDown.disabled = T.midi(ns[2]) - 12 < LO;
      if (withSound) Sound.chord(midisOf(ns), { arp: 0.06 });
      seen.add(p);
      if (!finished && seen.has(1) && seen.has(2)) {
        finished = true;
        done('Du hast alle drei Stellungen gehört. Die Töne bleiben C, E und G, nur der **Basston** wechselt: Grundton, Terz oder Quinte.');
      }
    }

    update(false);
    el.append(staff.el, nameEl, btnRow(bUp, bDown), kbWrap(kb.el), read);
  }

  /* ---------- Kapitel 3: Quartsextakkord ---------- */

  function threePositionsIntro(el) {
    const ch = [0, 1, 2].map(inv => voicing(C_DUR, inv));
    const st = Staff({ width: 360 });
    const draw = hl => st.render(ch, { captions: ['Grundstellung', 'Sextakkord', 'Quartsext'], hl });
    draw(-1);
    el.append(st.el, btnRow(POS.map((label, i) => PlayBtn(label, () => {
      Sound.chord(midisOf(ch[i]), { arp: 0.08 });
      draw(i);
    }))));
  }

  // Intervall-Lupe: obere Akkordtöne antippen und den Abstand zum Bass ablesen.
  function intervalLens(el, done) {
    const chords = [0, 1, 2].map(inv => voicing(C_DUR, inv));
    const NUM = { Terz: 3, Quarte: 4, Quinte: 5, Sexte: 6 };
    const found = new Set();
    let pos = 0, finished = false;
    const ivOf = (lo, x) => T.interval(lo, x).name.trim();
    const numOf = name => NUM[name.split(' ').pop()];
    const staff = Staff({ width: 220 });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf einen der beiden oberen Akkordtöne.');
    const list = h('ul', { class: 'moves is-on' });
    const kb = Keyboard({ from: 60, to: 79, labels: 'white', onPress: m => tap(m) });

    function paintList() {
      list.replaceChildren(...chords.map((ch, p) => {
        const nums = [1, 2].map(i => (found.has(`${p}:${i}`) ? numOf(ivOf(ch[0], ch[i])) : '?'));
        return h('li', { class: p === pos ? 'is-lead' : '' }, h('b', {}, nums.join(' und ')), h('span', {}, POS[p]));
      }));
    }
    function show() {
      const ch = chords[pos];
      kb.clearMarks();
      ch.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : 'mk-sel', T.name(x)));
      staff.render([ch], { captions: [T.join(ch)] });
      paintList();
    }
    function tap(m) {
      const ch = chords[pos];
      const i = ch.findIndex(x => T.midi(x) === m);
      if (i < 0) { read.innerHTML = inline(`**${T.pcName(m)}** gehört hier nicht zum Akkord. Tippe auf eine markierte Taste.`); return; }
      if (i === 0) { read.innerHTML = inline(`**${T.name(ch[0])}** ist der Bass selbst. Von ihm aus wird gezählt.`); return; }
      read.innerHTML = inline(`${T.name(ch[0])} – ${T.name(ch[i])}: **${ivOf(ch[0], ch[i])}**, ${T.midi(ch[i]) - T.midi(ch[0])} Halbtöne.`);
      found.add(`${pos}:${i}`);
      paintList();
      if (!finished && found.size === 6) {
        finished = true;
        done('Grundstellung: Terz und Quinte. Sextakkord: Terz und Sexte. Quartsextakkord: Quarte und Sexte. Die Namen der Umkehrungen kommen genau von diesen Abständen über dem Bass.');
      }
    }
    const seg = h('div', { class: 'seg umk-seg', role: 'group', 'aria-label': 'Stellung' });
    POS.forEach((label, p) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(p === pos) }, label);
      b.addEventListener('click', () => {
        pos = p;
        seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        show();
        Sound.chord(midisOf(chords[p]), { arp: 0.06 });
      });
      seg.append(b);
    });
    show();
    el.append(seg, staff.el, kbWrap(kb.el), read, list);
  }

  /* ---------- Kapitel 4: Grundton finden ---------- */

  function findRootIntro(el) {
    const ch = [T.notes('E4 A4 C5'), T.notes('A4 C5 E5')];
    const st = Staff({ width: 260 });
    st.render(ch, {
      captions: ['E – A – C', 'A – C – E'],
      onTap: i => Sound.chord(midisOf(ch[i]), { arp: 0.08 }),
    });
    el.append(st.el,
      h('p', { class: 'hint' }, 'Tippe auf einen Akkord, um ihn zu hören.'),
      h('p', { class: 'aside', html: inline('**Für Fortgeschrittene:** Vierklänge haben vier Töne und deshalb vier Stellungen: Grundstellung, **Quintsextakkord** (Terz im Bass), **Terzquartakkord** (Quinte im Bass) und **Sekundakkord** (Septime im Bass).') }));
  }

  // Grundton-Detektiv: in drei Akkorden den Grundton antippen.
  function rootDetective(el, done, api) {
    const ROUNDS = 3;
    let round = 0, busy = false, finished = false, cur = null, prev = null;
    const staff = Staff({ width: 260 });
    const chips = h('div', { class: 'btn-row' });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' });
    const count = h('p', { class: 'hint' });
    const above = (lo, x) => { const y = { ...x, o: lo.o }; return T.step(y) > T.step(lo) ? y : { ...y, o: y.o + 1 }; };

    function next() {
      const c = pickOther(prev);
      prev = c;
      const inv = pick([1, 2]);
      cur = { c, inv, v: voicing(c, inv) };
      busy = false;
      staff.render([cur.v]);
      chips.replaceChildren(...cur.v.map(x => h('button', { type: 'button', class: 'btn btn--outline', onclick: () => choose(x) }, T.name(x))));
      read.innerHTML = inline('Welcher Ton ist der Grundton? Tippe ihn an.');
      count.textContent = `Akkord ${round + 1} von ${ROUNDS}`;
      Sound.chord(midisOf(cur.v), { arp: 0.06 });
    }

    function choose(x) {
      if (busy || finished) return;
      const { c, inv, v } = cur;
      const rp = rootPos(c);
      const j = roleOf(c, x);
      if (j === 0) {
        busy = true;
        round++;
        const stacked = voicing(c, 0);
        staff.render([v, stacked], { captions: [T.join(v), cname(c)], hl: 1 });
        read.innerHTML = inline(`Richtig: Über **${T.name(x)}** stapeln sich zwei Terzen, ${T.join(rp)}. Der Akkord ist **${cname(c)}** als ${POS[inv]}.`);
        Sound.chord(midisOf(stacked), { arp: 0.06 });
        if (round >= ROUNDS) {
          finished = true;
          count.textContent = `${ROUNDS} von ${ROUNDS} entschlüsselt`;
          done('Drei Akkorde entschlüsselt. Der Grundton ist der Ton, über dem sich die beiden anderen als **Terzen** stapeln.');
        } else api.later(next, 2200);
        return;
      }
      const order = [rp[j], rp[(j + 1) % 3], rp[(j + 2) % 3]];
      const a = { ...order[0], o: 4 };
      const b = above(a, order[1]);
      const d = above(b, order[2]);
      Sound.piano(T.midi(x));
      read.innerHTML = inline(`Ab **${T.name(x)}** geschichtet: ${T.join([a, b, d])}. ${T.name(a)} – ${T.name(b)} ist eine ${T.interval(a, b).name.trim()}, ${T.name(b)} – ${T.name(d)} eine ${T.interval(b, d).name.trim()}. Das sind nicht zwei Terzen.`);
    }

    next();
    el.append(staff.el, chips, read, count);
  }

  function whichChordQuestion(c, inv) {
    const v = voicing(c, inv);
    const rp = rootPos(c);
    const name = cname(c);
    const other = inv === 1 ? v[1] : v[2];   // weder Bass noch Grundton
    const right = `${name}, ${POS[inv]}`;
    return Steps.mc({
      prompt: 'Welcher Akkord steht hier, und in welcher Stellung?',
      media: staffMedia(v),
      options: [
        right,
        { t: `${nameOf(v[0], c[1])}, Grundstellung`, why: 'Der tiefste Ton ist hier nicht der Grundton. Suche die Quarte im Akkord.' },
        { t: `${name}, ${POS[3 - inv]}`, why: 'Der Akkord stimmt. Prüfe noch, welcher Akkordton unten liegt.' },
        { t: `${nameOf(other, c[1])}, ${POS[3 - inv]}`, why: 'Schichte die Töne in Terzen. Welcher Ton steht dann unten?' },
      ],
      answer: right,
      explain: `Die Quarte ${T.name(rp[2])} – ${T.name(rp[0])} verrät den Grundton **${T.name(rp[0])}**. Unten liegt ${ROLE_ART[inv]} ${T.name(v[0])}: ${name} als **${POS[inv]}**.`,
    });
  }

  function keysRoot(c, inv) {
    const v = voicing(c, inv);
    const rp = rootPos(c);
    const rootKey = v.find(x => same(x, rp[0]));
    return Steps.keys({
      prompt: `Spiele den Grundton von **${T.join(v)}**.`,
      from: 60, to: 81,
      marks: v.map(x => [T.midi(x), 'mk-ref', T.name(x)]),
      check: pcCheck(T.pc(rp[0]), 'Suche die Quarte im Akkord. Ihr oberer Ton ist der Grundton.'),
      solution: [T.midi(rootKey)],
      explain: `${T.name(rp[2])} – ${T.name(rp[0])} ist die Quarte, ihr oberer Ton **${T.name(rp[0])}** ist der Grundton. Der Akkord ist ${cname(c)} als ${POS[inv]}.`,
    });
  }

  /* ---------- Kapitel 5: Stimmführung ---------- */

  function progressionCompare(el, api) {
    const A = ['C4 E4 G4', 'F4 A4 C5', 'G4 H4 D5', 'C4 E4 G4'].map(T.notes);
    const B = ['C4 E4 G4', 'C4 F4 A4', 'H3 D4 G4', 'C4 E4 G4'].map(T.notes);
    const caps = ['C-Dur', 'F-Dur', 'G-Dur', 'C-Dur'];
    const stA = Staff({ width: 320 });
    const stB = Staff({ width: 320 });
    const draw = (st, prog, hl) => st.render(prog, { labels: false, captions: caps, hl });
    draw(stA, A, -1);
    draw(stB, B, -1);
    const heard = new Set();
    const play = (st, prog, key) => () => {
      prog.forEach((ch, i) => {
        Sound.chord(midisOf(ch), { when: i * 0.85, dur: 1.1 });
        api.later(() => draw(st, prog, i), i * 850);
      });
      api.later(() => draw(st, prog, -1), prog.length * 850 + 400);
      heard.add(key);
      if (heard.size === 2) api.ready(true);
    };
    el.append(
      h('p', { class: 'mono-label' }, 'Alles in Grundstellung'), stA.el,
      btnRow(PlayBtn('Anhören', play(stA, A, 'a'))),
      h('p', { class: 'mono-label' }, 'Mit Umkehrungen'), stB.el,
      btnRow(PlayBtn('Anhören', play(stB, B, 'b'))));
  }

  const moveText = (a, b) => {
    const d = T.midi(b) - T.midi(a);
    if (d === 0) return [`${T.name(a)}`, 'bleibt liegen'];
    const size = Math.abs(d) === 1 ? 'Halbton' : Math.abs(d) === 2 ? 'Ganzton' : `${Math.abs(d)} Halbtöne`;
    return [`${T.name(a)} → ${T.name(b)}`, `${size} ${d > 0 ? 'aufwärts' : 'abwärts'}`];
  };
  const cost = (a, b) => a.reduce((sum, x, i) => sum + Math.abs(T.midi(b[i]) - T.midi(x)), 0);

  // Puzzle: zu einem Akkord die Stellung des nächsten Akkords mit den kürzesten Wegen wählen.
  function voiceLeading(el, done, api) {
    const ROUNDS = [
      { from: 'C4 E4 G4', fromName: 'C-Dur', toName: 'F-Dur', opts: ['F4 A4 C5', 'A3 C4 F4', 'C4 F4 A4'] },
      { from: 'C4 E4 G4', fromName: 'C-Dur', toName: 'a-Moll', opts: ['A4 C5 E5', 'A3 C4 E4', 'C4 E4 A4'] },
      { from: 'H3 D4 G4', fromName: 'G-Dur', toName: 'C-Dur', opts: ['C4 E4 G4', 'E4 G4 C5', 'G3 C4 E4'] },
    ];
    let r = 0, busy = false, finished = false;
    const staff = Staff({ width: 260 });
    const ask = h('p', { class: 'chord-name' });
    const opts = h('div', { class: 'btn-row' });
    const list = h('ul', { class: 'moves is-on' });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' });
    const count = h('p', { class: 'hint' });

    function show() {
      const R = ROUNDS[r];
      const from = T.notes(R.from);
      busy = false;
      staff.render([from, []], { captions: [R.fromName, R.toName], placeholder: true });
      ask.innerHTML = inline(`Von **${T.join(from)}** zu **${R.toName}**: Welche Stellung braucht die kürzesten Wege?`);
      opts.replaceChildren(...shuffle(R.opts).map(o => h('button', { type: 'button', class: 'btn btn--outline', onclick: () => choose(o) }, T.join(T.notes(o)))));
      list.replaceChildren();
      read.textContent = 'Wähle eine Stellung. Du hörst beide Akkorde nacheinander.';
      count.textContent = `Wechsel ${r + 1} von ${ROUNDS.length}`;
    }

    function choose(o) {
      if (busy || finished) return;
      const R = ROUNDS[r];
      const from = T.notes(R.from);
      const to = T.notes(o);
      const best = Math.min(...R.opts.map(x => cost(from, T.notes(x))));
      const c = cost(from, to);
      staff.render([from, to], { captions: [R.fromName, R.toName], hl: 1 });
      list.replaceChildren(...from.map((x, i) => {
        const [b, s] = moveText(x, to[i]);
        return h('li', { class: T.midi(x) === T.midi(to[i]) ? 'is-lead' : '' }, h('b', {}, b), h('span', {}, s));
      }));
      Sound.chord(midisOf(from), { dur: 1 });
      Sound.chord(midisOf(to), { when: 0.9, dur: 1.8 });
      const unit = c === 1 ? 'Halbton' : 'Halbtöne';
      if (c > best) {
        read.innerHTML = inline(`Insgesamt **${c} ${unit}** Bewegung. Das geht kürzer.`);
        return;
      }
      busy = true;
      const keep = from.filter((x, i) => T.midi(x) === T.midi(to[i])).map(T.name);
      read.innerHTML = inline(`Nur **${c} ${unit}** Bewegung insgesamt. ${keep.join(' und ')} ${keep.length === 1 ? 'bleibt' : 'bleiben'} liegen.`);
      r++;
      if (r >= ROUNDS.length) {
        finished = true;
        count.textContent = `${ROUNDS.length} von ${ROUNDS.length} geschafft`;
        done('Drei Wechsel, jedes Mal der kürzeste Weg. **Gemeinsame Töne bleiben liegen**, die anderen gehen einen Halb- oder Ganztonschritt.');
      } else api.later(show, 2600);
    }

    show();
    el.append(ask, staff.el, opts, list, read, count);
  }

  // Paare mit genau einem gemeinsamen Ton: [erster Akkord, zweiter Akkord].
  const COMMON_ONE = [
    [['C', 'maj'], ['F', 'maj']], [['C', 'maj'], ['G', 'maj']], [['G', 'maj'], ['D', 'maj']],
    [['F', 'maj'], ['B', 'maj']], [['D', 'maj'], ['A', 'maj']], [['A', 'maj'], ['D', 'maj']],
  ];

  function commonToneQuestion() {
    const [a, b] = pick(COMMON_ONE);
    const ra = rootPos(a), rb = rootPos(b);
    const common = ra.find(x => rb.some(y => same(x, y)));
    return Steps.mc({
      prompt: `Welcher Ton bleibt liegen, wenn du von **${cname(a)}** zu **${cname(b)}** wechselst?`,
      options: ra.map(x => (same(x, common) ? T.name(x) : { t: T.name(x), why: `${T.name(x)} kommt in ${cname(b)} nicht vor (${T.join(rb)}).` })),
      answer: T.name(common),
      explain: `${cname(a)} (${T.join(ra)}) und ${cname(b)} (${T.join(rb)}) teilen den Ton **${T.name(common)}**. Er bleibt liegen, die anderen Töne bewegen sich.`,
    });
  }

  function parallelCommonQuestion() {
    const major = pick([['C', 'maj'], ['G', 'maj'], ['F', 'maj'], ['D', 'maj']]);
    const [r, t, f] = rootPos(major);
    const minorRoot = T.transpose(r, -2, -3);
    const minor = [T.name(minorRoot), 'min'];
    const p = rootPos(minor)[0];
    const M = cname(major), m = cname(minor);
    const answer = `${T.name(r)} und ${T.name(t)}`;
    return Steps.mc({
      prompt: `Welche Töne bleiben liegen, wenn du von **${M}** zu **${m}** wechselst?`,
      options: [
        answer,
        { t: `${T.name(t)} und ${T.name(f)}`, why: `${T.name(f)} gehört nicht zu ${m}.` },
        { t: `${T.name(r)} und ${T.name(f)}`, why: `${T.name(f)} gehört nicht zu ${m}.` },
        { t: `${T.name(p)} und ${T.name(r)}`, why: `${T.name(p)} gehört nicht zu ${M}.` },
      ],
      answer,
      explain: `${M} und ${m} sind Paralleltonarten und teilen zwei Töne: **${T.name(r)}** und **${T.name(t)}**. Nur ${T.name(f)} geht einen Ganzton nach oben zum ${T.name(p)}.`,
    });
  }

  // Von C – E – G aus mit kleinster Bewegung greifen.
  const SMOOTH = [
    { name: 'F-Dur', pcs: [5, 9, 0], target: [60, 65, 69], explain: 'C bleibt liegen, E steigt einen Halbton zum F, G einen Ganzton zum A: **C – F – A**, F-Dur als Quartsextakkord.' },
    { name: 'a-Moll', pcs: [9, 0, 4], target: [60, 64, 69], explain: 'C und E bleiben liegen, nur G steigt einen Ganzton zum A: **C – E – A**, a-Moll als Sextakkord.' },
    { name: 'G-Dur', pcs: [7, 11, 2], target: [59, 62, 67], explain: 'G bleibt liegen, C fällt einen Halbton zum H, E einen Ganzton zum D: **H – D – G**, G-Dur als Sextakkord.' },
    { name: 'e-Moll', pcs: [4, 7, 11], target: [59, 64, 67], explain: 'E und G bleiben liegen, nur C fällt einen Halbton zum H: **H – E – G**, e-Moll als Quartsextakkord.' },
  ];

  function keysSmooth() {
    const t = pick(SMOOTH);
    const set = pcSetCheck(t.pcs, '');
    return Steps.keys({
      prompt: `Die Hand liegt auf **C – E – G**. Spiele **${t.name}** so, dass sie sich möglichst wenig bewegt.`,
      from: 55, to: 76, max: 3,
      marks: [[60, 'mk-ref', 'C'], [64, 'mk-ref', 'E'], [67, 'mk-ref', 'G']],
      check: sel => {
        if (sel.length < 3) return { ok: false, msg: `Du hast erst ${sel.length} von 3 Tönen gewählt.` };
        const s2 = sel.slice().sort((a, b) => a - b);
        if (s2.join() === t.target.join()) return { ok: true };
        if (set(sel).ok) return { ok: false, msg: `Das ist ${t.name}, aber die Hand bewegt sich mehr als nötig. Welche Töne von C – E – G können liegen bleiben?` };
        return { ok: false, msg: `${s2.map(T.pcName).join(' – ')} ist noch nicht ${t.name}. Denk an die drei Töne von ${t.name}.` };
      },
      solution: t.target,
      explain: t.explain,
    });
  }

  /* ---------- Kapitel 6: Hören ---------- */

  const EAR_TIPS = [
    'Gebrochen hörst du von unten zwei Terzen übereinander, der Klang ruht.',
    'Gebrochen hörst du erst eine Terz, dann oben den Sprung einer Quarte.',
    'Gebrochen hörst du unten den Sprung einer Quarte, dann eine Terz. Der Klang schwebt.',
  ];

  function positionsListen(el, api) {
    const ch = [0, 1, 2].map(inv => voicing(C_DUR, inv));
    const st = Staff({ width: 360 });
    const draw = hl => st.render(ch, { captions: ['Grundstellung', 'Sextakkord', 'Quartsext'], hl });
    draw(-1);
    const heard = new Set();
    el.append(st.el,
      h('div', { class: 'ear-grid' }, POS.map((label, i) => PlayBtn(label, () => {
        const m = midisOf(ch[i]);
        Sound.chord(m);
        Sound.chord(m, { when: 1.1, arp: 0.25 });
        draw(i);
        heard.add(i);
        if (heard.size === 3) api.ready(true);
      }))),
      h('p', { class: 'hint' }, 'Jeder Knopf spielt den Akkord erst zusammen, dann gebrochen von unten. Hör dir alle drei an.'));
  }

  function positionEar(no, inv, mode) {
    const c = pick(POOL);
    const m = midisOf(voicing(c, inv)).map(x => x - 12);
    const block = () => Sound.chord(m);
    const broken = () => Sound.chord(m, { arp: 0.25 });
    const role = mode === 'role';
    return Steps.mc({
      title: `Hörprobe ${no}`,
      prompt: role ? 'Welcher Akkordton liegt unten?' : 'In welcher Stellung erklingt der Akkord?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Nochmal hören', block), PlayBtn('Gebrochen', broken, { variant: 'quiet' })));
        api.later(block, 350);
      },
      options: role ? ROLE : POS,
      keepOrder: true,
      answer: role ? ROLE[inv] : POS[inv],
      explain: `Das war ${cname(c)} als **${POS[inv]}**, unten lag ${ROLE_ART[inv]}. ${EAR_TIPS[inv]}`,
      wrong: 'Spiel den Akkord gebrochen und achte auf die Quarte: Liegt sie unten, oben oder gar nicht im Akkord?',
    });
  }

  function rootOddOne() {
    const c = pick(POOL);
    const order = shuffle([0, 1, 2]);
    const L = ['A', 'B', 'C'];
    const ms = order.map(inv => midisOf(voicing(c, inv)).map(x => x - 12));
    const right = L[order.indexOf(0)];
    const others = order.map((inv, i) => (inv ? `Klang ${L[i]} war ein ${POS[inv]}` : '')).filter(Boolean).join(', ');
    return Steps.mc({
      title: 'Finde die Grundstellung',
      prompt: `Dreimal **${cname(c)}**, jedes Mal in einer anderen Stellung. Welcher Klang steht in Grundstellung?`,
      media: el => el.append(btnRow(ms.map((m, i) => PlayBtn('Klang ' + L[i], () => Sound.chord(m))))),
      options: L.map(x => 'Klang ' + x),
      keepOrder: true,
      answer: 'Klang ' + right,
      explain: `Klang ${right} war die Grundstellung, mit dem Grundton im Bass. ${others}.`,
      wrong: 'Hör auf den tiefsten Ton. In der Grundstellung klingt der Akkord am festesten.',
    });
  }

  /* ---------- Kopfbild ---------- */
  function visual() {
    const ch = [0, 1, 2].map(inv => voicing(C_DUR, inv));
    const st = Staff({ width: 400 });
    st.render(ch, {
      captions: ['Grundstellung', 'Sextakkord', 'Quartsext'],
      onTap: i => Sound.chord(midisOf(ch[i]), { arp: 0.06 }),
    });
    return { label: 'Drei Stellungen · zum Anhören antippen', foot: 'Gleiche Töne, anderer Basston', el: st.el };
  }

  /* ---------- Blitzrunde ---------- */
  const pickVoicing = invs => { const c = pick(POOL); const inv = pick(invs); return { c, inv, v: voicing(c, inv) }; };

  function aGrund() {
    const { inv, v } = pickVoicing([0, 0, 1, 2]);
    return {
      tag: 'Grundstellung?',
      prompt: `Steht **${T.join(v)}** in Grundstellung?`,
      options: ['Ja', 'Nein'],
      answer: inv === 0 ? 'Ja' : 'Nein',
    };
  }

  function aSext() {
    const { inv, v } = pickVoicing([0, 1]);
    return {
      tag: 'Stellung',
      prompt: `Grundstellung oder Sextakkord: **${T.join(v)}**?`,
      options: ['Grundstellung', 'Sextakkord'],
      answer: POS[inv],
    };
  }

  function aBass() {
    const { c, inv, v } = pickVoicing([0, 1, 2]);
    return {
      tag: 'Basston',
      prompt: `Welcher Ton liegt im Bass, wenn **${cname(c)}** ${as(inv)} steht?`,
      options: shuffle(rootPos(c).map(T.name)),
      answer: T.name(v[0]),
    };
  }

  function aRoot() {
    const { c, v } = pickVoicing([1, 2]);
    return {
      tag: 'Grundton',
      prompt: `Wie heißt der Grundton von **${T.join(v)}**?`,
      options: shuffle(v.map(T.name)),
      answer: T.name(rootPos(c)[0]),
    };
  }

  function aEar() {
    const { c, inv, v } = pickVoicing([0, 1, 2]);
    return {
      tag: 'Hörprobe',
      prompt: 'In welcher Stellung erklingt der Akkord?',
      key: `${c[0]}-${c[1]}-${inv}`,
      play: midisOf(v).map(x => x - 12),
      options: POS,
      answer: POS[inv],
    };
  }

  defineCourse({
    id: 'umkehrungen',
    short: 'Umkehrungen',
    title: ['Umkehrungen der ', 'Akkorde'],
    topic: 'Harmonielehre',
    sub: 'Grundstellung, Sextakkord, Quartsextakkord',
    lead: 'Dieselben drei Töne, neu gestapelt. Du lernst Grundstellung, Sextakkord und Quartsextakkord kennen, findest in jeder Lage den Grundton und hörst, welcher Ton im Bass liegt.',
    visual,
    badge: { id: 'umk-kurs', glyph: '\u{1D10A}', name: 'Umkehrkünstler', desc: 'Den Kurs zu den Umkehrungen der Akkorde abgeschlossen.' },
    arcade: [
      { id: 'umk-grund', name: 'Grundstellung erkennen', gen: aGrund, needs: 'umk-grundstellung' },
      { id: 'umk-sext', name: 'Sextakkord erkennen', gen: aSext, needs: 'umk-sextakkord' },
      { id: 'umk-bass', name: 'Basston finden', gen: aBass, needs: 'umk-quartsext' },
      { id: 'umk-root', name: 'Grundton finden', gen: aRoot, needs: 'umk-erkennen' },
      { id: 'umk-ear', name: 'Hörprobe Stellung', gen: aEar, needs: 'umk-hoeren' },
    ],
    levels: [
      {
        id: 'umk-grundstellung',
        title: 'Grundstellung',
        sub: 'Der Grundton liegt unten',
        takeaway: 'In der **Grundstellung** liegt der Grundton unten, darüber zwei Terzen. Im Notenbild sitzen alle drei Noten auf Linien oder alle in Zwischenräumen: der **Schneemann**.',
        steps: () => {
          const c1 = pick(POOL), c2 = pickOther(c1), c3 = pick(POOL), c4 = pickOther(c3);
          return [
            Steps.info({
              title: 'Grundton unten, Terzen darüber',
              text: 'Bisher hast du Dreiklänge immer gleich gebaut: Grundton, darüber eine Terz, darüber noch eine Terz. Diese Anordnung heißt **Grundstellung**. Der tiefste Ton, der **Basston**, ist dann der Grundton.\n\nIm Notenbild erkennst du die Grundstellung sofort: Die drei Noten sitzen alle auf Linien oder alle in Zwischenräumen, eng übereinander wie ein **Schneemann**.',
              media: snowmanIntro,
            }),
            keysVoicing(c1, 0),
            bassToneQuestion(c2, 0),
            inStaffRootQuestion(c3, pick([0, 0, 1, 2])),
            spellRootQuestion(c4),
          ];
        },
      },
      {
        id: 'umk-sextakkord',
        title: 'Die erste Umkehrung',
        sub: 'Der Sextakkord: die Terz im Bass',
        takeaway: 'Legst du den Grundton eine Oktave höher, liegt die **Terz im Bass**. Vom Bass aus klingen eine Terz und eine Sexte: der **Sextakkord**.',
        steps: () => {
          const c1 = pick(POOL), c2 = pickOther(c1), c3 = pick(POOL);
          return [
            Steps.info({
              title: 'Der unterste Ton wandert nach oben',
              text: 'Nimm den untersten Ton und lege ihn eine Oktave höher: Aus C – E – G wird **E – G – C**. Es sind dieselben drei Töne, der Akkord heißt weiter C-Dur. Aber jetzt liegt die **Terz** unten.\n\nDiese Anordnung heißt **erste Umkehrung**. Hör dir beide an.',
              gate: true,
              media: firstInversionIntro,
            }),
            Steps.task({
              title: 'Die Umkehr-Maschine',
              text: 'Verlege Töne von unten nach oben oder von oben nach unten. Notenzeile, Klaviatur und Name zeigen dir jede Stellung.\n\n**Ziel:** Finde neben der Grundstellung die beiden anderen Stellungen von C-Dur.',
              mount: inversionMachine,
            }),
            Steps.mc({
              prompt: 'In E – G – C liegt vom Bass E aus eine Terz zum G. Welches Intervall liegt zwischen dem Bass E und dem oberen **C**?',
              options: [
                'Sexte',
                { t: 'Quinte', why: 'E – H wäre die Quinte. Zähl die Notennamen von E bis C.' },
                { t: 'Quarte', why: 'E – A wäre die Quarte. Zähl die Notennamen von E bis C.' },
                { t: 'Septime', why: 'E – D wäre die Septime. Das C liegt einen Notennamen tiefer.' },
              ],
              keepOrder: true,
              answer: 'Sexte',
              explain: 'E F G A H C: sechs Notennamen, also eine **Sexte**. Terz und Sexte über dem Bass geben dem **Sextakkord** seinen Namen; die Terz lässt man im Namen weg.',
            }),
            keysVoicing(c1, 1),
            bassToneQuestion(c2, 1),
            positionStaffQuestion(c3, pick([0, 1]), 2),
          ];
        },
      },
      {
        id: 'umk-quartsext',
        title: 'Die zweite Umkehrung',
        sub: 'Der Quartsextakkord: die Quinte im Bass',
        takeaway: 'Liegt die **Quinte im Bass**, klingen vom Bass aus eine Quarte und eine Sexte: der **Quartsextakkord**, zum Beispiel G – C – E.',
        steps: () => {
          const c1 = pick(POOL), c2 = pickOther(c1), c3 = pick(POOL);
          return [
            Steps.info({
              title: 'Jetzt liegt die Quinte unten',
              text: 'Lege auch die Terz noch eine Oktave höher: Aus E – G – C wird **G – C – E**. Jetzt liegt die **Quinte** unten.\n\nVom Bass G aus zählst du bis C vier Notennamen, eine **Quarte**, und bis E sechs, eine **Sexte**. Deshalb heißt diese zweite Umkehrung **Quartsextakkord**.',
              media: threePositionsIntro,
            }),
            Steps.task({
              title: 'Vom Bass aus zählen',
              text: 'Wähle eine Stellung und tippe auf die beiden oberen Akkordtöne. Du siehst, welches Intervall sie über dem Bass bilden.\n\n**Ziel:** Miss alle sechs Abstände in den drei Stellungen.',
              mount: intervalLens,
            }),
            keysVoicing(c1, 2),
            bassToneQuestion(c2, 2),
            positionStaffQuestion(c3, pick([0, 1, 2, 2])),
            Steps.mc({
              prompt: 'Über dem Bass liegen eine **Quarte** und eine **Sexte**. Welcher Akkordton ist der Bass?',
              options: [
                { t: 'Grundton', why: 'Über dem Grundton liegen eine Terz und eine Quinte.' },
                { t: 'Terz', why: 'Über der Terz liegen eine Terz und eine Sexte.' },
                'Quinte',
              ],
              keepOrder: true,
              answer: 'Quinte',
              explain: 'G – C – E: Von der Quinte G aus ist C eine Quarte und E eine Sexte entfernt. Daher der Name **Quartsextakkord**.',
            }),
          ];
        },
      },
      {
        id: 'umk-erkennen',
        title: 'Den Grundton finden',
        sub: 'Jede Stellung entschlüsseln',
        takeaway: 'Schichte die Töne in Terzen, dann steht der **Grundton** unten. Schneller geht es mit der **Quarte**: Ihr oberer Ton ist der Grundton.',
        steps: () => {
          const c1 = pick(POOL), c2 = pickOther(c1);
          return [
            Steps.info({
              title: 'Wo steckt der Grundton?',
              text: 'In einer Umkehrung liegt der Grundton nicht unten. So findest du ihn trotzdem:\n\n**Umschichten:** Ordne die Töne so, dass sie Terzen bilden. Der unterste ist dann der Grundton.\n**Abkürzung:** Liegt im Akkord eine **Quarte**, ist ihr **oberer** Ton der Grundton. In E – A – C ist E – A die Quarte, also ist A der Grundton: a-Moll.',
              media: findRootIntro,
            }),
            Steps.task({
              title: 'Der Grundton-Detektiv',
              text: 'Drei Akkorde in Umkehrungen. Tippe jeweils auf den Ton, den du für den Grundton hältst.\n\nLiegst du daneben, siehst du, warum sich ab diesem Ton keine Terzen stapeln.',
              mount: rootDetective,
            }),
            whichChordQuestion(c1, pick([1, 2])),
            keysRoot(c2, pick([1, 2])),
            Steps.mc({
              prompt: 'In welcher Stellung liegt die Quarte ganz **unten**, zwischen Bass und mittlerem Ton?',
              options: [
                { t: 'Grundstellung', why: 'In der Grundstellung liegen nur zwei Terzen übereinander, keine Quarte.' },
                { t: 'Sextakkord', why: 'Beim Sextakkord liegt die Quarte oben, zum Beispiel G – C in E – G – C.' },
                'Quartsextakkord',
              ],
              keepOrder: true,
              answer: 'Quartsextakkord',
              explain: 'G – C – E: G – C ist die Quarte, ganz unten. Ihr oberer Ton C ist der Grundton, der Bass G ist die Quinte.',
            }),
            Steps.mc({
              prompt: 'Auch Vierklänge lassen sich umkehren. Liegt die **Septime** unten, heißt das **Sekundakkord**. Welcher Ton liegt bei G – H – D – F als Sekundakkord im Bass?',
              options: [
                { t: 'G', why: 'G ist der Grundton. Er liegt in der Grundstellung unten.' },
                { t: 'H', why: 'H ist die Terz. Liegt sie unten, heißt der Akkord Quintsextakkord.' },
                { t: 'D', why: 'D ist die Quinte. Liegt sie unten, heißt der Akkord Terzquartakkord.' },
                'F',
              ],
              keepOrder: true,
              answer: 'F',
              explain: 'F ist die Septime von G – H – D – F. Im Sekundakkord F – G – H – D liegt sie unten. Zwischen F und G liegt eine **Sekunde**, daher der Name.',
            }),
          ];
        },
      },
      {
        id: 'umk-stimmfuehrung',
        title: 'Kurze Wege',
        sub: 'Umkehrungen verbinden Akkorde',
        takeaway: '**Gemeinsame Töne bleiben liegen**, die anderen gehen den kürzesten Weg. Mit Umkehrungen klingt C – F – G – C ruhig und verbunden.',
        steps: () => [
          Steps.info({
            title: 'Springen oder gleiten',
            text: 'Spielst du C – F – G – C immer in Grundstellung, springt die ganze Hand hin und her. Mit Umkehrungen geht es ruhiger: **Gemeinsame Töne bleiben liegen**, die anderen bewegen sich nur einen Schritt.\n\nHör dir beide Fassungen an.',
            gate: true,
            media: progressionCompare,
          }),
          Steps.task({
            title: 'Der kürzeste Weg',
            text: 'Wähle für den nächsten Akkord die Stellung, bei der sich die Töne am wenigsten bewegen. Unter der Notenzeile siehst du jeden Weg.\n\n**Ziel:** dreimal den kürzesten Weg finden.',
            mount: voiceLeading,
          }),
          commonToneQuestion(),
          parallelCommonQuestion(),
          keysSmooth(),
          Steps.mc({
            prompt: 'Warum klingt C – F – G – C mit Umkehrungen ruhiger als in lauter Grundstellungen?',
            options: [
              'Gemeinsame Töne bleiben liegen, die anderen gehen kleine Schritte',
              { t: 'Die Akkorde werden leiser', why: 'An der Lautstärke ändert sich nichts. Achte auf die Wege der einzelnen Töne.' },
              { t: 'Es erklingen weniger Töne', why: 'Es sind in beiden Fassungen immer drei Töne.' },
              { t: 'Die Akkorde wechseln die Tonart', why: 'Beide Fassungen bleiben in C-Dur: Tonika, Subdominante, Dominante, Tonika.' },
            ],
            answer: 'Gemeinsame Töne bleiben liegen, die anderen gehen kleine Schritte',
            explain: 'Jede Stimme nimmt den kürzesten Weg. So hängen die Akkorde zusammen, statt hin und her zu springen.',
          }),
        ],
      },
      {
        id: 'umk-hoeren', ear: true,
        title: 'Was liegt im Bass?',
        sub: 'Stellungen am Klang erkennen',
        takeaway: 'Achte auf den **tiefsten Ton** und auf die Quarte: keine Quarte heißt Grundstellung, Quarte oben Sextakkord, Quarte unten **Quartsextakkord**.',
        steps: () => {
          const invs = shuffle([0, 1, 2, pick([0, 1, 2])]);
          return [
            Steps.info({
              title: 'Gleiche Töne, anderer Klang',
              text: 'Alle drei Stellungen haben dieselben Töne und klingen doch verschieden. Die **Grundstellung** klingt fest und ruhig, der **Sextakkord** leichter, der **Quartsextakkord** schwebend, als wollte er weiter.\n\nHör dir alle drei an.',
              gate: true,
              media: positionsListen,
            }),
            ...invs.map((inv, i) => positionEar(i + 1, inv)),
            positionEar(5, pick([0, 1, 2]), 'role'),
            rootOddOne(),
          ];
        },
      },
    ],
  });
})();
