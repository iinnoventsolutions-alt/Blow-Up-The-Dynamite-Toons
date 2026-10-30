#!/usr/bin/env bash
# Read-only static malware scan of installer disk image contents.
# This is an additional signature check, not Google Safe Browsing clearance.
set -euo pipefail
mkdir -p release
report="$PWD/release/CLAMAV-SCAN.txt"
db="$(mktemp -d)"
config="$(mktemp)"
mountpoints=()
cleanup() {
  for ((i=${#mountpoints[@]}-1; i>=0; i--)); do hdiutil detach "${mountpoints[i]}" -quiet || true; done
  rm -rf "$db" "$config"
}
trap cleanup EXIT

printf 'ClamAV signature scan (not a substitute for notarization or Safe Browsing)\nCommit: %s\nRun: %s\n' "${GITHUB_SHA:-unknown}" "${GITHUB_RUN_ID:-unknown}" > "$report"
brew install clamav ca-certificates
# FreshClam must validate official signature downloads with a trusted CA store.
# macOS runners may not expose a default OpenSSL CA bundle to Homebrew ClamAV.
ca_bundle="$(brew --prefix)/etc/ca-certificates/cert.pem"
if [[ ! -s "$ca_bundle" ]]; then
  echo "ERROR: Homebrew trusted CA bundle is missing: $ca_bundle" | tee -a "$report"
  exit 1
fi
export SSL_CERT_FILE="$ca_bundle"
export CURL_CA_BUNDLE="$ca_bundle"
printf 'Trusted CA bundle: %s\\n' "$ca_bundle" | tee -a "$report"
cat > "$config" <<EOF
DatabaseDirectory $db
DatabaseOwner $(id -un)
DatabaseMirror database.clamav.net
EOF
# Fail closed if the signature database cannot be downloaded.
freshclam --config-file="$config" 2>&1 | tee -a "$report"
if ! find "$db" -maxdepth 1 -type f \( -name '*.cvd' -o -name '*.cld' \) | grep -q .; then
  echo 'ERROR: No ClamAV signature database available.' | tee -a "$report"
  exit 1
fi
clamscan --version | tee -a "$report"
for arch in arm64 x64; do
  if [[ "$arch" == arm64 ]]; then
    dmg='release/IInnovent Professional Storyboard-1.0.0-arm64.dmg'
  else
    dmg='release/IInnovent Professional Storyboard-1.0.0.dmg'
  fi
  test -f "$dmg"
  mountpoint="$(mktemp -d)"
  mountpoints+=("$mountpoint")
  hdiutil attach -readonly -nobrowse -mountpoint "$mountpoint" "$dmg" >/dev/null
  app="$mountpoint/IInnovent Professional Storyboard.app"
  if [[ ! -d "$app" ]]; then
    echo "ERROR: Expected application missing from $dmg" | tee -a "$report"
    exit 1
  fi
  printf '\nScanning %s from %s\n' "$arch" "$dmg" | tee -a "$report"
  # Exit code 1 means detection; 2 means scan failure. Neither is accepted.
  clamscan --recursive --infected --official-db-only --database="$db" --log="$PWD/release/clamav-$arch.log" "$app" 2>&1 | tee -a "$report"
  hdiutil detach "$mountpoint" -quiet
  mountpoints=("${mountpoints[@]:0:${#mountpoints[@]}-1}")
  rmdir "$mountpoint"
done
printf '\nBoth static scans finished with zero detections. Does not establish software safety.\n' | tee -a "$report"
