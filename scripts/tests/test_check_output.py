"""Testfälle für scripts/check-output.py.

Jeder Test baut einen kleinen, gültigen public/-Ordner, ändert genau eine
Sache und erwartet, dass die Prüfung genau daran scheitert.

Aufruf: python3 -m unittest discover -s scripts/tests
"""

import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "check-output.py")
WEBSITE = os.path.abspath(os.path.join(HERE, "..", ".."))

spec = importlib.util.spec_from_file_location("check_output", SCRIPT)
co = importlib.util.module_from_spec(spec)
spec.loader.exec_module(co)

DOMAINS = ["youtube.com", "www.youtube.com", "youtu.be"]

PAGE = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Test</title>
<link rel="canonical" href="https://museprep.com/">
<link rel="stylesheet" href="/css/main.css">
<link rel="preload" href="/fonts/text.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="/images/icon.png">
</head>
<body>
<header><a href="/"><img src="/images/logo.webp" alt="MusePrep"></a></header>
<main>
<p><a href="/artikel/">Artikel</a> · <a href="artikel/notenlesen/">relativ</a> · <a href="#oben">Anker</a></p>
<p><a href="https://www.youtube.com/@MusePrep" rel="noopener">YouTube</a> · <a href="mailto:info@example.org">Mail</a></p>
<img src="/artikel/notenlesen/bild.webp" srcset="/artikel/notenlesen/bild.webp 480w, https://museprep.com/artikel/notenlesen/bild.webp 800w" alt="">
{extra}
</main>
</body>
</html>
"""


class CheckOutputTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="check-output-")
        self.public = os.path.join(self.tmp, "public")
        self.page("")
        self.write("artikel/index.html", "<!doctype html><title>Artikel</title><a href=\"../\">Start</a>")
        self.write("artikel/notenlesen/index.html", "<!doctype html><title>N</title><a href=../../artikel/>zurück</a>")
        self.write("artikel/notenlesen/bild.webp", b"RIFF\x00\x00\x00\x00WEBP")
        self.write("css/main.css", "@font-face{src:url(/fonts/text.woff2) format('woff2')}"
                                   "body{background:url('../images/logo.webp')}")
        self.write("fonts/text.woff2", b"wOF2")
        self.write("images/logo.webp", b"RIFF\x00\x00\x00\x00WEBP")
        self.write("images/icon.png", b"\x89PNG\r\n\x1a\n")
        self.write("index.xml", "<rss/>")
        self.write("sitemap.xml", "<urlset/>")
        self.write("robots.txt", "User-agent: *\n")
        self.write(".htaccess", "Options -Indexes\n")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def reset(self):
        self.tearDown()
        self.setUp()

    def write(self, rel, data):
        full = os.path.join(self.public, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb" if isinstance(data, bytes) else "w") as f:
            f.write(data)

    def page(self, extra):
        self.write("index.html", PAGE.replace("{extra}", extra))

    def report(self, elements=(), require_htaccess=True):
        site = co.Site(self.public, "https://museprep.com/", DOMAINS, list(elements))
        return co.check_site(site, require_htaccess)

    def assertFails(self, expected, count=1, **kw):
        found = self.report(**kw).violations
        self.assertTrue(any(expected in msg for _, msg in found),
                        "erwartet %r, gefunden: %r" % (expected, found))
        if count is not None:
            self.assertEqual(len(found), count, found)
        return found

    # Ausgangslage

    def test_valid_site_passes(self):
        report = self.report()
        self.assertEqual(report.violations, [])
        self.assertEqual(report.external_links, {"https://www.youtube.com/@MusePrep"})

    # Abnahme Paket 4: Skript in Vorlage, fremde Bildquelle, nicht erlaubte Domain

    def test_script_in_template(self):
        self.page("<script>alert(1)</script>")
        self.assertFails("<script> ist nicht erlaubt")

    def test_foreign_image_source(self):
        self.page('<img src="https://evil.example/pixel.png" alt="">')
        self.assertFails("Ressource von fremder Adresse: https://evil.example/pixel.png")

    def test_link_to_not_allowed_domain(self):
        self.page('<a href="https://example.org/">woanders</a>')
        self.assertFails("Link zu nicht erlaubter Domain 'example.org'")

    # Elemente

    def test_guarded_elements(self):
        for html, tag in [('<iframe src="/"></iframe>', "iframe"),
                          ('<object data="/images/logo.webp"></object>', "object"),
                          ('<embed src="/images/logo.webp">', "embed"),
                          ('<form action="/"><input name="q"></form>', "form"),
                          ('<script src="/js/app.js"></script>', "script")]:
            with self.subTest(tag=tag):
                self.reset()
                self.page(html)
                self.assertFails("<%s> ist nicht erlaubt" % tag, count=None)

    def test_allowlisted_element(self):
        self.write("js/app.js", "")
        allowed = [{"tag": "script", "attrs": {"src": "/js/app.js", "defer": ""}}]
        self.page('<script src="/js/app.js" defer></script>')
        # .js ist als Dateityp nicht freigegeben – das Element selbst aber schon.
        found = self.report(elements=allowed).violations
        self.assertEqual([m for _, m in found if "<script>" in m], [])
        self.page('<script src="/js/app.js"></script>')
        self.assertFails("<script> ist nicht erlaubt", count=None, elements=allowed)
        self.page('<script src="/js/app.js" defer>alert(1)</script>')
        self.assertFails("<script> mit Inline-Inhalt", count=None, elements=allowed)

    def test_allowlisted_element_with_patterns(self):
        js = "quiz/klanglabor.min." + "a" * 64 + ".js"
        self.write(js, "")
        allowed = [{"tag": "script", "attrs": {"src": "^/quiz/klanglabor\\.min\\.[0-9a-f]{64}\\.js$",
                                               "integrity": "^sha256-[A-Za-z0-9+/]{43}=$", "defer": ""}}]
        ok = '<script src="/%s" integrity="sha256-%s=" defer></script>' % (js, "B" * 43)
        self.page(ok)
        self.assertEqual(self.report(elements=allowed).violations, [])
        for html in ('<script src="/quiz/klanglabor.min.%s.js" integrity="sha256-%s=" defer></script>' % ("z" * 64, "B" * 43),
                     '<script src="/%s" integrity="sha256-%s=" defer type="module"></script>' % (js, "B" * 43),
                     '<script src="/%s" defer></script>' % js,
                     '<script src="/%s" integrity="sha256-%s=" defer>alert(1)</script>' % (js, "B" * 43)):
            with self.subTest(html=html):
                self.page(html)
                self.assertFails("<script>", count=None, elements=allowed)

    def test_javascript_only_in_quiz(self):
        self.write("quiz/app.js", "")
        self.assertEqual(self.report().violations, [])
        self.write("js/app.js", "")
        self.assertFails("JavaScript nur unter /quiz/")

    def test_style_and_base(self):
        for html, expected in [('<p style="color:red">x</p>', "style-Attribut"),
                               ("<style>p{color:red}</style>", "<style> ist nicht erlaubt"),
                               ('<base href="https://evil.example/">', "<base> ist nicht erlaubt"),
                               ('<meta http-equiv="refresh" content="0;url=/">', "http-equiv=\"refresh\"")]:
            with self.subTest(expected=expected):
                self.reset()
                self.page(html)
                self.assertFails(expected, count=None)

    # Attribute und Adressen

    def test_event_handler_attributes(self):
        for html in ('<img src="/images/logo.webp" onerror="alert(1)" alt="">',
                     '<a href="/" ONCLICK="alert(1)">x</a>',
                     '<details ontoggle=alert(1)>x</details>'):
            with self.subTest(html=html):
                self.reset()
                self.page(html)
                self.assertFails("ist nicht erlaubt")

    def test_javascript_urls(self):
        for html in ('<a href="javascript:alert(1)">x</a>',
                     '<a href=" JaVa\tScRiPt:alert(1)">x</a>',
                     '<a href="&#106;avascript:alert(1)">x</a>',
                     '<a href="vbscript:msgbox">x</a>',
                     '<button formaction="javascript:alert(1)">x</button>',
                     '<div title="javascript:alert(1)">x</div>'):
            with self.subTest(html=html):
                self.reset()
                self.page(html)
                self.assertFails("script:", count=None)

    def test_data_urls(self):
        self.page('<img src="data:image/png;base64,iVBORw0KGgo=" alt="">')
        self.assertFails("data:-Adresse")

    def test_foreign_resources(self):
        for html, expected in [('<link rel="stylesheet" href="https://cdn.example/x.css">', "fremder Adresse"),
                               ('<img srcset="/images/logo.webp 1x, https://evil.example/2x.png 2x" alt="">', "fremder Adresse"),
                               ('<img src="//evil.example/x.png" alt="">', "protokollrelative"),
                               ('<img src="http://museprep.com/images/logo.webp" alt="">', "fremder Adresse"),
                               ('<video poster="https://evil.example/p.jpg"></video>', "fremder Adresse")]:
            with self.subTest(html=html):
                self.reset()
                self.page(html)
                self.assertFails(expected)

    def test_foreign_resources_in_css(self):
        for css, expected in [("@font-face{src:url(https://fonts.gstatic.com/x.woff2)}", "fremder Adresse"),
                              ("@import url('https://fonts.googleapis.com/css2?family=X');", "fremder Adresse"),
                              ("body{background:url(data:image/png;base64,AAAA)}", "data:-Adresse")]:
            with self.subTest(css=css):
                self.reset()
                self.write("css/main.css", css)
                self.assertFails(expected, count=None)

    def test_subdomain_is_not_allowed_automatically(self):
        self.page('<a href="https://music.youtube.com/">x</a>')
        self.assertFails("nicht erlaubter Domain 'music.youtube.com'")

    def test_own_absolute_links_are_internal(self):
        self.page('<a href="https://museprep.com/artikel/">x</a>')
        self.assertEqual(self.report().violations, [])

    # Interne Ziele

    def test_broken_internal_links(self):
        for html in ('<a href="/gibt-es-nicht/">x</a>',
                     '<img src="/artikel/notenlesen/original.jpg" alt="">',
                     '<a href="https://museprep.com/alt/">x</a>',
                     '<a href="../../../etc/passwd">x</a>'):
            with self.subTest(html=html):
                self.reset()
                self.page(html)
                self.assertFails("existiert nicht")

    def test_broken_css_reference(self):
        self.write("css/main.css", "@font-face{src:url(/fonts/fehlt.woff2)}")
        self.assertFails("existiert nicht")

    # Dateien

    def test_forbidden_file_types(self):
        for rel, expected in [("info.php", "Dateityp '.php'"),
                              ("artikel/notenlesen/original.jpg", "Dateityp '.jpg'"),
                              ("artikel/notenlesen/skizze.png", "PNG nur unter /images/"),
                              ("cgi-bin/run", "Dateityp 'run'"),
                              ("artikel/.env", "versteckte Datei")]:
            with self.subTest(rel=rel):
                self.reset()
                self.write(rel, "x")
                self.assertFails(expected)

    def test_missing_htaccess(self):
        os.remove(os.path.join(self.public, ".htaccess"))
        self.assertFails(".htaccess fehlt")
        self.assertEqual(self.report(require_htaccess=False).violations, [])

    def test_symlink(self):
        os.symlink("/etc/passwd", os.path.join(self.public, "passwd.txt"))
        self.assertFails("Symlinks sind nicht erlaubt")

    # Kommandozeile

    def test_command_line_outputs(self):
        manifest = os.path.join(self.tmp, "manifest.json")
        links = os.path.join(self.tmp, "links.txt")
        allowlist = os.path.join(self.tmp, "allowlist.json")
        with open(allowlist, "w") as f:
            json.dump({"shortcodes": [], "external_domains": DOMAINS, "elements": []}, f)
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = co.main([self.public, "--allowlist", allowlist, "--require-htaccess",
                            "--manifest-out", manifest, "--links-out", links])
            self.assertEqual(code, 0, out.getvalue())
            self.page("<script>x</script>")
            self.assertEqual(co.main([self.public, "--allowlist", allowlist]), 1)
            self.assertEqual(co.main([os.path.join(self.tmp, "fehlt")]), 2)
        with open(manifest) as f:
            data = json.load(f)
        self.assertIn("index.html", data)
        self.assertEqual(len(data["index.html"]), 64)
        with open(links) as f:
            self.assertEqual(f.read(), "https://www.youtube.com/@MusePrep\n")


class RealBuildTest(unittest.TestCase):
    """Der echte Hugo-Build mit dem Inhalts-Repository muss bestehen."""

    def test_real_build(self):
        hugo = os.path.join(WEBSITE, ".bin", "hugo")
        content = os.path.abspath(os.path.join(WEBSITE, "..", "museprep-content", "content"))
        if not (os.path.isfile(hugo) and os.path.isdir(content)):
            self.skipTest("Hugo oder museprep-content fehlt")
        tmp = tempfile.mkdtemp(prefix="real-build-")
        try:
            subprocess.run([hugo, "--source", WEBSITE, "--contentDir", content, "--destination", tmp,
                            "--minify", "--panicOnWarning", "--quiet", "--noBuildLock"], check=True)
            domains, elements = co.load_allowlist(os.path.join(HERE, "..", "allowlist.json"))
            report = co.check_site(co.Site(tmp, "https://museprep.com/", domains, elements))
            self.assertEqual(report.violations, [])
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
