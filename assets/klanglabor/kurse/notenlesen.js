'use strict';
/* Kurs: Notenlesen – Klaviatur, Notenzeile, Hilfslinien, Bassschlüssel, Vorzeichen, Notenwerte, Hören. */

(() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
  const TREBLE = 30, BASS = 18;   // Stammtonstufe der untersten Linie: E4 bzw. G2
  const at = name => T.notes(name)[0];
  const baseOf = clef => (clef === 'bass' ? BASS : TREBLE);

  // Lage einer Note in Worten, z. B. „auf der 2. Linie“ oder „unter der 1. Hilfslinie“.
  function where(note, base = TREBLE) {
    const k = T.step(note) - base;
    if (k >= 0 && k <= 8) return k % 2 === 0 ? `auf der ${k / 2 + 1}. Linie` : `im ${(k + 1) / 2}. Zwischenraum`;
    if (k === -1) return 'direkt unter der untersten Linie';
    if (k === 9) return 'direkt über der obersten Linie';
    if (k < 0) return k % 2 === 0 ? `auf der ${-k / 2}. Hilfslinie unter dem System` : `unter der ${(-k - 1) / 2}. Hilfslinie`;
    return k % 2 === 0 ? `auf der ${(k - 8) / 2}. Hilfslinie über dem System` : `über der ${(k - 9) / 2}. Hilfslinie`;
  }

  const readout = text => h('p', { class: 'readout', 'aria-live': 'polite', html: inline(text) });
  const letterOptions = ans => [ans, ...shuffle(LETTERS.filter(x => x !== ans)).slice(0, 3)];

  // Notenzeile mit antippbaren Noten (jede Note klingt).
  function tapStaff(names, { width = 340, clef = 'treble', labels = true, captions = [] } = {}) {
    const ns = names.map(at);
    const st = Staff({ width, clef });
    st.render(ns.map(x => [x]), { labels, captions, onTap: gi => Sound.piano(T.midi(ns[gi])) });
    return st.el;
  }

  // „Welcher Ton ist das?“ mit einer Note in der Notenzeile.
  function nameQuestion({ title, names, clef = 'treble' }) {
    const note = at(pick(names));
    const ans = T.name(note);
    return Steps.mc({
      title,
      prompt: 'Welcher Ton ist das?',
      media: el => {
        const st = Staff({ width: 200, clef });
        st.render([[note]], { labels: false });
        el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.piano(T.midi(note)))));
      },
      options: letterOptions(ans),
      answer: ans,
      explain: `Das ist **${ans}**: Die Note steht ${where(note, baseOf(clef))}.`,
      wrong: 'Zähl von einer Note aus, die du sicher kennst. Jede Linie und jeder Zwischenraum ist ein Stammton weiter.',
    });
  }

  // Genau diese Taste, auch die Lage muss stimmen.
  function exactCheck(target) {
    return sel => {
      const d = sel[0] - target;
      if (d === 0) return { ok: true };
      if (mod(d, 12) === 0) {
        const oct = Math.abs(d / 12);
        return { ok: false, msg: `Der Name stimmt, aber nicht die Lage: Diese Taste liegt ${oct === 1 ? 'eine Oktave' : oct + ' Oktaven'} zu ${d > 0 ? 'hoch' : 'tief'}.` };
      }
      return { ok: false, msg: `Das ist ${T.pcName(sel[0])}. Lies die Note noch einmal und zähl vom mittleren C aus.` };
    };
  }

  // Note aus der Notenzeile auf der Klaviatur spielen.
  function playWhatYouRead({ names, clef = 'treble', from, to }) {
    const note = at(pick(names));
    const m = T.midi(note);
    return Steps.keys({
      prompt: 'Spiele genau diesen Ton, in der richtigen Lage. Die hell markierte Taste ist das **mittlere C**.',
      media: el => {
        const st = Staff({ width: 200, clef });
        st.render([[note]], { labels: false });
        el.append(st.el);
      },
      from, to, labels: 'none', marks: [[60, 'mk-step', 'C']],
      check: exactCheck(m),
      solution: [m],
      explain: `**${T.name(note)}** steht ${where(note, baseOf(clef))}.`,
    });
  }

  /* ---------- Vorzeichen ---------- */
  const SHARP = { C: 'Cis', D: 'Dis', F: 'Fis', G: 'Gis', A: 'Ais' };
  const FLAT = { D: 'Des', E: 'Es', G: 'Ges', A: 'As', H: 'B' };
  const spellAcc = (l, a) => T.name({ l: mod(l, 7), a, o: 4 });

  // Stammton + Vorzeichen → Name, mit drei Ablenkern (Gegenvorzeichen, Nachbarn mit gleichem Vorzeichen).
  function accidentalQuiz() {
    const flat = Math.random() < 0.5;
    const letter = pick(Object.keys(flat ? FLAT : SHARP));
    const l = LETTERS.indexOf(letter);
    const a = flat ? -1 : 1;
    const ans = spellAcc(l, a);
    return {
      flat, letter, ans,
      sym: flat ? '♭' : '♯',
      opposite: spellAcc(l, -a),
      neighbors: [[spellAcc(l + 1, a), LETTERS[mod(l + 1, 7)]], [spellAcc(l - 1, a), LETTERS[mod(l - 1, 7)]]],
    };
  }

  /* ---------- Notenwerte ---------- */
  const G = { 4: '\u{1D15D}', 3: '\u{1D15E}.', 2: '\u{1D15E}', 1.5: '\u{1D15F}.', 1: '\u{1D15F}', 0.5: '\u{1D160}' };
  const fmt = b => ({ 0.5: '½', 1.5: '1½', 2.5: '2½', 3.5: '3½' }[b] || String(b));
  const beatsText = b => `${fmt(b)} ${b <= 1 ? 'Schlag' : 'Schläge'}`;
  const val = x => Number(String(x).replace('½', '.5'));
  const BPM = 96, BEAT = 60 / BPM;

  // Ein 4/4-Takt mit Metronom: beats = Notenwerte in Schlägen.
  function playBar(beats, pitch = 67) {
    for (let i = 0; i < 4; i++) Sound.click(i * BEAT, i === 0);
    Sound.rhythm(beats.map(b => [pitch, b]), { bpm: BPM });
  }

  const barView = beats => h('div', { class: 'noten-bar', role: 'img', 'aria-label': 'Takt: ' + beats.map(beatsText).join(', ') },
    beats.map(b => h('span', { class: 'noten-glyph', 'aria-hidden': 'true' }, G[b])));

  // [klein, groß, Schläge klein, Schläge groß]
  const PAIRS = [
    ['Viertel', 'halbe Note', 1, 2], ['Achtel', 'Viertelnote', 0.5, 1], ['Viertel', 'ganze Note', 1, 4],
    ['Achtel', 'halbe Note', 0.5, 2], ['Achtel', 'ganze Note', 0.5, 4], ['Halbe', 'ganze Note', 2, 4],
  ];
  const RHYTHMS = [[1, 1, 2], [2, 1, 1], [1, 2, 1], [0.5, 0.5, 1, 2], [2, 0.5, 0.5, 1], [1, 1, 1, 1], [3, 1], [1, 3], [0.5, 0.5, 0.5, 0.5, 2], [1, 0.5, 0.5, 1, 1]];
  const rhText = r => r.map(b => G[b]).join(' ');

  function rhythmQuestion(no, r) {
    const others = shuffle(RHYTHMS.filter(x => x !== r)).slice(0, 3);
    return Steps.mc({
      title: `Hörprobe ${no}`,
      prompt: 'Welchen Rhythmus hörst du? Das Metronom klickt die vier Schläge mit.',
      media: (el, api) => {
        if (el.parentElement) el.parentElement.classList.add('noten-rq');
        const play = () => playBar(r);
        el.append(btnRow(PlayBtn('Nochmal hören', play)));
        api.later(play, 400);
      },
      options: [r, ...others].map(rhText),
      answer: rhText(r),
      explain: `Gehört hast du **${r.map(fmt).join(' + ')}** Schläge: ${r.length} ${r.length === 1 ? 'Ton' : 'Töne'} in einem vollen Takt.`,
      wrong: 'Zähl die Töne und achte darauf, wo ein Ton länger klingt als ein Klick.',
    });
  }

  /* ---------- Hören ---------- */
  const WHITE = [60, 62, 64, 65, 67, 69, 71, 72];
  const toNote = m => T.fromMidi(m);
  // Zufällige Melodie als Folge von Indizes in WHITE, Schritte und kleine Sprünge.
  function walk(len, start) {
    const idx = [start];
    while (idx.length < len) {
      const nx = idx[idx.length - 1] + pick([-2, -1, 1, 2]);
      if (nx >= 0 && nx < WHITE.length) idx.push(nx);
    }
    return idx;
  }

  /* ---------- Experimente ---------- */

  // Kapitel 1: die Stammtöne C bis H nacheinander auf unbeschrifteter Klaviatur.
  function stammtonRun(el, done) {
    let pos = 0, last = null, finished = false;
    const nextWhite = m => (isBlackKey(m + 1) ? m + 2 : m + 1);
    const read = readout('Beginne mit einem **C**.');
    const kb = Keyboard({
      from: 60, to: 83, labels: 'none',
      onPress: m => {
        if (finished) return;
        const want = LETTERS[pos];
        const hit = pos === 0 ? mod(m, 12) === 0 : m === nextWhite(last);
        if (!hit) {
          read.innerHTML = inline(pos === 0
            ? `Das war ${T.pcName(m)}. Das C liegt direkt links neben den **zwei** schwarzen Tasten.`
            : `Das war ${T.pcName(m)}. Als Nächstes kommt **${want}**, die weiße Taste direkt rechts neben ${LETTERS[pos - 1]}.`);
          return;
        }
        kb.mark(m, 'mk-ok', want);
        last = m;
        pos++;
        if (pos === LETTERS.length) {
          finished = true;
          read.innerHTML = inline('**C – D – E – F – G – A – H.** Alle sieben gefunden.');
          done('Das sind die sieben **Stammtöne**. Mit dem nächsten C beginnt die Reihe von vorn, eine **Oktave** höher.');
        } else {
          read.innerHTML = inline(`**${LETTERS.slice(0, pos).join(' – ')}** … weiter mit **${LETTERS[pos]}**.`);
        }
      },
    });
    el.append(kbWrap(kb.el), read);
  }

  // Kapitel 2: Notenzeile erkunden, bis alle fünf Linientöne gefunden sind.
  function lineExplorer(el, done) {
    const LINES = [30, 32, 34, 36, 38];
    const found = new Set();
    let d = null, finished = false;
    const staff = Staff({ width: 220 });
    const read = readout('Tippe in die Notenzeile oder schiebe die Note mit den Pfeilen.');
    const chips = h('div', { class: 'found' });
    const paintChips = () => chips.replaceChildren(...LINES.map(x =>
      h('span', { class: 'chip' + (found.has(x) ? ' is-on' : '') }, found.has(x) ? T.name(T.fromStep(x)) : '?')));
    const paint = () => staff.render(d == null ? [[]] : [[T.fromStep(d)]], { labels: true, classes: [d != null && LINES.includes(d) ? 'is-ok' : 'is-pick'] });
    const set = nd => {
      d = Math.max(29, Math.min(39, nd));
      paint();
      const note = T.fromStep(d);
      Sound.piano(T.midi(note));
      const line = LINES.includes(d);
      if (line && !finished) found.add(d);
      paintChips();
      read.innerHTML = inline(`**${T.name(note)}** steht ${where(note)}.${line ? ' Ein Linienton.' : ''}`);
      if (found.size === LINES.length && !finished) {
        finished = true;
        done('**E – G – H – D – F**: die fünf Linientöne von unten nach oben. Merksatz: **E**s **G**eht **H**urtig **D**urch **F**leiß.');
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
      h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Linientöne'), chips));
  }

  // Kapitel 5: alle schwarzen Tasten antippen, beide Namen erscheinen.
  function blackKeys(el, done) {
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
          read.innerHTML = inline(`**${T.pcName(m)}** ist eine weiße Taste. Tippe auf eine schwarze.`);
          return;
        }
        const [up, dn] = NAMES[pc];
        read.innerHTML = inline(`Diese Taste heißt **${up}** (${T.pcName(pc - 1)} erhöht) oder **${dn}** (${T.pcName(pc + 1)} erniedrigt).`);
        kb.mark(m, 'mk-ok', '');
        found.add(pc);
        paintChips();
        if (found.size === 5 && !finished) {
          finished = true;
          done('Jede schwarze Taste hat **zwei Namen**: einmal vom linken Nachbarn erhöht, einmal vom rechten erniedrigt. Gleich klingende Töne mit verschiedenen Namen heißen **enharmonisch** gleich.');
        }
      },
    });
    paintChips();
    el.append(kbWrap(kb.el), read, h('div', { class: 'found-row' }, h('span', { class: 'hint' }, 'Gefundene Tasten'), chips));
  }

  // Kapitel 6: einen 4/4-Takt mit mindestens drei verschiedenen Notenwerten genau füllen.
  function barFiller(el, done) {
    const VALUES = [4, 3, 2, 1, 0.5];
    const NAMES = { 4: 'Ganze', 3: 'Punktierte Halbe', 2: 'Halbe', 1: 'Viertel', 0.5: 'Achtel' };
    let bar = [], finished = false;
    const sum = () => bar.reduce((a, b) => a + b, 0);
    const view = h('div', { class: 'noten-bar', 'aria-live': 'polite' });
    const read = readout('0 von 4 Schlägen. Füge Notenwerte hinzu.');
    const btns = VALUES.map(b => {
      const x = h('button', { type: 'button', class: 'btn btn--outline noten-vbtn', 'aria-label': `${NAMES[b]} hinzufügen, ${beatsText(b)}` },
        h('span', { class: 'noten-glyph', 'aria-hidden': 'true' }, G[b]), h('small', {}, fmt(b)));
      x.addEventListener('click', () => { if (!finished && sum() + b <= 4) { bar.push(b); update(); } });
      return x;
    });
    const undo = h('button', { type: 'button', class: 'link-btn', onclick: () => { if (!finished && bar.length) { bar.pop(); update(); } } }, 'Rückgängig');
    const clear = h('button', { type: 'button', class: 'link-btn', onclick: () => { if (!finished) { bar = []; update(); } } }, 'Neu');

    function update() {
      const total = sum();
      view.replaceChildren(...bar.map(b => h('span', { class: 'noten-glyph' }, G[b])));
      view.setAttribute('aria-label', bar.length ? 'Takt: ' + bar.map(b => NAMES[b]).join(', ') : 'leerer Takt');
      btns.forEach((x, i) => { x.disabled = finished || total + VALUES[i] > 4; });
      undo.disabled = clear.disabled = finished || !bar.length;
      if (total < 4) {
        read.innerHTML = inline(`${fmt(total)} von 4 Schlägen. Noch **${beatsText(4 - total)}** frei.`);
        return;
      }
      playBar(bar);
      const kinds = new Set(bar).size;
      if (kinds >= 3) {
        finished = true;
        btns.forEach(x => { x.disabled = true; });
        undo.disabled = clear.disabled = true;
        read.innerHTML = inline('**Der Takt ist voll.**');
        done(`${rhText(bar)}: ${bar.map(fmt).join(' + ')} = 4 Schläge. Ein voller **4/4-Takt** mit ${kinds} verschiedenen Notenwerten.`);
      } else {
        read.innerHTML = inline(`Der Takt ist voll, aber mit ${kinds === 1 ? 'nur einem Notenwert' : 'nur zwei verschiedenen Notenwerten'}. Für das Ziel brauchst du **drei**. Nimm etwas zurück oder fang neu an.`);
      }
    }

    update();
    el.append(view, h('div', { class: 'noten-vbtns' }, btns), btnRow(PlayBtn('Takt anhören', () => playBar(bar)), undo, clear), read);
  }

  // Kopfbild: die C-Dur-Tonleiter zum Antippen.
  function visual() {
    return {
      label: 'Notenzeile · zum Anhören antippen',
      foot: 'Sieben Stammtöne, dann beginnt alles von vorn',
      el: tapStaff(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4', 'C5'], { width: 360 }),
    };
  }

  /* ---------- Blitzrunde ---------- */
  function genKey() {
    const i = randInt(0, 6);
    const right = Math.random() < 0.5;
    const ans = LETTERS[mod(i + (right ? 1 : -1), 7)];
    return {
      tag: 'Klaviatur',
      prompt: `Welche weiße Taste liegt direkt **${right ? 'rechts' : 'links'}** neben **${LETTERS[i]}**?`,
      options: quizOptions(ans, LETTERS.filter(x => x !== LETTERS[i])),
      answer: ans,
    };
  }

  function staffGen(tag, prompt, names, clef) {
    return () => {
      const nm = pick(names);
      const note = at(nm);
      const ans = T.name(note);
      return {
        tag, prompt, key: tag + nm,
        media: el => {
          const st = Staff({ width: 200, clef });
          st.render([[note]], { labels: false });
          el.append(st.el);
        },
        options: quizOptions(ans, LETTERS),
        answer: ans,
      };
    };
  }

  function genAccidental() {
    const q = accidentalQuiz();
    return {
      tag: 'Vorzeichen',
      prompt: `Wie heißt **${q.letter}** mit ${q.flat ? 'einem Be' : 'einem Kreuz'} (${q.sym})?`,
      options: shuffle([q.ans, q.opposite, ...q.neighbors.map(x => x[0])]),
      answer: q.ans,
    };
  }

  function genValue() {
    if (Math.random() < 0.5) {
      const [small, big, sb, bb] = pick(PAIRS);
      return { tag: 'Notenwerte', prompt: `Wie viele **${small}** passen in eine **${big}**?`, options: ['1', '2', '4', '8'], answer: String(bb / sb) };
    }
    const [name, b] = pick([['ganze Note', 4], ['halbe Note', 2], ['Viertelnote', 1], ['Achtelnote', 0.5], ['punktierte halbe Note', 3], ['punktierte Viertelnote', 1.5]]);
    const ans = fmt(b);
    return {
      tag: 'Notenwerte',
      prompt: `Wie viele Schläge dauert eine **${name}**?`,
      options: quizOptions(ans, ['½', '1', '1½', '2', '3', '4']).sort((x, y) => val(x) - val(y)),
      answer: ans,
    };
  }

  /* ---------- Kapitel ---------- */
  const KEY_SPOTS = {
    D: 'D liegt **zwischen** den zwei schwarzen Tasten',
    E: 'E liegt direkt **rechts** neben den zwei schwarzen Tasten',
    G: 'G liegt zwischen der ersten und zweiten Taste der **Dreiergruppe**',
    A: 'A liegt zwischen der zweiten und dritten Taste der **Dreiergruppe**',
    H: 'H liegt direkt **rechts** neben der Dreiergruppe',
  };

  defineCourse({
    id: 'notenlesen',
    short: 'Notenlesen',
    title: ['Noten ', 'lesen'],
    topic: 'Grundlagen',
    sub: 'Klaviatur, Notenzeile, Schlüssel, Vorzeichen und Notenwerte',
    lead: 'Fünf Linien, ein Schlüssel, sieben Stammtöne. Du lernst, wo jeder Ton auf der Notenzeile und auf der Klaviatur sitzt, wie Vorzeichen ihn verändern und wie lange er klingt.',
    visual,
    badge: { id: 'noten-kurs', glyph: '\u{1D15F}', name: 'Vom Blatt', desc: 'Den Kurs Notenlesen abgeschlossen.' },
    arcade: [
      { id: 'noten-taste', name: 'Tasten-Nachbarn', gen: genKey, needs: 'noten-tasten' },
      { id: 'noten-linie', name: 'Violinschlüssel lesen', gen: staffGen('Violinschlüssel', 'Wie heißt dieser Ton?', ['E4', 'F4', 'G4', 'A4', 'H4', 'C5', 'D5', 'E5', 'F5'], 'treble'), needs: 'noten-linien' },
      { id: 'noten-bassname', name: 'Bassschlüssel lesen', gen: staffGen('Bassschlüssel', 'Wie heißt dieser Ton im Bassschlüssel?', ['G2', 'A2', 'H2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'], 'bass'), needs: 'noten-bass' },
      { id: 'noten-vz', name: 'Vorzeichen-Namen', gen: genAccidental, needs: 'noten-vorzeichen' },
      { id: 'noten-wert', name: 'Notenwerte zählen', gen: genValue, needs: 'noten-werte' },
    ],
    levels: [
      {
        id: 'noten-tasten',
        title: 'Die Klaviatur',
        sub: 'Sieben Stammtöne und ihr Muster',
        takeaway: 'Sieben **Stammtöne**: C D E F G A H. **C** liegt links neben zwei schwarzen Tasten, **F** links neben drei.',
        steps: () => {
          const target = pick(Object.keys(KEY_SPOTS));
          const pc = T.pc(n(target, 4));
          return [
            Steps.info({
              title: 'Weiße Tasten, schwarze Gruppen',
              text: 'Die weißen Tasten tragen die sieben **Stammtöne**: C – D – E – F – G – A – H. Danach beginnt die Reihe mit dem nächsten C von vorn.\n\nDie schwarzen Tasten liegen in **Zweier- und Dreiergruppen**. An diesem Muster findest du jeden Ton: **C** liegt direkt links neben den zwei schwarzen Tasten, **F** direkt links neben den drei.',
              media: el => el.append(kbWrap(Keyboard({ from: 60, to: 83, labels: 'white' }).el)),
            }),
            Steps.keys({
              prompt: 'Diesmal ohne Beschriftung: Finde ein **F**.',
              from: 60, to: 83, labels: 'none',
              check: pcCheck(5, 'F liegt direkt links neben der **Dreiergruppe** schwarzer Tasten.'),
              solution: [65],
              explain: 'F liegt direkt links neben den drei schwarzen Tasten.',
            }),
            Steps.task({
              title: 'Die Stammtöne der Reihe nach',
              text: 'Spiele die sieben Stammtöne von **C** bis **H** nacheinander aufwärts, ohne eine weiße Taste auszulassen.\n\nDie Klaviatur ist unbeschriftet. Orientiere dich an den schwarzen Tasten.',
              mount: stammtonRun,
            }),
            Steps.keys({
              prompt: `Finde ein **${target}**. Die Gruppen der schwarzen Tasten helfen dir.`,
              from: 60, to: 83, labels: 'none',
              check: pcCheck(pc, `${KEY_SPOTS[target]}.`),
              solution: [60 + pc],
              explain: `Richtig: ${KEY_SPOTS[target]}.`,
            }),
            Steps.keys({
              prompt: 'Finde **alle C** auf dieser Klaviatur.',
              from: 57, to: 84, labels: 'none', max: 3,
              check: sel => {
                if (sel.length < 3) return { ok: false, msg: `Du hast erst ${sel.length} von 3 Tasten gewählt.` };
                const wrong = sel.filter(m => mod(m, 12) !== 0);
                if (!wrong.length) return { ok: true };
                return { ok: false, msg: `${wrong.map(T.pcName).join(' und ')} ${wrong.length === 1 ? 'ist' : 'sind'} kein C. Das C liegt direkt links neben den zwei schwarzen Tasten.` };
              },
              solution: [60, 72, 84],
              explain: 'Drei C, jedes direkt links neben zwei schwarzen Tasten. Von einem C zum nächsten ist es eine **Oktave**.',
            }),
            Steps.mc({
              prompt: 'Im Deutschen heißt die weiße Taste zwischen A und C **H**. Was ist dann **B**?',
              options: [
                'Die schwarze Taste zwischen A und H',
                { t: 'Die weiße Taste zwischen A und C', why: 'Die heißt im Deutschen H. Nur im Englischen wird sie „B“ genannt.' },
                { t: 'Die schwarze Taste zwischen C und D', why: 'Das ist Cis oder Des.' },
                { t: 'Die weiße Taste zwischen H und D', why: 'Das ist C.' },
              ],
              answer: 'Die schwarze Taste zwischen A und H',
              explain: 'B ist das **erniedrigte H**, die schwarze Taste direkt links neben H. Vorsicht bei englischen Noten: Dort heißt unser H „B“.',
            }),
          ];
        },
      },
      {
        id: 'noten-linien',
        title: 'Linien und Zwischenräume',
        sub: 'Das Notensystem und der Violinschlüssel',
        takeaway: 'Linien von unten: **E G H D F**, Zwischenräume: **F A C E**. Der Violinschlüssel markiert das **G** auf der zweiten Linie.',
        steps: () => {
          const t1 = pick(['G4', 'A4', 'H4', 'C5', 'D5']);
          const n1 = at(t1);
          const t2 = pick([
            { target: 'E4', explain: 'Das E steht auf der **untersten Linie**. Das andere E liegt im obersten Zwischenraum.' },
            { target: 'F5', explain: 'Das F steht auf der **obersten Linie**. Das andere F liegt im untersten Zwischenraum.' },
          ]);
          return [
            Steps.info({
              title: 'Fünf Linien',
              text: 'Noten stehen auf **fünf Linien** und in den **vier Zwischenräumen** dazwischen. Gezählt wird **von unten**.\n\nJe höher eine Note steht, desto höher klingt sie. Von einer Linie zum nächsten Zwischenraum geht es genau einen **Stammton** weiter. Tippe die Noten an.',
              media: el => el.append(tapStaff(['E4', 'F4', 'G4', 'A4', 'H4', 'C5', 'D5', 'E5', 'F5'], { width: 400 })),
            }),
            Steps.info({
              title: 'Der Violinschlüssel',
              text: 'Am Anfang jeder Zeile steht ein **Schlüssel**. Er legt fest, welcher Ton wo steht.\n\nDer **Violinschlüssel** heißt auch **G-Schlüssel**: Er kringelt sich um die **zweite Linie** von unten. Dort steht das **G** über dem mittleren C. Von diesem G aus kannst du alle anderen Töne abzählen.',
              media: el => {
                const st = Staff({ width: 220 });
                st.render([[n('G', 4)]], { captions: ['G auf der 2. Linie'], hl: 0 });
                el.append(st.el, btnRow(PlayBtn('G anhören', () => Sound.piano(67))));
              },
            }),
            Steps.pick({
              prompt: `Setze ein **${T.name(n1)}** in die Notenzeile, ohne Hilfslinien.`,
              target: t1,
              start: t1 === 'H4' ? 'E5' : undefined,
              explain: `**${T.name(n1)}** steht ${where(n1)}.${t1 === 'G4' ? ' Genau dort kringelt sich der Violinschlüssel.' : ''}`,
            }),
            Steps.pick({
              prompt: `Setze das **${t2.target.charAt(0)}**, das **auf einer Linie** steht.`,
              target: t2.target,
              explain: t2.explain,
            }),
            Steps.task({
              title: 'Finde die Linientöne',
              text: 'Tippe in die Notenzeile oder schiebe die Note mit den Pfeilen. Jede Position wird benannt und klingt.\n\nFinde alle **fünf Töne, die auf einer Linie stehen**.',
              mount: lineExplorer,
            }),
            Steps.mc({
              prompt: 'Welche Töne liegen in den **vier Zwischenräumen**, von unten nach oben?',
              options: [
                'F – A – C – E',
                { t: 'E – G – H – D', why: 'Das sind vier der fünf Linientöne.' },
                { t: 'F – A – H – D', why: 'H und D stehen auf Linien.' },
                { t: 'G – H – D – F', why: 'Das sind Linientöne.' },
              ],
              answer: 'F – A – C – E',
              explain: 'Von unten: **F – A – C – E**. Jeder Zwischenraum liegt zwischen zwei Linientönen: E (F) G (A) H (C) D (E) F.',
            }),
            nameQuestion({ names: ['E4', 'F4', 'G4', 'A4', 'H4', 'C5', 'D5', 'E5', 'F5'] }),
          ];
        },
      },
      {
        id: 'noten-hilfslinien',
        title: 'Hilfslinien',
        sub: 'Über und unter dem System',
        takeaway: 'Das **mittlere C** steht auf der ersten Hilfslinie unter dem System. Nach sieben Stammtönen kommt derselbe Name wieder: eine **Oktave**.',
        steps: () => {
          const t = pick([
            { target: 'A5', prompt: 'Setze das **A**, das eine **Oktave höher** liegt als das A im zweiten Zwischenraum.', explain: 'Dieses A steht auf der **ersten Hilfslinie** über dem System: oberste Linie F, darüber G, dann A.' },
            { target: 'C6', prompt: 'Setze das **C**, das **zwei Oktaven** über dem mittleren C liegt.', explain: 'Über dem A auf der ersten Hilfslinie folgen H und dann C auf der **zweiten Hilfslinie**.' },
            { target: 'A3', prompt: 'Setze das **A**, das eine **Oktave tiefer** liegt als das A im zweiten Zwischenraum.', explain: 'Unter dem mittleren C auf der ersten Hilfslinie folgen H und dann A auf der **zweiten Hilfslinie** unten.' },
            { target: 'H5', prompt: 'Setze das **H**, das eine **Oktave über** dem H auf der Mittellinie liegt.', explain: 'Dieses H steht über der ersten Hilfslinie, sieben Stammtöne über der Mittellinie.' },
          ]);
          return [
            Steps.info({
              title: 'Kurze Linien für tiefe Töne',
              text: 'Reichen die fünf Linien nicht, verlängert man das System mit kurzen **Hilfslinien**.\n\nDas **mittlere C**, die Taste in der Mitte der Klaviatur, steht im Violinschlüssel auf der **ersten Hilfslinie unter** dem System. Direkt darüber, unter der untersten Linie, liegt D. Dann folgt E auf der ersten Linie.',
              media: el => {
                const kb = Keyboard({ from: 55, to: 76, labels: 'c' });
                kb.mark(60, 'mk-ref', 'C');
                el.append(tapStaff(['C4', 'D4', 'E4'], { width: 240 }), kbWrap(kb.el));
              },
            }),
            Steps.info({
              title: 'Nach oben genauso',
              text: 'Über der obersten Linie (F) liegt G, dann **A auf der ersten Hilfslinie**, H darüber und **C auf der zweiten Hilfslinie**.\n\nDieses hohe C klingt **zwei Oktaven** über dem mittleren C. Tippe die Noten an.',
              media: el => el.append(tapStaff(['E5', 'F5', 'G5', 'A5', 'H5', 'C6'], { width: 340 })),
            }),
            Steps.pick({
              prompt: 'Setze das **mittlere C** in die Notenzeile.',
              target: 'C4',
              explain: 'Das mittlere C steht auf der **ersten Hilfslinie** unter dem System.',
            }),
            Steps.pick({ prompt: t.prompt, target: t.target, explain: t.explain }),
            playWhatYouRead({ names: ['C4', 'D4', 'H3', 'A3', 'C5', 'G5', 'A5', 'H5', 'C6'], from: 55, to: 84 }),
            Steps.mc({
              prompt: 'Was ist eine **Oktave**?',
              options: [
                'Der Abstand zum nächsten Ton mit gleichem Namen',
                { t: 'Der Abstand von acht Halbtönen', why: 'Gezählt werden acht Stammtöne, nicht Halbtöne. Eine Oktave hat 12 Halbtöne.' },
                { t: 'Der Abstand von der untersten zur obersten Linie', why: 'Von E bis F oben sind es neun Stammtöne, mehr als eine Oktave.' },
                { t: 'Der Abstand zwischen zwei Hilfslinien', why: 'Von einer Hilfslinie zur nächsten sind es nur zwei Stammtöne.' },
              ],
              answer: 'Der Abstand zum nächsten Ton mit gleichem Namen',
              explain: 'Nach sieben Stammtönen kommt wieder derselbe Name: C – D – E – F – G – A – H – **C**. Dieser Abstand ist eine **Oktave** mit 12 Halbtönen.',
            }),
            nameQuestion({ names: ['C4', 'H3', 'A3', 'D4', 'G5', 'A5', 'H5', 'C6'] }),
          ];
        },
      },
      {
        id: 'noten-bass',
        title: 'Der Bassschlüssel',
        sub: 'Ein Schlüssel für tiefe Töne',
        takeaway: 'Im **Bassschlüssel** liegen die Linien auf **G H D F A**, die Zwischenräume auf **A C E G**. Seine Punkte markieren das **F**.',
        steps: () => {
          const t = pick(['H2', 'C3', 'D3', 'E3', 'F3']);
          const nt = at(t);
          return [
            Steps.info({
              title: 'Der F-Schlüssel',
              text: 'Für tiefe Töne, etwa die linke Hand am Klavier, Cello oder Fagott, gibt es den **Bassschlüssel**.\n\nEr heißt auch **F-Schlüssel**: Seine zwei Punkte umschließen die **vierte Linie** von unten. Dort steht das **F** unterhalb des mittleren C.',
              media: el => {
                const st = Staff({ width: 220, clef: 'bass' });
                st.render([[n('F', 3)]], { captions: ['F auf der 4. Linie'], hl: 0 });
                el.append(st.el, btnRow(PlayBtn('F anhören', () => Sound.piano(53))));
              },
            }),
            Steps.info({
              title: 'Linien und Zwischenräume im Bass',
              text: 'Linien von unten: **G – H – D – F – A**. Zwischenräume: **A – C – E – G**.\n\nGanz oben, auf der **ersten Hilfslinie über** dem System, steht das **mittlere C**. Es ist dasselbe C, das im Violinschlüssel auf der ersten Hilfslinie **unter** dem System steht. Hier treffen sich die beiden Schlüssel.',
              media: el => {
                const bass = Staff({ width: 200, clef: 'bass' });
                const treble = Staff({ width: 200 });
                bass.render([[n('C', 4)]], { captions: ['Bassschlüssel'] });
                treble.render([[n('C', 4)]], { captions: ['Violinschlüssel'] });
                el.append(
                  tapStaff(['G2', 'A2', 'H2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'], { width: 400, clef: 'bass' }),
                  h('div', { class: 'noten-pair' }, bass.el, treble.el),
                  btnRow(PlayBtn('Mittleres C anhören', () => Sound.piano(60))));
              },
            }),
            Steps.pick({
              prompt: `Setze ein **${T.name(nt)}** in die Notenzeile mit Bassschlüssel, ohne Hilfslinien.`,
              target: t, clef: 'bass',
              start: t === 'D3' ? 'G3' : undefined,
              explain: `Im Bassschlüssel steht **${T.name(nt)}** ${where(nt, BASS)}.`,
            }),
            Steps.pick({
              prompt: 'Setze das **mittlere C** in den Bassschlüssel.',
              target: 'C4', clef: 'bass',
              explain: 'Im Bassschlüssel steht das mittlere C auf der **ersten Hilfslinie über** dem System.',
            }),
            nameQuestion({ names: ['G2', 'A2', 'H2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'C4'], clef: 'bass' }),
            playWhatYouRead({ names: ['G2', 'A2', 'H2', 'C3', 'D3', 'E3', 'F3', 'A3', 'C4'], clef: 'bass', from: 43, to: 64 }),
            Steps.mc({
              prompt: 'Welcher Ton steht im Bassschlüssel auf der **mittleren Linie**?',
              options: [
                'D',
                { t: 'H', why: 'H steht im Violinschlüssel auf der Mittellinie. Im Bassschlüssel zählst du von der untersten Linie G aus.' },
                { t: 'F', why: 'F steht auf der vierten Linie, dort sitzen die Punkte des Schlüssels.' },
                { t: 'C', why: 'C liegt im Bassschlüssel in einem Zwischenraum oder auf einer Hilfslinie.' },
              ],
              answer: 'D',
              explain: 'Linien von unten: G – H – **D** – F – A. Die dritte Linie trägt das D.',
            }),
          ];
        },
      },
      {
        id: 'noten-vorzeichen',
        title: 'Kreuz und Be',
        sub: 'Schwarze Tasten, neue Namen',
        takeaway: '**♯** hängt **-is** an, **♭** hängt **-es** an (Ausnahmen: Es, As, B). Jede schwarze Taste hat **zwei Namen**.',
        steps: () => {
          const q = accidentalQuiz();
          const exception = q.flat && ['E', 'A', 'H'].includes(q.letter) ? ' Das ist eine der drei Ausnahmen: Es, As und B.' : '';
          const playName = pick([...Object.values(SHARP), ...Object.values(FLAT)]);
          const pn = n(playName, 4);
          const base = LETTERS[pn.l];
          const playHint = pn.a > 0 ? `${playName} ist ${base} erhöht: die Taste direkt rechts neben ${base}.` : `${playName} ist ${base} erniedrigt: die Taste direkt links neben ${base}.`;
          const sn = at(pick(['Fis4', 'B4', 'Es4', 'As4', 'Cis5', 'Gis4', 'Des5']));
          const sName = T.name(sn), sLetter = LETTERS[sn.l], sSharp = sn.a > 0;
          const sEnh = T.spellings(T.pc(sn), 1).find(x => x !== sName);
          const sOther = LETTERS[mod(sn.l + (sSharp ? 1 : -1), 7)];
          const enh = pick([
            { x: 'Eis', ans: 'F', opts: ['E', 'Fis', 'Es'], explain: 'Zwischen E und F liegt keine schwarze Taste. E um einen Halbton erhöht ist also die weiße Taste **F**.' },
            { x: 'His', ans: 'C', opts: ['H', 'Cis', 'B'], explain: 'Zwischen H und C liegt keine schwarze Taste. H erhöht ist also **C**.' },
            { x: 'Ces', ans: 'H', opts: ['C', 'B', 'Cis'], explain: 'Zwischen H und C liegt keine schwarze Taste. C erniedrigt ist also **H**.' },
            { x: 'Fes', ans: 'E', opts: ['F', 'Es', 'Fis'], explain: 'Zwischen E und F liegt keine schwarze Taste. F erniedrigt ist also **E**.' },
          ]);
          return [
            Steps.info({
              title: 'Einen Halbton höher oder tiefer',
              text: 'Ein **Kreuz** ♯ erhöht einen Ton um einen Halbton, an den Namen kommt **-is**: F wird zu Fis, C zu Cis.\n\nEin **Be** ♭ erniedrigt um einen Halbton, an den Namen kommt **-es**: D wird zu Des, G zu Ges. Drei Ausnahmen: **Es**, **As** und **B** (das erniedrigte H).\n\nEin **Auflösungszeichen** ♮ hebt ein Vorzeichen wieder auf. Tippe die Noten an.',
              media: el => el.append(tapStaff(['F4', 'Fis4', 'H4', 'B4'], { width: 300, labels: false, captions: ['F', 'Fis', 'H', 'B'] })),
            }),
            Steps.task({
              title: 'Zwei Namen für jede schwarze Taste',
              text: 'Jede schwarze Taste liegt zwischen zwei weißen. Sie ist also der **linke Nachbar erhöht** oder der **rechte Nachbar erniedrigt**.\n\nTippe alle fünf schwarzen Tasten an und lerne ihre beiden Namen kennen.',
              mount: blackKeys,
            }),
            Steps.mc({
              prompt: `Wie heißt **${q.letter}** mit ${q.flat ? 'einem **Be** (♭)' : 'einem **Kreuz** (♯)'}?`,
              options: [
                q.ans,
                { t: q.opposite, why: `${q.opposite} wäre ${q.letter} ${q.flat ? 'erhöht' : 'erniedrigt'}.` },
                ...q.neighbors.map(([x, l]) => ({ t: x, why: `${x} gehört zum Stammton ${l}, nicht zu ${q.letter}.` })),
              ],
              answer: q.ans,
              explain: `${q.letter} ${q.flat ? 'erniedrigt' : 'erhöht'} heißt **${q.ans}**.${exception}`,
            }),
            Steps.keys({
              prompt: `Spiele **${playName}**.`,
              from: 60, to: 71,
              check: pcCheck(T.pc(pn), playHint),
              solution: [60 + T.pc(pn)],
              explain: playHint,
            }),
            Steps.mc({
              prompt: 'Wie heißt dieser Ton?',
              media: el => {
                const st = Staff({ width: 200 });
                st.render([[sn]], { labels: false });
                el.append(st.el, btnRow(PlayBtn('Anhören', () => Sound.piano(T.midi(sn)))));
              },
              options: [
                sName,
                { t: sEnh, why: 'Klingt gleich, aber die Note steht auf dem Platz eines anderen Stammtons.' },
                { t: sLetter, why: `Das Vorzeichen zählt mit: ${sSharp ? 'Das Kreuz erhöht' : 'Das Be erniedrigt'} die Note um einen Halbton.` },
                { t: sOther, why: 'Schau, auf welchem Platz die Note steht, und rechne dann das Vorzeichen dazu.' },
              ],
              answer: sName,
              explain: `Die Note steht auf dem Platz des **${sLetter}**, ${sSharp ? 'das Kreuz' : 'das Be'} macht daraus **${sName}**.`,
            }),
            Steps.mc({
              prompt: `Welcher Ton klingt genauso wie **${enh.x}**?`,
              options: [enh.ans, ...enh.opts],
              answer: enh.ans,
              explain: enh.explain,
              wrong: 'Such auf der Klaviatur: Welche Taste liegt einen Halbton neben dem Stammton? Zwischen E und F und zwischen H und C gibt es keine schwarze Taste.',
            }),
            Steps.mc({
              prompt: 'Was macht das **Auflösungszeichen** ♮?',
              options: [
                'Es hebt ein Vorzeichen auf',
                { t: 'Es erhöht um einen Halbton', why: 'Das macht das Kreuz.' },
                { t: 'Es erniedrigt um einen Halbton', why: 'Das macht das Be.' },
                { t: 'Es verlängert die Note', why: 'Das macht ein Punkt hinter der Note.' },
              ],
              answer: 'Es hebt ein Vorzeichen auf',
              explain: 'Nach einem ♮ gilt wieder der **Stammton**: Aus Fis wird wieder F.',
            }),
          ];
        },
      },
      {
        id: 'noten-werte',
        title: 'Notenwerte und Takt',
        sub: 'Wie lange ein Ton klingt',
        takeaway: 'Ganze 4, Halbe 2, Viertel 1, Achtel ½ Schlag. Ein **4/4-Takt** ist voll, wenn die Werte zusammen 4 ergeben. Ein **Punkt** verlängert um die Hälfte.',
        steps: () => {
          const [small, big, sb, bb] = pick(PAIRS);
          const dotted = pick([
            { name: 'punktierte halbe Note', g: G[3], options: ['2', '2½', '3', '4'], answer: '3', explain: 'Der Punkt verlängert um die Hälfte: 2 + 1 = **3** Schläge.' },
            { name: 'punktierte Viertelnote', g: G[1.5], options: ['1', '1½', '2', '3'], answer: '1½', explain: 'Der Punkt verlängert um die Hälfte: 1 + ½ = **1½** Schläge.' },
          ]);
          const [r1, r2] = shuffle(RHYTHMS);
          return [
            Steps.info({
              title: 'Wie lange klingt ein Ton?',
              text: 'Die Form der Note zeigt ihre **Dauer**. Gezählt wird in **Schlägen**: Die ganze Note dauert 4, die halbe 2, die Viertel 1 und die Achtel einen halben Schlag.\n\nHör dir jede an. Das Metronom klickt die vier Schläge eines Takts, die Noten füllen ihn.',
              media: el => el.append(h('div', { class: 'noten-values' }, [[4, 'Ganze Note'], [2, 'Halbe Note'], [1, 'Viertelnote'], [0.5, 'Achtelnote']].map(([b, name]) =>
                h('div', { class: 'noten-value' },
                  h('span', { class: 'noten-glyph', 'aria-hidden': 'true' }, G[b]),
                  h('span', { class: 'noten-vname' }, name),
                  h('span', { class: 'hint' }, beatsText(b)),
                  PlayBtn('Anhören', () => playBar(Array(4 / b).fill(b))))))),
            }),
            Steps.mc({
              prompt: `Wie viele **${small}** passen in eine **${big}**?`,
              options: ['1', '2', '4', '8'], keepOrder: true,
              answer: String(bb / sb),
              explain: `Die ${big} dauert ${beatsText(bb)}, ${small === 'Halbe' ? 'die Halbe' : `das ${small}`} ${beatsText(sb)}: ${fmt(bb)} ÷ ${fmt(sb)} = **${bb / sb}**.`,
              wrong: 'Rechne in Schlägen: Ganze 4, Halbe 2, Viertel 1, Achtel ½.',
            }),
            Steps.info({
              title: 'Der Takt',
              text: 'Ein **4/4-Takt** fasst vier Viertelschläge. Ein **Taktstrich** trennt die Takte, und jeder Takt muss genau voll sein, zum Beispiel halbe + Viertel + Viertel = 2 + 1 + 1.\n\nEin **Punkt** hinter der Note verlängert sie um die Hälfte: Die punktierte Halbe dauert 2 + 1 = **3** Schläge.',
              media: el => el.append(
                barView([2, 1, 1]), btnRow(PlayBtn('2 + 1 + 1 anhören', () => playBar([2, 1, 1]))),
                barView([3, 1]), btnRow(PlayBtn('3 + 1 anhören', () => playBar([3, 1])))),
            }),
            Steps.task({
              title: 'Fülle den Takt',
              text: 'Tippe auf die Notenwerte, um sie in den Takt zu setzen. Ist er voll, erklingt er.\n\nZiel: ein Takt mit genau 4 Schlägen und **mindestens drei verschiedenen** Notenwerten.',
              mount: barFiller,
            }),
            Steps.mc({
              prompt: `Wie viele Schläge dauert eine **${dotted.name}** (${dotted.g})?`,
              options: dotted.options, keepOrder: true,
              answer: dotted.answer,
              explain: dotted.explain,
              wrong: 'Der Punkt verlängert die Note um die Hälfte ihres eigenen Werts.',
            }),
            rhythmQuestion(1, r1),
            rhythmQuestion(2, r2),
          ];
        },
      },
      {
        id: 'noten-hoeren',
        ear: true,
        title: 'Vom Bild zum Klang',
        sub: 'Notenbild und Klang verbinden',
        takeaway: 'Was in der Notenzeile **steigt**, klingt höher. Schritte klingen nah, Sprünge weit. So verbindest du **Notenbild und Klang**.',
        steps: () => {
          // Höher oder tiefer
          const [i1, i2] = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 2);
          const higher = WHITE[i2] > WHITE[i1];
          // Tonfolge ab C
          const seqs = [];
          ['D', 'E', 'F', 'G'].forEach(x => ['D', 'E', 'F', 'G'].forEach(y => { if (x !== y) seqs.push(['C', x, y]); }));
          const [ansSeq, ...otherSeqs] = shuffle(seqs);
          const seqText = s => s.join(' – ');
          const seqMidis = s => s.map(x => T.midi(n(x, 4)));
          // Passt das Gehörte?
          const mel = walk(4, randInt(1, 5));
          const same = Math.random() < 0.5;
          const played = mel.slice();
          let changed = -1;
          if (!same) {
            changed = randInt(1, 3);
            const opts = [mel[changed] - 1, mel[changed] + 1].filter(x => x >= 0 && x < WHITE.length);
            played[changed] = pick(opts);
          }
          const melNotes = mel.map(i => toNote(WHITE[i]));
          // Drei Notenzeilen
          const start = randInt(1, 5);
          const trio = [];
          while (trio.length < 3) {
            const w = walk(4, start);
            if (!trio.some(x => x.join() === w.join())) trio.push(w);
          }
          const right = randInt(0, 2);
          const L = ['A', 'B', 'C'];
          const melody = pick(['C4 D4 E4', 'E4 D4 C4', 'C4 E4 G4', 'G4 E4 C4', 'C4 D4 E4 F4', 'G4 F4 E4 D4']);
          return [
            Steps.info({
              title: 'Hören, was da steht',
              text: 'Steigt die Note in der Notenzeile, steigt auch der Klang. **Schritte** von der Linie zum Zwischenraum klingen nah beieinander, **Sprünge** über mehrere Plätze klingen weiter.\n\nTippe die Noten an oder spiel die ganze Zeile ab.',
              media: el => {
                const up = ['C4', 'E4', 'G4', 'C5'], down = ['G4', 'F4', 'E4', 'D4', 'C4'];
                el.append(
                  tapStaff(up, { width: 280, captions: ['Sprünge aufwärts'] }),
                  btnRow(PlayBtn('Sprünge anhören', () => Sound.seq(up.map(x => T.midi(at(x)))))),
                  tapStaff(down, { width: 300, captions: ['Schritte abwärts'] }),
                  btnRow(PlayBtn('Schritte anhören', () => Sound.seq(down.map(x => T.midi(at(x)))))));
              },
            }),
            Steps.mc({
              title: 'Höher oder tiefer?',
              prompt: 'Zwei Töne nacheinander. Ist der zweite **höher** oder **tiefer** als der erste?',
              media: (el, api) => {
                const play = () => Sound.seq([WHITE[i1], WHITE[i2]], { step: 0.7 });
                el.append(btnRow(PlayBtn('Nochmal hören', play)));
                api.later(play, 350);
              },
              options: ['höher', 'tiefer'], keepOrder: true,
              answer: higher ? 'höher' : 'tiefer',
              explain: `Der zweite Ton (${T.pcName(WHITE[i2])}) liegt ${higher ? 'höher' : 'tiefer'} als der erste (${T.pcName(WHITE[i1])}).`,
              wrong: 'Hör noch einmal: Geht die Stimme nach oben oder nach unten?',
            }),
            Steps.mc({
              title: 'Welche Tonfolge?',
              prompt: 'Der erste Ton ist **C**. Welche Tonfolge hörst du?',
              media: (el, api) => {
                const play = () => Sound.seq(seqMidis(ansSeq), { step: 0.62 });
                el.append(btnRow(PlayBtn('Nochmal hören', play), PlayBtn('Nur das C', () => Sound.piano(60), { variant: 'quiet' })));
                api.later(play, 350);
              },
              options: [ansSeq, ...otherSeqs.slice(0, 3)].map(seqText),
              answer: seqText(ansSeq),
              explain: `Gespielt wurde **${seqText(ansSeq)}**.`,
              wrong: 'Achte auf die Richtung: Steigt es nach dem C in einem Schritt oder mit einem Sprung? Und geht der dritte Ton nach oben oder nach unten?',
            }),
            Steps.mc({
              title: 'Passt es zum Notenbild?',
              prompt: 'Lies mit und hör zu. Klingt die Melodie genau so, wie sie dasteht?',
              media: (el, api) => {
                const st = Staff({ width: 280 });
                st.render(melNotes.map(x => [x]), { labels: false });
                const play = () => Sound.seq(played.map(i => WHITE[i]), { step: 0.7 });
                el.append(st.el, btnRow(PlayBtn('Nochmal hören', play)));
                api.later(play, 450);
              },
              options: ['Ja, genau so', 'Nein, ein Ton ist anders'], keepOrder: true,
              answer: same ? 'Ja, genau so' : 'Nein, ein Ton ist anders',
              explain: same
                ? `Genau so, Ton für Ton: ${T.join(melNotes)}.`
                : `Der ${changed + 1}. Ton war anders: gespielt wurde **${T.pcName(WHITE[played[changed]])}** statt **${T.name(melNotes[changed])}**.`,
              wrong: 'Hör noch einmal und folge dabei jeder Note mit den Augen.',
            }),
            Steps.mc({
              title: 'Welche Notenzeile?',
              prompt: 'Du hörst eine der drei Melodien. Welche?',
              media: (el, api) => {
                const play = () => Sound.seq(trio[right].map(i => WHITE[i]), { step: 0.62 });
                el.append(h('div', { class: 'noten-trio' }, trio.map((w, k) => {
                  const st = Staff({ width: 200 });
                  st.render(w.map(i => [toNote(WHITE[i])]), { labels: false });
                  return h('figure', {}, h('figcaption', {}, 'Notenzeile ' + L[k]), st.el);
                })), btnRow(PlayBtn('Nochmal hören', play)));
                api.later(play, 450);
              },
              options: L.map(x => 'Notenzeile ' + x), keepOrder: true,
              answer: 'Notenzeile ' + L[right],
              explain: `Gespielt wurde Notenzeile ${L[right]}: ${T.join(trio[right].map(i => toNote(WHITE[i])))}.`,
              wrong: 'Alle drei beginnen gleich. Achte darauf, wohin der zweite Ton geht: nach oben oder nach unten, Schritt oder Sprung?',
            }),
            Steps.dictation({
              title: 'Dein erstes Diktat',
              melody, from: 60, to: 72,
            }),
          ];
        },
      },
    ],
  });
})();
