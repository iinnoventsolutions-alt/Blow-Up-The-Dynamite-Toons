# RI2.15.5-C3.4-D — Source archive integrity verification procedure

**Status: PREPARED / EXECUTION PENDING / DISTRIBUTION NO-GO.** Actual archive bytes have not been retrieved and hashed in this checkpoint. This procedure is read-only with respect to the application repository and existing staged binaries.

## Upstream archives and expected SHA-256 (Homebrew source formula metadata)

| Component | Source URL | Expected SHA-256 |
|---|---|---|
| libvpx v1.17.0 (ARM64) | https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz | `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a` |
| libvpx v1.16.0 (Intel) | https://github.com/webmproject/libvpx/archive/refs/tags/v1.16.0.tar.gz | `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` |
| Opus v1.6.1 (both) | https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz | `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1` |

## Suggested macOS verification (download to temporary audit directory; no install or rebuild)

```bash
set -euo pipefail
audit_dir="$(mktemp -d "${TMPDIR:-/tmp}/ri2-c34d.XXXXXX")"
cd "$audit_dir"
curl -fL --retry 3 -o libvpx-1.17.0.tar.gz https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz
curl -fL --retry 3 -o libvpx-1.16.0.tar.gz https://github.com/webmproject/libvpx/archive/refs/tags/v1.16.0.tar.gz
curl -fL --retry 3 -o opus-1.6.1.tar.gz https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz
cat > expected-sha256.txt <<'EOF'
1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a  libvpx-1.17.0.tar.gz
7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c  libvpx-1.16.0.tar.gz
6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1  opus-1.6.1.tar.gz
EOF
shasum -a 256 -c expected-sha256.txt
shasum -a 256 *.tar.gz > observed-sha256.txt
printf 'Audit directory: %s\n' "$audit_dir"
```

A mismatch must be treated as FAIL and investigated (including possible archive regeneration), **not** replaced with an unverified hash. Preserve the observed output and upstream download URLs. Successful hashes verify downloaded archives against source-formula expectations; they do not establish original CI bottle identity or corresponding-source compliance.

## Completion criteria

Capture three `OK` results, hashes and source URLs, then record user-executed verification. Do not mark C3.4-D PASS until that evidence is received. Original runtime acceptance remains unchanged.

**Restrictions:** no changes to Working/main/Draft PR #14, no production export activation, no binary rebuild, and no distribution.
