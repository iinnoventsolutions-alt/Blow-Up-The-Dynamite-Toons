#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
fail() {
  echo "$1"
  read -r -p "Press Return to close. " reply
  exit 1
}
if ! command -v node >/dev/null 2>&1; then
  fail "Install Node.js 24 or newer from nodejs.org, then launch this preview again."
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  fail "This preview requires Node.js 24 or newer. Update Node.js, then try again."
fi
if [ ! -f dist/index.html ]; then
  command -v npm >/dev/null 2>&1 || fail "npm is missing. Reinstall Node.js, then try again."
  echo "Preparing the browser preview for this source download..."
  if [ ! -f node_modules/vite/bin/vite.js ]; then
    echo "Installing dependencies. First launch requires an internet connection."
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci || fail "Dependency installation failed. Check your internet connection and the error above, then try again."
  fi
  npm run build || fail "Preview build failed. Review the error above."
fi
node desktop/preview.cjs
status=$?
if [ "$status" -ne 0 ]; then
  fail "Preview could not start. Review the error above."
fi
