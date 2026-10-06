'use strict';
/* Kurs: Moll-Akkorde – kleine Terz, Aufbau, Schreibweise, Parallel- und Varianttonart, Stufen, Hören. */

(() => {
  const minor = (root, o = 4) => T.chord(n(root, o), 'min');
  const major = (root, o = 4) => T.chord(n(root, o), 'maj');
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  // Leitereigener Dreiklang auf einer Stammtonstufe (nur weiße Tasten, also C-Dur).
  const whiteTriad = d => [T.fromStep(d), T.fromStep(d + 2), T.fromStep(d + 4)];
  function triadKind(ns) {
    const ms = midisOf(ns);
    return { '4,3': 'maj', '3,4': 'min', '3,3': 'dim', '4,4': 'aug' }[[ms[1] - ms[0], ms[2] - ms[1]].join()];
  }
  function triadLabel(ns) {
    const k = triadKind(ns);
    return k === 'maj' ? T.durName(ns[0]) : k === 'min' ? T.mollName(ns[0]) : CH[k].name;
  }

  /* ---------- Experimente ---------- */

  // Kapitel 1: C-Dur und c-Moll nebeneinander, die Terz wandert einen Halbton.
  function durMollCompare(el) {
    const st = Staff({ width: 250 });
    const kb = Keyboard({ from: 60, to: 72, labels: 'white' });
    const items = [
      { label: 'C-Dur', notes: major('C') },
      { label: 'c-Moll', notes: minor('C') },
    ];
    const show = i => {
      st.render(items.map(x => x.notes), { captions: items.map(x => x.label), hl: i });
      kb.clearMarks();
      if (i >= 0) items[i].notes.forEach((x, k) => kb.mark(T.midi(x), k === 1 ? 'mk-ok' : 'mk-ref', T.name(x)));
    };
    show(-1);
    el.append(st.el,
      btnRow(...items.map((x, i) => PlayBtn(x.label, () => { show(i); Sound.chord(midisOf(x.notes), { arp: 0.06 }); }))),
      kbWrap(kb.el));
  }

  // Kapitel 1: Auf welchen weißen Tasten liegt eine kleine Terz, die wieder auf einer weißen Taste endet?
  function whiteThirds(el, done) {
    const WANT = [2, 4, 9, 11];   // D – F, E – G, A – C, H – D
    const found = new Set();
    let finished = false;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe auf eine weiße Taste. Ihre kleine Terz erscheint darüber.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...WANT.map(p =>
      h('span', { class: 'chip' + (found.has(p) ? ' is-on' : '') }, found.has(p) ? `${T.pcName(p)} – ${T.pcName(p + 3)}` : '?')));
    paintChips();
    const kb = Keyboard({
      from: 60, to: 76, labels: 'white',
      onPress: m => {
        if (finished) return;
        kb.clearMarks();
        if (isBlackKey(m)) { read.innerHTML = inline('Bleib bei den **weißen** Tasten.'); return; }
        if (m + 3 > 76) { read.innerHTML = inline('Hier passt die Terz nicht mehr auf die Klaviatur. Tippe weiter links.'); return; }
        const top = T.transpose(T.fromMidi(m), 2, 3);
        const pair = `${T.pcName(m)} – ${T.name(top)}`;
        kb.mark(m, 'mk-ref', T.pcName(m));
        kb.mark(m + 3, 'mk-sel', T.name(top));
        Sound.chord([m, m + 3], { arp: 0.25 });
        if (isBlackKey(m + 3)) {
          read.innerHTML = inline(`**${pair}**: Die kleine Terz über ${T.pcName(m)} liegt auf einer schwarzen Taste. Auf den weißen Tasten liegt über ${T.pcName(m)} eine große Terz.`);
          return;
        }
        const p = mod(m, 12);
        if (found.has(p)) { read.innerHTML = inline(`**${pair}** hast du schon. Suche weiter.`); return; }
        found.add(p);
        paintChips();
        read.innerHTML = inline(`**${pair}**: beide Tasten weiß. ${found.size} von 4 gefunden.`);
        if (found.size === WANT.length) {
          finished = true;
          done('D – F, E – G, A – C und H – D: Auf den weißen Tasten gibt es **vier** kleine Terzen. Über C, F und G liegt auf Weiß eine große Terz.');
        }
      },
    });
    el.append(kbWrap(kb.el), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefunden'), chips));
  }

  // Kapitel 2: Grundton antippen, dann die Terz senken oder heben.
  function durMollSwitch(el, done) {
    let root = 60, mode = 'maj', finished = false;
    const switched = new Set();
    const staff = Staff({ width: 220 });
    const nameEl = h('p', { class: 'chord-name', 'aria-live': 'polite' });
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe einen Grundton an und schalte dann zwischen Dur und Moll um.');
    const toggle = h('button', { type: 'button', class: 'btn btn--outline' });
    const chips = h('div', { class: 'found' });
    const notes = () => T.chord(T.fromMidi(root), mode);
    const play = () => Sound.chord(midisOf(notes()), { arp: 0.06 });

    const kb = Keyboard({
      from: 60, to: 79, labels: 'white',
      onPress: m => {
        if (m > 72) { read.innerHTML = inline('Wähle einen Grundton zwischen dem C in der Mitte und dem nächsten C.'); return; }
        root = m;
        mode = 'maj';
        read.innerHTML = inline(`Das ist **${T.durName(T.fromMidi(m))}**. Senke jetzt die Terz.`);
        update(true);
      },
    });

    toggle.addEventListener('click', () => {
      const before = notes();
      mode = mode === 'maj' ? 'min' : 'maj';
      const after = notes();
      update(true);
      if (mode === 'min') {
        switched.add(mod(root, 12));
        read.innerHTML = inline(`Aus **${T.durName(before[0])}** wird **${T.mollName(after[0])}**: ${T.name(before[1])} wird zu ${T.name(after[1])}. ${Math.min(switched.size, 3)} von 3 Grundtönen umgeschaltet.`);
      } else {
        read.innerHTML = inline(`Zurück zu **${T.durName(after[0])}**: Die Terz steigt wieder um einen Halbton.`);
      }
      if (!finished && switched.size >= 3) {
        finished = true;
        done('Drei Dur-Dreiklänge in Moll verwandelt. Jedes Mal hat sich nur **die Terz** bewegt, einen Halbton abwärts. Grundton und Quinte blieben liegen.');
      }
    });

    function update(withSound) {
      const ns = notes();
      const label = mode === 'maj' ? T.durName(ns[0]) : T.mollName(ns[0]);
      kb.clearMarks();
      ns.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : i === 1 ? 'mk-ok' : 'mk-sel', T.name(x)));
      staff.render([ns], { captions: [label] });
      nameEl.innerHTML = inline(`**${label}**: ${T.join(ns)}`);
      toggle.replaceChildren(mode === 'maj' ? 'Terz senken' : 'Terz heben', h('small', {}, mode === 'maj' ? '−1' : '+1'));
      chips.replaceChildren(...[0, 1, 2].map(i => {
        const p = [...switched][i];
        return h('span', { class: 'chip' + (p != null ? ' is-on' : '') }, p != null ? T.mollName(T.fromMidi(60 + p)) : '?');
      }));
      if (withSound) play();
    }

    update(false);
    el.append(staff.el, nameEl, btnRow(toggle, PlayBtn('Anhören', play)), kbWrap(kb.el), read,
      h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Umgeschaltet'), chips));
  }

  // Kapitel 4: Zu drei Dur-Tonarten den Grundton der Moll-Parallele im Kreis finden.
  function parallelFinder(el, done, api) {
    const pool = shuffle(['G', 'F', 'D', 'A', 'B', 'Es', 'E']).slice(0, 3).map(x => n(x, 4));
    let k = 0, busy = false, finished = false;
    const solved = [];
    const read = h('p', { class: 'readout', 'aria-live': 'polite' });
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...pool.map((d, i) =>
      h('span', { class: 'chip' + (i < solved.length ? ' is-on' : '') }, i < solved.length ? solved[i] : '?')));

    const c = PitchCircle({
      sound: false,
      onTap: p => {
        if (finished || busy) return;
        const dur = pool[k];
        const rp = T.pc(dur);
        const want = mod(rp - 3, 12);
        if (p !== want) {
          Sound.piano(60 + p);
          const d = mod(rp - p, 12);
          const where = d > 6 ? `${12 - d} ${12 - d === 1 ? 'Halbton' : 'Halbtöne'} über` : `${d} ${d === 1 ? 'Halbton' : 'Halbtöne'} unter`;
          read.innerHTML = inline(p === rp
            ? `Das ist der Grundton von ${T.durName(dur)} selbst. Mit gleichem Grundton wäre es die Variante, nicht die Parallele.`
            : `**${T.pcName(p)}** liegt ${where} ${T.name(dur)}. Gesucht ist der Ton genau eine kleine Terz tiefer.`);
          return;
        }
        const moll = T.transpose(dur, -2, -3);
        c.poly([want, want + 3, want + 7].map(q => mod(q, 12)), 'f2');
        c.dot(want, 'f2');
        c.arrow(want, rp);
        Sound.chord([60 + rp, 64 + rp, 67 + rp].map(m => m - 12 * (rp > 6)), { arp: 0.05, dur: 1 });
        api.later(() => Sound.chord([60 + want, 63 + want, 67 + want].map(m => m - 12 * (want > 6)), { arp: 0.05 }), 800);
        solved.push(`${T.durName(dur)} ↔ ${T.mollName(moll)}`);
        paintChips();
        read.innerHTML = inline(`**${T.mollName(moll)}** ist die Parallele zu ${T.durName(dur)}. Die beiden Dreiecke teilen sich eine Seite: zwei gemeinsame Töne.`);
        k++;
        if (k === pool.length) {
          finished = true;
          done(`${solved.join(', ')}. Die Parallele liegt immer **drei Halbtöne tiefer**, im Kreis drei Schritte gegen den Uhrzeigersinn.`);
        } else {
          busy = true;
          api.later(() => { busy = false; ask(); }, 2200);
        }
      },
    });

    function ask() {
      const dur = pool[k];
      const rp = T.pc(dur);
      c.clearPolys();
      c.clearArrows();
      for (let q = 0; q < 12; q++) { c.dot(q, 'f2', false); c.dot(q, 'f3', false); }
      const pcs = [rp, rp + 4, rp + 7].map(q => mod(q, 12));
      c.poly(pcs, 'f3');
      pcs.forEach(q => c.dot(q, 'f3'));
      read.innerHTML = inline(`Wo liegt der Grundton der Moll-Parallele zu **${T.durName(dur)}**? Tippe ihn im Kreis an.`);
    }

    ask();
    paintChips();
    el.append(h('div', { class: 'explore' },
      h('div', { class: 'circle-box' }, c.el),
      h('div', { class: 'explore-side' }, read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Paare'), chips))));
  }

  // Kapitel 5: weiße Taste antippen → Dreiklang auf dieser Stufe von C-Dur.
  function degreeExplorer(el, done) {
    const WANT = [1, 2, 5];   // II, III, VI
    const found = new Set();
    let finished = false;
    const staff = Staff({ width: 220 });
    const nameEl = h('p', { class: 'chord-name', 'aria-live': 'polite' }, 'Tippe auf eine weiße Taste.');
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Jede weiße Taste ist eine Stufe von C-Dur. Gesucht sind die drei Stufen mit einem Moll-Dreiklang.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...WANT.map(dg =>
      h('span', { class: 'chip' + (found.has(dg) ? ' is-on' : '') }, found.has(dg) ? ROMAN[dg] : '?')));
    paintChips();
    staff.render([]);
    const kb = Keyboard({
      from: 60, to: 79, labels: 'white',
      onPress: m => {
        if (finished) return;
        if (isBlackKey(m)) { read.innerHTML = inline('C-Dur kommt ohne schwarze Tasten aus. Bleib auf den weißen.'); return; }
        if (m > 72) { read.innerHTML = inline('Tippe auf eine Taste vom mittleren C bis zum nächsten C.'); return; }
        const d = T.step(T.fromMidi(m));
        const dg = mod(d, 7);
        const ns = whiteTriad(d);
        const kind = triadKind(ns);
        kb.clearMarks();
        ns.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : 'mk-sel', T.name(x)));
        staff.render([ns], { captions: [ROMAN[dg]] });
        nameEl.innerHTML = inline(`**${ROMAN[dg]}. Stufe · ${triadLabel(ns)}**: ${T.join(ns)}`);
        Sound.chord(midisOf(ns), { arp: 0.06 });
        if (kind !== 'min') {
          read.innerHTML = inline(kind === 'maj'
            ? `Ein Dur-Dreiklang: große Terz unten. ${found.size} von 3 Moll-Stufen gefunden.`
            : `Zwei kleine Terzen: ein **verminderter** Dreiklang. ${found.size} von 3 Moll-Stufen gefunden.`);
          return;
        }
        found.add(dg);
        paintChips();
        read.innerHTML = inline(`Ein Moll-Dreiklang: kleine Terz unten. ${found.size} von 3 Moll-Stufen gefunden.`);
        if (found.size === WANT.length) {
          finished = true;
          done('d-Moll, e-Moll und a-Moll stehen auf den Stufen **II, III und VI**. Dazu kommen die Dur-Dreiklänge auf I, IV und V und der verminderte auf VII.');
        }
      },
    });
    el.append(staff.el, nameEl, kbWrap(kb.el), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Moll-Stufen'), chips));
  }

  /* ---------- Fragen mit Zufall ---------- */

  function thirdKeys() {
    const r = n(pick(['C', 'D', 'E', 'F', 'G', 'A', 'Fis']), 4);
    const top = T.transpose(r, 2, 3);
    const m = T.midi(r);
    return Steps.keys({
      prompt: `Spiele die **kleine Terz** über dem markierten **${T.name(r)}**.`,
      from: 60, to: 76, marks: [[m, 'mk-ref', T.name(r)]],
      check: sel => {
        const d = sel[0] - m;
        if (d === 3) return { ok: true };
        return { ok: false, msg: d <= 0 ? `Die Terz liegt über dem ${T.name(r)}, also weiter rechts.` : `Das sind ${d} Halbtöne. Gesucht sind 3.` };
      },
      solution: [m + 3],
      explain: `${T.name(r)} – ${T.name(top)}: drei Halbtöne (${[0, 1, 2, 3].map(k => T.pcName(m + k)).join(' → ')}).`,
    });
  }

  function thirdEar() {
    const r = n(pick(['C', 'D', 'E', 'F', 'G']), 4);
    const big = Math.random() < 0.5;
    const top = T.transpose(r, 2, big ? 4 : 3);
    const ms = [T.midi(r), T.midi(top)];
    const play = () => Sound.chord(ms, { arp: 0.4 });
    return Steps.mc({
      title: 'Hörprobe',
      prompt: 'Hör genau hin. Ist das eine kleine oder eine große Terz?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Anhören', play), PlayBtn('Zusammen', () => Sound.chord(ms), { variant: 'quiet' })));
        api.later(play, 350);
      },
      options: ['kleine Terz', 'große Terz'], keepOrder: true, answer: big ? 'große Terz' : 'kleine Terz',
      explain: big
        ? `${T.name(r)} – ${T.name(top)} hat 4 Halbtöne: eine **große Terz**. Sie klingt hell, wie der Anfang eines Dur-Dreiklangs.`
        : `${T.name(r)} – ${T.name(top)} hat 3 Halbtöne: eine **kleine Terz**. Sie klingt dunkler, wie der Anfang eines Moll-Dreiklangs.`,
      wrong: 'Hör noch einmal hin: Klingt der Abstand hell und weit oder eher dunkel und eng?',
    });
  }

  function buildMinor(pool) {
    const r = n(pick(pool), 4);
    const ch = T.chord(r, 'min');
    const ms = midisOf(ch);
    return Steps.keys({
      prompt: `Baue **${T.mollName(r)}** auf dem markierten **${T.name(r)}**.`,
      from: 60, to: 79, max: 3, marks: [[ms[0], 'mk-ref', T.name(r)]],
      check: pcSetCheck(ms.map(m => mod(m, 12)), `Von ${T.name(r)} aus: 3 Halbtöne zur Terz, dann 4 weiter zur Quinte.`),
      solution: ms,
      explain: `${T.join(ch)}: kleine Terz ${T.name(ch[0])} – ${T.name(ch[1])}, große Terz ${T.name(ch[1])} – ${T.name(ch[2])}.`,
    });
  }

  const WHICH_MINOR = [
    { ok: 'E – G – H', bad: [
      ['E – Gis – H', 'E – Gis ist eine große Terz. Das ist Dur.'],
      ['E – G – B', 'G – B ist nur eine kleine Terz. Zwei kleine Terzen ergeben einen verminderten Dreiklang.'],
      ['E – Gis – His', 'Zwei große Terzen übereinander: Das ist ein übermäßiger Dreiklang.']] },
    { ok: 'D – F – A', bad: [
      ['D – Fis – A', 'D – Fis ist eine große Terz. Das ist Dur.'],
      ['D – F – As', 'F – As ist nur eine kleine Terz. Zwei kleine Terzen ergeben einen verminderten Dreiklang.'],
      ['D – Fis – Ais', 'Zwei große Terzen übereinander: Das ist ein übermäßiger Dreiklang.']] },
    { ok: 'G – B – D', bad: [
      ['G – H – D', 'G – H ist eine große Terz. Das ist Dur.'],
      ['G – B – Des', 'B – Des ist nur eine kleine Terz. Zwei kleine Terzen ergeben einen verminderten Dreiklang.'],
      ['G – H – Dis', 'Zwei große Terzen übereinander: Das ist ein übermäßiger Dreiklang.']] },
  ];

  function whichMinor() {
    const it = pick(WHICH_MINOR);
    return Steps.mc({
      prompt: 'Welcher dieser Dreiklänge ist **Moll**?',
      options: [it.ok, ...it.bad.map(([t, why]) => ({ t, why }))],
      answer: it.ok,
      explain: `${it.ok}: unten eine kleine Terz (3 Halbtöne), oben eine große (4 Halbtöne).`,
    });
  }

  const PICK_TONES = [
    { prompt: 'e-Moll besteht aus **E – G – H**. Das E steht auf der untersten Linie. Setze die **Terz** auf die Notenzeile.',
      target: 'G4', explain: 'G steht auf der zweiten Linie. E – G – H liegen alle auf Linien, jeweils eine Linie höher.' },
    { prompt: 'd-Moll besteht aus **D – F – A**. Das D hängt direkt unter der untersten Linie. Setze die **Quinte** auf die Notenzeile.',
      target: 'A4', explain: 'A steht im zweiten Zwischenraum. Bei D – F – A sitzt jeder Ton zwischen den Linien, das D direkt unter dem System.' },
    { prompt: 'a-Moll besteht aus **A – C – E**. Das A steht im zweiten Zwischenraum. Setze die **Terz** auf die Notenzeile.',
      target: 'C5', explain: 'C steht im dritten Zwischenraum, direkt über der Mittellinie. Bei A – C – E stehen alle drei Töne in Zwischenräumen.' },
  ];

  const SPELL = [
    { key: 'cis-Moll', ok: 'Cis – E – Gis', bad: [
      ['Cis – E – As', 'Klingt gleich, aber E – As ist keine Terz. Nach E folgt in der Terzenkette ein G.'],
      ['Des – E – As', 'Des – E ist eine übermäßige Sekunde, keine Terz.'],
      ['Cis – Eis – Gis', 'Cis – Eis ist eine große Terz. Das ist Cis-Dur.']] },
    { key: 'es-Moll', ok: 'Es – Ges – B', bad: [
      ['Es – Fis – B', 'Es – Fis ist eine übermäßige Sekunde. Nach E folgt in der Terzenkette ein G.'],
      ['Es – Ges – Ais', 'Ges – Ais ist keine Terz. Nach G folgt in der Terzenkette ein H.'],
      ['Es – G – B', 'Es – G ist eine große Terz. Das ist Es-Dur.']] },
    { key: 'h-Moll', ok: 'H – D – Fis', bad: [
      ['H – D – Ges', 'Klingt gleich, aber D – Ges ist keine Terz, sondern eine verminderte Quarte. Nach D folgt ein F.'],
      ['H – Dis – Fis', 'H – Dis ist eine große Terz. Das ist H-Dur.'],
      ['B – D – F', 'Das ist B-Dur. Der Grundton heißt im Deutschen H, B ist das erniedrigte H.']] },
    { key: 'f-Moll', ok: 'F – As – C', bad: [
      ['F – Gis – C', 'F – Gis ist eine übermäßige Sekunde. Nach F folgt in der Terzenkette ein A.'],
      ['F – A – C', 'F – A ist eine große Terz. Das ist F-Dur.'],
      ['F – As – Ces', 'As – Ces ist nur eine kleine Terz. Zwei kleine Terzen ergeben einen verminderten Dreiklang.']] },
    { key: 'b-Moll', ok: 'B – Des – F', bad: [
      ['B – Cis – F', 'B – Cis ist keine Terz, sondern eine übermäßige Sekunde. Nach H folgt in der Terzenkette ein D.'],
      ['B – D – F', 'B – D ist eine große Terz. Das ist B-Dur.'],
      ['Ais – Des – F', 'Ais – Des ist keine Terz: Von A bis D sind es vier Notennamen.']] },
    { key: 'gis-Moll', ok: 'Gis – H – Dis', bad: [
      ['As – H – Es', 'As – H ist eine übermäßige Sekunde, keine Terz.'],
      ['Gis – H – Es', 'Klingt gleich, aber H – Es ist keine Terz, sondern eine verminderte Quarte. Nach H folgt ein D.'],
      ['Gis – His – Dis', 'Gis – His ist eine große Terz. Das ist Gis-Dur.']] },
  ];

  function spellQuestion(it) {
    return Steps.mc({
      prompt: `Wie schreibt man **${it.key}**?`,
      options: [it.ok, ...it.bad.map(([t, why]) => ({ t, why }))],
      answer: it.ok,
      explain: `${it.ok}: Jede Terz überspringt genau einen Notennamen, und die Abstände sind 3 + 4 Halbtöne.`,
    });
  }

  const READ = [
    { notes: 'Fis4 A4 Cis5', ok: 'fis-Moll', bad: [
      ['Fis-Dur', 'Zähl die Halbtöne vom Grundton zur Terz: Fis – A sind 3, nicht 4.'],
      ['a-Moll', 'Der Grundton ist der tiefste Ton, wenn die Noten in Terzen übereinanderstehen.'],
      ['ges-Moll', 'Die Noten tragen Kreuze (♯), keine Bes (♭).']] },
    { notes: 'C5 Es5 G5', ok: 'c-Moll', bad: [
      ['C-Dur', 'Vor dem E steht ein ♭. Damit ist die Terz klein.'],
      ['es-Moll', 'Der tiefste Ton ist C, auf ihm sind die Terzen gestapelt.'],
      ['Es-Dur', 'Es ist hier die Terz, nicht der Grundton.']] },
    { notes: 'G4 B4 D5', ok: 'g-Moll', bad: [
      ['G-Dur', 'Vor dem H steht ein ♭: Aus H wird B, die Terz ist klein.'],
      ['b-Moll', 'B ist hier die Terz. Der Grundton ist der tiefste Ton.'],
      ['B-Dur', 'B-Dur hätte B als tiefsten Ton.']] },
    { notes: 'Cis5 E5 Gis5', ok: 'cis-Moll', bad: [
      ['Cis-Dur', 'Vor dem E steht kein Kreuz. Cis – E sind 3 Halbtöne.'],
      ['des-Moll', 'Die Noten tragen Kreuze, keine Bes.'],
      ['e-Moll', 'E ist hier die Terz. Der Grundton ist der tiefste Ton.']] },
    { notes: 'H4 D5 Fis5', ok: 'h-Moll', bad: [
      ['H-Dur', 'Vor dem D steht kein Kreuz. H – D sind nur 3 Halbtöne.'],
      ['d-Moll', 'D ist hier die Terz. Der Grundton ist der tiefste Ton.'],
      ['b-Moll', 'Vor dem H steht kein Be. Dieser Ton heißt H.']] },
  ];

  function readQuestion() {
    const it = pick(READ);
    const ns = T.notes(it.notes);
    return Steps.mc({
      prompt: 'Welcher Dreiklang steht hier? Lies die Noten und achte auf die Vorzeichen.',
      media: el => {
        const st = Staff({ width: 220 });
        st.render([ns], { labels: false });
        el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.chord(midisOf(ns), { arp: 0.08 }))));
      },
      options: [it.ok, ...it.bad.map(([t, why]) => ({ t, why }))],
      answer: it.ok,
      explain: `${T.join(ns)}: unten eine kleine Terz, oben eine große. Das ist **${it.ok}**.`,
    });
  }

  function buildMinorBlack() {
    return buildMinor(['Es', 'B', 'Cis', 'Gis', 'F']);
  }

  const ACC_PICK = [
    { key: 'f-Moll', tones: 'F – As – C', tone: 'As', letter: 'A', target: 'A4', place: 'im zweiten Zwischenraum' },
    { key: 'es-Moll', tones: 'Es – Ges – B', tone: 'Ges', letter: 'G', target: 'G4', place: 'auf der zweiten Linie' },
    { key: 'b-Moll', tones: 'B – Des – F', tone: 'Des', letter: 'D', target: 'D5', place: 'auf der vierten Linie' },
  ];

  function accPick() {
    const it = pick(ACC_PICK);
    return Steps.pick({
      title: 'Die Note und ihr Vorzeichen',
      prompt: `In **${it.key}** (${it.tones}) kommt der Ton **${it.tone}** vor. Das ♭ steht vor der Note, der Notenkopf selbst sitzt auf dem Platz des Stammtons. Setze die Note für ${it.tone}.`,
      target: it.target,
      explain: `${it.tone} steht ${it.place}, auf dem Platz des ${it.letter}. Das ♭ davor macht daraus ${it.tone}.`,
    });
  }

  function parallelQuestion() {
    const r = n(pick(['G', 'F', 'D', 'Es', 'A', 'B']), 4);
    const par = T.transpose(r, -2, -3);
    const up = T.transpose(r, 2, 4);
    const fifth = T.transpose(r, 4, 7);
    return Steps.mc({
      prompt: `Wie heißt die **Paralleltonart** von **${T.durName(r)}**?`,
      options: [
        T.mollName(par),
        { t: T.mollName(r), why: 'Das ist die Variante: gleicher Grundton. Die Parallele hat einen anderen Grundton.' },
        { t: T.mollName(up), why: `${T.name(up)} liegt eine große Terz über ${T.name(r)}. Die Parallele liegt tiefer.` },
        { t: T.mollName(fifth), why: `${T.name(fifth)} ist die Quinte von ${T.durName(r)}. Die Parallele liegt tiefer.` },
      ],
      answer: T.mollName(par),
      explain: `${T.name(r)} → ${T.name(par)}: drei Halbtöne abwärts. ${T.durName(r)} und ${T.mollName(par)} benutzen dieselben Töne.`,
    });
  }

  function parallelBack() {
    const m = n(pick(['D', 'E', 'H', 'C', 'Fis', 'G']), 4);
    const dur = T.transpose(m, 2, 3);
    const down = T.transpose(m, -2, -3);
    const fifth = T.transpose(m, 4, 7);
    return Steps.mc({
      prompt: `Zu welcher Dur-Tonart ist **${T.mollName(m)}** die Parallele?`,
      options: [
        T.durName(dur),
        { t: T.durName(m), why: 'Das ist die Variante mit gleichem Grundton. Die Parallele hat einen anderen.' },
        { t: T.durName(down), why: 'Falsche Richtung: Von Moll aus liegt die Dur-Parallele höher, nicht tiefer.' },
        { t: T.durName(fifth), why: `${T.name(fifth)} liegt eine Quinte über ${T.name(m)}. Gesucht ist ein kleinerer Abstand.` },
      ],
      answer: T.durName(dur),
      explain: `${T.name(m)} → ${T.name(dur)}: eine kleine Terz aufwärts. ${T.mollName(m)} ist die Parallele von ${T.durName(dur)}.`,
    });
  }

  const SHARED = [
    { dur: 'C', moll: 'A', pcs: [0, 4], sol: [60, 64] },
    { dur: 'G', moll: 'E', pcs: [7, 11], sol: [67, 71] },
    { dur: 'F', moll: 'D', pcs: [5, 9], sol: [65, 69] },
    { dur: 'D', moll: 'H', pcs: [2, 6], sol: [62, 66] },
  ];

  function sharedKeys() {
    const it = pick(SHARED);
    const D = n(it.dur, 4), M = n(it.moll, 4);
    const both = it.pcs.map(T.pcName).join(' und ');
    return Steps.keys({
      prompt: `${T.durName(D)} und ${T.mollName(M)} sind Parallelen. Ihre Dreiklänge teilen sich **zwei Töne**. Spiele diese beiden Töne.`,
      from: 60, to: 76, max: 2,
      check: pcSetCheck(it.pcs, `Schreib dir beide Dreiklänge auf: ${T.durName(D)} und ${T.mollName(M)}. Welche Töne kommen in beiden vor?`),
      solution: it.sol,
      explain: `${T.durName(D)}: ${T.join(major(it.dur))}, ${T.mollName(M)}: ${T.join(minor(it.moll))}. Gemeinsam sind **${both}**.`,
    });
  }

  function variantQuestion() {
    const r = n(pick(['A', 'E', 'D', 'G', 'F']), 4);
    const maj = T.chord(r, 'maj'), min = T.chord(r, 'min');
    return Steps.mc({
      prompt: `Wie heißt die **Varianttonart** von **${T.durName(r)}**?`,
      options: [
        T.mollName(r),
        { t: T.mollName(T.transpose(r, -2, -3)), why: 'Das ist die Parallele. Bei der Variante bleibt der Grundton gleich.' },
        { t: T.mollName(T.transpose(r, 4, 7)), why: 'Das ist der Moll-Dreiklang auf der Quinte. Bei der Variante bleibt der Grundton gleich.' },
        { t: T.mollName(T.transpose(r, -1, -1)), why: 'Bei der Variante ändert sich nur die Terz, der Grundton bleibt.' },
      ],
      answer: T.mollName(r),
      explain: `${T.durName(r)}: ${T.join(maj)}, ${T.mollName(r)}: ${T.join(min)}. Nur die Terz ändert sich: ${T.name(maj[1])} wird zu ${T.name(min[1])}.`,
    });
  }

  const DEGREE_SETS = [
    { key: 'G-Dur', ok: 'a-Moll, h-Moll, e-Moll', bad: [
      ['g-Moll, c-Moll, d-Moll', 'Das sind die Varianten der Stufen I, IV und V. In G-Dur sind G, C und D aber Dur.'],
      ['a-Moll, h-Moll, fis-Moll', 'Auf Fis, der VII. Stufe, steht in G-Dur ein verminderter Dreiklang: Fis – A – C.'],
      ['e-Moll, a-Moll, d-Moll', 'In G-Dur ist D die Dominante, also ein Dur-Dreiklang.']] },
    { key: 'F-Dur', ok: 'g-Moll, a-Moll, d-Moll', bad: [
      ['f-Moll, b-Moll, c-Moll', 'Das sind die Varianten der Stufen I, IV und V. In F-Dur sind F, B und C aber Dur.'],
      ['g-Moll, a-Moll, e-Moll', 'Auf E, der VII. Stufe, steht in F-Dur ein verminderter Dreiklang: E – G – B.'],
      ['d-Moll, g-Moll, c-Moll', 'In F-Dur ist C die Dominante, also ein Dur-Dreiklang.']] },
    { key: 'D-Dur', ok: 'e-Moll, fis-Moll, h-Moll', bad: [
      ['d-Moll, g-Moll, a-Moll', 'Das sind die Varianten der Stufen I, IV und V. In D-Dur sind D, G und A aber Dur.'],
      ['e-Moll, fis-Moll, cis-Moll', 'Auf Cis, der VII. Stufe, steht in D-Dur ein verminderter Dreiklang: Cis – E – G.'],
      ['h-Moll, e-Moll, a-Moll', 'In D-Dur ist A die Dominante, also ein Dur-Dreiklang.']] },
  ];

  function degreeSet() {
    const it = pick(DEGREE_SETS);
    return Steps.mc({
      prompt: `Welche drei Moll-Dreiklänge gehören zu **${it.key}**?`,
      options: [it.ok, ...it.bad.map(([t, why]) => ({ t, why }))],
      answer: it.ok,
      explain: `Die Stufen II, III und VI von ${it.key}: ${it.ok}. Genau wie in C-Dur, nur von einem anderen Grundton aus.`,
    });
  }

  function degreeOf() {
    const OPTS = [
      { r: 'II', label: 'd-Moll', why: 'Auf der II. Stufe steht d-Moll.', ord: 'zweite', name: 'D' },
      { r: 'III', label: 'e-Moll', why: 'Auf der III. Stufe steht e-Moll.', ord: 'dritte', name: 'E' },
      { r: 'VI', label: 'a-Moll', why: 'Auf der VI. Stufe steht a-Moll.', ord: 'sechste', name: 'A' },
      { r: 'VII', why: 'Auf der VII. Stufe steht der verminderte Dreiklang H – D – F.' },
    ];
    const it = pick(OPTS.slice(0, 3));
    return Steps.mc({
      prompt: `Auf welcher Stufe steht **${it.label}** in C-Dur?`,
      options: OPTS.map(o => (o === it ? o.r : { t: o.r, why: o.why })),
      keepOrder: true,
      answer: it.r,
      explain: `${it.name} ist der ${it.ord} Ton der C-Dur-Tonleiter: C D E F G A H.${it.r === 'VI' ? ' a-Moll ist zugleich die Parallele von C-Dur.' : ''}`,
    });
  }

  const STEP_KEYS = [
    { key: 'G-Dur', tonic: 'G', deg: 5, root: 'E' },
    { key: 'F-Dur', tonic: 'F', deg: 1, root: 'G' },
    { key: 'D-Dur', tonic: 'D', deg: 2, root: 'Fis' },
    { key: 'C-Dur', tonic: 'C', deg: 2, root: 'E' },
    { key: 'F-Dur', tonic: 'F', deg: 5, root: 'D' },
  ];

  function degreeKeys() {
    const it = pick(STEP_KEYS);
    const ch = minor(it.root);
    const ms = midisOf(ch);
    return Steps.keys({
      prompt: `Spiele den Dreiklang auf der **${ROMAN[it.deg]}. Stufe** von **${it.key}**.`,
      from: 60, to: 79, max: 3,
      check: pcSetCheck(ms.map(m => mod(m, 12)), `Zähl die Tonleiter von ${it.tonic} aus aufwärts und stapel nur Töne, die zu ${it.key} gehören.`),
      solution: ms,
      explain: `Die ${ROMAN[it.deg]}. Stufe von ${it.key} ist ${it.root}: ${T.join(ch)}, also ${T.mollName(ch[0])}.`,
    });
  }

  /* ---------- Gehörbildung ---------- */
  const EAR_TIPS = {
    maj: 'Große Terz unten: hell und offen.',
    min: 'Kleine Terz unten: dunkler und weicher.',
  };
  const earQuestion = (no, type) => chordEar({
    no, type, types: ['maj', 'min'], tips: EAR_TIPS,
    wrong: 'Spiel den Akkord gebrochen und achte auf den mittleren Ton, die Terz.',
  });

  function findMinor() {
    const types = shuffle(['min', 'maj', 'maj']);
    const roots = types.map(() => randInt(52, 60));
    const L = ['A', 'B', 'C'];
    const right = L[types.indexOf('min')];
    return Steps.mc({
      title: 'Finde den Moll-Dreiklang',
      prompt: 'Drei Klänge: zwei davon Dur, einer Moll. Welcher ist Moll?',
      media: el => el.append(btnRow(types.map((t, i) => PlayBtn('Klang ' + L[i], () => Sound.chord(T.chordMidis(roots[i], t)))))),
      options: L.map(x => 'Klang ' + x),
      keepOrder: true,
      answer: 'Klang ' + right,
      explain: `Klang ${right} war der Moll-Dreiklang. Die beiden anderen waren Dur.`,
      wrong: 'Hör dir alle drei noch einmal an. Moll klingt am dunkelsten.',
    });
  }

  function cadenceEnd() {
    const minorEnd = Math.random() < 0.5;
    const t = randInt(-2, 3);
    const seq = minorEnd
      ? [[57, 60, 64], [57, 62, 65], [56, 59, 64], [57, 60, 64]]   // a-Moll – d-Moll – E-Dur – a-Moll
      : [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]];  // C-Dur – F-Dur – G-Dur – C-Dur
    const play = () => seq.forEach((c, i) => Sound.chord(c.map(m => m + t), { when: i * 0.85, dur: i === 3 ? 2.4 : 1 }));
    return Steps.mc({
      title: 'Der Schluss',
      prompt: 'Vier Akkorde. Endet die Folge in Dur oder in Moll?',
      media: (el, api) => {
        el.append(btnRow(PlayBtn('Nochmal hören', play)));
        api.later(play, 350);
      },
      options: ['in Dur', 'in Moll'], keepOrder: true, answer: minorEnd ? 'in Moll' : 'in Dur',
      explain: minorEnd
        ? 'Der letzte Akkord ist ein Moll-Dreiklang: Die Folge endet dunkel. Der Akkord davor war übrigens Dur. In Moll ist die Dominante meist ein Dur-Dreiklang, das macht den Schluss stärker.'
        : 'Der letzte Akkord ist ein Dur-Dreiklang: Die Folge endet hell auf der Tonika, nach Subdominante und Dominante.',
      wrong: 'Hör vor allem auf den letzten Akkord. Klingt er hell oder dunkel?',
    });
  }

  /* ---------- Kopfbild: Moll-Dreieck und gespiegeltes Dur-Dreieck ---------- */
  function visual() {
    let polys = [];
    const c = PitchCircle({ sound: false, onTap: p => show(p, true) });
    function show(p, withSound) {
      polys.forEach(x => x.remove());
      for (let q = 0; q < 12; q++) { c.dot(q, 'f2', false); c.dot(q, 'f3', false); }
      const mi = [p, p + 3, p + 7].map(q => mod(q, 12));
      const ma = [p, p + 4, p + 7].map(q => mod(q, 12));
      polys = [c.poly(ma, 'f3 is-line', false), c.poly(mi, 'f2', withSound)];
      mi.forEach(q => c.dot(q, 'f2'));
      c.dot(ma[1], 'f3');
      if (withSound) Sound.chord([60 + p, 63 + p, 67 + p], { arp: 0.07 });
    }
    show(9, false);
    return { label: 'Oktavkreis · zum Anhören antippen', foot: 'Moll: das Dur-Dreieck gespiegelt', el: c.el };
  }

  /* ---------- Blitzrunde ---------- */
  function genTerz() {
    const r = n(pick(['C', 'D', 'E', 'F', 'G', 'A', 'H', 'Cis', 'Es', 'Fis', 'Gis', 'B']), 4);
    const ans = T.name(T.transpose(r, 2, 3));
    const trap = T.spellings(mod(T.pc(r) + 3, 12), 1).find(x => x !== ans);
    return {
      tag: 'Kleine Terz',
      prompt: `Welcher Ton liegt eine **kleine Terz** über **${T.name(r)}**?`,
      options: quizOptions(ans, [T.name(T.transpose(r, 2, 4)), trap, T.name(T.transpose(r, 1, 2)), T.name(T.transpose(r, 3, 5))]),
      answer: ans,
    };
  }

  function genArt() {
    const type = Math.random() < 0.5 ? 'maj' : 'min';
    const ch = T.chord(n(pick(['C', 'D', 'E', 'F', 'G', 'A', 'H', 'B', 'Es', 'Fis']), 4), type);
    return {
      tag: 'Dur oder Moll',
      prompt: `Ist **${T.join(ch)}** Dur oder Moll?`,
      options: ['Dur', 'Moll'],
      answer: type === 'maj' ? 'Dur' : 'Moll',
    };
  }

  function genName() {
    const r = n(pick(['C', 'D', 'E', 'F', 'G', 'A', 'H', 'Cis', 'Fis', 'Gis', 'Es', 'B']), 4);
    const third = T.transpose(r, 2, 3);
    const ans = T.name(third);
    const trap = T.spellings(T.pc(third), 1).find(x => x !== ans);
    return {
      tag: 'Moll schreiben',
      prompt: `Wie heißt die Terz von **${T.mollName(r)}**?`,
      options: quizOptions(ans, [trap, T.name(T.transpose(r, 2, 4)), T.name(T.transpose(r, 1, 2))]),
      answer: ans,
    };
  }

  function genParallel() {
    if (Math.random() < 0.5) {
      const r = n(pick(['C', 'G', 'D', 'A', 'E', 'F', 'B', 'Es', 'As']), 4);
      const ans = T.mollName(T.transpose(r, -2, -3));
      return {
        tag: 'Parallele',
        prompt: `Wie heißt die Moll-Parallele von **${T.durName(r)}**?`,
        options: quizOptions(ans, [T.mollName(r), T.mollName(T.transpose(r, 2, 4)), T.mollName(T.transpose(r, 4, 7))]),
        answer: ans,
      };
    }
    const m = n(pick(['A', 'E', 'H', 'Fis', 'D', 'G', 'C', 'F']), 4);
    const ans = T.durName(T.transpose(m, 2, 3));
    return {
      tag: 'Parallele',
      prompt: `Zu welcher Dur-Tonart ist **${T.mollName(m)}** die Parallele?`,
      options: quizOptions(ans, [T.durName(m), T.durName(T.transpose(m, -2, -3)), T.durName(T.transpose(m, 4, 7))]),
      answer: ans,
    };
  }

  function genEar() {
    const type = Math.random() < 0.5 ? 'maj' : 'min';
    const root = randInt(50, 62);
    return {
      tag: 'Hörprobe',
      prompt: 'Hörst du Dur oder Moll?',
      key: type + root,
      play: T.chordMidis(root, type),
      options: ['Dur', 'Moll'],
      answer: type === 'maj' ? 'Dur' : 'Moll',
    };
  }

  defineCourse({
    id: 'moll',
    short: 'Moll-Akkorde',
    title: ['Moll-', 'Akkorde'],
    topic: 'Harmonielehre',
    sub: 'Kleine Terz unten: Ein Halbton macht aus Hell Dunkel',
    lead: 'Ein einziger Halbton macht aus Hell Dunkel. Du baust Moll-Dreiklänge, vergleichst sie mit Dur, findest Parallel- und Varianttonarten und trainierst dein Ohr.',
    visual,
    badge: { id: 'moll-kurs', glyph: '♭', name: 'Weiche Terz', desc: 'Den Kurs zu den Moll-Akkorden abgeschlossen.' },
    arcade: [
      { id: 'moll-terz', name: 'Kleine Terz', gen: genTerz, needs: 'moll-kleine-terz' },
      { id: 'moll-art', name: 'Dur oder Moll', gen: genArt, needs: 'moll-aufbau' },
      { id: 'moll-name', name: 'Moll schreiben', gen: genName, needs: 'moll-schreibweise' },
      { id: 'moll-parallele', name: 'Paralleltonart', gen: genParallel, needs: 'moll-parallel' },
      { id: 'moll-ohr', name: 'Hörprobe Dur/Moll', gen: genEar, needs: 'moll-hoeren' },
    ],
    levels: [
      {
        id: 'moll-kleine-terz',
        title: 'Die kleine Terz',
        sub: 'Ein Halbton macht den Unterschied',
        takeaway: 'Die **kleine Terz** hat 3 Halbtöne, die große 4. Im Moll-Dreiklang liegt die kleine Terz **unten**: 3 + 4 statt 4 + 3.',
        steps: () => [
          Steps.info({
            title: 'Dur und Moll trennt ein einziger Halbton',
            text: 'Du kennst den Dur-Dreiklang: große Terz unten, kleine Terz oben, also **4 + 3** Halbtöne. Senkst du die Terz um einen Halbton, entsteht **Moll**: **3 + 4**.\n\nGrundton und Quinte bleiben gleich. Hör dir beide an und schau, welche Taste sich bewegt.',
            media: durMollCompare,
          }),
          Steps.task({
            title: 'Kleine Terzen auf Weiß',
            text: 'Tippe auf eine weiße Taste. Darüber erscheint ihre **kleine Terz**, drei Halbtöne höher.\n\nManchmal landet die Terz auf einer schwarzen Taste. Finde alle kleinen Terzen, die **nur weiße Tasten** brauchen.',
            mount: whiteThirds,
          }),
          Steps.mc({
            prompt: 'Dur ist **4 + 3** Halbtöne. Wie lautet die Formel für **Moll**?',
            options: [
              '3 + 4',
              { t: '4 + 3', why: 'Das ist Dur: große Terz unten.' },
              { t: '3 + 3', why: 'Zwei kleine Terzen ergeben einen verminderten Dreiklang. Die Quinte wäre zu klein.' },
              { t: '4 + 4', why: 'Zwei große Terzen ergeben einen übermäßigen Dreiklang. Die Quinte wäre zu groß.' },
            ],
            answer: '3 + 4',
            explain: 'Kleine Terz unten (3), große Terz oben (4). Zusammen wieder 7 Halbtöne: eine reine Quinte, genau wie bei Dur.',
          }),
          thirdKeys(),
          thirdEar(),
          Steps.mc({
            prompt: 'Aus **C-Dur** wird **c-Moll**. Welcher Ton ändert sich?',
            options: [
              'Die Terz: E wird zu Es',
              { t: 'Der Grundton: C wird zu Ces', why: 'Der Grundton bleibt, sonst hieße der Akkord nicht mehr c-Moll.' },
              { t: 'Die Quinte: G wird zu Ges', why: 'Die Quinte bleibt rein. Mit Ges wäre der Dreiklang vermindert.' },
              { t: 'Alle drei Töne', why: 'Zwei Töne bleiben liegen. Nur einer bewegt sich.' },
            ],
            answer: 'Die Terz: E wird zu Es',
            explain: 'C – E – G wird zu C – Es – G. Nur die Terz sinkt um einen Halbton.',
          }),
        ],
      },
      {
        id: 'moll-aufbau',
        title: 'Den Moll-Dreiklang bauen',
        sub: 'Kleine Terz unten, große Terz oben',
        takeaway: 'Ein Moll-Dreiklang besteht aus **Grundton, kleiner Terz und Quinte**, zum Beispiel A – C – E. Senkst du die Terz eines Dur-Dreiklangs, wird er zu Moll.',
        steps: () => [
          Steps.info({
            title: 'a-Moll: Moll auf den weißen Tasten',
            text: 'Auf dem Ton A entsteht ein Moll-Dreiklang ganz ohne schwarze Tasten: **A – C – E**.\n\nA – C ist eine kleine Terz (3 Halbtöne), C – E eine große Terz (4 Halbtöne). Von A bis E sind es 7 Halbtöne: die reine Quinte.',
            media: el => {
              const ns = T.notes('A4 C5 E5');
              const st = Staff({ width: 220 });
              st.render([ns], { captions: ['a-Moll'] });
              const kb = Keyboard({ from: 60, to: 76, labels: 'white' });
              ns.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : 'mk-sel', T.name(x)));
              el.append(st.el, btnRow(PlayBtn('a-Moll anhören', () => Sound.chord(midisOf(ns), { arp: 0.08 }))), kbWrap(kb.el));
            },
          }),
          Steps.task({
            title: 'Der Dur-Moll-Schalter',
            text: 'Tippe einen Grundton an: Sein Dur-Dreiklang erklingt. Mit **Terz senken** machst du daraus Moll.\n\nSchalte auf **drei verschiedenen** Grundtönen von Dur nach Moll.',
            mount: durMollSwitch,
          }),
          buildMinor(['D', 'E', 'A']),
          buildMinor(['Fis', 'G', 'C', 'F', 'H']),
          whichMinor(),
          (() => {
            const it = pick(PICK_TONES);
            return Steps.pick({ title: 'Ins Notenbild', prompt: it.prompt, target: it.target, explain: it.explain });
          })(),
        ],
      },
      {
        id: 'moll-schreibweise',
        title: 'Namen und Notenbild',
        sub: 'Klein geschrieben, in Terzen gestapelt',
        takeaway: 'Moll schreibt man **klein** (cis-Moll), Dur groß (Cis-Dur). Jede Terz überspringt einen Notennamen: **Cis – E – Gis**, nicht Cis – E – As.',
        steps: () => {
          const [a, b] = shuffle(SPELL);
          return [
            Steps.info({
              title: 'Groß für Dur, klein für Moll',
              text: 'In Namen schreibt man Dur mit großem, Moll mit kleinem Anfangsbuchstaben: **C-Dur**, aber **c-Moll**; **Fis-Dur**, aber **fis-Moll**.\n\nBeim Aufschreiben gilt dasselbe wie bei Dur: Jede Terz überspringt genau einen Notennamen. Auf Cis folgen also ein E und ein G, passend erhöht: **Cis – E – Gis**.\n\nTippe auf einen Akkord, um ihn zu hören.',
              media: el => {
                const items = [['cis-Moll', 'Cis4 E4 Gis4'], ['es-Moll', 'Es4 Ges4 B4'], ['h-Moll', 'H4 D5 Fis5']].map(([c, s]) => ({ c, ns: T.notes(s) }));
                const st = Staff({ width: 330 });
                const draw = hl => st.render(items.map(x => x.ns), { captions: items.map(x => x.c), hl, onTap });
                const onTap = i => { Sound.chord(midisOf(items[i].ns), { arp: 0.08 }); draw(i); };
                draw(-1);
                el.append(st.el);
              },
            }),
            spellQuestion(a),
            spellQuestion(b),
            readQuestion(),
            buildMinorBlack(),
            accPick(),
          ];
        },
      },
      {
        id: 'moll-parallel',
        title: 'Parallel und Variante',
        sub: 'Verwandte Tonarten finden',
        takeaway: 'Die **Paralleltonart** liegt eine kleine Terz tiefer und benutzt dieselben Töne: C-Dur ↔ a-Moll. Die **Variante** hat denselben Grundton: C-Dur ↔ c-Moll.',
        steps: () => [
          Steps.info({
            title: 'Gleiche Töne, anderer Grundton',
            text: 'C-Dur und a-Moll sind **Paralleltonarten**: Beide kommen ganz ohne schwarze Tasten aus. Der Grundton von a-Moll liegt **eine kleine Terz unter** dem C.\n\nAuch die Dreiklänge sind eng verwandt: C – E – G und A – C – E teilen sich **zwei Töne**, C und E.\n\nDaneben gibt es die **Variante**: gleicher Grundton, anderes Tongeschlecht, also C-Dur und c-Moll.',
            media: el => {
              const cd = major('C'), am = minor('A', 3);
              const st = Staff({ width: 250 });
              const kb = Keyboard({ from: 57, to: 69, labels: 'white' });
              const show = (ns, cls, hl) => {
                st.render([cd, am], { captions: ['C-Dur', 'a-Moll'], hl });
                kb.clearMarks();
                ns.forEach(x => kb.mark(T.midi(x), [0, 4].includes(T.pc(x)) ? 'mk-ok' : cls, T.name(x)));
              };
              st.render([cd, am], { captions: ['C-Dur', 'a-Moll'] });
              el.append(st.el, btnRow(
                PlayBtn('C-Dur', () => { show(cd, 'mk-ref', 0); Sound.chord(midisOf(cd), { arp: 0.06 }); }),
                PlayBtn('a-Moll', () => { show(am, 'mk-sel', 1); Sound.chord(midisOf(am), { arp: 0.06 }); })),
              kbWrap(kb.el),
              h('p', { class: 'hint' }, 'Grün: die beiden gemeinsamen Töne C und E.'));
            },
          }),
          Steps.task({
            title: 'Parallelen im Kreis',
            text: 'Im Kreis ist ein Dur-Dreiklang eingezeichnet. Tippe auf den Grundton seiner **Moll-Parallele**.\n\nFinde so die Parallelen zu **drei** Dur-Tonarten.',
            mount: parallelFinder,
          }),
          parallelQuestion(),
          parallelBack(),
          sharedKeys(),
          variantQuestion(),
        ],
      },
      {
        id: 'moll-stufen',
        title: 'Moll in der Dur-Tonart',
        sub: 'Die Stufen II, III und VI',
        takeaway: 'In jeder Dur-Tonart stehen Moll-Dreiklänge auf der **II., III. und VI. Stufe**, in C-Dur d-Moll, e-Moll und a-Moll. Die VII. Stufe ist **vermindert**.',
        steps: () => [
          Steps.info({
            title: 'Sieben Stufen, drei Arten',
            text: 'Baust du auf jedem Ton der C-Dur-Tonleiter einen Dreiklang nur aus weißen Tasten, entstehen drei Arten:\n\n**Dur** auf I, IV und V: C, F, G\n**Moll** auf II, III und VI: d, e, a\n**vermindert** auf VII: H – D – F, zwei kleine Terzen\n\nDie römischen Ziffern zählen die Stufen. Tippe auf einen Akkord, um ihn zu hören.',
            media: el => {
              const chords = [0, 1, 2, 3, 4, 5, 6].map(dg => whiteTriad(28 + dg));
              const st = Staff({ width: 460 });
              const draw = hl => st.render(chords, { labels: false, captions: ROMAN, hl, onTap });
              const onTap = i => { Sound.chord(midisOf(chords[i]), { arp: 0.06 }); draw(i); };
              draw(-1);
              el.append(st.el);
            },
          }),
          Steps.task({
            title: 'Stufen erkunden',
            text: 'Tippe auf eine weiße Taste: Auf ihr entsteht der Dreiklang dieser Stufe von C-Dur.\n\nFinde die **drei Stufen**, auf denen ein Moll-Dreiklang steht.',
            mount: degreeExplorer,
          }),
          Steps.mc({
            prompt: 'Welche Stufe trägt in jeder Dur-Tonart einen **verminderten** Dreiklang?',
            options: [
              { t: 'II', why: 'Auf der II. Stufe steht ein Moll-Dreiklang, in C-Dur d-Moll.' },
              { t: 'V', why: 'Die V. Stufe ist die Dominante, ein Dur-Dreiklang.' },
              { t: 'VI', why: 'Auf der VI. Stufe steht die Moll-Parallele, in C-Dur a-Moll.' },
              'VII',
            ],
            keepOrder: true,
            answer: 'VII',
            explain: 'In C-Dur: H – D – F. Zwei kleine Terzen, die Quinte H – F hat nur 6 Halbtöne. Mehr über verminderte Klänge erfährst du später im Lernweg.',
          }),
          degreeSet(),
          degreeOf(),
          degreeKeys(),
        ],
      },
      {
        id: 'moll-hoeren',
        title: 'Dur oder Moll?',
        sub: 'Hell und dunkel sicher unterscheiden',
        ear: true,
        takeaway: 'Dur klingt **hell und offen**, Moll **dunkel und weich**. Die Terz entscheidet über das Tongeschlecht.',
        steps: () => {
          const types = shuffle(['maj', 'min', pick(['maj', 'min']), pick(['maj', 'min'])]);
          return [
            Steps.info({
              title: 'Hell und dunkel',
              text: 'Dur und Moll unterscheiden sich nur in der Terz, und doch hörst du den Unterschied sofort: Dur klingt **hell**, Moll eher **dunkel** oder traurig.\n\nVergleiche beide auf dem Ton C.',
              gate: true,
              media: earCompare(['maj', 'min'], 'min'),
            }),
            ...types.map((t, i) => earQuestion(i + 1, t)),
            findMinor(),
            cadenceEnd(),
          ];
        },
      },
    ],
  });
})();
