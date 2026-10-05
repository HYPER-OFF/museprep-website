'use strict';
/* Lerninhalte: Schritt-Typen (Erklärung, Frage, Klaviatur-Aufgabe, Experiment) und die Level des Kurses. */

const T = Theory;
const n = T.note;
const CH = T.CHORDS;

/* ---------- Schritt-Typen ----------
   Jeder Schritt hat kind ('info' | 'question' | 'task') und render(body, api).
   api: ready(bool), onCheck(fn → {ok, msg}), onRetry(fn), onReveal(fn → msg), onKey(fn),
        locked(), complete(msg), badge(id), later(fn, ms). */
const Steps = {
  info({ title, text, media, gate = false }) {
    return {
      kind: 'info',
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        if (text) body.append(h('div', { class: 'st-text', html: rich(text) }));
        if (media) {
          const m = h('div', { class: 'st-media' });
          body.append(m);
          media(m, api);
        }
        if (!gate) api.ready(true);
      },
    };
  },

  mc({ title, prompt, media, options, answer, explain, wrong, keepOrder = false }) {
    return {
      kind: 'question',
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        body.append(h('div', { class: 'st-text', html: rich(prompt) }));
        if (media) {
          const m = h('div', { class: 'st-media' });
          body.append(m);
          media(m, api);
        }
        const opts = options.map(o => (typeof o === 'string' ? { t: o } : o));
        const order = keepOrder ? opts : shuffle(opts);
        const wide = order.some(o => o.t.length > 26);
        const grid = h('div', { class: 'opts' + (wide ? ' opts--wide' : '') });
        let sel = null;
        const btns = order.map((o, i) => {
          const b = h('button', { type: 'button', class: 'opt' },
            h('span', { class: 'opt-key' }, String.fromCharCode(65 + i)),
            h('span', { class: 'opt-t', html: inline(o.t) }));
          b.addEventListener('click', () => {
            if (b.disabled || api.locked()) return;
            sel = o;
            btns.forEach(x => x.classList.toggle('is-sel', x === b));
            api.ready(true);
          });
          grid.append(b);
          return b;
        });
        body.append(grid);
        api.onKey(i => { if (btns[i]) btns[i].click(); });
        api.onCheck(() => {
          const ok = sel.t === answer;
          const b = btns[order.indexOf(sel)];
          b.classList.add(ok ? 'is-ok' : 'is-bad');
          if (ok) btns.forEach(x => { x.disabled = true; });
          return { ok, msg: ok ? explain : (sel.why || wrong || 'Nicht ganz. Versuch es noch einmal.') };
        });
        api.onRetry(() => {
          const b = btns[order.indexOf(sel)];
          b.classList.remove('is-sel');
          b.disabled = true;
          sel = null;
          api.ready(false);
        });
        api.onReveal(() => {
          btns.forEach(x => { x.disabled = true; x.classList.remove('is-sel'); });
          btns[order.findIndex(o => o.t === answer)].classList.add('is-ok');
          return explain;
        });
      },
    };
  },

  keys({ title, prompt, from, to, labels = 'white', marks = [], max = 1, check, solution, explain }) {
    return {
      kind: 'question',
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        body.append(h('div', { class: 'st-text', html: rich(prompt) }));
        const kb = Keyboard({ from, to, labels, mode: 'select', max, onChange: sel => api.ready(sel.length > 0) });
        marks.forEach(([m, cls, lab]) => kb.mark(m, cls, lab));
        body.append(h('div', { class: 'st-media' },
          kbWrap(kb.el),
          max > 1 ? h('p', { class: 'hint' }, `Wähle ${max} Tasten. Ein zweiter Tipp auf eine Taste hebt die Wahl auf.`) : null));
        api.onCheck(() => {
          const r = check(kb.selected);
          if (r.ok) kb.lock(true);
          return { ok: r.ok, msg: r.ok ? explain : r.msg };
        });
        api.onReveal(() => {
          kb.setSelected(solution);
          kb.lock(true);
          return explain;
        });
      },
    };
  },

  task({ title, text, mount }) {
    return {
      kind: 'task',
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        if (text) body.append(h('div', { class: 'st-text', html: rich(text) }));
        const m = h('div', { class: 'st-media' });
        body.append(m);
        mount(m, msg => api.complete(msg), api);
      },
    };
  },
};

/* ---------- Prüfhilfen ---------- */
function pcSetCheck(target, hint) {
  const want = [...target].sort((a, b) => a - b);
  return sel => {
    if (sel.length < want.length) return { ok: false, msg: `Du hast erst ${sel.length} von ${want.length} Tönen gewählt.` };
    const got = [...new Set(sel.map(m => mod(m, 12)))].sort((a, b) => a - b);
    if (got.length === want.length && got.every((p, i) => p === want[i])) return { ok: true };
    const names = sel.slice().sort((a, b) => a - b).map(T.pcName).join(' – ');
    return { ok: false, msg: `${names} passt noch nicht. ${hint}` };
  };
}

const midisOf = notes => notes.map(T.midi);

/* ---------- Experimente (Level-spezifische Widgets) ---------- */

// Level 1: zwei Tasten antippen, die Halbtöne dazwischen werden durchnummeriert.
function semitoneFinder(target) {
  return (el, done, api) => {
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe die erste Taste.');
    let first = null, busy = false, finished = false;
    const kb = Keyboard({
      from: 60, to: 76, labels: 'white',
      onPress: m => {
        if (finished || busy) return;
        if (first === null) {
          kb.clearMarks();
          first = m;
          kb.mark(m, 'mk-ref', '0');
          read.textContent = 'Und jetzt die zweite Taste.';
          return;
        }
        if (m === first) return;
        const lo = Math.min(first, m), hi = Math.max(first, m), d = hi - lo;
        kb.clearMarks();
        kb.mark(lo, 'mk-ref', '0');
        busy = true;
        for (let k = 1; k <= d; k++) api.later(() => kb.mark(lo + k, k === d ? 'mk-ref' : 'mk-step', String(k)), k * 120);
        api.later(() => {
          busy = false;
          first = null;
          if (d === target) {
            finished = true;
            read.innerHTML = inline(`**${d} Halbtöne.** Treffer!`);
            done(`${T.pcName(lo)} – ${T.pcName(hi)}: genau ${target} Halbtöne. Dieser Abstand heißt **kleine Terz**.`);
          } else {
            read.innerHTML = inline(`**${d} ${d === 1 ? 'Halbton' : 'Halbtöne'}.** Gesucht sind ${target}. Tippe eine neue erste Taste.`);
          }
        }, d * 120 + 220);
      },
    });
    el.append(kbWrap(kb.el), read);
  };
}

// Level 2: Terzen auf C stapeln, der Akkordname erscheint live.
function stackBuilder(el, done) {
  const root = n('C', 4);
  const ivs = [];
  let finished = false;
  const kb = Keyboard({ from: 60, to: 76, labels: 'white' });
  const staff = Staff({ width: 250 });
  const chain = h('div', { class: 'chain' });
  const nameEl = h('p', { class: 'chord-name', 'aria-live': 'polite' });
  const bMin = h('button', { type: 'button', class: 'btn btn--outline' }, '+ kleine Terz', h('small', {}, '3'));
  const bMaj = h('button', { type: 'button', class: 'btn btn--outline' }, '+ große Terz', h('small', {}, '4'));
  const bUndo = h('button', { type: 'button', class: 'link-btn' }, 'Rückgängig');
  const notes = () => T.stack(root, ivs);
  const play = () => Sound.chord(midisOf(notes()), { arp: 0.08 });
  bMin.addEventListener('click', () => { ivs.push(3); update(true); });
  bMaj.addEventListener('click', () => { ivs.push(4); update(true); });
  bUndo.addEventListener('click', () => { ivs.pop(); update(true); });

  function update(withSound) {
    const ns = notes();
    kb.clearMarks();
    ns.forEach((x, i) => kb.mark(T.midi(x), i === 0 ? 'mk-ref' : 'mk-sel', T.name(x)));
    staff.render([ns]);
    chain.replaceChildren(...ns.flatMap((x, i) => (i === 0
      ? [h('span', { class: 'chain-note' }, T.name(x))]
      : [h('span', { class: 'chain-iv iv-' + ivs[i - 1] }, ivs[i - 1]), h('span', { class: 'chain-note' }, T.name(x))])));
    const sum = ivs.reduce((a, b) => a + b, 0);
    const id = T.identify(ivs);
    nameEl.innerHTML = inline(
      ivs.length === 0 ? 'Ein einzelner Ton. Stapel eine Terz darauf.'
        : id ? `**${id.name}**`
          : sum % 12 === 0 ? `${sum} Halbtöne: Das klingt wieder wie C, eine Oktave höher. Der Kreis schließt sich.`
            : 'Dieser Stapel hat keinen gängigen Namen. Probier eine andere Kombination.');
    bMin.disabled = bMaj.disabled = ivs.length >= 4;
    bUndo.disabled = ivs.length === 0;
    if (withSound) play();
    if (!finished && ivs.join() === '3,3,3') {
      finished = true;
      done('C – Es – Ges – Heses: drei kleine Terzen übereinander. Das ist der **verminderte Septakkord**.');
    }
  }

  update(false);
  el.append(staff.el, chain, nameEl, btnRow(bMin, bMaj, bUndo, PlayBtn('Anhören', play)), kbWrap(kb.el));
}

// Level 3: große Sexte und verminderte Septime nebeneinander, gleich im Klang.
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

// Level 4: jeder Tipp färbt einen ganzen verminderten Septakkord ein.
function circleColoring(el, done, api) {
  const colored = new Set();
  let taps = 0, finished = false;
  const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Noch 12 Töne ohne Farbe.');
  const c = PitchCircle({
    sound: false,
    onTap: p => {
      if (finished) return;
      const f = p % 3;
      const pcs = [f, f + 3, f + 6, f + 9];
      const label = pcs.map(T.pcName).join(' – ');
      if (colored.has(p)) {
        read.innerHTML = inline(`${T.pcName(p)} gehört schon zu **${label}**. Tippe auf einen Ton ohne Farbe.`);
        Sound.piano(60 + p);
        return;
      }
      taps++;
      pcs.forEach(q => { colored.add(q); c.dot(q, 'f' + (f + 1)); });
      c.poly(pcs, 'f' + (f + 1));
      Sound.chord(pcs.map(q => 60 + q), { arp: 0.07 });
      const left = 12 - colored.size;
      read.innerHTML = inline(left ? `**${label}** ist gefärbt. Noch ${left} Töne ohne Farbe.` : 'Alle zwölf Töne haben Farbe.');
      if (!left) {
        finished = true;
        api.badge('symmetry');
        done(`Mit **${taps} Akkorden** sind alle zwölf Töne abgedeckt. Mehr verschiedene verminderte Septakkorde gibt es nicht.`);
      }
    },
  });
  el.append(h('div', { class: 'circle-box' }, c.el), read);
}

// Level 5: die vier Septakkorde zum Vergleichen.
function earCompare(el, api) {
  const items = ['dim7', 'hdim7', 'dom7', 'm7'];
  const heard = new Set();
  el.append(h('div', { class: 'ear-grid' }, items.map(t => PlayBtn(CH[t].name, () => {
    Sound.chord(T.chordMidis(60, t), { arp: 0.05 });
    heard.add(t);
    if (heard.size === items.length) api.ready(true);
  }, { variant: t === 'dim7' ? 'accent' : '' }))),
  h('p', { class: 'hint' }, 'Hör dir alle vier an, dann geht es weiter.'));
}

// Level 6: H°7 löst sich nach c-Moll auf, mit Stimmführung.
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

// Level 7: jeder Akkordton kann Leitton sein → vier Zieltonarten.
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

/* ---------- Gehörbildung ---------- */
const EAR_TYPES = ['dim7', 'hdim7', 'dom7', 'm7'];
const EAR_TIPS = {
  dim7: 'Alle Abstände sind gleich, nichts ruht: maximale Spannung.',
  hdim7: 'Unten vermindert, oben eine große Terz: gespannt, aber weicher.',
  dom7: 'Ein Dur-Dreiklang mit kleiner Septime: hell und zielstrebig.',
  m7: 'Ein Moll-Dreiklang mit kleiner Septime: weich und ruhig.',
};

function earQuestion(no, type) {
  const midis = T.chordMidis(randInt(50, 60), type);
  const block = () => Sound.chord(midis);
  const broken = () => Sound.chord(midis, { arp: 0.2 });
  return Steps.mc({
    title: `Hörprobe ${no}`,
    prompt: 'Welcher Akkord ist das?',
    media: (el, api) => {
      el.append(btnRow(PlayBtn('Nochmal hören', block), PlayBtn('Gebrochen', broken, { variant: 'quiet' })));
      api.later(block, 350);
    },
    options: EAR_TYPES.map(t => CH[t].name),
    keepOrder: true,
    answer: CH[type].name,
    explain: `Das war ein **${CH[type].name}**. ${EAR_TIPS[type]}`,
    wrong: 'Achte auf die Quinte: Klingt sie gespannt (vermindert) oder stabil (rein)? Spiel den Akkord ruhig noch einmal gebrochen.',
  });
}

function oddOneOut() {
  const others = shuffle(['hdim7', 'dom7', 'm7']).slice(0, 2);
  const types = shuffle(['dim7', ...others]);
  const roots = types.map(() => randInt(52, 58));
  const L = ['A', 'B', 'C'];
  const right = L[types.indexOf('dim7')];
  return Steps.mc({
    title: 'Finde den Verminderten',
    prompt: 'Drei Klänge, aber nur einer ist ein verminderter Septakkord. Welcher?',
    media: el => el.append(btnRow(types.map((t, i) => PlayBtn('Klang ' + L[i], () => Sound.chord(T.chordMidis(roots[i], t)))))),
    options: L.map(x => 'Klang ' + x),
    keepOrder: true,
    answer: 'Klang ' + right,
    explain: `Klang ${right} war der verminderte. Die anderen beiden: ${types.filter(t => t !== 'dim7').map(t => CH[t].name).join(' und ')}.`,
    wrong: 'Hör dir alle drei noch einmal an. Der verminderte klingt am unruhigsten.',
  });
}

/* ---------- Die Level ---------- */
const LEVELS = [
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
        mount: semitoneFinder(3),
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
        mount: stackBuilder,
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
        mount: circleColoring,
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
    id: 'hoeren', fam: 2,
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
          media: earCompare,
        }),
        ...types.map((t, i) => earQuestion(i + 1, t)),
        oddOneOut(),
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
];
