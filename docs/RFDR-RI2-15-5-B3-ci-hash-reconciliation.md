# RI2.15.5-B3 — Original CI runtime checksum comparison

**Result: PASS — 6/6 SHA-256 comparisons match.** Recorded 2026-11-20. Evidence consists of user-supplied output from local dual-runtime audit and checksum manifests downloaded from GitHub Actions run [44661662574](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44661662574). This document records a comparison of reported values; it does not independently read the user's local binaries.

| Architecture | File | SHA-256 | Comparison |
| --- | --- | --- | --- |
| ARM64 | bin/ffmpeg | b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f | MATCH |
| ARM64 | lib/libvpx.12.dylib | 2dde11fb9fe1989ba5e527644f73c7b1a3f97dc4ba19a03aa79724e25ec19d3d | MATCH |
| ARM64 | lib/libopus.0.dylib | 3da5c30dbd08758134e0ba448499114f829736d28134c00b964cf6e73d3bef80 | MATCH |
| Intel x86_64 | bin/ffmpeg | 9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc | MATCH |
| Intel x86_64 | lib/libvpx.12.dylib | 25ac39ba340a401b8fa2483a737a6da812f1653baa0637336dc83e68e3c11ba3 | MATCH |
| Intel x86_64 | lib/libopus.0.dylib | 761ed15901bb3a71954ed01388db64260c4915c3892a0c943a50c2e16ed68fea | MATCH |

## B2+B3 decision

**Isolated FFmpeg runtime integrity verification: CLOSED based on supplied evidence.** B2 reported expected architectures, bundled dependency paths, valid signatures, no errors; B3 reconciles all six hashes with original CI evidence. The comparison closes the prior missing approved-hash comparison for these six runtime files.

**Not approved:** The final Electron .app/DMG has not been inspected; inclusion of notices and corresponding source delivery is unverified; app-wide security/privacy testing and clean installer acceptance remain open. RI2.15.5-B overall remains OPEN until package-level verification. Developer ID signing and notarization remain conditionally deferred solely for private team/invited-tester distribution.

## Next: RI2.15.5-C

Inspect actual private installer and embedded FFmpeg for both architectures, validate DMG and .app contents, hashes, source/notice placement, dependency/security checks, Gatekeeper installation handling, and clean-machine behavior. Do not activate production distribution without explicit approval.

Protected: Working, main, Draft PR #14; no merge, release or public distribution authorized.
