'use strict';
/* Klanglabor – Ablauf: Fortschritt, Kapitelübersicht, Lektionen, Abschluss, Blitzrunde. */

(() => {
  const app = document.getElementById('app');
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Fortschritt (nur lokal in diesem Browser) ---------- */
  const STORE_KEY = 'klanglabor.v1';
  const fresh = () => ({ xp: 0, levels: {}, streak: { count: 0, last: null }, badges: [], arcadeBest: 0, sound: true });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* Speicher gesperrt oder kaputt: frisch starten */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ohne Speicher weiterspielen */ }
  }

  Sound.setEnabled(S.sound);
  document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });

  const RANKS = [
    { xp: 0, name: 'Neuling' },
    { xp: 100, name: 'Zuhörer' },
    { xp: 250, name: 'Terzenstapler' },
    { xp: 450, name: 'Harmoniker' },
    { xp: 700, name: 'Klangarchitekt' },
  ];

  const BADGES = [
    { id: 'first', glyph: '\u{1D11E}', name: 'Erster Schritt', desc: 'Dein erstes Kapitel geschafft.' },
    { id: 'perfect', glyph: '♮', name: 'Fehlerfrei', desc: 'Ein Kapitel ohne einen einzigen Fehler.' },
    { id: 'combo5', glyph: '♫', name: 'Lauf', desc: 'Fünf richtige Antworten in Folge.' },
    { id: 'symmetry', glyph: '°7', name: 'Quadratur', desc: 'Alle zwölf Töne im Oktavkreis gefärbt.' },
    { id: 'ear', glyph: '♬', name: 'Goldenes Ohr', desc: 'Das Hör-Kapitel ohne Fehler.' },
    { id: 'streak3', glyph: '\u{1D107}', name: 'Dranbleiber', desc: 'An drei Tagen in Folge geübt.' },
    { id: 'arcade', glyph: '\u{1D161}', name: 'Blitzmerker', desc: '200 Punkte in der Blitzrunde.' },
    { id: 'master', glyph: '\u{1D110}', name: 'Meister der Verminderung', desc: 'Alle Kapitel abgeschlossen.' },
  ];

  function rankOf(xp) {
    let i = 0;
    while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
    const cur = RANKS[i], next = RANKS[i + 1];
    return { i, name: cur.name, next, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
  }

  function award(id) {
    if (S.badges.includes(id)) return;
    S.badges.push(id);
    save();
    const b = BADGES.find(x => x.id === id);
    toast('Erfolg', b.name, b.glyph);
  }

  function addXp(amount) {
    const before = rankOf(S.xp).i;
    S.xp += amount;
    save();
    document.querySelectorAll('.sb-xp').forEach(el => { el.textContent = S.xp; });
    const r = rankOf(S.xp);
    if (r.i > before) toast('Neuer Rang', r.name, '\u{1D110}');
  }

  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }

  function touchStreak() {
    const today = dayKey(new Date());
    if (S.streak.last === today) return;
    S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1;
    S.streak.last = today;
    save();
    if (S.streak.count >= 3) award('streak3');
  }
  function streakNow() {
    return (S.streak.last === dayKey(new Date()) || S.streak.last === yesterday()) ? S.streak.count : 0;
  }

  const isDone = lv => !!(S.levels[lv.id] && S.levels[lv.id].done);
  const unlocked = i => i === 0 || isDone(LEVELS[i - 1]);
  const arcadeUnlocked = () => isDone(LEVELS[1]);
  const arcadeTypes = () => Arcade.TYPES.filter(t => !t.needs || (S.levels[t.needs] && S.levels[t.needs].done));
  const num = i => String(i + 1).padStart(2, '0');
  const arr = () => h('span', { class: 'arr', 'aria-hidden': 'true' }, '→');

  /* ---------- Gemeinsame Bausteine ---------- */
  let view = '';
  let teardown = [];
  function mount(name, ...nodes) {
    teardown.forEach(fn => fn());
    teardown = [];
    view = name;
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }

  const toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
  document.body.append(toastBox);
  function toast(label, text, glyph) {
    const t = h('div', { class: 'toast' },
      h('span', { class: 'toast-glyph', 'aria-hidden': 'true' }, glyph || '♪'),
      h('span', { class: 'toast-text' }, h('span', { class: 'mono-label' }, label), h('span', {}, text)));
    toastBox.append(t);
    setTimeout(() => t.classList.add('is-out'), 3000);
    setTimeout(() => t.remove(), 3500);
  }

  function dialog({ title, text, ok, cancel, onOk }) {
    const close = () => ov.remove();
    const okBtn = h('button', { type: 'button', class: 'btn btn--primary', onclick: () => { close(); onOk(); } }, ok, arr());
    const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) close(); } },
      h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-title' },
        h('h3', { id: 'dlg-title' }, title),
        h('p', {}, text),
        h('div', { class: 'dialog-actions' }, h('button', { type: 'button', class: 'link-btn', onclick: close }, cancel), okBtn)));
    document.body.append(ov);
    okBtn.focus();
  }

  function shake(el) {
    if (reduceMotion) return;
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
  }

  const starRow = (count, cls = 'stars', itemCls = 'star') => h('span', { class: cls, role: 'img', 'aria-label': `${count} von 3 Sternen` },
    [0, 1, 2].map(i => h('span', { class: itemCls + (i < count ? ' is-on' : ''), style: `--d:${i * 160}ms`, html: ICON.star })));

  function statusBar() {
    const streak = streakNow();
    const sound = h('button', { type: 'button', class: 'sb-sound', 'aria-pressed': String(S.sound) }, S.sound ? 'Ton an' : 'Ton aus');
    sound.addEventListener('click', () => {
      S.sound = !S.sound;
      Sound.setEnabled(S.sound);
      save();
      sound.textContent = S.sound ? 'Ton an' : 'Ton aus';
      sound.setAttribute('aria-pressed', String(S.sound));
      if (S.sound) Sound.sfx.ok();
    });
    return h('div', { class: 'statusbar' },
      h('span', { class: 'sb-brand' },
        h('a', { class: 'sb-back', href: app.dataset.back }, '← Quiz-Übersicht'),
        'Klanglabor · Übungsraum'),
      h('div', { class: 'sb-stats' },
        h('span', { class: 'sb-item' + (streak ? ' is-on' : ''), title: 'Tage in Folge geübt' }, 'Serie', h('b', {}, `${streak} ${streak === 1 ? 'Tag' : 'Tage'}`)),
        h('span', { class: 'sb-item', title: 'Erfahrungspunkte' }, 'XP', h('b', { class: 'sb-xp' }, S.xp)),
        sound));
  }

  function siteHeader(active) {
    const goTo = id => () => {
      if (view !== 'home') renderHome();
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const link = (id, label) => h('button', { type: 'button', class: active === id ? 'is-active' : '', onclick: goTo(id) }, label);
    return h('header', { class: 'site-header' },
      h('button', { type: 'button', class: 'logo', 'aria-label': 'Klanglabor von MusePrep, zur Übersicht', onclick: () => renderHome() },
        h('img', { src: app.dataset.logo, alt: '', width: 93, height: 60 }),
        h('span', { class: 'logo-sub' }, 'Klanglabor')),
      h('nav', { class: 'nav', 'aria-label': 'Bereiche' },
        link('kapitel', 'Kapitel'), link('blitzrunde', 'Blitzrunde'), link('erfolge', 'Erfolge')));
  }

  /* ---------- Startseite ---------- */
  function heroCircle() {
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
    return c.el;
  }

  function chapterRow(lv, i, isNext) {
    const st = S.levels[lv.id];
    const open = unlocked(i);
    const status = st && st.done
      ? [starRow(st.stars), h('span', { class: 'mono-label' }, 'Abgeschlossen')]
      : isNext ? [h('span', { class: 'mono-label' }, 'Als Nächstes →')]
        : [h('span', { class: 'mono-label' }, open ? 'Offen' : 'Gesperrt')];
    const b = h('button', {
      type: 'button',
      class: 'chapter' + (isNext ? ' is-next' : ''),
      disabled: !open,
      'aria-label': `Kapitel ${i + 1}: ${lv.title}${open ? '' : ', gesperrt'}`,
    },
    h('span', { class: 'ch-num', 'aria-hidden': 'true' }, num(i)),
    h('span', { class: 'ch-text' }, h('span', { class: 'ch-title' }, lv.title), h('span', { class: 'ch-sub' }, lv.sub)),
    h('span', { class: 'ch-status' }, status));
    b.addEventListener('click', () => startLevel(i));
    return h('li', {}, b);
  }

  function renderHome() {
    const next = LEVELS.findIndex((lv, i) => unlocked(i) && !isDone(lv));
    const doneCount = LEVELS.filter(isDone).length;
    const r = rankOf(S.xp);

    const cta = next >= 0
      ? h('button', { type: 'button', class: 'btn btn--primary', onclick: () => startLevel(next) },
        doneCount ? `Weiter mit Kapitel ${next + 1}` : 'Mit Kapitel 1 beginnen', arr())
      : h('button', { type: 'button', class: 'btn btn--primary', onclick: renderArcadeIntro }, 'Blitzrunde spielen', arr());
    const second = arcadeUnlocked() && next >= 0
      ? h('button', { type: 'button', class: 'btn btn--outline', onclick: renderArcadeIntro }, 'Blitzrunde', arr())
      : null;

    const hero = h('section', { class: 'hero' },
      h('div', { class: 'staff-lines', 'aria-hidden': 'true' }),
      h('div', { class: 'hero-clef', 'aria-hidden': 'true' }, '\u{1D11E}'),
      h('div', { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, `Kurs · ${LEVELS.length} Kapitel · Harmonielehre`),
        h('h1', {}, 'Der verminderte ', h('em', {}, 'Septakkord')),
        h('div', { class: 'hero-lead' }, h('p', {}, 'Vier Töne, drei kleine Terzen, ein perfektes Quadrat. Du baust den Akkord selbst, hörst ihn, löst ihn auf und deutest ihn um.')),
        h('div', { class: 'actions' }, cta, second),
        h('div', { class: 'rank' },
          h('div', { class: 'rank-head' }, h('p', { class: 'mono-label' }, 'Dein Rang'), h('p', { class: 'rank-next' }, r.next ? `noch ${r.next.xp - S.xp} XP bis ${r.next.name}` : 'Höchster Rang erreicht')),
          h('p', { class: 'rank-name' }, r.name),
          h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Fortschritt bis zum nächsten Rang', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(r.pct * 100) },
            h('div', { class: 'meter-fill', style: `width:${Math.round(r.pct * 100)}%` })))),
      h('figure', { class: 'circle-card' },
        h('span', { class: 'cc-label' }, 'Oktavkreis · zum Anhören antippen'),
        heroCircle(),
        h('figcaption', { class: 'cc-foot' }, 'Drei Akkorde decken alle zwölf Töne ab')));

    const chapters = h('section', { class: 'paths', id: 'kapitel' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Die Kapitel'), h('span', { class: 'glyphs', 'aria-hidden': 'true' }, '♭ ♮ ♯')),
      h('ol', { class: 'chapters' }, LEVELS.map((lv, i) => chapterRow(lv, i, i === next))));

    const open = arcadeUnlocked();
    const band = h('section', { class: 'band', id: 'blitzrunde' },
      h('div', { class: 'band-glyph', 'aria-hidden': 'true' }, '♫'),
      h('h2', {}, 'Blitzrunde'),
      h('p', {}, open
        ? `60 Sekunden, so viele Treffer wie möglich. Serien bringen bis zu ×4. Dein Rekord: ${S.arcadeBest} Punkte.`
        : 'Sechzig Sekunden, so viele Treffer wie möglich. Die Blitzrunde öffnet sich nach Kapitel 2.'),
      open
        ? h('button', { type: 'button', class: 'btn btn--gold', onclick: renderArcadeIntro }, 'Blitzrunde starten', arr())
        : h('p', { class: 'mono-label' }, 'Ab Kapitel 2'));

    const badges = h('section', { class: 'paths', id: 'erfolge' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Erfolge'), h('span', { class: 'mono-label' }, `${S.badges.length} von ${BADGES.length}`)),
      h('div', { class: 'cards' }, BADGES.map(b => {
        const on = S.badges.includes(b.id);
        return h('div', { class: 'card badge' + (on ? '' : ' is-locked') },
          h('span', { class: 'card-top' }, h('span', { class: 'badge-glyph', 'aria-hidden': 'true' }, b.glyph), h('span', { class: 'mono-label' }, on ? 'Erreicht' : 'Offen')),
          h('h3', {}, b.name),
          h('p', {}, b.desc));
      })));

    const footer = h('footer', { class: 'site-footer' },
      h('div', { class: 'footer-block' },
        h('p', { class: 'mono-label' }, 'Dein Fortschritt'),
        h('p', {}, 'Wird nur in diesem Browser gespeichert.'),
        h('button', {
          type: 'button', class: 'link-btn',
          onclick: () => dialog({
            title: 'Fortschritt zurücksetzen?',
            text: 'XP, Sterne, Erfolge, Tagesserie und Rekord werden gelöscht. Das lässt sich nicht rückgängig machen.',
            ok: 'Zurücksetzen', cancel: 'Behalten',
            onOk: () => { const snd = S.sound; S = fresh(); S.sound = snd; save(); renderHome(); },
          }),
        }, 'Fortschritt zurücksetzen')),
      h('nav', { class: 'footer-legal', 'aria-label': 'Rechtliches' },
        h('a', { href: app.dataset.impressum }, 'Impressum'),
        h('a', { href: app.dataset.datenschutz }, 'Datenschutzerklärung')),
      h('p', { class: 'copyright' }, 'Klanglabor · ein Übungsraum von MusePrep'));

    mount('home', statusBar(), siteHeader('kapitel'), h('main', { id: 'main' }, hero, chapters, band, badges), footer);
  }

  /* ---------- Lektion ---------- */
  let L = null;
  const PRAISE = ['Richtig.', 'Genau so.', 'Sehr gut.', 'Stimmt.', 'Sauber gelöst.'];
  const multiplier = c => (c >= 5 ? 3 : c >= 3 ? 2 : 1);

  function startLevel(i) {
    if (!unlocked(i)) return;
    const level = LEVELS[i];
    L = { index: i, level, steps: level.steps(), at: 0, mistakes: 0, xp: 0, combo: 0, bestCombo: 0, asked: 0, firstTry: 0, ctx: null, ui: null };
    renderLesson();
  }

  function leaveLesson() {
    if (L.at === 0 && L.ctx.state === 'idle') return renderHome();
    dialog({
      title: 'Kapitel verlassen?',
      text: 'Deine gesammelten XP bleiben. Das Kapitel beginnt beim nächsten Mal von vorn.',
      ok: 'Verlassen', cancel: 'Weiterlernen', onOk: renderHome,
    });
  }

  // Fortschritt als kleine Notenzeile: jede Aufgabe eine Note, die Melodie steigt.
  function progressSvg(total, at) {
    const gap = 22, W = total * gap + 14, H = 34;
    const lines = [0, 1, 2, 3, 4].map(i => s('line', { x1: 0, x2: W, y1: 5 + i * 6, y2: 5 + i * 6, class: 'pg-line' }));
    const notes = Array.from({ length: total }, (_, i) => {
      const x = 12 + i * gap, y = 29 - (i % 9) * 3;
      return s('ellipse', { cx: x, cy: y, rx: 5.4, ry: 3.9, transform: `rotate(-20 ${x} ${y})`, class: 'pg-note' + (i < at ? ' is-done' : i === at ? ' is-cur' : '') });
    });
    return s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' }, lines, notes);
  }

  function renderLesson() {
    const progArt = h('span', {});
    const count = h('span', { class: 'prog-count' });
    const combo = h('span', { class: 'combo', hidden: true });
    const card = h('div', { class: 'stage-card' });
    const fbTitle = h('p', { class: 'fb-title' });
    const fbMsg = h('div', { class: 'fb-msg' });
    const fb = h('div', { class: 'fb', hidden: true, 'aria-live': 'polite' }, fbTitle, fbMsg);
    const secondary = h('button', { type: 'button', class: 'link-btn', onclick: onSecondary });
    const primary = h('button', { type: 'button', class: 'btn btn--primary btn--check', onclick: onPrimary });
    const row = h('div', { class: 'actions-row' }, secondary, primary);
    const actions = h('div', { class: 'step-actions' }, fb, row);
    L.ui = { progArt, count, combo, card, fb, fbTitle, fbMsg, secondary, primary, row, actions };
    mount('lesson',
      statusBar(),
      h('header', { class: 'lesson-head' },
        h('div', { class: 'lh-row' },
          h('p', { class: 'crumbs' }, h('span', {}, 'Klanglabor'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', {}, `Kapitel ${num(L.index)} · ${L.level.title}`)),
          h('button', { type: 'button', class: 'link-btn', onclick: leaveLesson }, 'Kapitel verlassen')),
        h('div', { class: 'lh-row' }, h('div', { class: 'prog' }, progArt, count), combo)),
      h('main', { id: 'main', class: 'stage' }, card, actions));
    teardown.push(() => { if (L && L.ctx) L.ctx.timers.forEach(clearTimeout); });
    showStep();
  }

  function showStep() {
    const step = L.steps[L.at];
    if (L.ctx) L.ctx.timers.forEach(clearTimeout);
    const ctx = L.ctx = { step, state: 'idle', ready: false, attempts: 0, check: null, retry: null, reveal: null, keys: null, timers: [] };
    const live = () => L && L.ctx === ctx;
    const api = {
      ready: v => { if (!live()) return; ctx.ready = !!v; paintActions(); },
      onCheck: fn => { ctx.check = fn; },
      onRetry: fn => { ctx.retry = fn; },
      onReveal: fn => { ctx.reveal = fn; },
      onKey: fn => { ctx.keys = fn; },
      locked: () => ctx.state !== 'idle',
      complete: msg => completeTask(ctx, msg),
      badge: award,
      later: (fn, ms) => { ctx.timers.push(setTimeout(() => { if (live()) fn(); }, ms)); },
    };
    L.ui.progArt.replaceChildren(progressSvg(L.steps.length, L.at));
    L.ui.count.textContent = `Schritt ${L.at + 1} von ${L.steps.length}`;
    const body = h('div', { class: 'step' + (reduceMotion ? '' : ' is-enter') });
    L.ui.card.replaceChildren(body);
    if (step.kind === 'question') L.asked++;
    setState('idle');
    step.render(body, api);
    paintActions();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function setState(state, title, msg) {
    const ui = L.ui;
    L.ctx.state = state;
    ui.fb.hidden = state === 'idle';
    ui.fb.className = 'fb is-' + state;
    ui.fbTitle.textContent = title || '';
    ui.fbMsg.innerHTML = msg ? rich(msg) : '';
    paintActions();
    if (state !== 'idle') {
      ui.primary.focus({ preventScroll: true });
      ui.actions.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function paintActions() {
    const { ui, ctx } = L;
    const st = ctx.state, kind = ctx.step.kind;
    let label = 'Weiter', enabled = true, sec = '', arrow = true;
    if (st === 'idle') {
      if (kind === 'question') { label = 'Prüfen'; enabled = ctx.ready; arrow = false; }
      else if (kind === 'task') { enabled = false; sec = 'Aufgabe überspringen'; }
      else enabled = ctx.ready;
    } else if (st === 'bad') {
      label = 'Nochmal versuchen';
      arrow = false;
      sec = ctx.reveal ? 'Lösung zeigen' : '';
    }
    if (st !== 'bad' && L.at === L.steps.length - 1 && label === 'Weiter') label = 'Kapitel abschließen';
    ui.primary.replaceChildren(label, arrow ? arr() : '');
    ui.primary.disabled = !enabled;
    ui.secondary.textContent = sec;
    ui.secondary.hidden = !sec;
  }

  function onPrimary() {
    const ctx = L && L.ctx;
    if (!ctx || L.ui.primary.disabled) return;
    if (ctx.state === 'idle') return ctx.step.kind === 'question' ? check() : next();
    if (ctx.state === 'bad') return retry();
    next();
  }

  function onSecondary() {
    const ctx = L.ctx;
    if (ctx.state === 'idle' && ctx.step.kind === 'task') {
      L.combo = 0;
      paintCombo();
      setState('revealed', 'Übersprungen.', 'Kein Problem. Du kannst das Kapitel jederzeit wiederholen.');
    } else if (ctx.state === 'bad' && ctx.reveal) {
      setState('revealed', 'Die Lösung.', ctx.reveal());
    }
  }

  function check() {
    const ctx = L.ctx;
    if (!ctx.ready || !ctx.check) return;
    const r = ctx.check();
    ctx.attempts++;
    if (r.ok) {
      let gain = 3;
      if (ctx.attempts === 1) {
        L.combo++;
        L.firstTry++;
        L.bestCombo = Math.max(L.bestCombo, L.combo);
        gain = 10 * multiplier(L.combo);
      }
      gainXp(gain);
      Sound.sfx.ok();
      setState('ok', pick(PRAISE), r.msg);
      paintCombo(true);
      if (L.combo >= 5) award('combo5');
    } else {
      if (ctx.attempts === 1) L.mistakes++;
      L.combo = 0;
      paintCombo();
      Sound.sfx.bad();
      setState('bad', 'Nicht ganz.', r.msg);
      shake(L.ui.card);
    }
  }

  function retry() {
    if (L.ctx.retry) L.ctx.retry();
    setState('idle');
  }

  function completeTask(ctx, msg) {
    if (!L || ctx !== L.ctx || ctx.state !== 'idle') return;
    gainXp(5);
    Sound.sfx.ok();
    setState('ok', 'Geschafft.', msg);
  }

  function next() {
    L.at++;
    if (L.at >= L.steps.length) finishLevel();
    else showStep();
  }

  function gainXp(amount) {
    L.xp += amount;
    addXp(amount);
    const f = h('span', { class: 'xp-float' }, `+${amount} XP`);
    L.ui.row.append(f);
    setTimeout(() => f.remove(), 1200);
  }

  function paintCombo(pop) {
    const c = L.ui.combo;
    const m = multiplier(L.combo);
    c.hidden = L.combo < 2;
    c.replaceChildren(`Serie ${L.combo}`, m > 1 ? h('b', {}, `×${m}`) : '');
    if (pop && !reduceMotion) {
      c.classList.remove('is-pop');
      void c.offsetWidth;
      c.classList.add('is-pop');
    }
  }

  function finishLevel() {
    const lv = L.level;
    const stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    const prev = S.levels[lv.id] || {};
    const bonus = 20 + (stars === 3 ? 15 : 0);
    L.xp += bonus;
    S.levels[lv.id] = { done: true, stars: Math.max(prev.stars || 0, stars) };
    addXp(bonus);
    touchStreak();
    award('first');
    if (stars === 3) award('perfect');
    if (lv.id === 'hoeren' && L.mistakes === 0) award('ear');
    if (LEVELS.every(isDone)) award('master');
    renderDone(stars);
  }

  function renderDone(stars) {
    const i = L.index;
    const nextLv = LEVELS[i + 1];
    const acc = L.asked ? Math.round((L.firstTry / L.asked) * 100) : 100;
    const stat = (label, value) => h('div', { class: 'ds' }, h('dt', {}, label), h('dd', {}, value));
    const primaryBtn = nextLv
      ? h('button', { type: 'button', class: 'btn btn--primary', onclick: () => startLevel(i + 1) }, `Weiter mit Kapitel ${i + 2}`, arr())
      : h('button', { type: 'button', class: 'btn btn--primary', onclick: renderArcadeIntro }, 'Zur Blitzrunde', arr());

    mount('done', statusBar(), siteHeader('kapitel'), h('main', { id: 'main', class: 'done' },
      h('div', { class: 'done-head' },
        h('p', { class: 'crumbs' }, h('span', {}, `Kapitel ${num(i)}`), h('span', { 'aria-hidden': 'true' }, '/'), h('span', {}, 'abgeschlossen')),
        h('h1', {}, L.level.title),
        h('div', { class: 'done-rating' },
          starRow(stars, 'big-stars', 'big-star'),
          h('p', { class: 'done-sub' }, stars === 3 ? 'Ohne einen einzigen Fehler.' : stars === 2 ? 'Fast fehlerfrei. Für drei Sterne: Kapitel wiederholen.' : 'Geschafft. Mit einer Wiederholung holst du mehr Sterne.'))),
      h('dl', { class: 'done-stats' },
        stat('XP gesammelt', `+${L.xp}`),
        stat('Auf Anhieb richtig', `${acc} %`),
        stat('Beste Serie', L.bestCombo)),
      h('blockquote', { class: 'takeaway' },
        h('p', { class: 'mono-label' }, 'Das nimmst du mit'),
        h('p', { html: inline(L.level.takeaway) })),
      h('div', { class: 'actions' },
        primaryBtn,
        h('button', { type: 'button', class: 'btn btn--outline', onclick: () => startLevel(i) }, 'Kapitel wiederholen'),
        h('button', { type: 'button', class: 'link-btn', onclick: renderHome }, 'Zur Übersicht'))));
    Sound.sfx.fanfare();
    confetti();
  }

  /* ---------- Blitzrunde ---------- */
  let arcadeKeys = null;

  function renderArcadeIntro() {
    if (!arcadeUnlocked()) return;
    const types = arcadeTypes();
    mount('arcade', statusBar(), siteHeader('blitzrunde'), h('main', { id: 'main', class: 'arcade' },
      h('div', { class: 'arcade-glyph', 'aria-hidden': 'true' }, '\u{1D161}'),
      h('p', { class: 'eyebrow' }, 'Bonus · 60 Sekunden'),
      h('h1', {}, 'Blitzrunde'),
      h('ul', { class: 'rules' },
        h('li', {}, h('b', {}, '60 Sekunden'), ' Zeit, so viele Treffer wie möglich'),
        h('li', {}, h('b', {}, '+10 Punkte'), ' pro Treffer, Serien bringen bis zu ×4'),
        h('li', {}, h('b', {}, '−3 Sekunden'), ' für jeden Fehler'),
        h('li', {}, 'Antworten mit ', h('kbd', {}, 'A'), '–', h('kbd', {}, 'D'), ' oder ', h('kbd', {}, '1'), '–', h('kbd', {}, '4'))),
      h('div', { class: 'types' }, Arcade.TYPES.map(t => {
        const on = types.includes(t);
        return h('span', { class: 'chip' + (on ? ' is-on' : '') }, on ? t.name : `${t.name} · gesperrt`);
      })),
      h('p', { class: 'record' }, 'Dein Rekord', h('b', {}, S.arcadeBest)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn--gold', onclick: runArcade }, 'Start', arr()),
        h('button', { type: 'button', class: 'link-btn', onclick: renderHome }, 'Zur Übersicht'))));
  }

  function runArcade() {
    const DURATION = 60;
    const pool = arcadeTypes().map(t => t.gen);
    const G = { score: 0, combo: 0, best: 0, right: 0, penalty: 0, start: performance.now(), over: false, lock: false, q: null };
    const timeFill = h('div', { class: 'ar-line-fill' });
    const timeTxt = h('span', { class: 'ar-time', 'aria-label': 'Restzeit in Sekunden' }, String(DURATION));
    const scoreEl = h('strong', {}, '0');
    const comboEl = h('span', { class: 'combo', hidden: true });
    const tag = h('span', { class: 'ar-tag' });
    const prompt = h('div', { class: 'ar-prompt' });
    const media = h('div', { class: 'ar-media' });
    const opts = h('div', { class: 'opts' });
    const card = h('div', { class: 'ar-card' }, tag, prompt, media, opts);

    mount('arcade-run', statusBar(), h('main', { id: 'main', class: 'arcade' },
      h('div', { class: 'ar-top' }, h('button', { type: 'button', class: 'link-btn', onclick: () => end(true) }, 'Abbrechen'), timeTxt),
      h('div', { class: 'ar-line', 'aria-hidden': 'true' }, timeFill),
      h('div', { class: 'ar-head' }, h('div', { class: 'ar-score' }, h('span', { class: 'mono-label' }, 'Punkte'), scoreEl), comboEl),
      card));

    function nextQ() {
      if (G.over) return;
      let q;
      do { q = pick(pool)(); } while (G.q && q.prompt === G.q.prompt && !q.play);
      G.q = q;
      G.lock = false;
      tag.textContent = q.tag;
      prompt.innerHTML = inline(q.prompt);
      media.replaceChildren();
      if (q.play) {
        const play = () => Sound.chord(q.play);
        media.append(PlayBtn('Nochmal hören', play));
        play();
      }
      opts.className = 'opts' + (q.options.length === 2 ? ' opts--two' : '');
      opts.replaceChildren(...q.options.map((o, i) => h('button', { type: 'button', class: 'opt', onclick: () => answer(i) },
        h('span', { class: 'opt-key' }, String.fromCharCode(65 + i)), h('span', { class: 'opt-t', html: inline(o) }))));
    }

    function answer(i) {
      if (G.lock || G.over || !G.q.options[i]) return;
      G.lock = true;
      const ok = G.q.options[i] === G.q.answer;
      const btns = [...opts.children];
      btns[i].classList.add(ok ? 'is-ok' : 'is-bad');
      if (ok) {
        G.combo++;
        G.right++;
        G.best = Math.max(G.best, G.combo);
        G.score += 10 * Math.min(4, 1 + Math.floor(G.combo / 3));
        Sound.sfx.ok();
      } else {
        G.combo = 0;
        G.penalty += 3;
        Sound.sfx.bad();
        btns[G.q.options.indexOf(G.q.answer)].classList.add('is-ok');
        shake(card);
      }
      scoreEl.textContent = G.score;
      const m = Math.min(4, 1 + Math.floor(G.combo / 3));
      comboEl.hidden = G.combo < 2;
      comboEl.replaceChildren(`Serie ${G.combo}`, m > 1 ? h('b', {}, `×${m}`) : '');
      setTimeout(nextQ, ok ? 380 : 1200);
    }

    let raf = 0;
    function tick() {
      if (G.over) return;
      const left = DURATION - (performance.now() - G.start) / 1000 - G.penalty;
      timeFill.style.width = `${(Math.max(0, left) / DURATION) * 100}%`;
      timeFill.classList.toggle('is-low', left < 10);
      timeTxt.textContent = String(Math.max(0, Math.ceil(left)));
      if (left <= 0) return end(false);
      raf = requestAnimationFrame(tick);
    }

    function end(aborted) {
      if (G.over) return;
      G.over = true;
      cancelAnimationFrame(raf);
      arcadeKeys = null;
      if (aborted) return renderArcadeIntro();
      renderArcadeResult(G);
    }

    arcadeKeys = answer;
    teardown.push(() => { G.over = true; cancelAnimationFrame(raf); arcadeKeys = null; });
    nextQ();
    raf = requestAnimationFrame(tick);
  }

  function renderArcadeResult(G) {
    const record = G.score > S.arcadeBest;
    if (record) S.arcadeBest = G.score;
    const xp = Math.round(G.score / 10);
    if (xp) addXp(xp);
    touchStreak();
    save();
    if (G.score >= 200) award('arcade');
    const stat = (label, value) => h('div', { class: 'ds' }, h('dt', {}, label), h('dd', {}, value));
    mount('arcade', statusBar(), siteHeader('blitzrunde'), h('main', { id: 'main', class: 'arcade' },
      h('div', { class: 'arcade-glyph', 'aria-hidden': 'true' }, '\u{1D110}'),
      h('p', { class: 'eyebrow' }, 'Zeit ist um'),
      h('h1', {}, record && G.score > 0 ? 'Neuer Rekord' : 'Blitzrunde beendet'),
      h('p', { class: 'score-big' }, G.score, h('span', {}, 'Punkte')),
      h('dl', { class: 'done-stats' },
        stat('Treffer', G.right),
        stat('Beste Serie', G.best),
        stat('XP gesammelt', `+${xp}`)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn--gold', onclick: runArcade }, 'Nochmal', arr()),
        h('button', { type: 'button', class: 'link-btn', onclick: renderHome }, 'Zur Übersicht'))));
    Sound.sfx.fanfare();
    if (record && G.score > 0) confetti();
  }

  /* ---------- Konfetti: kleine Quadrate in den drei Akkordfarben ---------- */
  function confetti() {
    if (reduceMotion) return;
    const cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.append(cv);
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--fam-1', '--fam-2', '--gold'].map(v => cs.getPropertyValue(v).trim() || '#888');
    const P = Array.from({ length: 110 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 160, y: H * 0.38,
      vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 10 - 4,
      size: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: pick(cols), hollow: Math.random() < 0.4,
    }));
    const t0 = performance.now();
    (function frame(t) {
      const el = (t - t0) / 1000;
      g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.globalAlpha = Math.max(0, 1 - el / 2.6);
        if (p.hollow) { g.strokeStyle = p.c; g.lineWidth = 1.5; g.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size); }
        else { g.fillStyle = p.c; g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); }
        g.restore();
      }
      if (el < 2.6) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------- Tastatur ---------- */
  // 1–9 oder A–I wählen eine Antwort.
  function answerIndex(key) {
    if (/^[1-9]$/.test(key)) return Number(key) - 1;
    if (/^[a-i]$/i.test(key)) return key.toLowerCase().charCodeAt(0) - 97;
    return -1;
  }

  document.addEventListener('keydown', e => {
    const ov = document.querySelector('.overlay');
    if (ov) { if (e.key === 'Escape') ov.remove(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const idx = answerIndex(e.key);
    if (view === 'lesson' && L && L.ctx) {
      if (e.key === 'Enter') { e.preventDefault(); onPrimary(); }
      else if (e.key === 'Escape') leaveLesson();
      else if (idx >= 0 && L.ctx.state === 'idle' && L.ctx.keys) L.ctx.keys(idx);
    } else if (view === 'arcade-run' && arcadeKeys && idx >= 0) {
      arcadeKeys(idx);
    }
  });

  renderHome();
})();
