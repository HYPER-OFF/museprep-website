#!/usr/bin/env python3
"""Ausgangsprüfung für die fertig gebaute Website (public/).

Liest jedes HTML- und CSS-Dokument, bevor etwas hochgeladen wird. Jede Regel
bricht den Lauf ab; gemeldet werden alle Verstöße auf einmal.

Aufruf:
  check-output.py public/ [--base-url https://museprep.com/]
                  [--allowlist scripts/allowlist.json] [--require-htaccess]
                  [--manifest-out datei.json] [--links-out datei.txt]
Ergebnis: Exit 0 = bestanden, 1 = Verstöße, 2 = Aufruf- oder Konfigurationsfehler

Regeln:
- script, iframe, object, embed, form nur in einer Form aus allowlist.json
  ("elements": Tag mit exakt diesen Attributen, ohne Inline-Inhalt; ein Wert,
  der mit ^ beginnt, ist ein regulärer Ausdruck für den ganzen Wert).
- Keine Attribute, die mit "on" beginnen; keine javascript:/vbscript:-Adressen;
  keine data:-Adressen; keine style-Attribute, kein <style>, kein <base>,
  kein <meta http-equiv="refresh">.
- Bilder, CSS, Schriften und Skripte nur von der eigenen Domain.
- Links nach außen nur zu Domains aus allowlist.json ("external_domains").
- Interne Links und Quellen müssen in public/ existieren.
- In public/ nur erlaubte Dateitypen.

Nur Python-Standardbibliothek, lauffähig ab Python 3.9.
"""

import argparse
import hashlib
import json
import os
import posixpath
import re
import stat
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

DEFAULT_BASE_URL = "https://museprep.com/"

GUARDED_ELEMENTS = {"script", "iframe", "object", "embed", "form"}
FORBIDDEN_ELEMENTS = {"style": "<style> ist nicht erlaubt (CSP: keine Inline-Styles)",
                      "base": "<base> ist nicht erlaubt"}

# Attribute, deren Wert eine Adresse ist.
URL_ATTRS = {"href", "src", "srcset", "action", "formaction", "poster", "cite", "background",
             "data", "manifest", "ping", "xlink:href", "longdesc", "usemap", "icon",
             "codebase", "archive", "lowsrc", "dynsrc", "imagesrcset"}
NAVIGATION = {("a", "href"), ("area", "href")}
LINK_SCHEMES = {"mailto", "tel"}

ALLOWED_EXTENSIONS = {".html", ".xml", ".css", ".woff2", ".webp", ".txt"}
PNG_DIR = "images/"          # nur Icons aus assets/images
JS_DIR = "quiz/"             # nur das Klanglabor
ROOT_DOTFILES = {".htaccess"}

CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE | re.DOTALL)
CSS_IMPORT = re.compile(r"@import\s+(?:url\()?\s*['\"]?([^'\")\s;]+)", re.IGNORECASE)
SCHEME = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):")


class Report:
    def __init__(self):
        self.violations = []
        self.external_links = set()
        self.checked = 0
        self.files = []

    def add(self, where, message):
        self.violations.append((where, message))


def scheme_of(value):
    # Browser ignorieren Leer- und Steuerzeichen in Adressen ("java\tscript:").
    cleaned = re.sub(r"[\x00-\x20\x7f]", "", value)
    m = SCHEME.match(cleaned)
    return m.group(1).lower() if m else None


class Site:
    def __init__(self, public, base_url, external_domains, elements):
        self.public = os.path.abspath(public)
        base = urlsplit(base_url)
        self.base_scheme = base.scheme
        self.base_host = (base.hostname or "").lower()
        self.external_domains = {d.lower() for d in external_domains}
        self.elements = elements

    def is_own(self, url):
        parts = urlsplit(url)
        return parts.scheme == self.base_scheme and (parts.hostname or "").lower() == self.base_host \
            and parts.port is None

    def exists(self, page_rel, url):
        """Gibt es das Ziel einer internen Adresse in public/?"""
        path = unquote(urlsplit(url).path)
        if not path:
            return True
        if path.startswith("/"):
            target = posixpath.normpath(path)
        else:
            target = posixpath.normpath(posixpath.join(posixpath.dirname("/" + page_rel), path))
        if target.startswith("/.."):
            return False
        if path.endswith("/") and not target.endswith("/"):
            target += "/"
        full = os.path.join(self.public, target.lstrip("/"))
        if target.endswith("/"):
            return os.path.isfile(os.path.join(full, "index.html"))
        return os.path.isfile(full) or os.path.isfile(os.path.join(full, "index.html"))


def check_url(site, report, where, page_rel, value, navigation):
    """Prüft eine Adresse; navigation=True für <a href>, sonst Ressource."""
    value = value.strip()
    if not value or value.startswith("#"):
        return
    scheme = scheme_of(value)
    if scheme in ("javascript", "vbscript"):
        report.add(where, "%s:-Adresse ist nicht erlaubt" % scheme)
        return
    if scheme == "data":
        report.add(where, "data:-Adresse ist nicht erlaubt")
        return
    if scheme is None and value.startswith("//"):
        report.add(where, "protokollrelative Adresse %r ist nicht erlaubt" % value)
        return
    if scheme is None:
        if not site.exists(page_rel, value):
            report.add(where, "internes Ziel %r existiert nicht" % value)
        return
    if scheme in ("http", "https"):
        if site.is_own(value):
            if not site.exists(page_rel, value):
                report.add(where, "internes Ziel %r existiert nicht" % value)
            return
        host = (urlsplit(value).hostname or "").lower()
        if not navigation:
            report.add(where, "Ressource von fremder Adresse: %s" % value)
        elif host not in site.external_domains:
            report.add(where, "Link zu nicht erlaubter Domain %r: %s" % (host, value))
        else:
            report.external_links.add(value)
        return
    if navigation and scheme in LINK_SCHEMES:
        return
    report.add(where, "Adressschema %r ist nicht erlaubt" % scheme)


def srcset_urls(value):
    for candidate in value.split(","):
        candidate = candidate.strip()
        if candidate:
            yield candidate.split()[0]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []          # (tag, attrs, zeile, index)
        self.inline = {}        # index -> Text in <script>/<iframe> …
        self._open = None

    def handle_starttag(self, tag, attrs):
        index = len(self.tags)
        self.tags.append((tag, attrs, self.getpos()[0], index))
        if tag in GUARDED_ELEMENTS:
            self._open = (tag, index)

    def handle_startendtag(self, tag, attrs):
        self.tags.append((tag, attrs, self.getpos()[0], len(self.tags)))

    def handle_endtag(self, tag):
        if self._open and self._open[0] == tag:
            self._open = None

    def handle_data(self, data):
        if self._open and data.strip():
            self.inline[self._open[1]] = self.inline.get(self._open[1], "") + data


def attr_matches(expected, actual):
    """Wert aus allowlist.json: exakt, oder als Muster, wenn er mit ^ beginnt."""
    if expected.startswith("^"):
        return re.fullmatch(expected, actual) is not None
    return expected == actual


def element_allowed(site, tag, attrs):
    form = {k: (v if v is not None else "") for k, v in attrs}
    for allowed in site.elements:
        expected = allowed.get("attrs", {})
        if (allowed.get("tag") == tag and set(expected) == set(form)
                and all(attr_matches(expected[k], form[k]) for k in form)):
            return True
    return False


def check_html(site, report, rel, text):
    parser = PageParser()
    parser.feed(text)
    parser.close()
    for tag, attrs, line, index in parser.tags:
        where = "%s:%d" % (rel, line)

        if tag in GUARDED_ELEMENTS:
            if not element_allowed(site, tag, attrs):
                report.add(where, "<%s> ist nicht erlaubt (nicht in allowlist.json)" % tag)
            elif index in parser.inline:
                report.add(where, "<%s> mit Inline-Inhalt ist nicht erlaubt" % tag)
        if tag in FORBIDDEN_ELEMENTS:
            report.add(where, FORBIDDEN_ELEMENTS[tag])
        if tag == "meta":
            equiv = dict(attrs).get("http-equiv", "") or ""
            if equiv.strip().lower() in ("refresh", "set-cookie"):
                report.add(where, '<meta http-equiv="%s"> ist nicht erlaubt' % equiv.lower())

        for name, value in attrs:
            if name.startswith("on"):
                report.add(where, "Attribut %r ist nicht erlaubt" % name)
                continue
            if name == "style":
                report.add(where, "style-Attribut ist nicht erlaubt (CSP)")
                continue
            if value is None:
                continue
            if name not in URL_ATTRS:
                if scheme_of(value) in ("javascript", "vbscript"):
                    report.add(where, "Attribut %r enthält eine %s:-Adresse" % (name, scheme_of(value)))
                continue
            navigation = (tag, name) in NAVIGATION
            urls = srcset_urls(value) if name in ("srcset", "imagesrcset") else [value]
            for url in urls:
                check_url(site, report, where, rel, url, navigation)


def check_css(site, report, rel, text):
    for m in CSS_URL.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        check_url(site, report, "%s:%d" % (rel, line), rel, m.group(2), False)
    for m in CSS_IMPORT.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        check_url(site, report, "%s:%d" % (rel, line), rel, m.group(1), False)


def walk_files(public):
    for dirpath, dirnames, filenames in os.walk(public, followlinks=False):
        for name in sorted(dirnames + filenames):
            full = os.path.join(dirpath, name)
            yield full, os.path.relpath(full, public).replace(os.sep, "/")
        dirnames.sort()


def check_site(site, require_htaccess=False):
    report = Report()
    files = report.files
    for full, rel in walk_files(site.public):
        mode = os.lstat(full).st_mode
        if stat.S_ISLNK(mode):
            report.add(rel, "Symlinks sind nicht erlaubt")
            continue
        if stat.S_ISDIR(mode):
            continue
        if not stat.S_ISREG(mode):
            report.add(rel, "nur normale Dateien sind erlaubt")
            continue
        files.append((full, rel))
        name = posixpath.basename(rel)
        ext = posixpath.splitext(name)[1].lower()
        if name.startswith("."):
            if rel not in ROOT_DOTFILES:
                report.add(rel, "versteckte Datei ist nicht erlaubt")
        elif ext == ".png":
            if not rel.startswith(PNG_DIR):
                report.add(rel, "PNG nur unter /%s (Inhaltsbilder werden als WebP ausgeliefert)" % PNG_DIR)
        elif ext == ".js":
            if not rel.startswith(JS_DIR):
                report.add(rel, "JavaScript nur unter /%s" % JS_DIR)
        elif ext not in ALLOWED_EXTENSIONS:
            report.add(rel, "Dateityp %r ist auf dem Webspace nicht erlaubt" % (ext or name))

    if require_htaccess and not os.path.isfile(os.path.join(site.public, ".htaccess")):
        report.add(".htaccess", ".htaccess fehlt (Sicherheits-Kopfzeilen und Weiterleitungen)")

    for full, rel in files:
        if rel.endswith((".html", ".css")):
            report.checked += 1
            with open(full, encoding="utf-8", errors="replace") as f:
                text = f.read()
            if rel.endswith(".html"):
                check_html(site, report, rel, text)
            else:
                check_css(site, report, rel, text)
    return report


def write_manifest(path, files):
    manifest = {}
    for full, rel in files:
        h = hashlib.sha256()
        with open(full, "rb") as f:
            for block in iter(lambda: f.read(65536), b""):
                h.update(block)
        manifest[rel] = h.hexdigest()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write("\n")


def load_allowlist(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    domains = data.get("external_domains")
    elements = data.get("elements")
    if not isinstance(domains, list) or not all(isinstance(d, str) for d in domains):
        raise ValueError("'external_domains' muss eine Liste von Domains sein")
    if not isinstance(elements, list) or not all(
            isinstance(e, dict) and isinstance(e.get("tag"), str)
            and isinstance(e.get("attrs", {}), dict) for e in elements):
        raise ValueError("'elements' muss eine Liste von {\"tag\": …, \"attrs\": {…}} sein")
    return domains, elements


def main(argv=None):
    here = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(description="Ausgangsprüfung für public/")
    parser.add_argument("public", help="Ausgabeordner von Hugo")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--allowlist", default=os.path.join(here, "allowlist.json"))
    parser.add_argument("--require-htaccess", action="store_true")
    parser.add_argument("--manifest-out")
    parser.add_argument("--links-out")
    args = parser.parse_args(argv)

    if not os.path.isdir(args.public):
        print("Ausgabeordner nicht gefunden: %s" % args.public, file=sys.stderr)
        return 2
    try:
        domains, elements = load_allowlist(args.allowlist)
    except (OSError, ValueError) as exc:
        print("Allowlist fehlerhaft (%s): %s" % (args.allowlist, exc), file=sys.stderr)
        return 2

    site = Site(args.public, args.base_url, domains, elements)
    report = check_site(site, args.require_htaccess)

    if args.manifest_out:
        write_manifest(args.manifest_out, report.files)
    if args.links_out:
        with open(args.links_out, "w", encoding="utf-8") as f:
            f.writelines(link + "\n" for link in sorted(report.external_links))

    if report.violations:
        count = len(report.violations)
        print("Ausgangsprüfung fehlgeschlagen – %d %s:" % (count, "Verstoß" if count == 1 else "Verstöße"))
        for where, message in sorted(report.violations):
            print("  %s: %s" % (where, message))
        return 1
    print("Ausgangsprüfung bestanden: %d Dokumente, %d Dateien, %d externe Links."
          % (report.checked, len(report.files), len(report.external_links)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
