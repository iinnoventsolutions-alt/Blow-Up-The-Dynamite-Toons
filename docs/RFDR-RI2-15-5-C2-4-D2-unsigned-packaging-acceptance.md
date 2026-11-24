# RI2.15.5-C2.4-D2 — Unsigned packaging comparison acceptance

**Status: PASS / closed on user-reported local output.**

Unsigned unpacked macOS app resources matched the approved RI2.15.5-B3 SHA-256 values for all three files in both architectures.

| Runtime file | arm64 SHA-256 | x64 SHA-256 |
|---|---|---|
| bin/ffmpeg | b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f | 9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc |
| lib/libvpx.12.dylib | 2dde11fb9fe1989ba5e527644f73c7b1a3f97dc4ba19a03aa79724e25ec19d3d | 25ac39ba340a401b8fa2483a737a6da812f1653baa0637336dc83e68e3c11ba3 |
| lib/libopus.0.dylib | 3da5c30dbd08758134e0ba448499114f829736d28134c00b964cf6e73d3bef80 | 761ed15901bb3a71954ed01388db64260c4915c3892a0c943a50c2e16ed68fea |

Prior signed packaged app results showed changed FFmpeg executable hashes and hardened-runtime ad-hoc CodeDirectory signatures; the unsigned comparison supports signing as the cause of those changes. It does not independently prove post-sign runtime functionality or signature validity.

## Next: C2.4-D3 two-phase integrity and signing acceptance

1. Retain original B3 checksums as the pre-sign immutable-source gate.
2. Verify packaged signed binaries by architecture, code-signature validity, dylib linkage, expected license notices, and executable functionality; record post-sign hashes as separate evidence, **not replacements** for B3.
3. Keep production export disabled, installer distribution blocked, and corresponding-source obligations open.
4. Perform native ARM64 and Intel acceptance after signed-package checks.

No changes to Working, main, Draft PR #14, and no merge or distribution authorization.
