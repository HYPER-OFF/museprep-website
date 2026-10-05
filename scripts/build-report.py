#!/usr/bin/env python3
"""Lauf-Zusammenfassung für den Workflow: geänderte Dateien und neue Links.

Vergleicht das Manifest und die Linkliste des aktuellen Builds mit dem
zuletzt hochgeladenen Stand und schreibt Markdown nach stdout (für
$GITHUB_STEP_SUMMARY).

Aufruf: build-report.py --current report/ [--previous previous/]
Beide Ordner enthalten manifest.json und links.txt von check-output.py.

Das Website-Repository ist öffentlich: der Bericht nennt nur Dateien und
Links aus public/, also nur das, was nach der Freigabe ohnehin öffentlich ist.
"""

import argparse
import json
import os
import sys

MAX_LINES = 200


def load(folder):
    manifest, links = {}, set()
    if folder and os.path.isfile(os.path.join(folder, "manifest.json")):
        with open(os.path.join(folder, "manifest.json"), encoding="utf-8") as f:
            manifest = json.load(f)
    if folder and os.path.isfile(os.path.join(folder, "links.txt")):
        with open(os.path.join(folder, "links.txt"), encoding="utf-8") as f:
            links = {line.strip() for line in f if line.strip()}
    return manifest, links


def diff(old, new):
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    changed = sorted(p for p in set(old) & set(new) if old[p] != new[p])
    return added, changed, removed


def render(previous, current):
    old_manifest, old_links = previous
    new_manifest, new_links = current
    first = not old_manifest
    added, changed, removed = diff(old_manifest, new_manifest)
    new_link_list = sorted(new_links - old_links)

    out = ["## Bericht", ""]
    if first:
        out.append("Erster Lauf ohne hochgeladenen Vorgängerstand – alle Dateien sind neu.")
        out.append("")
    out.append("| | Anzahl |")
    out.append("|---|---|")
    out.append("| Dateien gesamt | %d |" % len(new_manifest))
    out.append("| neu | %d |" % len(added))
    out.append("| geändert | %d |" % len(changed))
    out.append("| entfernt | %d |" % len(removed))
    out.append("| neue externe Links | %d |" % len(new_link_list))
    out.append("")

    rows = [("neu", p) for p in added] + [("geändert", p) for p in changed] + [("entfernt", p) for p in removed]
    if rows and not first:
        out.append("### Geänderte Dateien")
        out.append("")
        out.append("| Status | Datei |")
        out.append("|---|---|")
        for status, path in rows[:MAX_LINES]:
            out.append("| %s | `%s` |" % (status, path))
        if len(rows) > MAX_LINES:
            out.append("| … | %d weitere |" % (len(rows) - MAX_LINES))
        out.append("")
    if new_link_list:
        out.append("### Neue externe Links")
        out.append("")
        for link in new_link_list[:MAX_LINES]:
            out.append("- <%s>" % link)
        out.append("")
    return "\n".join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--current", required=True)
    parser.add_argument("--previous")
    args = parser.parse_args(argv)
    print(render(load(args.previous), load(args.current)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
