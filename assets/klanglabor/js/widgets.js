'use strict';
/* Interaktive Bausteine: Klaviatur, Notenzeile, Oktavkreis, Abspielknopf. */

const isBlackKey = m => [1, 3, 6, 8, 10].includes(mod(m, 12));

/* ---------- Klaviatur ----------
   mode 'play': Tasten klingen nur, onPress meldet die Taste.
   mode 'select': Tasten werden an-/abgewählt (höchstens max), onChange meldet die Auswahl. */
function Keyboard(opts = {}) {
  const { from = 60, to = 76, labels = 'white', mode = 'play', max = 1, onPress = null, onChange = null } = opts;
  const whites = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const ww = 100 / whites.length;
  const bw = ww * 0.62;
  const el = h('div', { class: 'kb', role: 'group', 'aria-label': 'Klaviatur', style: `--whites:${whites.length}` });
  const keys = new Map();
  const blackEls = [];
  let selected = [];
  let locked = false;
  let lastPointer = 0;
  let wi = -1;

  for (let m = from; m <= to; m++) {
    const black = isBlackKey(m);
    if (!black) wi++;
    const left = black ? (wi + 1) * ww - bw / 2 : wi * ww;
    const nm = Theory.pcName(m);
    const show = labels === 'all' || (labels === 'white' && !black) || (labels === 'c' && mod(m, 12) === 0);
    const lab = h('span', { class: 'kb-lab' }, show ? nm : '');
    const k = h('button', {
      type: 'button',
      class: 'kb-key ' + (black ? 'kb-b' : 'kb-w'),
      style: `left:${left.toFixed(3)}%;width:${(black ? bw : ww).toFixed(3)}%`,
      'aria-label': nm + (Math.floor(m / 12) - 1),
    }, lab);
    k.addEventListener('pointerdown', () => {
      if (locked) return;
      lastPointer = performance.now();
      sound(m, k);
    });
    k.addEventListener('click', () => {
      if (locked) return;
      if (performance.now() - lastPointer > 700) sound(m, k);
      act(m);
    });
    keys.set(m, { el: k, lab, base: lab.textContent, mark: null });
    if (black) blackEls.push(k); else el.append(k);
  }
  blackEls.forEach(k => el.append(k));

  function sound(m, k) {
    Sound.piano(m);
    k.classList.add('is-down');
    setTimeout(() => k.classList.remove('is-down'), 180);
  }

  function act(m) {
    if (mode === 'select') {
      const i = selected.indexOf(m);
      if (i >= 0) selected.splice(i, 1);
      else if (max === 1) selected = [m];
      else {
        if (selected.length >= max) selected.shift();
        selected.push(m);
      }
      paint();
      if (onChange) onChange(selected.slice());
    }
    if (onPress) onPress(m);
  }

  function paint() {
    keys.forEach((k, m) => k.el.classList.toggle('is-sel', selected.includes(m)));
  }

  function mark(m, cls, label) {
    const k = keys.get(m);
    if (!k) return;
    if (k.mark) k.el.classList.remove(k.mark);
    k.mark = cls || null;
    if (cls) k.el.classList.add(cls);
    k.lab.textContent = label != null ? label : k.base;
  }

  return {
    el,
    mark,
    clearMarks() { keys.forEach((k, m) => mark(m, null)); },
    setSelected(arr) { selected = arr.slice(); paint(); },
    get selected() { return selected.slice(); },
    lock(v) { locked = !!v; el.classList.toggle('is-locked', locked); },
  };
}

/* ---------- Notenzeile (Violin- oder Bassschlüssel) ----------
   render(groups): jede Gruppe ist ein Akkord (Array von Tönen), nebeneinander gesetzt;
   eine leere Gruppe ist ein freier Platz (mit placeholder ein Fragezeichen).
   Optionen: labels, captions, hl (hervorgehobene Gruppe), classes (Klasse je Gruppe),
   onTap (Gruppe antippen, z. B. zum Anhören). */
function Staff(opts = {}) {
  const W = opts.width || 340;
  const H = 128;
  const TOP = 36;            // oberste Linie
  const BOTTOM = TOP + 40;   // unterste Linie
  const bass = opts.clef === 'bass';
  const BASE = bass ? 18 : 30;   // Stammtonstufe der untersten Linie: G2 bzw. E4
  const el = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'staff', role: 'img', style: `max-width:${Math.round(W * 1.3)}px` });
  const yOfStep = d => BOTTOM - (d - BASE) * 5;
  const yOf = n => yOfStep(Theory.step(n));
  const ACC = { '-2': '\u{1D12B}', '-1': '\u266D', 1: '\u266F', 2: '\u{1D12A}' };

  function ledger(cx, y) {
    return s('line', { x1: cx - 12, x2: cx + 12, y1: y, y2: y, class: 'st-ledger' });
  }

  function render(groups, { labels = true, captions = [], hl = -1, classes = [], placeholder = false, onTap = null } = {}) {
    el.replaceChildren();
    for (let i = 0; i < 5; i++) {
      el.append(s('line', { x1: 2, x2: W - 2, y1: TOP + i * 10, y2: TOP + i * 10, class: 'st-line' }));
    }
    el.append(bass
      ? s('text', { x: 8, y: TOP + 40, class: 'st-clef st-clef--bass' }, '\u{1D122}')
      : s('text', { x: 6, y: BOTTOM + 10, class: 'st-clef' }, '\u{1D11E}'));
    const x0 = 66;
    const slot = (W - x0 - 10) / Math.max(1, groups.length);
    const aria = [];
    groups.forEach((g, gi) => {
      const cx = x0 + slot * gi + slot * 0.45;
      const grp = s('g', { class: 'st-group' + (gi === hl ? ' is-hl' : '') + (classes[gi] ? ' ' + classes[gi] : '') });
      if (onTap) {
        grp.classList.add('is-tap');
        grp.setAttribute('tabindex', 0);
        grp.setAttribute('role', 'button');
        grp.setAttribute('aria-label', (captions[gi] || Theory.join(g)) + ', anhören');
        grp.append(s('rect', { x: cx - slot * 0.45, y: 0, width: slot, height: H, class: 'st-hit' }));
        grp.addEventListener('click', () => onTap(gi));
        grp.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onTap(gi); } });
      }
      if (!g.length && placeholder) grp.append(s('text', { x: cx, y: TOP + 24, class: 'st-ph', 'text-anchor': 'middle' }, '?'));
      const ds = g.map(Theory.step);
      for (let d = BASE - 2; d >= Math.min(...ds); d -= 2) grp.append(ledger(cx, yOfStep(d)));
      for (let d = BASE + 10; d <= Math.max(...ds); d += 2) grp.append(ledger(cx, yOfStep(d)));
      const cols = [];
      g.map(n => ({ n, y: yOf(n) })).sort((a, b) => a.y - b.y).forEach(({ n, y }) => {
        grp.append(
          s('ellipse', { cx, cy: y, rx: 7.4, ry: 5.2, class: 'st-head' }),
          s('ellipse', { cx, cy: y, rx: 3.9, ry: 2.4, transform: `rotate(-38 ${cx} ${y})`, class: 'st-hole' }));
        if (n.a !== 0) {
          let c = 0;
          while ((cols[c] || []).some(yy => Math.abs(yy - y) < 17)) c++;
          (cols[c] = cols[c] || []).push(y);
          const ax = cx - 17 - c * (n.a === -2 ? 16 : 11);
          grp.append(s('text', { x: ax, y: y + 4, class: 'st-acc', 'text-anchor': 'middle' }, ACC[n.a]));
        }
        if (labels) grp.append(s('text', { x: cx + 12.5, y: y + 3.5, class: 'st-lab' }, Theory.name(n)));
      });
      if (captions[gi]) grp.append(s('text', { x: cx, y: H - 3, class: 'st-cap', 'text-anchor': 'middle' }, captions[gi]));
      el.append(grp);
      aria.push(g.length ? Theory.join(g) : 'frei');
    });
    el.setAttribute('aria-label', 'Noten' + (bass ? ' im Bassschlüssel' : '') + ': ' + aria.join(' | '));
  }

  // Stammtonstufe unter einer Bildschirmposition (für das Setzen von Noten per Antippen).
  function stepAt(clientY) {
    const r = el.getBoundingClientRect();
    const y = (clientY - r.top) * (H / r.height);
    return BASE + Math.round((BOTTOM - y) / 5);
  }

  return { el, render, stepAt, base: BASE };
}

/* ---------- Oktavkreis ----------
   Zwölf Töne wie ein Ziffernblatt, C oben, im Uhrzeigersinn je ein Halbton. */
let circleCount = 0;
function PitchCircle(opts = {}) {
  const { onTap = null, sound = true } = opts;
  const C = 150, R = 108;
  const id = 'pc' + (++circleCount);
  const el = s('svg', { viewBox: '0 0 300 300', class: 'pcircle', role: 'group', 'aria-label': 'Oktavkreis' });
  const defs = s('defs', {},
    s('marker', { id: id + '-head', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' },
      s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'pc-arrowhead' })));
  const polys = s('g');
  const arrows = s('g');
  const dots = s('g');
  el.append(defs, s('circle', { cx: C, cy: C, r: R, class: 'pc-ring' }), polys, arrows, dots);

  const pos = (p, r = R) => [C + r * Math.sin(p * Math.PI / 6), C - r * Math.cos(p * Math.PI / 6)];
  const dotEls = [];
  for (let p = 0; p < 12; p++) {
    const [x, y] = pos(p);
    const g = s('g', { class: 'pc-dot' + (isBlackKey(p) ? ' is-black' : ''), tabindex: 0, role: 'button', 'aria-label': Theory.pcName(p) },
      s('circle', { cx: x, cy: y, r: 19 }),
      s('text', { x, y: y + 4.2, 'text-anchor': 'middle' }, Theory.pcName(p)));
    g.addEventListener('click', () => {
      if (sound) Sound.piano(60 + p);
      if (onTap) onTap(p);
    });
    g.addEventListener('keydown', e => {
      if (e.key === ' ') { e.preventDefault(); g.dispatchEvent(new Event('click')); }
    });
    dots.append(g);
    dotEls.push(g);
  }

  return {
    el,
    poly(pcs, cls, animate = true) {
      const pg = s('polygon', { points: pcs.map(p => pos(p).map(v => v.toFixed(1)).join(',')).join(' '), class: `pc-poly ${cls}${animate ? ' is-draw' : ''}` });
      polys.append(pg);
      return pg;
    },
    clearPolys() { polys.replaceChildren(); },
    dot(p, cls, on = true) { dotEls[mod(p, 12)].classList.toggle(cls, on); },
    // Bogenpfeil außen am Kreis, von einem Ton zum nächsten im Uhrzeigersinn.
    arrow(from, to) {
      const r = R + 31;
      const [x1, y1] = pos(from + 0.2, r);
      const [x2, y2] = pos(to - 0.25, r);
      arrows.append(s('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`, class: 'pc-arrow', 'marker-end': `url(#${id}-head)` }));
    },
    clearArrows() { arrows.replaceChildren(); },
  };
}

/* ---------- Abspielknopf ---------- */
function PlayBtn(label, onPlay, opts = {}) {
  const b = h('button', { type: 'button', class: 'play' + (opts.variant ? ' play--' + opts.variant : '') },
    h('span', { class: 'play-ico', html: ICON.play }),
    h('span', { class: 'play-lab', html: inline(label) }));
  b.addEventListener('click', () => {
    onPlay();
    b.classList.add('is-played');
    b.classList.remove('is-pulse');
    void b.offsetWidth;
    b.classList.add('is-pulse');
  });
  return b;
}
