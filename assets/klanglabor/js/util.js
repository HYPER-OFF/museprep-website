'use strict';
/* Kleine Helfer: DOM-Bau, Zufall, Textformatierung, Icons. */

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  addKids(el, kids);
  return el;
}

function s(tag, attrs, ...kids) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  setAttrs(el, attrs);
  addKids(el, kids);
  return el;
}

function setAttrs(el, attrs) {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    // CSSOM statt style-Attribut: die Content-Security-Policy erlaubt keine Inline-Styles.
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function addKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const mod = (n, m) => ((n % m) + m) % m;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// **fett** im Fließtext; Absätze durch Leerzeilen.
function inline(str) {
  return String(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
}
function rich(str) {
  return String(str).split(/\n{2,}/).map(p => '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>').join('');
}

const btnRow = (...kids) => h('div', { class: 'btn-row' }, kids);
const kbWrap = el => h('div', { class: 'kb-wrap' }, el);

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.8-6.4c.6-.4.6-1.2 0-1.6L9.6 4.8C8.9 4.3 8 4.8 8 5.6z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.4 2.2 4.6 13.3c-.4.5 0 1.2.6 1.2h5.6l-1.2 6.8c-.1.7.8 1.1 1.2.5l8.6-11.1c.4-.5 0-1.2-.6-1.2h-5.5l1.4-6.7c.2-.7-.8-1.1-1.3-.6z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.3c.3 2.6 1.7 4.2 3.2 5.8 1.5 1.6 3 3.4 3 6.2A6.8 6.8 0 0 1 12 21a6.8 6.8 0 0 1-6.8-6.7c0-2.5 1.2-4.3 2.6-5.6.4-.4 1-.1 1.1.4.2 1.2.8 2.2 1.7 2.7-.2-3.6 1.1-6.9 3-9 .3-.3.9-.2 1 .5z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="7" r="1.6" fill="currentColor"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5m0-5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4.5l3 2M9.5 2.8h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 8.5l4.6 3.8L12 5.5l3.9 6.8 4.6-3.8-1.8 10H5.3z"/></svg>',
  ear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9.5a5 5 0 0 1 10 0c0 3.2-3.2 4-3.2 7.2a2.8 2.8 0 0 1-5.3 1.2M10 10a2 2 0 0 1 4 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path fill="currentColor" d="M6 4h11.5l-2.5 4 2.5 4H6z"/></svg>',
  square: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".5"/><path d="M12 3l9 9-9 9-9-9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Markenzeichen: der Oktavkreis mit dem eingeschriebenen Quadrat des verminderten Septakkords.
const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true">'
  + '<circle class="lg-ring" cx="16" cy="16" r="12.5"/>'
  + '<path class="lg-sq" d="M16 3.5 28.5 16 16 28.5 3.5 16z"/>'
  + '<circle class="lg-pt" cx="16" cy="3.5" r="2.6"/><circle class="lg-pt" cx="28.5" cy="16" r="2.6"/>'
  + '<circle class="lg-pt" cx="16" cy="28.5" r="2.6"/><circle class="lg-pt" cx="3.5" cy="16" r="2.6"/>'
  + '</svg>';
