# RI2.15.5-C2.4-D3 — Signed application two-stage acceptance

**Result:** PASS for arm64 and x64, based on user-provided local verifier output. C2.4-D3 closed; distribution remains unauthorized.

Both runs reported `RI2.15.5-C2.4-D3 TWO-STAGE PASS` with `stagedB3Verified=true`, `postSigningHashesAreEvidenceOnly=true`, `distributionAuthorized=false`, `licenseCount=4`, `appSignatureVerified=true`, and `ffmpegExecutionVerified=true`.

| Architecture | Runtime | Approved staged B3 SHA-256 | Packaged post-sign SHA-256 |
|---|---|---|---|
| arm64 | bin/ffmpeg | b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f | 53403f3abe58087c5e0164aac1c0a3ab8572eb321e2ed3d386e388cdbe6a5024 |
| arm64 | lib/libvpx.12.dylib | 2dde11fb9fe1989ba5e527644f73c7b1a3f97dc4ba19a03aa79724e25ec19d3d | 65bbda27966222ee025d5e2f77ea3277626ef0ee86a03c6c7691b910d44dc431 |
| arm64 | lib/libopus.0.dylib | 3da5c30dbd08758134e0ba448499114f829736d28134c00b964cf6e73d3bef80 | 8723d36177521ed25e01239732aa1adb8a51371ad913ff4ed359df9ba7af50b0 |
| x64 | bin/ffmpeg | 9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc | 15133cf5091b170ee67d3fb27646a55317edc09f062fa6d81daa258ecb899281 |
| x64 | lib/libvpx.12.dylib | 25ac39ba340a401b8fa2483a737a6da812f1653baa0637336dc83e68e3c11ba3 | 376167ec5eb4f3f88e3cdd1c001373af1b619713014e9f6e78dadae5d4b77401 |
| x64 | lib/libopus.0.dylib | 761ed15901bb3a71954ed01388db64260c4915c3892a0c943a50c2e16ed68fea | 611abb9ed95aac62d5fa22d72a9c691e58af829d95b68553846a46f99ddd51fe |

The verifier checks staged B3 integrity, Mach-O architecture, code signatures, allowed linked library paths, license notices, internal-test staging status, app signature, and FFmpeg version execution. Results are not a full application functional acceptance, notarization, or redistribution permission.

**Recommended next checkpoint:** C2.5 native signed-unpacked-app smoke testing on ARM64 and Intel (launch, project open/save, camera and audio playback, export remains disabled, app quit/relaunch), followed by licensing/corresponding-source review. Keep production export disabled; do not change Working, main, or Draft PR #14; no release or distribution.
