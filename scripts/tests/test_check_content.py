"""Testfälle für scripts/check-content.py.

Jeder Test baut einen gültigen Inhaltsbaum, ändert genau eine Sache und
erwartet, dass die Prüfung genau daran scheitert.

Aufruf: python3 -m unittest discover -s scripts/tests
"""

import contextlib
import importlib.util
import io
import json
import os
import shutil
import struct
import tempfile
import unittest
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "check-content.py")

spec = importlib.util.spec_from_file_location("check_content", SCRIPT)
cc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cc)


# --- kleine, echte Bilddateien (nur der Kopf muss stimmen) ------------------

def png_bytes(width=40, height=20, extra_chunks=b""):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\xff\xff\xff" * min(width, 4) for _ in range(min(height, 4)))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + extra_chunks
            + chunk(b"IDAT", zlib.compress(raw))
            + chunk(b"IEND", b""))


def jpeg_bytes(width=40, height=20):
    return (b"\xff\xd8"
            + b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            + b"\xff\xc0\x00\x11\x08" + struct.pack(">HH", height, width)
            + b"\x03\x01\x22\x00\x02\x11\x01\x03\x11\x01"
            + b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xff\xd9")


def webp_lossless_bytes(width=40, height=20):
    bits = (width - 1) | ((height - 1) << 14)
    payload = b"\x2f" + struct.pack("<I", bits) + b"\x00" * 8
    chunk = b"VP8L" + struct.pack("<I", len(payload)) + payload
    return b"RIFF" + struct.pack("<I", 4 + len(chunk)) + b"WEBP" + chunk


def webp_animated_bytes(width=40, height=20):
    payload = bytes([0x02, 0, 0, 0]) + (width - 1).to_bytes(3, "little") + (height - 1).to_bytes(3, "little")
    chunk = b"VP8X" + struct.pack("<I", len(payload)) + payload
    return b"RIFF" + struct.pack("<I", 4 + len(chunk)) + b"WEBP" + chunk


def page(fields, body="Ein Absatz.\n"):
    return json.dumps(fields, ensure_ascii=False, indent=2) + "\n" + body


ARTICLE = {"title": "Noten lesen", "date": "2026-10-05", "draft": False,
           "description": "Kurzbeschreibung"}


class CheckContentTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="check-content-")
        self.repo = os.path.join(self.tmp, "museprep-content")
        self.write(".pages.yml", "content: []\n")
        self.write("content/_index.de.md", page({"title": "MusePrep"}))
        self.write("content/_index.en.md", page({"title": "MusePrep"}))
        self.write("content/artikel/_index.de.md", page({"title": "Artikel"}))
        self.write("content/artikel/notenlesen/index.de.md",
                   page(ARTICLE, "## Linien\n\n![Notensystem](/artikel/notenlesen/system.jpg)\n"))
        self.write("content/artikel/notenlesen/index.en.md", page(dict(ARTICLE, title="Reading music")))
        self.write("content/artikel/notenlesen/system.jpg", jpeg_bytes())
        self.write("content/artikel/notenlesen/skizze.png", png_bytes())
        self.write("content/artikel/notenlesen/foto.webp", webp_lossless_bytes())
        os.makedirs(os.path.join(self.repo, ".git"))
        self.write(".git/config", "[core]\n")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def reset(self):
        """Frischer, gültiger Baum für den nächsten Unterfall."""
        self.tearDown()
        self.setUp()

    # Hilfen

    def path(self, rel):
        return os.path.join(self.repo, rel)

    def write(self, rel, data):
        full = self.path(rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        mode = "wb" if isinstance(data, bytes) else "w"
        with open(full, mode, **({} if isinstance(data, bytes) else {"encoding": "utf-8", "newline": ""})) as f:
            f.write(data)

    def violations(self, shortcodes=()):
        return cc.check_repository(self.repo, set(shortcodes)).violations

    def assertFails(self, expected, shortcodes=()):
        found = self.violations(shortcodes)
        self.assertTrue(found, "Prüfung hätte scheitern müssen")
        self.assertTrue(any(expected in msg for _, msg in found),
                        "erwartet %r, gefunden: %r" % (expected, found))
        return found

    def assertPasses(self, shortcodes=()):
        self.assertEqual(self.violations(shortcodes), [])

    # Ausgangslage

    def test_valid_tree_passes(self):
        self.assertPasses()

    def test_central_image_folder_passes(self):
        self.write("content/bilder/index.de.md", page({"title": "Bilder"}))
        self.write("content/bilder/c-dur-tonleiter.jpg", jpeg_bytes())
        self.write("content/bilder/skizze.png", png_bytes())
        self.assertPasses()

    # Abnahme Paket 3: verbotene Datei, Symlink, gesperrtes Feld, fremder Shortcode

    def test_forbidden_file_svg(self):
        self.write("content/artikel/notenlesen/logo.svg", "<svg onload=alert(1)></svg>")
        found = self.assertFails("Dateityp nicht erlaubt")
        self.assertEqual(len(found), 1)

    def test_forbidden_file_html_and_content_adapter(self):
        self.write("content/seite.html", "<p>hi</p>")
        self.write("content/artikel/_content.gotmpl", "{{ }}")
        found = self.violations()
        self.assertEqual(len(found), 2, found)

    def test_symlink_file(self):
        os.symlink("/etc/passwd", self.path("content/artikel/notenlesen/passwd.jpg"))
        found = self.assertFails("Symlinks sind nicht erlaubt")
        self.assertEqual(len(found), 1)

    def test_symlink_dir(self):
        os.symlink(self.tmp, self.path("content/artikel/link"))
        found = self.assertFails("Symlinks sind nicht erlaubt")
        self.assertEqual(len(found), 1)

    def test_blocked_fields(self):
        for field, value in [("aliases", ["/alt/"]), ("url", "/"), ("layout", "x"),
                             ("outputs", ["json"]), ("Title", "x"), ("slug", "x"),
                             ("build", {"render": "never"}), ("cascade", {})]:
            with self.subTest(field=field):
                self.write("content/artikel/notenlesen/index.de.md", page(dict(ARTICLE, **{field: value})))
                found = self.assertFails("Feld %r ist nicht erlaubt" % field)
                self.assertEqual(len(found), 1)

    def test_foreign_shortcode(self):
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "{{< youtube abc >}}\n"))
        found = self.assertFails("Shortcode 'youtube' ist nicht erlaubt")
        # Das schließende }} verletzt zusätzlich die }-Regel (Pages CMS).
        self.assertEqual(len(found), 2, found)

    # Weitere Shortcode-Fälle

    def test_shortcode_in_code_block_and_percent_form(self):
        self.write("content/artikel/notenlesen/index.de.md",
                   page(ARTICLE, "```\n{{% details %}}x{{% /details %}}\n```\n"))
        found = self.assertFails("Shortcode 'details' ist nicht erlaubt")
        self.assertEqual(sum("Shortcode" in msg for _, msg in found), 2, found)

    def test_escaped_shortcode_is_still_rejected(self):
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "{{</* youtube x */>}}\n"))
        self.assertFails("Shortcode")

    def test_allowlisted_shortcode_is_not_reported(self):
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "{{< hinweis >}}\n"))
        found = self.violations(shortcodes={"hinweis"})
        self.assertFalse([m for _, m in found if "Shortcode" in m], found)
        # Mit Pages CMS bleibt die }-Regel bestehen: Dateien mit Shortcodes
        # könnte das CMS nicht öffnen.
        self.assertEqual(len(found), 1, found)
        self.assertIn("'}' im Text", found[0][1])

    # Kopfbereich

    def test_missing_and_empty_title(self):
        self.write("content/artikel/notenlesen/index.de.md", page({"date": "2026-10-05"}))
        self.assertFails("Pflichtfeld 'title' fehlt")
        self.write("content/artikel/notenlesen/index.de.md", page({"title": "  "}))
        self.assertFails("'title' muss ein nicht leerer Text sein")

    def test_wrong_types(self):
        for field, value, expected in [("draft", "false", "'draft' muss true oder false sein"),
                                       ("title", 5, "'title' muss"),
                                       ("date", "05.10.2026", "'date' muss ein Datum"),
                                       ("date", "2026-13-45", "'date' muss ein Datum"),
                                       ("description", ["x"], "'description' muss Text sein")]:
            with self.subTest(field=field, value=value):
                self.write("content/artikel/notenlesen/index.de.md", page(dict(ARTICLE, **{field: value})))
                self.assertFails(expected)

    def test_optional_fields_may_be_empty(self):
        for fields in [{"title": "x", "date": ""}, {"title": "x", "date": None},
                       {"title": "x", "description": None}, {"title": "x", "date": "2026-10-05T10:00:00+02:00"},
                       {"title": "x", "date": "2026-10-05T10:00:00Z"}]:
            with self.subTest(fields=fields):
                self.write("content/artikel/notenlesen/index.de.md", page(fields))
                self.assertPasses()

    def test_yaml_front_matter(self):
        self.write("content/artikel/notenlesen/index.de.md", "---\ntitle: x\n---\nText\n")
        self.assertFails("Kopfbereich fehlt")

    def test_invalid_json(self):
        self.write("content/artikel/notenlesen/index.de.md", '{\n  "title": "x",\n}\nText\n')
        self.assertFails("kein gültiges JSON")

    def test_duplicate_key(self):
        self.write("content/artikel/notenlesen/index.de.md", '{"title": "a", "title": "b"}\nText\n')
        self.assertFails("doppeltes Feld 'title'")

    def test_nan(self):
        self.write("content/artikel/notenlesen/index.de.md", '{"title": "a", "draft": NaN}\nText\n')
        self.assertFails("NaN ist in JSON nicht erlaubt")

    def test_front_matter_needs_newline(self):
        self.write("content/artikel/notenlesen/index.de.md", '{"title": "a"}Text\n')
        self.assertFails("neue Zeile")

    def test_missing_final_newline_is_fine(self):
        # So speichert Pages CMS.
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "Text ohne Zeilenende"))
        self.assertPasses()

    def test_crlf_nul_bom_and_bad_utf8(self):
        for data, expected in [(page(ARTICLE).replace("\n", "\r\n"), "Windows-Zeilenenden"),
                               (page(ARTICLE, "a\x00b\n"), "NUL"),
                               ("﻿" + page(ARTICLE), "Kopfbereich fehlt"),
                               (page(ARTICLE).encode("utf-8") + b"\xff\xfe", "kein gültiges UTF-8")]:
            with self.subTest(expected=expected):
                self.write("content/artikel/notenlesen/index.de.md", data)
                self.assertFails(expected)

    def test_closing_brace_in_body(self):
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "Text\n\nMenge {a, b}\n"))
        found = self.assertFails("Zeile 9: '}' im Text")
        self.assertEqual(len(found), 1)

    # Bilder

    def test_wrong_signature(self):
        self.write("content/artikel/notenlesen/system.jpg", png_bytes())
        self.assertFails("passt nicht zur Endung .jpg")
        self.write("content/artikel/notenlesen/system.jpg", b"MZ\x90\x00 kein Bild")
        self.assertFails("passt nicht zur Endung .jpg")

    def test_image_too_large_bytes(self):
        self.write("content/artikel/notenlesen/system.jpg", jpeg_bytes() + b"\x00" * (2 * 1024 * 1024))
        self.assertFails("Bild zu groß")

    def test_text_too_large(self):
        self.write("content/artikel/notenlesen/index.de.md", page(ARTICLE, "x" * (201 * 1024)))
        self.assertFails("Text zu groß")

    def test_too_many_pixels(self):
        for name, big in [("skizze.png", png_bytes(9000, 10)),
                          ("system.jpg", jpeg_bytes(7000, 7000)),
                          ("foto.webp", webp_lossless_bytes(16000, 2))]:
            with self.subTest(name=name):
                self.reset()
                self.write("content/artikel/notenlesen/" + name, big)
                found = self.assertFails("Bild zu groß")
                self.assertEqual(len(found), 1, found)

    def test_animated_images(self):
        actl = struct.pack(">I", 8) + b"acTL" + b"\x00" * 8 + b"\x00\x00\x00\x00"
        self.write("content/artikel/notenlesen/skizze.png", png_bytes(extra_chunks=actl))
        self.assertFails("animierte Bilder")
        self.write("content/artikel/notenlesen/skizze.png", png_bytes())
        self.write("content/artikel/notenlesen/foto.webp", webp_animated_bytes())
        self.assertFails("animierte Bilder")

    def test_empty_file(self):
        self.write("content/artikel/notenlesen/system.jpg", b"")
        self.assertFails("Datei ist leer")

    # Namen und Orte

    def test_bad_names(self):
        for rel, expected in [("content/artikel/notenlesen/Bild.jpg", "Bildname"),
                              ("content/artikel/notenlesen/mein_bild.png", "Bildname"),
                              ("content/artikel/notenlesen/bild.jpeg", "Bildname"),
                              ("content/artikel/notenlesen/index.fr.md", "Textdateien heißen"),
                              ("content/artikel/notenlesen/readme.md", "Textdateien heißen"),
                              ("content/artikel/Über/index.de.md", "Ordnername"),
                              ("content/artikel/mit leerzeichen/index.de.md", "Ordnername")]:
            with self.subTest(rel=rel):
                data = jpeg_bytes() if rel.endswith((".jpg", ".png", ".jpeg")) else page(ARTICLE)
                self.reset()
                self.write(rel, data)
                found = self.assertFails(expected)
                self.assertEqual(len(found), 1, found)

    def test_hidden_files(self):
        self.write("content/artikel/notenlesen/.DS_Store", b"\x00\x00")
        self.assertFails("versteckte")
        os.remove(self.path("content/artikel/notenlesen/.DS_Store"))
        self.write("content/.hugo/x.md", page(ARTICLE))
        self.assertFails("versteckte")

    def test_extra_files_in_repo_root(self):
        for rel in ("README.md", "cms.config.json", ".github/workflows/x.yml", "static/x.js"):
            with self.subTest(rel=rel):
                self.write(rel, "x")
                self.assertFails("neben content/ ist nur .pages.yml erlaubt")
                top = rel.split("/")[0]
                full = self.path(top)
                shutil.rmtree(full) if os.path.isdir(full) else os.remove(full)

    def test_cms_config_too_large(self):
        self.write(".pages.yml", "#" * (65 * 1024))
        self.assertFails("Konfiguration zu groß")

    def test_index_in_content_root(self):
        self.write("content/index.de.md", page(ARTICLE))
        self.assertFails("im Wurzelordner sind nur _index")

    def test_index_and_branch_index_mixed(self):
        self.write("content/artikel/notenlesen/_index.de.md", page(ARTICLE))
        self.assertFails("nicht im selben Ordner")

    def test_missing_content_dir(self):
        shutil.rmtree(self.path("content"))
        self.assertFails("Ordner content/ fehlt")


QUIZ = {"title": "Intervalle", "description": "Kurz",
        "fragen": [{"frage": "Wie viele Halbtöne hat eine große Terz?", "antworten": ["3", "4"], "richtig": 2,
                    "erklaerung": "C – E"}]}


class QuizSchemaTest(CheckContentTest):
    """Quiz-Seiten dürfen zusätzlich "fragen" haben – mit festem Aufbau."""

    def setUp(self):
        super().setUp()
        self.write("content/quiz/_index.de.md", page({"title": "Quiz"}))
        self.write("content/quiz/intervalle/index.de.md", page(QUIZ))

    def set_quiz(self, **changes):
        quiz = json.loads(json.dumps(QUIZ))
        quiz.update(changes)
        self.write("content/quiz/intervalle/index.de.md", page(quiz))

    def set_question(self, **changes):
        q = dict(QUIZ["fragen"][0], **changes)
        self.set_quiz(fragen=[{k: v for k, v in q.items() if v is not None}])

    def test_valid_quiz_passes(self):
        self.assertPasses()

    def test_optional_explanation(self):
        self.set_question(erklaerung=None)
        self.assertPasses()

    def test_quiz_needs_questions(self):
        quiz = dict(QUIZ)
        del quiz["fragen"]
        self.write("content/quiz/intervalle/index.de.md", page(quiz))
        self.assertFails("Pflichtfeld 'fragen' fehlt")

    def test_questions_only_on_quiz_pages(self):
        self.write("content/artikel/notenlesen/index.de.md", page(dict(ARTICLE, fragen=QUIZ["fragen"])))
        self.assertFails("Feld 'fragen' ist nicht erlaubt")

    def test_invalid_questions(self):
        for change, expected in [({"fragen": []}, "Liste mit 1 bis"),
                                 ({"fragen": "Frage?"}, "Liste mit 1 bis"),
                                 ({"fragen": ["Frage?"]}, "muss ein Objekt sein")]:
            with self.subTest(change=change):
                self.reset()
                self.write("content/quiz/intervalle/index.de.md", page(dict(QUIZ, **change)))
                self.assertFails(expected)

    def test_invalid_question_fields(self):
        for change, expected in [({"richtig": 3}, "'richtig' muss"),
                                 ({"richtig": 0}, "'richtig' muss"),
                                 ({"richtig": True}, "'richtig' muss"),
                                 ({"richtig": "2"}, "'richtig' muss"),
                                 ({"antworten": ["nur eine"]}, "'antworten' muss"),
                                 ({"antworten": ["a", "b", "c", "d", "e", "f", "g"]}, "'antworten' muss"),
                                 ({"antworten": ["a", ""]}, "'antworten' muss"),
                                 ({"frage": " "}, "'frage' muss"),
                                 ({"erklaerung": 5}, "'erklaerung' muss"),
                                 ({"bild": "x.jpg"}, "Feld 'bild' ist nicht erlaubt")]:
            with self.subTest(change=change):
                self.reset()
                self.set_question(**change)
                self.assertFails(expected)

    def test_reserved_folder(self):
        self.write("content/quiz/klanglabor/index.de.md", page(QUIZ))
        self.assertFails("ist reserviert")


class RealContentTest(unittest.TestCase):
    """Das echte Inhalts-Repository neben diesem Repository muss bestehen."""

    def test_real_content_repo(self):
        repo = os.path.abspath(os.path.join(HERE, "..", "..", "..", "museprep-content"))
        if not os.path.isdir(repo):
            self.skipTest("museprep-content liegt nicht neben museprep-website")
        report = cc.check_repository(repo, cc.load_allowlist(os.path.join(HERE, "..", "allowlist.json")))
        self.assertEqual(report.violations, [])


class CommandLineTest(unittest.TestCase):

    def test_exit_codes(self):
        tmp = tempfile.mkdtemp()
        try:
            os.makedirs(os.path.join(tmp, "content"))
            with open(os.path.join(tmp, "content", "_index.de.md"), "w", encoding="utf-8") as f:
                f.write(page({"title": "x"}))
            out = io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
                self.assertEqual(cc.main([tmp]), 0)
                with open(os.path.join(tmp, "content", "x.svg"), "w") as f:
                    f.write("<svg/>")
                self.assertEqual(cc.main([tmp]), 1)
                self.assertEqual(cc.main([os.path.join(tmp, "gibt-es-nicht")]), 2)
            self.assertIn("content/x.svg: Dateityp nicht erlaubt", out.getvalue())
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
