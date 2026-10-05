#!/usr/bin/env bash
# Prüft nach der Domain-Umstellung jede alte Adresse auf der Live-Seite:
# erwartet 200 (neue Seite liefert direkt), 301 mit Ziel oder 410.
# Aufruf: tools/check-live-redirects.sh [https://museprep.com]
set -uo pipefail
base="${1:-https://museprep.com}"
list="$(dirname "$0")/old-urls.txt"
fail=0
while read -r path; do
  case "$path" in ''|\#*) continue ;; esac
  read -r code location < <(curl -s -o /dev/null --max-time 20 -w '%{http_code} %{redirect_url}\n' "$base$path")
  case "$code" in
    200|410) printf '%s  %s\n' "$code" "$path" ;;
    301) printf '%s  %s → %s\n' "$code" "$path" "${location#"$base"}" ;;
    *) printf '%s  %s  ← FEHLER\n' "$code" "$path"; fail=1 ;;
  esac
done < "$list"
exit $fail
