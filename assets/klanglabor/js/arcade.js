'use strict';
/* Aufgaben für die Blitzrunde. Jeder Generator liefert eine frische Frage:
   { tag, prompt, options, answer, play? } */

const Arcade = (() => {
  const Th = Theory;
  const DIM_ROOTS = ['C', 'Cis', 'D', 'Dis', 'E', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'];
  const SAFE_ROOTS = ['C', 'D', 'E', 'G', 'A', 'H'];
  const TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'Es', 'B'];

  // Richtige Antwort plus bis zu (count − 1) verschiedene Ablenker, gemischt.
  function fill(answer, cands, count = 4) {
    const others = shuffle([...new Set(cands)].filter(c => c && c !== answer)).slice(0, count - 1);
    return shuffle([answer, ...others]);
  }

  function semis() {
    const a = randInt(0, 11), d = randInt(1, 11), b = (a + d) % 12;
    const near = [d - 3, d - 2, d - 1, d + 1, d + 2, d + 3].filter(x => x >= 1 && x <= 11).map(String);
    return {
      tag: 'Halbtöne',
      prompt: `Wie viele Halbtöne liegen von **${Th.pcName(a)}** aufwärts bis **${Th.pcName(b)}**?`,
      options: fill(String(d), near).sort((x, y) => x - y),
      answer: String(d),
    };
  }

  function isDim() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'dim7' : pick(['hdim7', 'dom7', 'm7']);
    const notes = Th.chord(Th.note(pick(SAFE_ROOTS), 4), type);
    return {
      tag: 'Vermindert?',
      prompt: `Ist **${Th.join(notes)}** ein verminderter Septakkord?`,
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  function complete() {
    const ch = Th.chord(Th.note(pick(DIM_ROOTS), 4), 'dim7');
    const k = randInt(1, 3);
    const p = Th.pc(ch[k]);
    const ans = Th.name(ch[k]);
    // Falle: derselbe Klang, falsch geschrieben (z. B. A statt Heses).
    const trap = [Th.pcName(p), ...Th.spellings(p, 1)].find(x => x !== ans);
    const near = shuffle([Th.pcName(p + 1), Th.pcName(p - 1), Th.pcName(p + 2)].filter(x => x !== ans && x !== trap));
    return {
      tag: 'Ergänzen',
      prompt: `Ergänze den verminderten Septakkord: ${ch.map((x, i) => (i === k ? '**?**' : Th.name(x))).join(' – ')}`,
      options: shuffle([ans, trap, ...near.slice(0, trap ? 2 : 3)].filter(Boolean)),
      answer: ans,
    };
  }

  function ear() {
    const yes = Math.random() < 0.5;
    const type = yes ? 'dim7' : pick(['hdim7', 'dom7', 'm7']);
    return {
      tag: 'Hörprobe',
      prompt: 'Hörst du einen verminderten Septakkord?',
      play: Th.chordMidis(randInt(50, 60), type),
      options: ['Ja', 'Nein'],
      answer: yes ? 'Ja' : 'Nein',
    };
  }

  function leit() {
    const tonic = Th.note(pick(TONICS), 4);
    const lead = Th.transpose(tonic, -1, -1);
    const ch = Th.chord(lead, 'dim7');
    const p = Th.pc(lead);
    const ans = Th.name(tonic);
    return {
      tag: 'Leitton',
      prompt: `**${Th.name(lead)}** ist der Leitton in ${Th.join(ch)}. Wohin löst sich der Akkord auf?`,
      options: fill(ans, [Th.pcName(p - 1), Th.pcName(p + 2), Th.name(ch[1]), Th.pcName(p + 4)]),
      answer: ans,
    };
  }

  const TYPES = [
    { id: 'semis', name: 'Halbtöne zählen', gen: semis, needs: null },
    { id: 'isDim', name: 'Vermindert oder nicht', gen: isDim, needs: null },
    { id: 'complete', name: 'Akkord ergänzen', gen: complete, needs: 'septime' },
    { id: 'ear', name: 'Hörprobe', gen: ear, needs: 'hoeren' },
    { id: 'leit', name: 'Leitton finden', gen: leit, needs: 'aufloesung' },
  ];

  return { TYPES };
})();
