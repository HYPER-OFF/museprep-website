'use strict';
/* Kursgerüst: Kursverzeichnis, Schritt-Typen, Prüfhilfen und Experimente, die mehrere Kurse nutzen.
   Die Kurse selbst liegen in ../kurse/, je Kurs eine Datei. */

const T = Theory;
const n = T.note;
const CH = T.CHORDS;

/* ---------- Kursverzeichnis ----------
   Jede Kursdatei meldet sich mit defineCourse an und kapselt ihre Helfer in einer eigenen Funktion,
   weil alle Dateien zu einem Skript zusammengefügt werden. Die Reihenfolge hier ist der Lernweg.

   defineCourse({
     id, short: 'Dur-Akkorde', title: ['Dur-', 'Akkorde'] (zweiter Teil kursiv), topic: 'Harmonielehre',
     sub: 'eine Zeile für die Kursliste', lead: 'Einleitung im Kopfbereich',
     visual: () => ({ label, foot, el }),                       Bild im Kopfbereich (auf Tinte)
     badge: { id, glyph, name, desc }, extras: [ … ],           Erfolg für den Abschluss, weitere Erfolge
     levels: [{ id, title, sub, takeaway, ear?, steps: () => [ … ] }],   ids kursübergreifend eindeutig
     arcade: [{ id, name, gen, needs: levelId }],               Blitzrunde: gen() → { tag, prompt, options, answer, key?, play?, media? }
   }) */
const COURSE_ORDER = ['notenlesen', 'dur', 'moll', 'umkehrungen', 'uebermaessig', 'septakkord', 'diktat'];
const COURSE_DEFS = {};
function defineCourse(def) { COURSE_DEFS[def.id] = def; }

/* ---------- Schritt-Typen ----------
   Jeder Schritt hat kind ('info' | 'question' | 'task') und render(body, api); cfg dient den Tests.
   api: ready(bool), onCheck(fn → {ok, msg}), onRetry(fn), onReveal(fn → msg), onKey(fn),
        locked(), complete(msg), badge(id), later(fn, ms). */
const Steps = {
  info({ title, text, media, gate = false }) {
    return {
      kind: 'info',
      cfg: { type: 'info' },
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
      cfg: { type: 'mc', options, answer },
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

  keys({ title, prompt, media, from, to, labels = 'white', marks = [], max = 1, check, solution, explain }) {
    return {
      kind: 'question',
      cfg: { type: 'keys', from, to, max, check, solution },
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        body.append(h('div', { class: 'st-text', html: rich(prompt) }));
        const kb = Keyboard({ from, to, labels, mode: 'select', max, onChange: sel => api.ready(sel.length > 0) });
        marks.forEach(([m, cls, lab]) => kb.mark(m, cls, lab));
        const box = h('div', { class: 'st-media' });
        if (media) media(box, api);
        box.append(kbWrap(kb.el),
          max > 1 ? h('p', { class: 'hint' }, `Wähle ${max} Tasten. Ein zweiter Tipp auf eine Taste hebt die Wahl auf.`) : null);
        body.append(box);
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

  // Eine Note auf die Notenzeile setzen: antippen oder mit ▲ ▼ verschieben. target z. B. 'G4' (ohne Vorzeichen).
  pick({ title, prompt, target, clef = 'treble', start, explain }) {
    const want = T.step(T.notes(target)[0]);
    return {
      kind: 'question',
      cfg: { type: 'pick', target, clef, start },
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        body.append(h('div', { class: 'st-text', html: rich(prompt) }));
        const staff = Staff({ width: 220, clef });
        const lo = staff.base - 6, hi = staff.base + 14;   // drei Hilfslinien darunter und darüber
        let d = start ? T.step(T.notes(start)[0]) : staff.base + 4;
        let locked = false;
        const nameOf = x => T.name(T.fromStep(x));
        const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Tippe in die Notenzeile oder schiebe die Note mit den Pfeilen.');
        const paint = cls => staff.render([[T.fromStep(d)]], { labels: false, classes: [cls || 'is-pick'] });
        const set = nd => {
          if (locked || api.locked()) return;
          d = Math.max(lo, Math.min(hi, nd));
          paint();
          Sound.piano(T.midi(T.fromStep(d)));
          api.ready(true);
        };
        staff.el.setAttribute('tabindex', 0);
        staff.el.addEventListener('click', e => set(staff.stepAt(e.clientY)));
        staff.el.addEventListener('keydown', e => {
          if (e.key === 'ArrowUp') { e.preventDefault(); set(d + 1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); set(d - 1); }
        });
        const up = h('button', { type: 'button', class: 'nudge', 'aria-label': 'Note einen Schritt höher', onclick: () => set(d + 1) }, '▲');
        const down = h('button', { type: 'button', class: 'nudge', 'aria-label': 'Note einen Schritt tiefer', onclick: () => set(d - 1) }, '▼');
        paint('is-ghost');
        body.append(h('div', { class: 'st-media' }, h('div', { class: 'pick' }, staff.el, h('div', { class: 'nudges' }, up, down)), read));
        api.onCheck(() => {
          const ok = d === want;
          if (ok) { locked = true; paint('is-ok'); return { ok, msg: explain }; }
          paint('is-bad');
          const same = mod(d - want, 7) === 0;
          return {
            ok,
            msg: same
              ? `Das ist auch ein **${nameOf(d)}**, aber eine Oktave zu ${d > want ? 'hoch' : 'tief'}.`
              : `Das ist ein **${nameOf(d)}**. Gesucht ist **${nameOf(want)}**, es liegt ${d < want ? 'höher' : 'tiefer'}.`,
          };
        });
        api.onRetry(() => { paint(); api.ready(false); });
        api.onReveal(() => { d = want; locked = true; paint('is-ok'); return explain; });
      },
    };
  },

  // Melodiediktat: hören und auf der Klaviatur nachspielen; die Töne erscheinen in der Notenzeile.
  // melody z. B. 'C4 D4 E4 C4'; die ersten given Töne sind vorgegeben.
  dictation({ title, prompt, melody, given = 1, from = 60, to = 76, step = 0.62, explain }) {
    const want = T.notes(melody);
    const wantM = want.map(T.midi);
    const free = want.length - given;
    return {
      kind: 'question',
      cfg: { type: 'dictation', melody, given, from, to },
      render(body, api) {
        if (title) body.append(h('h2', { class: 'st-title' }, title));
        body.append(h('div', { class: 'st-text', html: rich(prompt || `Hör dir die Melodie an und spiele sie auf der Klaviatur nach. ${given === 1 ? 'Der erste Ton ist' : `Die ersten ${given} Töne sind`} vorgegeben.`) }));
        const staff = Staff({ width: Math.min(460, 120 + want.length * 44) });
        const count = h('span', { class: 'hint' });
        let got = [];
        let marks = null;
        let locked = false;
        // Eingaben so schreiben wie der gleichklingende Melodieton, sonst mit dem Standardnamen.
        const spellOf = m => {
          const i = wantM.findIndex(w => mod(w - m, 12) === 0);
          return i >= 0 ? T.fromMidi(m, T.name(want[i])) : T.fromMidi(m);
        };
        const paint = () => {
          const groups = want.map((w, i) => (i < given ? [w] : got[i - given] != null ? [spellOf(got[i - given])] : []));
          const classes = want.map((w, i) => (i < given ? 'is-given' : marks ? marks[i - given] || '' : ''));
          staff.render(groups, { labels: false, classes, placeholder: true });
          count.textContent = `${got.length} von ${free} Tönen`;
        };
        const kb = Keyboard({
          from, to, labels: 'white',
          onPress: m => {
            if (locked || api.locked() || got.length >= free) return;
            got.push(m);
            marks = null;
            paint();
            api.ready(got.length === free);
          },
        });
        const playMel = () => Sound.seq(wantM, { step });
        const playMine = () => Sound.seq([...wantM.slice(0, given), ...got], { step });
        const undo = h('button', { type: 'button', class: 'link-btn', onclick: () => {
          if (locked || api.locked() || !got.length) return;
          got.pop(); marks = null; paint(); api.ready(false);
        } }, 'Rückgängig');
        paint();
        body.append(h('div', { class: 'st-media' },
          staff.el,
          btnRow(PlayBtn('Melodie anhören', playMel), PlayBtn('Deine Fassung', playMine, { variant: 'quiet' }), undo),
          kbWrap(kb.el), count));
        api.later(playMel, 450);
        api.onCheck(() => {
          marks = got.map((m, i) => (m === wantM[i + given] ? 'is-ok' : 'is-bad'));
          paint();
          const first = marks.indexOf('is-bad');
          if (first < 0) {
            locked = true;
            kb.lock(true);
            return { ok: true, msg: explain || `Genau: ${T.join(want)}.` };
          }
          const octave = got.every((m, i) => mod(m - wantM[i + given], 12) === 0);
          const pos = first + given + 1;
          return {
            ok: false,
            msg: octave
              ? 'Die Tonnamen stimmen, aber nicht die Lage. Achte darauf, ob die Melodie steigt oder fällt.'
              : `${pos > given + 1 ? `Bis Ton ${pos - 1} stimmt alles, Ton ${pos} noch nicht.` : `Schon Ton ${pos} stimmt noch nicht.`} Die richtigen Töne bleiben stehen, wenn du es nochmal versuchst.`,
          };
        });
        api.onRetry(() => {
          const first = marks ? marks.indexOf('is-bad') : -1;
          if (first >= 0) got = got.slice(0, first);
          marks = null;
          paint();
          api.ready(false);
        });
        api.onReveal(() => {
          got = wantM.slice(given);
          marks = null;
          locked = true;
          kb.lock(true);
          paint();
          playMel();
          return explain || `Die Melodie: ${T.join(want)}.`;
        });
      },
    };
  },

  task({ title, text, mount }) {
    return {
      kind: 'task',
      cfg: { type: 'task' },
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
// Tonklassen ohne Rücksicht auf Lage und Reihenfolge.
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

// Wie pcSetCheck, zusätzlich muss der tiefste gewählte Ton die Tonklasse bass haben (Umkehrungen).
function bassCheck(target, bass, hint) {
  const set = pcSetCheck(target, hint);
  return sel => {
    const r = set(sel);
    if (!r.ok) return r;
    const low = Math.min(...sel);
    if (mod(low, 12) === mod(bass, 12)) return { ok: true };
    return { ok: false, msg: `Die Töne stimmen, aber unten liegt ${T.pcName(low)}. Gesucht ist ${T.pcName(bass)} im Bass.` };
  };
}

// Genau eine Taste mit dieser Tonklasse (egal in welcher Oktave).
function pcCheck(pc, hint) {
  return sel => (mod(sel[0], 12) === mod(pc, 12) ? { ok: true } : { ok: false, msg: `Das ist ${T.pcName(sel[0])}. ${hint}` });
}

const midisOf = notes => notes.map(T.midi);

// Richtige Antwort plus bis zu (count − 1) verschiedene Ablenker, gemischt (für die Blitzrunde).
function quizOptions(answer, cands, count = 4) {
  const others = shuffle([...new Set(cands)].filter(c => c && c !== answer)).slice(0, count - 1);
  return shuffle([answer, ...others]);
}

// Namen für zwei Tasten im Abstand semis, so geschrieben, dass das Intervall stimmt und möglichst
// wenige Vorzeichen braucht (68 + 3 → Gis – H statt As – H, 61 + 4 → Des – F statt Cis – F).
function spellInterval(lo, semis) {
  const steps = Math.round(semis * 7 / 12);
  let best = null;
  for (const nm of T.spellings(lo, 1)) {
    const a = T.fromMidi(lo, nm);
    const b = T.transpose(a, steps, semis);
    if (Math.abs(b.a) > 1) continue;
    const cost = Math.abs(a.a) + Math.abs(b.a);
    if (!best || cost < best.cost) best = { cost, names: [T.name(a), T.name(b)] };
  }
  return best ? best.names : [T.pcName(lo), T.pcName(lo + semis)];
}

/* ---------- Gemeinsame Experimente ---------- */

// Zwei Tasten antippen, die Halbtöne dazwischen werden durchnummeriert. Ziel: target Halbtöne.
function semitoneFinder(target, ivName) {
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
            const [a, b] = spellInterval(lo, target);
            done(`${a} – ${b}: genau ${target} Halbtöne. Dieser Abstand heißt **${ivName}**.`);
          } else {
            read.innerHTML = inline(`**${d} ${d === 1 ? 'Halbton' : 'Halbtöne'}.** Gesucht sind ${target}. Tippe eine neue erste Taste.`);
          }
        }, d * 120 + 220);
      },
    });
    el.append(kbWrap(kb.el), read);
  };
}

// Terzen auf C stapeln, der Akkordname erscheint live. Fertig, wenn die Abstände goal ergeben (z. B. '3,3,3').
function stackBuilder(goal, doneMsg) {
  return (el, done) => {
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
      if (!finished && ivs.join() === goal) {
        finished = true;
        done(doneMsg);
      }
    }

    update(false);
    el.append(staff.el, chain, nameEl, btnRow(bMin, bMaj, bUndo, PlayBtn('Anhören', play)), kbWrap(kb.el));
  };
}

// Oktavkreis einfärben: jeder Tipp färbt alle Töne im Abstand von step Halbtönen (3 → Quadrate, 4 → Dreiecke).
function circleColoring(step, { badge, doneMsg }) {
  return (el, done, api) => {
    const colored = new Set();
    let taps = 0, finished = false;
    const read = h('p', { class: 'readout', 'aria-live': 'polite' }, 'Noch 12 Töne ohne Farbe.');
    const c = PitchCircle({
      sound: false,
      onTap: p => {
        if (finished) return;
        const f = p % step;
        const pcs = [];
        for (let q = f; q < 12; q += step) pcs.push(q);
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
          if (badge) api.badge(badge);
          done(doneMsg(taps));
        }
      },
    });
    el.append(h('div', { class: 'circle-box' }, c.el), read);
  };
}

// Akkordarten nebeneinander zum Vergleichen; weiter erst, wenn alle gehört sind.
function earCompare(items, accent, root = 60) {
  return (el, api) => {
    const heard = new Set();
    el.append(h('div', { class: 'ear-grid' }, items.map(t => PlayBtn(CH[t].name, () => {
      Sound.chord(T.chordMidis(root, t), { arp: 0.05 });
      heard.add(t);
      if (heard.size === items.length) api.ready(true);
    }, { variant: t === accent ? 'accent' : '' }))),
    h('p', { class: 'hint' }, `Hör dir alle ${items.length} an, dann geht es weiter.`));
  };
}

// Hörprobe: Welche Akkordart erklingt? types = Antwortmöglichkeiten, tips = Merksatz je Art.
function chordEar({ no, type, types, tips, wrong, low = 50, high = 60 }) {
  const midis = T.chordMidis(randInt(low, high), type);
  const block = () => Sound.chord(midis);
  const broken = () => Sound.chord(midis, { arp: 0.2 });
  return Steps.mc({
    title: `Hörprobe ${no}`,
    prompt: 'Welcher Akkord ist das?',
    media: (el, api) => {
      el.append(btnRow(PlayBtn('Nochmal hören', block), PlayBtn('Gebrochen', broken, { variant: 'quiet' })));
      api.later(block, 350);
    },
    options: types.map(t => CH[t].name),
    keepOrder: true,
    answer: CH[type].name,
    explain: `Das war ein **${CH[type].name}**. ${tips[type] || ''}`,
    wrong,
  });
}

// Drei Klänge, einer davon ist target. others = mögliche Ablenker.
function oddOneOut({ title, prompt, target, others, wrong, low = 52, high = 58 }) {
  const types = shuffle([target, ...shuffle(others).slice(0, 2)]);
  const roots = types.map(() => randInt(low, high));
  const L = ['A', 'B', 'C'];
  const right = L[types.indexOf(target)];
  return Steps.mc({
    title,
    prompt,
    media: el => el.append(btnRow(types.map((t, i) => PlayBtn('Klang ' + L[i], () => Sound.chord(T.chordMidis(roots[i], t)))))),
    options: L.map(x => 'Klang ' + x),
    keepOrder: true,
    answer: 'Klang ' + right,
    explain: `Klang ${right} war ein ${CH[target].name}. Die anderen beiden:${types.filter(t => t !== target).map(t => CH[t].name).join(' und ')}.`,
    wrong,
  });
}
