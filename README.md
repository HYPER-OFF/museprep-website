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
| `scripts/` | Hugo-Installation, lokaler Build, Prüfskripte, Bericht |
| `.github/workflows/build.yml` | Build mit Freigabe und Upload |
| `deploy/known_hosts` | fest hinterlegter Host-Schlüssel des Webservers |
| `static/.htaccess` | Sicherheits-Kopfzeilen, später Weiterleitungen |

## Stand

- Paket 1: Repositories und Rechte, siehe [`docs/SETUP.md`](docs/SETUP.md).
- Paket 2: Hugo-Grundgerüst mit Design, zwei Sprachen, lokalen Schriften und
  Bild-Hook.
- Paket 3: Eingangsprüfung `scripts/check-content.py` mit Testfällen.
- Paket 4: Ausgangsprüfung `scripts/check-output.py` mit Testfällen.
- Paket 5: Workflow `.github/workflows/build.yml` mit Zeitsteuerung, Freigabe
  und rsync-Upload, `static/.htaccess` mit Sicherheits-Kopfzeilen,
  Dependabot. Einrichtung und Ablauf: [`docs/SETUP.md`](docs/SETUP.md),
  Abschnitte 5–7.
- Paket 6: alle 90 WordPress-Beiträge als `index.en.md` übertragen (ohne
  Bilder), 301-Weiterleitungen aller alten Adressen in `static/.htaccess`,
  Bericht in [`docs/MIGRATION.md`](docs/MIGRATION.md).
- Paket 9: Entwürfe für Impressum und Datenschutzerklärung (im
  Inhalts-Repository), Umstellungs-Checkliste in [`docs/GO-LIVE.md`](docs/GO-LIVE.md).

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

## Ausgangsprüfung

```sh
python3 scripts/check-output.py public/      # Exit 0 = bestanden, 1 = Verstöße
```

Geprüft wird das fertige HTML und CSS in `public/`: `script`, `iframe`,
`object`, `embed` und `form` nur in der Form, die `allowlist.json` unter
`elements` nennt (die Liste ist leer, die Seite hat kein JavaScript); keine
`on…`-Attribute, keine `javascript:`- oder `data:`-Adressen, keine
Inline-Styles; Bilder, CSS und Schriften nur von der eigenen Domain; Links
nach außen nur zu Domains aus `external_domains`; interne Links und Quellen
müssen existieren; nur erlaubte Dateitypen (keine Originalbilder, kein PHP).
Mit `--manifest-out` und `--links-out` schreibt das Skript Prüfsummen aller
Dateien und die Liste externer Links für den Bericht im Workflow.

## Migration und Weiterleitungen

```sh
tools/migrate-wordpress.py --content ../museprep-content/content   # erneut übertragen
python3 -m unittest scripts/tests/test_redirects.py                 # Weiterleitungen prüfen
tools/check-live-redirects.sh                                      # nach der Domainumstellung
```

`tools/migrate-wordpress.py` holt die Beiträge über die WordPress-API, wandelt
sie in Markdown um und schreibt außerdem den Weiterleitungsblock in
`static/.htaccess` und die Liste `tools/old-urls.txt`. Mit `--with-images`
lädt es auch die Bilder. Vorsicht: Bilder in Ordnern, die nur `index.en.md`
enthalten, sieht Hugo nicht (Dateien ohne Sprachkennung gehören zur
Standardsprache Deutsch) – siehe offene Punkte in `docs/MIGRATION.md`.
