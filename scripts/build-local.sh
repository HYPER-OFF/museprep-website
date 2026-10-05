#!/usr/bin/env bash
# Lokaler Build mit denselben Schritten wie im Workflow, ohne Upload.
# Aufruf: scripts/build-local.sh [pfad-zum-inhalts-repo]
# Standard: ../museprep-content neben diesem Repository.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
content="$(cd "${1:-$root/../museprep-content}" && pwd)"

"$root/scripts/install-hugo.sh" >/dev/null

# Eingangsprüfung (Paket 3): scripts/check-content.py "$content"

rm -rf "$root/public"
"$root/.bin/hugo" --source "$root" --contentDir "$content/content" \
  --minify --panicOnWarning --printPathWarnings

# Ausgangsprüfung (Paket 4): scripts/check-output.py "$root/public"

echo "Fertig: $root/public"
