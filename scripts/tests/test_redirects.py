"""Prüft die 301-Weiterleitungen in static/.htaccess gegen die alten Adressen.

- Jede Adresse aus tools/old-urls.txt trifft eine Regel (die erste passende gilt,
  wie bei Apache mod_alias).
- 301-Ziele existieren im fertigen Build und werden nicht erneut umgeleitet.
- Keine Adresse der neuen Seite wird von einer Regel erfasst.

Baut die Seite dafür mit Hugo in einen temporären Ordner (wird übersprungen,
wenn Hugo oder das Inhalts-Repository fehlen).
"""

import os
import re
import shutil
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.abspath(os.path.join(HERE, "..", ".."))
HTACCESS = os.path.join(WEBSITE, "static", ".htaccess")
OLD_URLS = os.path.join(WEBSITE, "tools", "old-urls.txt")
CONTENT = os.path.abspath(os.path.join(WEBSITE, "..", "museprep-content", "content"))
HUGO = os.path.join(WEBSITE, ".bin", "hugo")

RULE = re.compile(r"^RedirectMatch\s+(\d{3})\s+(\S+)(?:\s+(\S+))?\s*$")

# Alte Adressen, die die neue Seite selbst ausliefert (keine Weiterleitung nötig).
SERVED_DIRECTLY = {"/"}


def load_rules():
    rules = []
    with open(HTACCESS, encoding="utf-8") as f:
        for number, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.split()[0] in ("Redirect", "RedirectPermanent", "RewriteRule"):
                raise AssertionError("Zeile %d: nur RedirectMatch verwenden: %s" % (number, line))
            m = RULE.match(line)
            if m:
                rules.append((int(m.group(1)), re.compile(m.group(2)), m.group(3), number))
    return rules


def first_match(rules, path):
    for status, pattern, target, number in rules:
        m = pattern.search(path)
        if m:
            if target:
                target = re.sub(r"\$(\d)", lambda g: m.group(int(g.group(1))) or "", target)
            return status, target, number
    return None


def old_paths():
    with open(OLD_URLS, encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.startswith("#")]


def site_paths(public):
    """Alle Adressen der neuen Seite: Ordner mit index.html und alle Dateien."""
    paths = set()
    for dirpath, _, files in os.walk(public):
        rel = "/" + os.path.relpath(dirpath, public).replace(os.sep, "/").lstrip(".").strip("/")
        for name in files:
            path = (rel.rstrip("/") + "/" + name)
            paths.add(path)
            if name == "index.html":
                paths.add(rel if rel.endswith("/") else rel + "/")
    return paths


def exists(public, target):
    path = target.split("#")[0].split("?")[0]
    full = os.path.join(public, path.lstrip("/"))
    if path.endswith("/"):
        return os.path.isfile(os.path.join(full, "index.html"))
    return os.path.isfile(full)


class RedirectRulesTest(unittest.TestCase):

    def test_every_old_url_is_covered(self):
        rules = load_rules()
        missing = [p for p in old_paths() if p not in SERVED_DIRECTLY and not first_match(rules, p)]
        self.assertEqual(missing, [])

    def test_posts_and_old_slugs_go_to_articles(self):
        rules = load_rules()
        cases = {
            "/what-is-the-circle-of-fifths/": "/en/articles/what-is-the-circle-of-fifths/",
            "/what-is-the-circle-of-fifths": "/en/articles/what-is-the-circle-of-fifths/",
            "/2025/05/10/musical-staff-basics/": "/en/articles/musical-staff-basics/",
            "/2025/05/10/musical-staff-beginners-guide/": "/en/articles/musical-staff-basics/",
            "/natural-sign-in-music-your-complete-guide-to-understanding-musical-notation/":
                "/en/articles/natural-sign-in-music/",
            "/major-scale/feed/": "/en/articles/major-scale/",
            "/category/learn/theory-basics/": "/en/articles/",
            "/legal-policies/privacy-policy-2/": "/en/datenschutz/",
            "/deutsch-lernen/": "/",
            "/sitemap_index.xml": "/sitemap.xml",
        }
        for path, target in cases.items():
            with self.subTest(path=path):
                self.assertEqual(first_match(rules, path)[:2], (301, target))
        # ähnliche, aber längere Slugs dürfen nicht auf den kürzeren fallen
        self.assertEqual(first_match(rules, "/major-scale-steps/")[1], "/en/articles/major-scale-steps/")
        self.assertEqual(first_match(rules, "/wp-login.php")[0], 410)
        self.assertEqual(first_match(rules, "/wp-content/uploads/2025/04/x.png")[0], 410)


class RedirectTargetsTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not (os.path.isfile(HUGO) and os.path.isdir(CONTENT)):
            raise unittest.SkipTest("Hugo oder museprep-content fehlt")
        cls.public = tempfile.mkdtemp(prefix="redirects-")
        subprocess.run([HUGO, "--source", WEBSITE, "--contentDir", CONTENT, "--destination", cls.public,
                        "--minify", "--quiet", "--noBuildLock"], check=True)
        cls.rules = load_rules()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.public)

    def test_targets_exist_and_are_final(self):
        problems = []
        for path in old_paths():
            match = first_match(self.rules, path)
            if match is None:
                if not exists(self.public, path):
                    problems.append("%s: keine Regel und nicht auf der neuen Seite" % path)
                continue
            status, target, number = match
            if status != 301:
                continue
            if not exists(self.public, target):
                problems.append("%s → %s (Zeile %d): Ziel fehlt" % (path, target, number))
            elif first_match(self.rules, target):
                problems.append("%s → %s: Ziel wird erneut umgeleitet" % (path, target))
        self.assertEqual(problems, [])

    def test_new_site_is_not_redirected(self):
        paths = site_paths(self.public)
        self.assertGreater(len(paths), 100, "Build scheint leer")
        hits = sorted("%s (Zeile %d)" % (p, first_match(self.rules, p)[2])
                      for p in paths if first_match(self.rules, p))
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
