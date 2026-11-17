#!/usr/bin/env bash
# RFDR Intel packaging preflight. Read-only; does not alter the application.
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: This check must run on macOS." >&2; exit 2
fi
if [[ $# -ne 1 || ! -d "$1/Contents" ]]; then
  echo "Usage: bash scripts/verify-intel-package.sh /path/to/App.app" >&2; exit 2
fi
app="$1"
plist="$app/Contents/Info.plist"
exe_name=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$plist")
electron="$app/Contents/MacOS/$exe_name"
resources="$app/Contents/Resources"
ffmpeg="$resources/ffmpeg"
require_x64() {
  local target="$1"
  [[ -f "$target" ]] || { echo "MISSING: $target" >&2; exit 1; }
  local arches
  arches=$(lipo -archs "$target" 2>/dev/null) || { echo "NOT MACH-O: $target" >&2; exit 1; }
  [[ " $arches " == *" x86_64 "* ]] || { echo "NO x86_64 SLICE: $target ($arches)" >&2; exit 1; }
  echo "ARCH OK: $target ($arches)"
}
require_x64 "$electron"
require_x64 "$ffmpeg"
while IFS= read -r -d '' lib; do require_x64 "$lib"; done < <(find "$resources" -type f \( -name '*.dylib' -o -name '*.so' \) -print0)
echo "FFmpeg linked libraries:"
otool -L "$ffmpeg"
echo "App signature:"
codesign --verify --deep --strict --verbose=2 "$app"
echo "FFmpeg signature:"
codesign --verify --verbose=2 "$ffmpeg"
echo "Intel package architecture and signature preflight: PASS"
