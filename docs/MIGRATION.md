# Migration der WordPress-Beiträge

Erzeugt von `tools/migrate-wordpress.py` am 2026-10-05. Alle 90 Beiträge der alten Seite
liegen als englische Fassung (`index.en.md`) unter `content/artikel/<slug>/`.
Jede alte Adresse leitet per 301 auf die neue weiter (`static/.htaccess`).

Bilder wurden bewusst **nicht** übernommen (188 Bilder weggelassen, davon 89
Beiträge betroffen). Mit `--with-images` lädt das Werkzeug sie mit.

## Zur Durchsicht

### Affiliate-Link entfernt (8)

- `music-theory-back-to-school-essentials`: https://amzn.to/3GSUuO3 (ew on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/3UlhOXS (👉 View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/40nKCCO (View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/44Zc8bf (View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/4568P33 (View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/46h1QWb (View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/4eYyRIP (View on Amazon)
- `music-theory-back-to-school-essentials`: https://amzn.to/4kKr96k (View on Amazon)

### Link entfernt (1)

- `musical-notation-basics`: ungültige Adresse http://6

### Umgewandelt (10)

- `musical-symbols-guide`: interaktives Quiz → Fragen mit Lösung

### Frühere Beitragsnamen

Interne Links und Weiterleitungen nutzen diese Zuordnung (von Hand nach Titel
und Datum geprüft). Wo WordPress heute anders weiterleitet, steht es dabei.

| Früherer Name | Heutiger Beitrag | WordPress leitet heute auf |
|---|---|---|
| `5-romantic-era-composer-highlights-you-should-know` | `romantic-era-composer` | gleich |
| `enhancing-music-skills-with-half-steps-introduction-for-beginners` | `enhancing-music-skills-with-half-steps` | `half-steps-and-whole-steps-in-music` |
| `learn-to-read-notes-mastering-pitches-in-treble-and-bass-clef` | `learn-to-read-notes` | gleich |
| `musical-notation-clefs-natural-notes` | `musical-notation-basics` | gleich |
| `musical-staff-beginners-guide` | `musical-staff-basics` | `definition-of-music-staff` |
| `natural-sign-in-music-your-complete-guide-to-understanding-musical-notation` | `natural-sign-in-music` | `accidentals-music-theory` |
| `teaching-music-theory-without-a-textbook-creative-music-education` | `teaching-music-theory-without-a-textbook` | `music-theory-for-beginners` |
| `understanding-accidentals-music-theory-your-complete-guide-to-sharps-and-flats` | `accidentals-music-theory` | gleich |
| `why-daily-music-challenges-boost-your-learning` | `daily-music-challenges` | gleich |

### Bilder

Bilder liegen zentral in `content/bilder/` (im Text `/bilder/name.jpg`), nicht im
Artikelordner. Grund: Hugo ordnet Bilder ohne Sprachkennung der Standardsprache zu,
ein rein englischer Artikelordner sähe seine Bilder sonst nicht; außerdem überschneiden
sich so Media- und Inhaltsordner in Pages CMS nicht. Mit `--with-images` schreibt das
Werkzeug die Bilder als `<slug>-<name>` dorthin.

### Externe Link-Ziele

| Domain | Links |
|---|---|
| www.youtube.com | 289 |
| online.berklee.edu | 1 |
| www.coursera.org | 1 |
| www.musictheory.net | 1 |
| www.teoria.com | 1 |

## Alle Beiträge

| Alte Adresse | Neue Adresse | Bilder weggelassen |
|---|---|---|
| `/2026-the-year-you-finally-understand-music/` | `/en/articles/2026-the-year-you-finally-understand-music/` | 2 |
| `/about-the-creator-of-silent-night/` | `/en/articles/about-the-creator-of-silent-night/` | 2 |
| `/accidentals-music-theory/` | `/en/articles/accidentals-music-theory/` | 2 |
| `/advanced-chord-positions/` | `/en/articles/advanced-chord-positions/` | 2 |
| `/advancing-in-music-learning/` | `/en/articles/advancing-in-music-learning/` | 2 |
| `/basic-music-theory/` | `/en/articles/basic-music-theory/` | 4 |
| `/basic-music-time-signature/` | `/en/articles/basic-music-time-signature/` | 2 |
| `/basic-musical-keys/` | `/en/articles/basic-musical-keys/` | 2 |
| `/basics-of-chord-inversions/` | `/en/articles/basics-of-chord-inversions/` | 1 |
| `/beginner-chords-101-learn-your-first-chords-in-minutes/` | `/en/articles/beginner-chords-101-learn-your-first-chords-in-minutes/` | 3 |
| `/beginner-melody-writing/` | `/en/articles/beginner-melody-writing/` | 3 |
| `/beginner-music-composition/` | `/en/articles/beginner-music-composition/` | 3 |
| `/borodin-in-the-steppes-of-central-asia/` | `/en/articles/borodin-in-the-steppes-of-central-asia/` | 2 |
| `/chord-construction-steps/` | `/en/articles/chord-construction-steps/` | 2 |
| `/chord-progressions-for-beginners/` | `/en/articles/chord-progressions-for-beginners/` | 3 |
| `/chord-structure/` | `/en/articles/chord-structure/` | 2 |
| `/chromaticism-in-flight-of-the-bumblebee/` | `/en/articles/chromaticism-in-flight-of-the-bumblebee/` | 2 |
| `/clara-schumann-biography/` | `/en/articles/clara-schumann-biography/` | 3 |
| `/daily-music-challenges/` | `/en/articles/daily-music-challenges/` | 2 |
| `/debussy-voiles-interpretation/` | `/en/articles/debussy-voiles-interpretation/` | 2 |
| `/definition-of-music-staff/` | `/en/articles/definition-of-music-staff/` | 2 |
| `/difference-between-octaves/` | `/en/articles/difference-between-octaves/` | 2 |
| `/digital-tools-for-beginner-musicians/` | `/en/articles/digital-tools-for-beginner-musicians/` | 2 |
| `/dreamlike-music/` | `/en/articles/dreamlike-music/` | 2 |
| `/dvoraks-ninth-symphony/` | `/en/articles/dvoraks-ninth-symphony/` | 2 |
| `/dynamics-in-music/` | `/en/articles/dynamics-in-music/` | 2 |
| `/easy-key-signature-guide/` | `/en/articles/easy-key-signature-guide/` | 2 |
| `/enhancing-music-skills-with-half-steps/` | `/en/articles/enhancing-music-skills-with-half-steps/` | 2 |
| `/exploring-different-seventh-chords-styles/` | `/en/articles/exploring-different-seventh-chords-styles/` | 2 |
| `/half-steps-and-whole-steps-in-music/` | `/en/articles/half-steps-and-whole-steps-in-music/` | 2 |
| `/half-steps-in-music/` | `/en/articles/half-steps-in-music/` | 2 |
| `/how-to-identify-the-key-of-a-piece-with-real-life-examples/` | `/en/articles/how-to-identify-the-key-of-a-piece-with-real-life-examples/` | 1 |
| `/identify-intervals-steps/` | `/en/articles/identify-intervals-steps/` | 2 |
| `/inner-hearing/` | `/en/articles/inner-hearing/` | 2 |
| `/learn-to-read-notes/` | `/en/articles/learn-to-read-notes/` | 2 |
| `/major-and-minor-intervals/` | `/en/articles/major-and-minor-intervals/` | 1 |
| `/major-scale/` | `/en/articles/major-scale/` | 1 |
| `/major-scale-concepts-for-beginners/` | `/en/articles/major-scale-concepts-for-beginners/` | 2 |
| `/major-scale-steps/` | `/en/articles/major-scale-steps/` | 2 |
| `/mastering-key-signatures-and-modulation-new-video-series-in-2026/` | `/en/articles/mastering-key-signatures-and-modulation-new-video-series-in-2026/` | 2 |
| `/minor-scale/` | `/en/articles/minor-scale/` | 2 |
| `/mistakes-music-beginners-should-avoid/` | `/en/articles/mistakes-music-beginners-should-avoid/` | 2 |
| `/morning-mood/` | `/en/articles/morning-mood/` | 2 |
| `/motif-in-music/` | `/en/articles/motif-in-music/` | 2 |
| `/museprep-shorts/` | `/en/articles/museprep-shorts/` | 0 |
| `/music-analysis-for-students/` | `/en/articles/music-analysis-for-students/` | 3 |
| `/music-practice-motivation/` | `/en/articles/music-practice-motivation/` | 3 |
| `/music-routine-planner/` | `/en/articles/music-routine-planner/` | 2 |
| `/music-theory-back-to-school-essentials/` | `/en/articles/music-theory-back-to-school-essentials/` | 3 |
| `/music-theory-basics/` | `/en/articles/music-theory-basics/` | 3 |
| `/music-theory-for-beginners/` | `/en/articles/music-theory-for-beginners/` | 3 |
| `/music-theory-for-beginners-online/` | `/en/articles/music-theory-for-beginners-online/` | 2 |
| `/music-theory-for-kids/` | `/en/articles/music-theory-for-kids/` | 3 |
| `/music-theory-in-the-classroom/` | `/en/articles/music-theory-in-the-classroom/` | 2 |
| `/music-theory-lessons-online/` | `/en/articles/music-theory-lessons-online/` | 2 |
| `/musical-intervals/` | `/en/articles/musical-intervals/` | 2 |
| `/musical-notation-basics/` | `/en/articles/musical-notation-basics/` | 2 |
| `/musical-octaves-explained/` | `/en/articles/musical-octaves-explained/` | 3 |
| `/musical-staff-basics/` | `/en/articles/musical-staff-basics/` | 2 |
| `/musical-symbols-guide/` | `/en/articles/musical-symbols-guide/` | 2 |
| `/natural-sign-in-music/` | `/en/articles/natural-sign-in-music/` | 2 |
| `/pentatonic-scale-for-beginners/` | `/en/articles/pentatonic-scale-for-beginners/` | 1 |
| `/perfect-intervals/` | `/en/articles/perfect-intervals/` | 2 |
| `/perfect-intervals-2/` | `/en/articles/perfect-intervals-2/` | 2 |
| `/perfect-intervals-explained/` | `/en/articles/perfect-intervals-explained/` | 2 |
| `/perfect-intervals-types/` | `/en/articles/perfect-intervals-types/` | 2 |
| `/practical-music-theory/` | `/en/articles/practical-music-theory/` | 3 |
| `/practice-natural-sign-in-music/` | `/en/articles/practice-natural-sign-in-music/` | 3 |
| `/relative-keys-explained/` | `/en/articles/relative-keys-explained/` | 2 |
| `/romantic-era-composer/` | `/en/articles/romantic-era-composer/` | 2 |
| `/sight-reading-for-beginners/` | `/en/articles/sight-reading-for-beginners/` | 3 |
| `/special-needs-music-resources/` | `/en/articles/special-needs-music-resources/` | 3 |
| `/teaching-music-theory-without-a-textbook/` | `/en/articles/teaching-music-theory-without-a-textbook/` | 3 |
| `/the-chromatic-scale/` | `/en/articles/the-chromatic-scale/` | 1 |
| `/the-exotic-minor-scale-in-music/` | `/en/articles/the-exotic-minor-scale-in-music/` | 2 |
| `/theory-in-repertoire/` | `/en/articles/theory-in-repertoire/` | 3 |
| `/timbre-in-music/` | `/en/articles/timbre-in-music/` | 2 |
| `/types-of-minor-scales/` | `/en/articles/types-of-minor-scales/` | 2 |
| `/understanding-pentatonic-scale-notes/` | `/en/articles/understanding-pentatonic-scale-notes/` | 2 |
| `/understanding-rhythm/` | `/en/articles/understanding-rhythm/` | 2 |
| `/understanding-seventh-chords-formula/` | `/en/articles/understanding-seventh-chords-formula/` | 1 |
| `/understanding-the-ascending-melodic-minor-scale/` | `/en/articles/understanding-the-ascending-melodic-minor-scale/` | 2 |
| `/variants-of-the-minor-scale/` | `/en/articles/variants-of-the-minor-scale/` | 2 |
| `/what-is-a-chord-in-music/` | `/en/articles/what-is-a-chord-in-music/` | 1 |
| `/what-is-a-melody/` | `/en/articles/what-is-a-melody/` | 2 |
| `/what-is-a-scale-in-music/` | `/en/articles/what-is-a-scale-in-music/` | 2 |
| `/what-is-an-interval/` | `/en/articles/what-is-an-interval/` | 1 |
| `/what-is-the-circle-of-fifths/` | `/en/articles/what-is-the-circle-of-fifths/` | 2 |
| `/whole-steps-and-half-steps/` | `/en/articles/whole-steps-and-half-steps/` | 2 |
| `/whole-tone-scales/` | `/en/articles/whole-tone-scales/` | 1 |
