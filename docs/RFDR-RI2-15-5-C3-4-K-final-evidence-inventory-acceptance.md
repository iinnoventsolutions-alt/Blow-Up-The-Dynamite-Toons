# RI2.15.5-C3.4-K — Final evidence inventory and cross-architecture assessment

**Status: PASS — C3.4-K inventory and six-category presence CLOSED. Content completeness and C3.4 compliance OPEN. Distribution NO-GO.**

## User-provided local evidence inventory

User supplied `C3.4-K-EVIDENCE-INVENTORY.txt` contents following successful local script execution. Each architecture has 27 files. Both arm64 and x64 have all six requested categories with exact filenames: `buildconf.txt`, `configure.log`, `ffmpeg-source-sha.txt`, `PROVENANCE.txt`, `binary-sha256.txt`, `ri2-7-relocated-links.txt`.

The user-provided SHA-256 values establish:
- `buildconf.txt`: both `78ee6b5a6676d6bd903c7543215a6837ccfa8703dad53b722c34bc4c9326db7d`.
- `ffmpeg-source-sha.txt`: both `a3e5582bbea44821462014d9e40ce9893d5c9ac6b81e2eb41a88779e67803141`.
- `ri2-7-relocated-links.txt`: both `c05d1c6f7a64fb75988472e0bd189edf2691bc71ec6ce6f287dad9bac6f014c9`.
- `configure.log`: arm64 `8f9e930998a85c09f739a8b7440f96cc3b5ec0a16f822e55f4f4313c1a15adb2`; x64 `aa6fe9ca95d329768ebcb59f105852b695c82261ed1f1d14695696838e26d5ef`.
- `PROVENANCE.txt`: arm64 `cc0322857dd892f56ac3e5739dae7bd973c37d78c765f7addf757760955ade93`; x64 `f4ae4beeb1f3f8b0487ff057e121318044ef50b785b798ce737ae22de79ca54d`.
- `binary-sha256.txt`: arm64 `75b70a64d1cc9e6259ac914f1642191efe2d74a51602968b44085878a22470be`; x64 `b06d8b089bf032bea1337a99de88df03984144f8b324d455c091da0fed817f6e`.

Other same-hash examples include `encoders.txt`, `filters.txt`, `muxers.txt`, and `ri2-8-relocated-closure.json`; architecture-specific hashes differ for `otool-L.txt`, `binary-architecture.txt`, and `ri2-6-dependency-closure.json`. Equal hashes establish byte equality of those files, **not** necessarily equality of linked runtime binaries or complete instructions.

## Decision and limitations

**C3.4-K PASS / CLOSED:** both directories populated; 27 files each; six required named evidence categories present; cross-architecture digest comparison completed.

**Not verified by this inventory:** textual contents of those files, pinned compiler/SDK, exact historical Homebrew formula/bottle/patch lineage, complete recipient build instructions, license notices, LGPL obligations, and recipient source delivery. The assistant did not independently read the locally downloaded evidence bytes; digest inventory was user-provided.

**Next recommended C3.4-L:** narrowly extract the actual text of build configuration, source SHA, provenance and relocation/link evidence (with sensitive information reviewed before sharing) to assess *content* gaps, then update reviewer packet. No repeat downloads, rebuilds or application tests.

No changes to `Working`, `main`, Draft PR #14, runtimes or production export. **Distribution NO-GO.**
