#!/usr/bin/env bash
# V1124 P4-C2: isolated local MP4/MOV capability and sample-encode probe.
# No application IPC, packaged encoder, source project, or production output is modified.
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "FAIL: this VideoToolbox probe requires macOS." >&2; exit 2
fi
FFMPEG="${1:-${FFMPEG_BIN:-}}"
if [[ -z "$FFMPEG" ]]; then
  echo "Usage: bash scripts/p4c2-mp4-mov-probe.sh /absolute/path/to/ffmpeg" >&2
  echo "Use a separately installed or custom-built capability candidate; the validated WebM-only bundle is expected to fail preflight." >&2
  exit 2
fi
if [[ "$FFMPEG" != /* || ! -f "$FFMPEG" || ! -x "$FFMPEG" ]]; then
  echo "FAIL: FFmpeg must be an absolute path to an executable file: $FFMPEG" >&2; exit 2
fi
echo "=== Architecture and candidate version ==="
file "$FFMPEG"
"$FFMPEG" -hide_banner -version | head -n 3
echo "=== Build flags (inspect licenses/dependencies before distribution) ==="
"$FFMPEG" -hide_banner -buildconf
echo "=== Required encoder and muxer names ==="
"$FFMPEG" -hide_banner -encoders 2>/dev/null | grep -E 'h264_videotoolbox|(^|[[:space:]])aac([[:space:]]|$)' || true
"$FFMPEG" -hide_banner -muxers 2>/dev/null | grep -E '[[:space:]](mp4|mov)[[:space:]]' || true
if ! "$FFMPEG" -hide_banner -encoders 2>/dev/null | grep -q 'h264_videotoolbox'; then
  echo "FAIL C2-01: VideoToolbox H.264 encoder is absent." >&2; exit 3
fi
if ! "$FFMPEG" -hide_banner -encoders 2>/dev/null | grep -Eq '^[[:space:]]*[A-Z.]{6}[[:space:]]+aac[[:space:]]'; then
  echo "FAIL C2-02: native AAC encoder is absent." >&2; exit 3
fi
for format in mp4 mov; do
  if ! "$FFMPEG" -hide_banner -muxers 2>/dev/null | grep -Eq "^[[:space:]]*E[[:space:]]+$format[[:space:]]"; then
    echo "FAIL: $format output muxer is absent." >&2; exit 3
  fi
done
output_dir="$(mktemp -d "${TMPDIR:-/tmp/}p4c2-encode.XXXXXX")"
echo "=== Generated media directory: $output_dir ==="
echo "Samples are retained for inspection; this script never installs or copies encoders into the app."
for format in mp4 mov; do
  destination="$output_dir/p4c2-h264-aac.$format"
  echo "=== C2 encode: $format ==="
  if ! "$FFMPEG" -hide_banner -loglevel warning -nostdin \
    -f lavfi -i 'testsrc2=size=320x180:rate=24:duration=2' \
    -f lavfi -i 'sine=frequency=440:sample_rate=48000:duration=2' \
    -map 0:v:0 -map 1:a:0 -c:v h264_videotoolbox -b:v 1200k \
    -pix_fmt yuv420p -c:a aac -b:a 128k -t 2 \
    -y "$destination" 2>"$output_dir/$format.log"; then
    echo "FAIL C2: $format encoding failed. Diagnostic: $output_dir/$format.log" >&2
    cat "$output_dir/$format.log" >&2
    exit 4
  fi
  if [[ ! -s "$destination" ]]; then
    echo "FAIL C2: $format output is empty." >&2; exit 4
  fi
  echo "PASS: $destination ($(stat -f '%z' "$destination") bytes)"
  probe="$(dirname "$FFMPEG")/ffprobe"
  if [[ ! -x "$probe" ]]; then probe="$(command -v ffprobe || true)"; fi
  if [[ -n "$probe" ]]; then
    "$probe" -v error -show_entries stream=codec_type,codec_name -show_entries format=duration \
      -of default=noprint_wrappers=1 "$destination" || exit 5
  else
    echo "NOTE: ffprobe unavailable; inspect the sample in QuickTime and verify video, audible tone and ~2-second duration."
  fi
done
echo "=== C2-03/04 sample export complete ==="
echo "Verify both samples open in QuickTime and contain picture plus audio."
echo "C2-05 distribution licensing and C2-06 Intel native support are NOT validated by this probe."
echo "Evidence directory: $output_dir"
