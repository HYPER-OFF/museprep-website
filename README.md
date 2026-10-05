# museprep-website

Vorlagen, CSS, Hugo-Konfiguration, Prüfskripte und Build-Workflow für
[museprep.com](https://museprep.com). Statische, zweisprachige Website (Deutsch
Standard, Englisch zweite Sprache), gebaut mit Hugo.

## Aufbau

Die Seite besteht aus zwei getrennten Repositories:

| Repository | Inhalt | Wer schreibt |
|---|---|---|
| `museprep-website` (öffentlich) | Vorlagen, CSS, `hugo.toml`, Prüfskripte, Workflow | nur der Entwickler |
| `museprep-content` (privat) | Markdown-Texte, Bilder, `.pages.yml` | Autoren über Pages CMS |

Inhalte liegen nie in diesem Repository. Der Build holt sie mit einem
Lese-Schlüssel ab, prüft sie, baut die Seite mit Hugo, prüft das Ergebnis und
lädt erst nach manueller Freigabe per rsync hoch.

## Grundregeln

- Kein Node, kein npm, keine Fremdbibliotheken, keine fremden Themes oder Module.
- Kein Tracking, keine Werbung, keine Schriften oder Skripte von fremden Servern
  – deshalb kein Consent-Banner.
- Auf dem Webspace liegen nur statische Dateien.
- YouTube-Videos werden verlinkt, nicht eingebettet.
- Prüfskripte nutzen nur die Python-Standardbibliothek.

## Lokal arbeiten

Beide Repositories liegen nebeneinander:

```
museprep_com/
  museprep-website/   dieses Repository
  museprep-content/   Klon des Inhalts-Repositorys
```

```sh
scripts/install-hugo.sh        # Hugo laut scripts/tools.lock nach .bin/, SHA-256-geprüft
.bin/hugo server               # Vorschau unter http://localhost:1313/
scripts/build-local.sh         # Build wie im Workflow nach public/
```

`hugo.toml` zeigt mit `contentDir` auf `../museprep-content/content`; der
Workflow übergibt den Pfad mit `--contentDir`.

## Aufbau des Repositorys

| Pfad | Inhalt |
|---|---|
| `hugo.toml` | Sprachen, Adressen, Sicherheitseinstellungen |
| `layouts/` | eigene Vorlagen (keine Themes), Render-Hooks für Bilder, Links, Tabellen |
| `layouts/_shortcodes/` | sperrt Hugos eingebaute Shortcodes |
| `assets/css/main.css` | natives CSS nach dem Claude-Design |
| `assets/images/` | Logo und Icon, werden beim Build neu kodiert |
| `i18n/` | Oberflächentexte Deutsch/Englisch |
| `static/fonts/` | Schriften als WOFF2 mit Lizenzen |
| `scripts/` | Hugo-Installation, lokaler Build, später Prüfskripte |

## Stand

- Paket 1: Repositories und Rechte, siehe [`docs/SETUP.md`](docs/SETUP.md).
- Paket 2: Hugo-Grundgerüst mit Design, zwei Sprachen, lokalen Schriften und
  Bild-Hook.
- Paket 3: Eingangsprüfung `scripts/check-content.py` mit Testfällen.
- Ausgangsprüfung und Workflow folgen in den nächsten Paketen.

## Eingangsprüfung

```sh
python3 scripts/check-content.py ../museprep-content   # Exit 0 = bestanden, 1 = Verstöße
python3 -m unittest discover -s scripts/tests          # Testfälle
```

Geprüft wird das ganze Inhalts-Repository, bevor Hugo es liest: nur `.md`,
`.jpg`, `.png`, `.webp` unter `content/` (daneben nur `.pages.yml`), keine
Symlinks oder versteckten Dateien, Namen aus `a-z`, `0-9` und `-`, Bilder
höchstens 2 MB und 40 Mio. Pixel mit passender Signatur, Texte höchstens
200 KB, Kopfbereich als JSON mit nur `title`, `date`, `draft`, `description`,
keine Shortcodes außer denen in `scripts/allowlist.json` und kein `}` im Text
(sonst kann Pages CMS die Datei nicht öffnen).
