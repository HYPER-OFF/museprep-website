#!/usr/bin/env python3
"""Eingangsprüfung für das Inhalts-Repository von museprep.com.

Prüft die abgeholten Inhalte, bevor Hugo sie liest. Jede Regel bricht den
Lauf ab; gemeldet werden alle Verstöße auf einmal.

Aufruf:  check-content.py <inhalts-repo> [--allowlist scripts/allowlist.json]
Ergebnis: Exit 0 = bestanden, 1 = Verstöße, 2 = Aufruf- oder Konfigurationsfehler

Nur Python-Standardbibliothek, lauffähig ab Python 3.9.
Die Feldliste hier ist verbindlich; .pages.yml ist nur Bedienhilfe fürs CMS.

Pages CMS liest den JSON-Kopfbereich bis zur letzten '}' der Datei. Deshalb
ist '}' im Text verboten – das gilt auch für Shortcodes ({{< … >}}): ein
Eintrag in allowlist.json hebt nur die Shortcode-Regel auf, nicht die '}'-Regel.
"""

import argparse
import json
import os
import re
import stat
import struct
import sys
from datetime import datetime

# Kopfbereich: erlaubte Felder und ihre Prüfung (exakte Schreibweise).
REQUIRED_FIELDS = {"title"}
ALLOWED_FIELDS = {"title", "date", "draft", "description"}

# Quiz-Seiten (content/quiz/<ordner>/index.*.md) dürfen zusätzlich "fragen" haben:
# eine Liste von {frage, antworten, richtig, erklaerung}. Sonst gilt überall die
# Vier-Felder-Regel.
QUIZ_PAGE = re.compile(r"^content/quiz/[a-z0-9-]+/index\.(de|en)\.md$")
QUIZ_RESERVED = {"klanglabor"}   # /quiz/klanglabor.html ist die App-Seite
QUIZ_MAX_QUESTIONS = 50
QUIZ_ANSWERS = (2, 6)
QUIZ_KEYS = {"frage", "antworten", "richtig", "erklaerung"}

MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_TEXT_BYTES = 200 * 1024
MAX_CONFIG_BYTES = 64 * 1024
MAX_IMAGE_SIDE = 8000
MAX_IMAGE_PIXELS = 40_000_000

CMS_CONFIG = ".pages.yml"
CONTENT_DIR = "content"

NAME_DIR = re.compile(r"^[a-z0-9-]+$")
NAME_MD = re.compile(r"^(_?)index\.(de|en)\.md$")
NAME_IMAGE = re.compile(r"^[a-z0-9-]+\.(jpg|png|webp)$")

# Hugo erkennt Shortcodes an {{< und {{% – auch in Codeblöcken.
SHORTCODE = re.compile(r"\{\{\s*[<%]\s*/?\s*([^\s>%]*)")

DATE = re.compile(
    r"^(\d{4}-\d{2}-\d{2})"
    r"(?:[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$"
)

SIGNATURES = {
    "jpg": lambda b: b[:3] == b"\xff\xd8\xff",
    "png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    "webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}


class Report:
    def __init__(self, root):
        self.root = root
        self.violations = []
        self.checked = 0

    def add(self, path, message):
        rel = os.path.relpath(path, self.root) if os.path.isabs(path) else path
        self.violations.append((rel, message))


# --- Kopfbereich ------------------------------------------------------------

def _no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("doppeltes Feld %r" % key)
        result[key] = value
    return result


def _no_constants(name):
    raise ValueError("%s ist in JSON nicht erlaubt" % name)


DECODER = json.JSONDecoder(object_pairs_hook=_no_duplicates, parse_constant=_no_constants)


def valid_date(value):
    m = DATE.match(value)
    if not m:
        return False
    try:
        datetime.strptime(m.group(1), "%Y-%m-%d")
        if m.group(2):
            datetime.strptime(m.group(2) + ":" + (m.group(3) or "00"), "%H:%M:%S")
        if m.group(4) and m.group(4) != "Z":
            datetime.strptime(m.group(4)[1:], "%H:%M")
    except ValueError:
        return False
    return True


def check_questions(report, path, questions):
    if type(questions) is not list or not 1 <= len(questions) <= QUIZ_MAX_QUESTIONS:
        report.add(path, "'fragen' muss eine Liste mit 1 bis %d Fragen sein" % QUIZ_MAX_QUESTIONS)
        return
    for number, q in enumerate(questions, 1):
        where = "Frage %d: " % number
        if type(q) is not dict:
            report.add(path, where + "muss ein Objekt sein")
            continue
        for key in sorted(set(q) - QUIZ_KEYS):
            report.add(path, where + "Feld %r ist nicht erlaubt (erlaubt: %s)" % (key, ", ".join(sorted(QUIZ_KEYS))))
        frage = q.get("frage")
        if type(frage) is not str or not frage.strip() or len(frage) > 500:
            report.add(path, where + "'frage' muss ein Text mit 1 bis 500 Zeichen sein")
        answers = q.get("antworten")
        low, high = QUIZ_ANSWERS
        if (type(answers) is not list or not low <= len(answers) <= high
                or any(type(a) is not str or not a.strip() or len(a) > 300 for a in answers)):
            report.add(path, where + "'antworten' muss eine Liste mit %d bis %d nicht leeren Texten sein" % (low, high))
            answers = None
        right = q.get("richtig")
        if type(right) is not int or (answers is not None and not 1 <= right <= len(answers)):
            report.add(path, where + "'richtig' muss die Nummer einer Antwort sein (1 bis Anzahl der Antworten)")
        explain = q.get("erklaerung")
        if explain is not None and (type(explain) is not str or len(explain) > 1000):
            report.add(path, where + "'erklaerung' muss ein Text mit höchstens 1000 Zeichen sein")


def check_front_matter(report, path, fm):
    allowed = ALLOWED_FIELDS
    rel = os.path.relpath(path, report.root).replace(os.sep, "/")
    if QUIZ_PAGE.match(rel):
        allowed = ALLOWED_FIELDS | {"fragen"}
        if "fragen" not in fm:
            report.add(path, "Pflichtfeld 'fragen' fehlt (Quiz)")
        else:
            check_questions(report, path, fm["fragen"])
    unknown = sorted(set(fm) - allowed)
    for key in unknown:
        report.add(path, "Feld %r ist nicht erlaubt (erlaubt: %s)"
                   % (key, ", ".join(sorted(allowed))))
    for key in sorted(REQUIRED_FIELDS - set(fm)):
        report.add(path, "Pflichtfeld %r fehlt" % key)

    if "title" in fm:
        title = fm["title"]
        if type(title) is not str or not title.strip():
            report.add(path, "'title' muss ein nicht leerer Text sein")
    if "date" in fm:
        date = fm["date"]
        # Leer oder null heißt: kein Datum.
        if date is not None and (type(date) is not str or (date and not valid_date(date))):
            report.add(path, "'date' muss ein Datum wie 2026-10-05 sein, nicht %r" % (date,))
    if "draft" in fm and type(fm["draft"]) is not bool:
        report.add(path, "'draft' muss true oder false sein, nicht %r" % (fm["draft"],))
    if "description" in fm:
        desc = fm["description"]
        if desc is not None and type(desc) is not str:
            report.add(path, "'description' muss Text sein")


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def check_markdown(report, path, allowed_shortcodes):
    data = read_limited(report, path, MAX_TEXT_BYTES, "Text")
    if data is None:
        return
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        report.add(path, "kein gültiges UTF-8 (Byte %d)" % exc.start)
        return
    if "\x00" in text:
        report.add(path, "enthält ein NUL-Zeichen")
        return
    if "\r" in text:
        report.add(path, "Windows-Zeilenenden (CR) sind nicht erlaubt")
        return
    if not text.startswith("{"):
        report.add(path, "Kopfbereich fehlt: die Datei muss mit einem JSON-Objekt { … } beginnen")
        return
    try:
        fm, end = DECODER.raw_decode(text, 0)
    except ValueError as exc:
        report.add(path, "Kopfbereich ist kein gültiges JSON: %s" % exc)
        return
    if end < len(text) and text[end] != "\n":
        report.add(path, "nach dem Kopfbereich muss eine neue Zeile beginnen")
    check_front_matter(report, path, fm)

    body = text[end:]
    brace = body.find("}")
    if brace != -1:
        report.add(path, "Zeile %d: '}' im Text ist nicht erlaubt (Pages CMS kann die Datei "
                   "sonst nicht öffnen)" % line_of(text, end + brace))

    for m in SHORTCODE.finditer(text):
        name = m.group(1)
        if name not in allowed_shortcodes:
            report.add(path, "Zeile %d: Shortcode %r ist nicht erlaubt"
                       % (line_of(text, m.start()), name or m.group(0)))


# --- Bilder -------------------------------------------------------------------

def png_info(data):
    """(breite, höhe, animiert) aus dem PNG-Kopf."""
    if len(data) < 33 or data[12:16] != b"IHDR":
        raise ValueError("PNG ohne IHDR")
    width, height = struct.unpack(">II", data[16:24])
    animated = False
    pos = 8
    while pos + 8 <= len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        if kind == b"acTL":
            animated = True
        if kind in (b"IDAT", b"IEND"):
            break
        pos += 12 + length
    return width, height, animated


SOF_MARKERS = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def jpeg_info(data):
    pos = 2
    while pos + 4 <= len(data):
        if data[pos] != 0xFF:
            raise ValueError("JPEG-Struktur beschädigt")
        marker = data[pos + 1]
        if marker == 0xFF:
            pos += 1
            continue
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        if marker in (0xD9, 0xDA):
            break
        length = struct.unpack(">H", data[pos + 2:pos + 4])[0]
        if marker in SOF_MARKERS:
            if pos + 9 > len(data):
                break
            height, width = struct.unpack(">HH", data[pos + 5:pos + 9])
            return width, height, False
        pos += 2 + length
    raise ValueError("JPEG ohne Bildgröße (SOF)")


def webp_info(data):
    kind = data[12:16]
    if kind == b"VP8 ":
        if data[23:26] != b"\x9d\x01\x2a":
            raise ValueError("WebP (VP8) beschädigt")
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF, False
    if kind == b"VP8L":
        if data[20] != 0x2F:
            raise ValueError("WebP (VP8L) beschädigt")
        bits = struct.unpack("<I", data[21:25])[0]
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1, False
    if kind == b"VP8X":
        flags = data[20]
        width = int.from_bytes(data[24:27], "little") + 1
        height = int.from_bytes(data[27:30], "little") + 1
        return width, height, bool(flags & 0x02)
    raise ValueError("unbekanntes WebP-Format")


IMAGE_INFO = {"png": png_info, "jpg": jpeg_info, "webp": webp_info}


def check_image(report, path, ext):
    data = read_limited(report, path, MAX_IMAGE_BYTES, "Bild")
    if data is None:
        return
    if not SIGNATURES[ext](data):
        report.add(path, "Dateiinhalt passt nicht zur Endung .%s" % ext)
        return
    try:
        width, height, animated = IMAGE_INFO[ext](data)
    except (ValueError, struct.error, IndexError) as exc:
        report.add(path, "Bild nicht lesbar: %s" % exc)
        return
    if width < 1 or height < 1:
        report.add(path, "Bildgröße %dx%d ist ungültig" % (width, height))
    elif width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE or width * height > MAX_IMAGE_PIXELS:
        report.add(path, "Bild zu groß: %dx%d Pixel (höchstens %d je Seite und %d Mio. Pixel)"
                   % (width, height, MAX_IMAGE_SIDE, MAX_IMAGE_PIXELS // 1_000_000))
    if animated:
        report.add(path, "animierte Bilder sind nicht erlaubt")


# --- Dateibaum -----------------------------------------------------------------

def read_limited(report, path, limit, label):
    size = os.lstat(path).st_size
    if size == 0:
        report.add(path, "Datei ist leer")
        return None
    if size > limit:
        report.add(path, "%s zu groß: %d KB (höchstens %d KB)" % (label, size // 1024, limit // 1024))
        return None
    with open(path, "rb") as f:
        return f.read(limit + 1)


def entry_kind(entry):
    """'dir', 'file' oder eine Beschreibung des Problems."""
    if entry.is_symlink():
        return "Symlinks sind nicht erlaubt"
    mode = entry.stat(follow_symlinks=False).st_mode
    if stat.S_ISDIR(mode):
        return "dir"
    if stat.S_ISREG(mode):
        return "file"
    return "nur normale Dateien und Ordner sind erlaubt"


def walk_content(report, directory, allowed_shortcodes, is_root):
    entries = sorted(os.scandir(directory), key=lambda e: e.name)
    md_kinds = set()
    for entry in entries:
        path = entry.path
        kind = entry_kind(entry)
        if kind not in ("dir", "file"):
            report.add(path, kind)
            continue
        if entry.name.startswith("."):
            report.add(path, "versteckte Dateien und Ordner sind nicht erlaubt")
            continue
        if kind == "dir":
            if not NAME_DIR.match(entry.name):
                report.add(path, "Ordnername nur aus Kleinbuchstaben, Ziffern und Bindestrich")
                continue
            if entry.name in QUIZ_RESERVED and os.path.basename(directory) == "quiz":
                report.add(path, "Ordnername %r ist reserviert" % entry.name)
                continue
            walk_content(report, path, allowed_shortcodes, False)
            continue

        report.checked += 1
        md = NAME_MD.match(entry.name)
        if md:
            md_kinds.add(md.group(1))
            if is_root and not md.group(1):
                report.add(path, "im Wurzelordner sind nur _index.de.md und _index.en.md erlaubt")
                continue
            check_markdown(report, path, allowed_shortcodes)
            continue
        image = NAME_IMAGE.match(entry.name)
        if image:
            check_image(report, path, image.group(1))
            continue
        if entry.name.endswith(".md"):
            report.add(path, "Textdateien heißen index.de.md, index.en.md, _index.de.md oder _index.en.md")
        elif re.search(r"\.(jpe?g|png|webp)$", entry.name, re.IGNORECASE):
            report.add(path, "Bildname nur aus Kleinbuchstaben, Ziffern und Bindestrich, Endung .jpg, .png oder .webp")
        else:
            report.add(path, "Dateityp nicht erlaubt (erlaubt: .md, .jpg, .png, .webp)")
    if len(md_kinds) > 1:
        report.add(directory, "index.*.md und _index.*.md dürfen nicht im selben Ordner liegen")


def check_repository(root, allowed_shortcodes):
    report = Report(root)
    content = os.path.join(root, CONTENT_DIR)
    found_content = False
    for entry in sorted(os.scandir(root), key=lambda e: e.name):
        if entry.name == ".git":
            continue
        kind = entry_kind(entry)
        if entry.name == CONTENT_DIR and kind == "dir":
            found_content = True
        elif entry.name == CMS_CONFIG and kind == "file":
            report.checked += 1
            data = read_limited(report, entry.path, MAX_CONFIG_BYTES, "Konfiguration")
            if data is not None:
                try:
                    data.decode("utf-8")
                except UnicodeDecodeError:
                    report.add(entry.path, "kein gültiges UTF-8")
        elif kind not in ("dir", "file"):
            report.add(entry.path, kind)
        else:
            report.add(entry.path, "neben content/ ist nur %s erlaubt" % CMS_CONFIG)
    if not found_content:
        report.add(content, "Ordner content/ fehlt")
    else:
        walk_content(report, content, allowed_shortcodes, True)
    return report


def load_allowlist(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    shortcodes = data.get("shortcodes")
    if not isinstance(shortcodes, list) or not all(isinstance(s, str) for s in shortcodes):
        raise ValueError("'shortcodes' muss eine Liste von Namen sein")
    return set(shortcodes)


def main(argv=None):
    here = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(description="Eingangsprüfung für museprep-content")
    parser.add_argument("repo", help="Pfad zum Inhalts-Repository")
    parser.add_argument("--allowlist", default=os.path.join(here, "allowlist.json"))
    args = parser.parse_args(argv)

    root = os.path.abspath(args.repo)
    if not os.path.isdir(root):
        print("Inhalts-Repository nicht gefunden: %s" % root, file=sys.stderr)
        return 2
    try:
        allowed = load_allowlist(args.allowlist)
    except (OSError, ValueError) as exc:
        print("Allowlist fehlerhaft (%s): %s" % (args.allowlist, exc), file=sys.stderr)
        return 2

    report = check_repository(root, allowed)
    if report.violations:
        count = len(report.violations)
        print("Eingangsprüfung fehlgeschlagen – %d %s:" % (count, "Verstoß" if count == 1 else "Verstöße"))
        for path, message in sorted(report.violations):
            print("  %s: %s" % (path, message))
        return 1
    print("Eingangsprüfung bestanden: %d Dateien geprüft." % report.checked)
    return 0


if __name__ == "__main__":
    sys.exit(main())
