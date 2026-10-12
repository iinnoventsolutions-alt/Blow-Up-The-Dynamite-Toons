#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 24 LTS from nodejs.org, then launch this preview again."
  read -r -p "Press Return to close. " reply
  exit 1
fi
exec node desktop/preview.cjs
