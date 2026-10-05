#!/usr/bin/env python3
"""Einmalige Übertragung der WordPress-Beiträge von museprep.com.

Holt alle Beiträge über die WordPress-API, wandelt das HTML in Markdown um,
lädt auf Wunsch (--with-images) die Bilder, rechnet sie mit macOS `sips` auf
höchstens 1600 px um und schreibt je Beitrag content/artikel/<slug>/index.en.md ins Inhalts-Repository.
Dazu: Weiterleitungen in static/.htaccess, Liste der alten Adressen und ein
Bericht für die Durchsicht.

Nur lokal, nicht Teil des Builds. Python-Standardbibliothek + sips (macOS).

Aufruf (aus museprep-website/):
  tools/migrate-wordpress.py --content ../museprep-content/content \\
      [--posts posts.json] [--only slug1,slug2]
"""

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit, parse_qs, quote

SITE = "https://museprep.com"
API = SITE + "/wp-json/wp/v2"
USER_AGENT = "museprep-migration/1.0 (+https://museprep.com)"
OWN_HOSTS = {"museprep.com", "www.museprep.com"}
MAX_EDGE = 1600
MAX_BYTES = 2 * 1024 * 1024

# Alte Seiten → neue Ziele (Englisch, weil die alte Seite englisch war).
PAGE_TARGETS = {
    "start-here": "/en/",
    "about": "/en/",
    "free-downloads": "/en/",
    "entrance-exam-check": "/en/",
    "deutsch-lernen": "/",
}
# Frühere Namen umbenannter Beiträge → heutiger Slug. Von Hand geprüft
# (Titel und Datum). WordPress leitet einige davon heute anders weiter
# (siehe OLD_SLUG_WP_DIFFERS) – maßgeblich ist hier der passende Beitrag.
OLD_SLUGS = {
    "musical-staff-beginners-guide": "musical-staff-basics",
    "musical-notation-clefs-natural-notes": "musical-notation-basics",
    "5-romantic-era-composer-highlights-you-should-know": "romantic-era-composer",
    "enhancing-music-skills-with-half-steps-introduction-for-beginners": "enhancing-music-skills-with-half-steps",
    "learn-to-read-notes-mastering-pitches-in-treble-and-bass-clef": "learn-to-read-notes",
    "natural-sign-in-music-your-complete-guide-to-understanding-musical-notation": "natural-sign-in-music",
    "teaching-music-theory-without-a-textbook-creative-music-education": "teaching-music-theory-without-a-textbook",
    "understanding-accidentals-music-theory-your-complete-guide-to-sharps-and-flats": "accidentals-music-theory",
    "why-daily-music-challenges-boost-your-learning": "daily-music-challenges",
}
OLD_SLUG_WP_DIFFERS = {
    "musical-staff-beginners-guide": "definition-of-music-staff",
    "enhancing-music-skills-with-half-steps-introduction-for-beginners": "half-steps-and-whole-steps-in-music",
    "natural-sign-in-music-your-complete-guide-to-understanding-musical-notation": "accidentals-music-theory",
    "teaching-music-theory-without-a-textbook-creative-music-education": "music-theory-for-beginners",
}

LEGAL_TARGETS = {
    "privacy-policy-2": "/en/datenschutz/",
    "cookie-policy-eu": "/en/datenschutz/",
    "legal-notice": "/en/impressum/",
    "disclaimer": "/en/impressum/",
    "affiliate-disclosure": "/en/impressum/",
}

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "param", "source", "track", "wbr"}
SKIP = {"script", "style", "noscript", "head", "title", "link", "meta", "button", "svg",
        "nav", "input", "select", "textarea", "template", "option"}
BLOCK = {"p", "div", "section", "article", "main", "header", "footer", "aside", "figure",
         "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "table",
         "pre", "figcaption", "form", "fieldset", "details", "summary", "dl", "dt", "dd",
         "body", "html", "label", "iframe", "center"} | SKIP
HARD_BREAK = "\x00BR\x00"


# --- HTML-Baum ---------------------------------------------------------------

class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.children, self.parent = tag, attrs, [], parent

    def find_all(self, tag):
        for child in self.children:
            if isinstance(child, Node):
                if child.tag == tag:
                    yield child
                yield from child.find_all(tag)

    def text(self):
        return "".join(c if isinstance(c, str) else c.text() for c in self.children)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root", {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, {k: (v or "") for k, v in attrs}, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, {k: (v or "") for k, v in attrs}, self.cur))

    def handle_endtag(self, tag):
        node = self.cur
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse_html(source):
    builder = TreeBuilder()
    builder.feed(source)
    builder.close()
    return builder.root


# --- Hilfen ------------------------------------------------------------------

def slugify(value, limit=60):
    value = value.replace("ß", "ss").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:limit].strip("-") or "bild"


def plain(source):
    """HTML → einzeiliger Klartext."""
    text = re.sub(r"<[^>]+>", " ", source)
    text = html.unescape(text).replace(" ", " ")
    return re.sub(r"\s+", " ", text).strip()


def escape_text(s):
    s = s.replace(" ", " ")
    s = re.sub(r"\s+", " ", s)
    s = s.replace("\\", "\\\\")
    for ch in "*_[]`~":
        s = s.replace(ch, "\\" + ch)
    s = re.sub(r"&(?=#?[A-Za-z0-9]+;)", "&amp;", s)
    s = s.replace("<", "&lt;").replace(">", "&gt;")
    # Pages CMS liest den Kopfbereich bis zur letzten "}" – deshalb als Entity.
    s = s.replace("}", "&#125;").replace("{{", "&#123;&#123;")
    return s


LINE_START = re.compile(r"^(#{1,6}(\s|$)|[-+](\s|$)|=+\s*$|(\d+)([.)])(\s|$))")


def protect_line_starts(text):
    lines = []
    for line in text.split("\n"):
        m = LINE_START.match(line)
        if m:
            if m.group(4):
                line = m.group(4) + "\\" + line[len(m.group(4)):]
            else:
                line = "\\" + line
        lines.append(line)
    return "\n".join(lines)


def finish_inline(text):
    text = text.strip()
    while text.startswith(HARD_BREAK):
        text = text[len(HARD_BREAK):].lstrip()
    while text.endswith(HARD_BREAK):
        text = text[:-len(HARD_BREAK)].rstrip()
    text = re.sub(r"[ \t]*" + re.escape(HARD_BREAK) + r"[ \t]*", "\\\\\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return protect_line_starts(text)


def wrap(marker, inner):
    m = re.match(r"^(\s*)(.*?)(\s*)$", inner, re.S)
    lead, core, trail = m.groups()
    if not core.strip() or core.replace(HARD_BREAK, "").strip() == "":
        return inner
    return lead + marker + core + marker + trail


def escape_url(url):
    return url.replace(" ", "%20").replace("(", "%28").replace(")", "%29")


def indent(text, pad):
    return "\n".join((pad + line) if line else "" for line in text.split("\n"))


def youtube_target(src):
    u = urlsplit(src)
    if not (u.hostname or "").endswith(("youtube.com", "youtube-nocookie.com")):
        return None
    parts = u.path.strip("/").split("/")
    if len(parts) >= 2 and parts[0] == "embed":
        if parts[1] == "videoseries":
            lst = parse_qs(u.query).get("list", [""])[0]
            return "https://www.youtube.com/playlist?list=" + lst if lst else None
        return "https://www.youtube.com/watch?v=" + parts[1]
    return None


# --- Umwandlung eines Beitrags -----------------------------------------------

class Converter:
    def __init__(self, slug, slugs, report, with_images=False):
        self.slug = slug
        self.slugs = slugs
        self.report = report      # Liste von (art, text)
        self.images = {}          # Schlüssel → {"url", "alt", "name"}
        self.with_images = with_images
        self.skipped_images = 0

    def note(self, kind, text):
        self.report.append((kind, text))

    # Bilder

    @staticmethod
    def image_key(url):
        u = urlsplit(url)
        path = re.sub(r"-\d+x\d+(?=\.[A-Za-z]+$)", "", u.path)
        path = re.sub(r"-scaled(?=\.[A-Za-z]+$)", "", path)
        return (u.hostname or "") + path

    def register_image(self, url, alt):
        key = self.image_key(url)
        if key not in self.images:
            base = os.path.basename(urlsplit(url).path)
            base = re.sub(r"\.[A-Za-z0-9]+$", "", base)
            base = re.sub(r"-\d+x\d+$", "", base)
            base = re.sub(r"-scaled$", "", base)
            name = slugify("%s-%s" % (self.slug, base), limit=80)
            taken = {img["name"] for img in self.images.values()}
            candidate, n = name, 2
            while candidate in taken:
                candidate, n = "%s-%d" % (name, n), n + 1
            self.images[key] = {"url": url, "alt": alt, "name": candidate}
        return self.images[key]

    @staticmethod
    def best_src(img):
        best, best_w = img.attrs.get("src", ""), 0
        for cand in img.attrs.get("srcset", "").split(","):
            bits = cand.strip().split()
            if len(bits) == 2 and bits[1].endswith("w") and bits[1][:-1].isdigit():
                if int(bits[1][:-1]) > best_w:
                    best, best_w = bits[0], int(bits[1][:-1])
        return best.strip()

    def image_md(self, img, caption=None):
        src = self.best_src(img)
        if not src or src.startswith("data:"):
            return ""
        if not self.with_images:
            self.skipped_images += 1
            return ""
        alt = plain(img.attrs.get("alt", ""))
        entry = self.register_image(src, alt)
        title = ' "%s"' % caption.replace('"', '\\"') if caption else ""
        alt_md = alt.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
        return "![%s](/bilder/%s{ext}%s)" % (alt_md, entry["name"], title)

    # Links

    def rewrite(self, href):
        href = href.strip()
        if not href:
            return None
        if href.startswith("#"):
            return href
        u = urlsplit(href)
        if u.scheme == "mailto":
            return href
        if u.scheme not in ("", "http", "https"):
            self.note("Link entfernt", "Schema %r: %s" % (u.scheme, href))
            return None
        host = (u.hostname or "").lower()
        if not host or host in OWN_HOSTS:
            return self.internal(u, href)
        if "." not in host:
            self.note("Link entfernt", "ungültige Adresse %s" % href)
            return None
        if host == "amzn.to" or host.endswith("amazon.com") or host.endswith("amazon.de"):
            return "AFFILIATE"
        return href

    def internal(self, u, href):
        path = u.path or "/"
        frag = "#" + u.fragment if u.fragment else ""
        if path.startswith("/wp-content/"):
            self.note("Link entfernt", "Datei der alten Seite %s" % path)
            return None
        m = re.match(r"^/(?:\d{4}/\d{2}/\d{2}/)?([a-z0-9-]+)/?$", path)
        if m and m.group(1) in self.slugs:
            return "/en/articles/%s/%s" % (m.group(1), frag)
        if m and m.group(1) in OLD_SLUGS:
            return "/en/articles/%s/%s" % (OLD_SLUGS[m.group(1)], frag)
        if m and m.group(1) in PAGE_TARGETS:
            return PAGE_TARGETS[m.group(1)]
        if path in ("", "/"):
            return "/en/"
        if path.startswith(("/category/", "/tag/", "/blog/")):
            return "/en/articles/"
        m = re.match(r"^/legal-policies/([a-z0-9-]+)/?$", path)
        if m:
            return LEGAL_TARGETS.get(m.group(1), "/en/impressum/")
        self.note("Link umgeleitet", "unbekannte interne Adresse %s → /en/" % href)
        return "/en/"

    # Inline

    def inline(self, nodes):
        out = []
        for n in nodes:
            out.append(escape_text(n) if isinstance(n, str) else self.inline_node(n))
        return "".join(out)

    def inline_node(self, n):
        t = n.tag
        if t in SKIP:
            return ""
        if t == "br":
            return HARD_BREAK
        if t in ("strong", "b"):
            return wrap("**", self.inline(n.children))
        if t in ("em", "i", "cite"):
            return wrap("*", self.inline(n.children))
        if t == "code":
            code = n.text().replace("\n", " ")
            fence = "``" if "`" in code else "`"
            return "%s%s%s" % (fence, code, fence)
        if t == "a":
            return self.link(n)
        if t == "img":
            return self.image_md(n)
        if t == "iframe":
            return ""
        if t in BLOCK:
            return " " + self.inline(n.children) + " "
        return self.inline(n.children)

    def link(self, n):
        text = self.inline(n.children).strip()
        if next(n.find_all("a"), None) is not None:
            return text  # verschachtelter Link im alten HTML: der innere gewinnt
        imgs = list(n.find_all("img"))
        if imgs and not plain(n.text()):
            return self.image_md(imgs[0])
        target = self.rewrite(n.attrs.get("href", ""))
        if target == "AFFILIATE":
            label = plain(n.text())
            self.note("Affiliate-Link entfernt", "%s (%s)" % (n.attrs.get("href"), label))
            return "" if re.search(r"amazon", label, re.I) else text
        if target is None or not text:
            return text
        return "[%s](%s)" % (text, escape_url(target))

    # Blöcke

    def blocks(self, nodes):
        out, buf, labels = [], [], []

        def flush():
            text = finish_inline(self.inline(buf))
            if text.replace("\\", "").strip():
                out.append(text)
            buf.clear()

        def flush_labels():
            if labels:
                out.extend(self.quiz(labels))
                labels.clear()

        for n in nodes:
            if isinstance(n, Node) and n.tag == "label":
                flush()
                labels.append(n)
                continue
            if isinstance(n, Node) and n.tag == "br" and labels:
                continue
            if isinstance(n, str) and labels and not n.strip():
                continue
            flush_labels()
            if isinstance(n, str) or n.tag not in BLOCK:
                buf.append(n)
                continue
            flush()
            out.extend(self.block(n))
        flush_labels()
        flush()
        return out

    def block(self, n):
        t = n.tag
        if t in SKIP:
            return []
        if t == "p":
            text = finish_inline(self.inline(n.children))
            return [text] if text.replace("\\", "").strip() else []
        if t in ("h1", "h2", "h3", "h4", "h5", "h6"):
            text = finish_inline(self.inline(n.children)).replace("\\\n", " ")
            text = re.sub(r"^\\(?=#)", "", text)
            level = max(2, int(t[1]))
            return ["#" * level + " " + text] if text.strip() else []
        if t in ("ul", "ol"):
            md = self.list_md(n)
            return [md] if md else []
        if t == "blockquote":
            inner = self.blocks(n.children)
            return [indent("\n\n".join(inner), "> ").replace("\n\n", "\n>\n")] if inner else []
        if t == "hr":
            return ["---"]
        if t == "table":
            md = self.table(n)
            return [md] if md else []
        if t == "pre":
            code = n.text().strip("\n")
            fence = "~~~" if "```" in code else "```"
            if "}" in code:
                self.note("Prüfen", "Codeblock enthält '}' (Pages CMS)")
            return ["%s\n%s\n%s" % (fence, code, fence)]
        if t == "iframe":
            return self.embed(n)
        if t == "figure":
            return self.figure(n)
        if t == "img":
            md = self.image_md(n)
            return [md] if md else []
        if t == "summary":
            text = finish_inline(self.inline(n.children))
            return ["**%s**" % text] if text else []
        return self.blocks(n.children)

    def figure(self, n):
        caption = None
        for cap in n.find_all("figcaption"):
            caption = plain(cap.text()) or None
        imgs = list(n.find_all("img"))
        if imgs:
            md = self.image_md(imgs[0], caption)
            return [md] if md else []
        frames = list(n.find_all("iframe"))
        if frames:
            return self.embed(frames[0])
        tables = list(n.find_all("table"))
        if tables:
            md = self.table(tables[0])
            return [md] + (["*%s*" % escape_text(caption)] if caption else [])
        return self.blocks(n.children)

    def embed(self, frame):
        src = frame.attrs.get("src", "")
        target = youtube_target(src)
        title = plain(frame.attrs.get("title", "")) or "Video"
        if target:
            return ["▶ [Watch on YouTube: %s](%s)" % (escape_text(title), target)]
        if src.startswith("https://"):
            self.note("Prüfen", "Einbettung als Link: %s" % src)
            return ["[%s](%s)" % (escape_text(title), escape_url(src))]
        return []

    def list_md(self, n):
        items = [c for c in n.children if isinstance(c, Node) and c.tag == "li"]
        ordered = n.tag == "ol"
        try:
            start = int(n.attrs.get("start", "1"))
        except ValueError:
            start = 1
        lines = []
        for i, li in enumerate(items):
            inner = self.blocks(li.children)
            if not inner:
                continue
            marker = "%d." % (start + i) if ordered else "-"
            pad = " " * (len(marker) + 1)
            text = marker + " " + indent(inner[0], pad)[len(pad):]
            for block in inner[1:]:
                sep = "\n" if re.match(r"^(\d+\.|-) ", block) else "\n\n"
                text += sep + indent(block, pad)
            lines.append(text)
        return "\n".join(lines)

    def table(self, n):
        rows = []
        for tr in n.find_all("tr"):
            cells = [c for c in tr.children if isinstance(c, Node) and c.tag in ("th", "td")]
            row = [finish_inline(self.inline(c.children)).replace("\\\n", " ").replace("\n", " ")
                   .replace("|", "\\|") for c in cells]
            if any(cell.strip() for cell in row):
                rows.append(row)
        if not rows:
            return ""
        width = max(len(r) for r in rows)
        rows = [r + [""] * (width - len(r)) for r in rows]
        out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
        out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
        return "\n".join(out)

    def quiz(self, labels):
        options, correct = [], None
        for label in labels:
            text = finish_inline(self.inline(label.children)).strip()
            options.append("- " + text)
            for inp in label.find_all("input"):
                if inp.attrs.get("value") == "correct":
                    correct = text
        out = ["\n".join(options)]
        if correct:
            out.append("*Answer: %s*" % correct)
        self.note("Umgewandelt", "interaktives Quiz → Fragen mit Lösung")
        return out


# --- Bilder laden und umrechnen ----------------------------------------------

def http_get(url, binary=True):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def sniff(data):
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data[4:12] in (b"ftypavif", b"ftypheic", b"ftypmif1"):
        return "avif"
    return None


def sips_size(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                         capture_output=True, text=True, check=True).stdout
    w = int(re.search(r"pixelWidth: (\d+)", out).group(1))
    h = int(re.search(r"pixelHeight: (\d+)", out).group(1))
    return w, h


def convert_image(data, dest_base):
    """Schreibt dest_base + .jpg/.png; gibt (endung, breite, höhe) zurück."""
    kind = sniff(data)
    if kind is None:
        raise ValueError("unbekanntes Bildformat")
    tmp = tempfile.mkdtemp(prefix="migrate-")
    try:
        src = os.path.join(tmp, "src." + kind)
        with open(src, "wb") as f:
            f.write(data)
        ext = "png" if kind in ("png", "gif") else "jpg"
        out = os.path.join(tmp, "out." + ext)
        args = ["sips", "-s", "format", "png" if ext == "png" else "jpeg"]
        if ext == "jpg":
            args += ["-s", "formatOptions", "85"]
        w, h = sips_size(src)
        if max(w, h) > MAX_EDGE:
            args += ["-Z", str(MAX_EDGE)]
        subprocess.run(args + [src, "--out", out], capture_output=True, check=True)
        if ext == "png" and os.path.getsize(out) > MAX_BYTES:
            ext, out2 = "jpg", os.path.join(tmp, "out.jpg")
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "85", out,
                            "--out", out2], capture_output=True, check=True)
            out = out2
        quality = 75
        while os.path.getsize(out) > MAX_BYTES and quality >= 45:
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality),
                            out, "--out", out], capture_output=True, check=True)
            quality -= 10
        if os.path.getsize(out) > MAX_BYTES:
            raise ValueError("Bild bleibt über 2 MB")
        w, h = sips_size(out)
        shutil.copyfile(out, dest_base + "." + ext)
        return ext, w, h
    finally:
        shutil.rmtree(tmp)


# --- Ablauf ------------------------------------------------------------------

def fetch_posts():
    url = API + "/posts?per_page=100&_embed=wp:featuredmedia&_fields=id,slug,date,link,title," \
                "excerpt,content,featured_media,_links,_embedded"
    return json.loads(http_get(url, binary=False), strict=False)


def description_of(post):
    text = plain(post["excerpt"]["rendered"])
    text = re.sub(r"\s*\[(…|&hellip;|\.\.\.)\]\s*$", "…", text)
    if len(text) > 300:
        text = text[:300].rsplit(" ", 1)[0].rstrip(",;:.") + " …"
    return text


def migrate_post(post, slugs, content_dir, image_cache, with_images=False):
    slug = post["slug"]
    notes = []
    conv = Converter(slug, slugs, notes, with_images)
    root = parse_html(post["content"]["rendered"])
    blocks = conv.blocks(root.children)

    featured = (post.get("_embedded") or {}).get("wp:featuredmedia") or []
    if not with_images and featured:
        conv.skipped_images += 1
    elif featured and featured[0].get("source_url"):
        media = featured[0]
        key = Converter.image_key(media["source_url"])
        if key not in conv.images:
            alt = plain(media.get("alt_text") or "") or plain(post["title"]["rendered"])
            entry = conv.register_image(media["source_url"], alt)
            alt_md = alt.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
            blocks.insert(0, "![%s](/bilder/%s{ext})" % (alt_md, entry["name"]))

    folder = os.path.join(content_dir, "artikel", slug)
    os.makedirs(folder, exist_ok=True)
    image_dir = os.path.join(content_dir, "bilder")
    exts, failed = {}, []
    for entry in conv.images.values():
        url = entry["url"].replace("&amp;", "&")
        try:
            if url not in image_cache:
                image_cache[url] = http_get(url)
                time.sleep(0.2)
            os.makedirs(image_dir, exist_ok=True)
            ext, w, h = convert_image(image_cache[url], os.path.join(image_dir, entry["name"]))
            exts[entry["name"]] = "." + ext
        except Exception as exc:  # Bild fehlt → Bild aus dem Text entfernen
            failed.append(entry["name"])
            notes.append(("Bild fehlt", "%s (%s)" % (url, exc)))
        host = (urlsplit(url).hostname or "").lower()
        if host not in OWN_HOSTS and entry["name"] not in failed:
            notes.append(("Fremde Bildquelle", "%s → %s (Lizenz prüfen)" % (url, entry["name"] + exts[entry["name"]])))

    body = "\n\n".join(blocks)
    for name in failed:
        body = re.sub(r"!\[[^\]]*\]\(/bilder/%s\{ext\}[^)]*\)\n*" % re.escape(name), "", body)
    body = re.sub(r"/bilder/([a-z0-9-]+)\{ext\}", lambda m: "/bilder/%s%s" % (m.group(1), exts[m.group(1)]), body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"

    assert "}" not in body, slug
    assert "{{<" not in body and "{{%" not in body, slug

    fm = {
        "title": plain(post["title"]["rendered"]),
        "date": post["date"][:10],
        "draft": False,
        "description": description_of(post),
    }
    with open(os.path.join(folder, "index.en.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(fm, ensure_ascii=False, indent=2) + "\n" + body)
    return {"slug": slug, "old": post["link"], "new": "/en/articles/%s/" % slug,
            "images": len(conv.images) - len(failed), "skipped": conv.skipped_images,
            "notes": notes, "body": body}


REDIRECT_MARKER = "# --- 301-Weiterleitungen der alten WordPress-Adressen (Paket 6) ---"
DATE = r"(?:\d{4}/\d{2}/\d{2}/)?"


def redirect_block(slugs):
    for slug in list(slugs) + list(OLD_SLUGS) + list(OLD_SLUGS.values()):
        assert re.match(r"^[a-z0-9-]+$", slug), slug  # Slugs brauchen keine Maskierung
    lines = [REDIRECT_MARKER,
             "# Erzeugt von tools/migrate-wordpress.py – nicht von Hand ändern.",
             "# Reihenfolge zählt: die erste passende Regel gilt.",
             "",
             "# Beiträge (auch alte Adressen mit Datum davor) → englische Artikel"]
    for slug in sorted(slugs):
        lines.append("RedirectMatch 301 ^/%s%s/?$ /en/articles/%s/" % (DATE, slug, slug))
    lines += ["", "# Frühere Namen umbenannter Beiträge"]
    for old, new in sorted(OLD_SLUGS.items()):
        lines.append("RedirectMatch 301 ^/%s%s/?$ /en/articles/%s/" % (DATE, old, new))
    alternation = "|".join(sorted(slugs))
    lines += ["", "# Unterseiten alter Beiträge (Feed, AMP, Einbettung)",
              "RedirectMatch 301 ^/(%s)/(?:feed|amp|embed)/?$ /en/articles/$1/" % alternation,
              "", "# Seiten",
              "RedirectMatch 301 ^/(?:start-here|about|free-downloads|entrance-exam-check)/?$ /en/",
              "RedirectMatch 301 ^/deutsch-lernen/?$ /",
              "RedirectMatch 301 ^/legal-policies/(?:privacy-policy-2|cookie-policy-eu)/?$ /en/datenschutz/",
              "RedirectMatch 301 ^/legal-policies(?:/(?:legal-notice|disclaimer|affiliate-disclosure))?/?$ /en/impressum/",
              "", "# Kategorien, Schlagwörter, Autoren, Archive",
              "RedirectMatch 301 ^/(?:category|tag|author)(?:/.*)?$ /en/articles/",
              r"RedirectMatch 301 ^/\d{4}(?:/\d{2}){0,2}/?$ /en/articles/",
              r"RedirectMatch 301 ^/page/\d+/?$ /en/articles/",
              "", "# Feeds und Sitemaps",
              "RedirectMatch 301 ^/feed/?$ /en/index.xml",
              "RedirectMatch 301 ^/(?:sitemap_index|sitemap-home|sitemap-posts|sitemap-pages|post-sitemap|page-sitemap)\\.xml$ /sitemap.xml",
              "", "# Dateien der alten Seite (Arbeitsblätter vorerst nicht übernommen)",
              "RedirectMatch 301 ^/wp-content/uploads/2025/11/Reading-Music_Practice-Sheet\\.pdf$ /en/",
              "RedirectMatch 301 ^/wp-content/uploads/2025/11/Ubungsblatt-Notenlernen-1\\.pdf$ /",
              "RedirectMatch 410 ^/(?:wp-admin|wp-includes|wp-content|wp-json|comments)(?:/.*)?$",
              "RedirectMatch 410 ^/(?:wp-login|xmlrpc|wp-cron)\\.php$",
              ""]
    return "\n".join(lines)


def write_redirects(path, slugs):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    head = text.split(REDIRECT_MARKER)[0].rstrip("\n") + "\n\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + redirect_block(slugs))


def write_old_urls(path, posts):
    pages = json.loads(http_get(API + "/pages?per_page=100&_fields=link", binary=False), strict=False)
    cats = json.loads(http_get(API + "/categories?per_page=100&_fields=link,count", binary=False), strict=False)
    paths = set()
    for item in posts + pages:
        paths.add(urlsplit(item["link"]).path or "/")
    for cat in cats:
        if cat.get("count"):
            paths.add(urlsplit(cat["link"]).path)
    for old in OLD_SLUGS:
        paths.add("/%s/" % old)
    paths.update({"/2025/05/10/musical-staff-beginners-guide/", "/2025/05/17/musical-notation-clefs-natural-notes/",
                  "/feed/", "/sitemap_index.xml", "/sitemap-posts.xml", "/sitemap-pages.xml",
                  "/sitemap-home.xml", "/wp-content/uploads/2025/11/Reading-Music_Practice-Sheet.pdf",
                  "/wp-content/uploads/2025/11/Ubungsblatt-Notenlernen-1.pdf", "/wp-login.php",
                  "/what-is-the-circle-of-fifths/feed/"})
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Adressen der alten WordPress-Seite (Sitemap, API, bekannte Altnamen).\n"
                "# Erzeugt von tools/migrate-wordpress.py; geprüft von scripts/tests/test_redirects.py.\n")
        f.writelines(p + "\n" for p in sorted(paths))
    return len(paths)


def main(argv=None):
    parser = argparse.ArgumentParser(description="WordPress → Hugo-Inhalte für museprep.com")
    parser.add_argument("--content", required=True, help="content/-Ordner des Inhalts-Repositorys")
    parser.add_argument("--posts", help="gespeicherte API-Antwort statt Abruf")
    parser.add_argument("--only", help="nur diese Slugs (Komma-getrennt)")
    parser.add_argument("--with-images", action="store_true",
                        help="Bilder mit übertragen (Standard: ohne Bilder)")
    parser.add_argument("--report", default=os.path.join("docs", "MIGRATION.md"))
    parser.add_argument("--htaccess", default=os.path.join("static", ".htaccess"))
    parser.add_argument("--old-urls", default=os.path.join("tools", "old-urls.txt"))
    args = parser.parse_args(argv)

    if args.posts:
        with open(args.posts, encoding="utf-8") as f:
            posts = json.loads(f.read(), strict=False)
    else:
        posts = fetch_posts()
    slugs = {p["slug"] for p in posts}
    only = set(args.only.split(",")) if args.only else None

    results, cache = [], {}
    for post in sorted(posts, key=lambda p: p["date"]):
        if only and post["slug"] not in only:
            continue
        result = migrate_post(post, slugs, args.content, cache, args.with_images)
        results.append(result)
        print("%-60s %2d Bilder, %2d weggelassen %s" % (result["slug"], result["images"], result["skipped"],
                                        "· %d Hinweise" % len(result["notes"]) if result["notes"] else ""))
    if not only:
        write_report(args.report, results)
        print("Bericht:", args.report)
        write_redirects(args.htaccess, slugs)
        print("Weiterleitungen:", args.htaccess)
        print("Alte Adressen:", write_old_urls(args.old_urls, posts), "→", args.old_urls)
    return 0


def write_report(path, results):
    domains = {}
    for r in results:
        for m in re.finditer(r"\]\((https?://[^)\s]+)\)", r["body"]):
            host = urlsplit(m.group(1)).hostname
            domains[host] = domains.get(host, 0) + 1
    lines = [
        "# Migration der WordPress-Beiträge",
        "",
        "Erzeugt von `tools/migrate-wordpress.py` am %s. Alle %d Beiträge der alten Seite"
        % (time.strftime("%Y-%m-%d"), len(results)),
        "liegen als englische Fassung (`index.en.md`) unter `content/artikel/<slug>/`.",
        "Jede alte Adresse leitet per 301 auf die neue weiter (`static/.htaccess`).",
        "",
        "Bilder wurden bewusst **nicht** übernommen (%d Bilder weggelassen, davon %d"
        % (sum(r["skipped"] for r in results), sum(1 for r in results if r["skipped"])),
        "Beiträge betroffen). Mit `--with-images` lädt das Werkzeug sie mit.",
        "",
        "## Zur Durchsicht",
        "",
    ]
    kinds = {}
    for r in results:
        for kind, text in r["notes"]:
            kinds.setdefault(kind, []).append("`%s`: %s" % (r["slug"], text))
    for kind in sorted(kinds):
        lines.append("### %s (%d)" % (kind, len(kinds[kind])))
        lines.append("")
        lines.extend("- " + t for t in sorted(set(kinds[kind])))
        lines.append("")
    lines += ["### Frühere Beitragsnamen", "",
              "Interne Links und Weiterleitungen nutzen diese Zuordnung (von Hand nach Titel",
              "und Datum geprüft). Wo WordPress heute anders weiterleitet, steht es dabei.", "",
              "| Früherer Name | Heutiger Beitrag | WordPress leitet heute auf |", "|---|---|---|"]
    lines += ["| `%s` | `%s` | %s |" % (o, n, "`%s`" % OLD_SLUG_WP_DIFFERS[o] if o in OLD_SLUG_WP_DIFFERS else "gleich")
              for o, n in sorted(OLD_SLUGS.items())]
    lines += ["", "### Bilder", "",
              "Bilder liegen zentral in `content/bilder/` (im Text `/bilder/name.jpg`), nicht im",
              "Artikelordner. Grund: Hugo ordnet Bilder ohne Sprachkennung der Standardsprache zu,",
              "ein rein englischer Artikelordner sähe seine Bilder sonst nicht; außerdem überschneiden",
              "sich so Media- und Inhaltsordner in Pages CMS nicht. Mit `--with-images` schreibt das",
              "Werkzeug die Bilder als `<slug>-<name>` dorthin.", "",
              "### Externe Link-Ziele", "", "| Domain | Links |", "|---|---|"]
    lines += ["| %s | %d |" % (d, n) for d, n in sorted(domains.items(), key=lambda x: (-x[1], x[0]))]
    lines += ["", "## Alle Beiträge", "", "| Alte Adresse | Neue Adresse | Bilder weggelassen |", "|---|---|---|"]
    for r in sorted(results, key=lambda x: x["slug"]):
        lines.append("| `/%s/` | `%s` | %d |" % (r["slug"], r["new"], r["skipped"]))
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    sys.exit(main())
