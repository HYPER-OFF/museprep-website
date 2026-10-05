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

## Stand

Paket 1 (Repositories und Rechte) – die Einstellungen auf GitHub stehen in
[`docs/SETUP.md`](docs/SETUP.md). Hugo-Grundgerüst, Prüfskripte und Workflow
folgen in den nächsten Paketen.
