#!/usr/bin/env bash
# Lädt die in scripts/tools.lock eingetragene Hugo-Version als offizielles
# Release, prüft die SHA-256-Prüfsumme und legt das Programm unter .bin/hugo ab.
# Läuft lokal (macOS) und im Workflow (Linux x86_64).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
lock="$root/scripts/tools.lock"
bin="$root/.bin"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) suffix="linux-amd64.tar.gz" ;;
  Darwin-*)     suffix="darwin-universal.pkg" ;;
  *) echo "Nicht unterstützte Plattform: $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

read -r _ version file sha < <(awk -v s="$suffix" '$1 == "hugo" && $3 ~ s"$" {print; exit}' "$lock")
if [ -z "${sha:-}" ]; then
  echo "Kein Eintrag für $suffix in $lock" >&2
  exit 1
fi

if [ -x "$bin/hugo" ] && "$bin/hugo" version 2>/dev/null | grep -q "v$version-"; then
  echo "Hugo $version ist bereits installiert: $bin/hugo"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Lade $file"
curl -fsSL --proto '=https' --tlsv1.2 -o "$tmp/$file" \
  "https://github.com/gohugoio/hugo/releases/download/v$version/$file"

if command -v sha256sum >/dev/null; then
  actual="$(sha256sum "$tmp/$file" | cut -d' ' -f1)"
else
  actual="$(shasum -a 256 "$tmp/$file" | cut -d' ' -f1)"
fi
if [ "$actual" != "$sha" ]; then
  echo "Prüfsumme falsch für $file" >&2
  echo "  erwartet: $sha" >&2
  echo "  erhalten: $actual" >&2
  exit 1
fi
echo "Prüfsumme stimmt."

mkdir -p "$bin"
case "$suffix" in
  *.tar.gz)
    tar -xzf "$tmp/$file" -C "$tmp" hugo
    install -m 0755 "$tmp/hugo" "$bin/hugo"
    ;;
  *.pkg)
    # Zusätzlich zur Prüfsumme: Apple-Signatur des Hugo-Maintainers.
    pkgutil --check-signature "$tmp/$file" | grep -q "Developer ID Installer: .*(ZYSJUFSYL4)" || {
      echo "Signatur des Pakets stimmt nicht" >&2
      exit 1
    }
    pkgutil --expand-full "$tmp/$file" "$tmp/pkg"
    found="$(find "$tmp/pkg" -type f -name hugo -perm -u+x | head -n 1)"
    if [ -z "$found" ]; then
      echo "Kein Hugo-Programm im Paket gefunden" >&2
      exit 1
    fi
    install -m 0755 "$found" "$bin/hugo"
    ;;
esac

"$bin/hugo" version
