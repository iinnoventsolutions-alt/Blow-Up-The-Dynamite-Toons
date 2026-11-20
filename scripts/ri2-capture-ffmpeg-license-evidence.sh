#!/bin/sh
# RI2.15.5-A: capture exact staged binary licensing evidence on an authorized macOS test host.
# Usage: sh scripts/ri2-capture-ffmpeg-license-evidence.sh /path/to/relocated-runtime /path/to/private-output-dir
# Documentation only. Does not package, sign, notarize or distribute anything.
set -eu
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 RUNTIME_DIRECTORY PRIVATE_OUTPUT_DIRECTORY" >&2
  exit 2
fi
runtime=$1
out=$2
bin="$runtime/bin/ffmpeg"
[ -f "$bin" ] || { echo "Missing FFmpeg: $bin" >&2; exit 1; }
[ -d "$runtime/lib" ] || { echo "Missing lib directory" >&2; exit 1; }
[ ! -e "$out" ] || { echo "Output directory must not exist: $out" >&2; exit 1; }
mkdir -m 700 "$out"
"$bin" -hide_banner -L > "$out/ffmpeg-license.txt"
"$bin" -hide_banner -version > "$out/ffmpeg-version.txt"
"$bin" -hide_banner -buildconf > "$out/ffmpeg-buildconf.txt"
otool -L "$bin" > "$out/ffmpeg-linked-libraries.txt"
file "$bin" > "$out/ffmpeg-architecture.txt"
shasum -a 256 "$bin" > "$out/sha256.txt"
for lib in "$runtime"/lib/*.dylib; do
  [ -f "$lib" ] || continue
  otool -L "$lib" >> "$out/linked-dylibs.txt"
  shasum -a 256 "$lib" >> "$out/sha256.txt"
done
if grep -Eq -- '--enable-(gpl|nonfree|version3)([[:space:]]|$)' "$out/ffmpeg-buildconf.txt"; then
  echo "BLOCKED: restricted configuration detected" >&2
  exit 1
fi
grep -q 'libvpx' "$out/ffmpeg-buildconf.txt" || { echo "Missing libvpx" >&2; exit 1; }
grep -q 'libopus' "$out/ffmpeg-buildconf.txt" || { echo "Missing libopus" >&2; exit 1; }
[ -s "$out/ffmpeg-license.txt" ] || { echo "Missing FFmpeg license output" >&2; exit 1; }
echo "Evidence captured at $out. Human/legal review still required; distribution NOT authorized."
