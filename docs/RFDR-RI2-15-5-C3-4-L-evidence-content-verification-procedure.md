# RI2.15.5-C3.4-L — Original CI evidence content verification

**Status: READ-ONLY CONTENT EXTRACTION PENDING USER RESULTS. C3.4 OPEN; DISTRIBUTION NO-GO.**

## Purpose

C3.4-K verified the presence of 27 files per architecture, including all six required evidence categories, but did not inspect their actual contents. This checkpoint compares the **contents** of original CI source identity, FFmpeg configure options, provenance, and relocation/linkage records without changing source packages or runtime binaries.

## User-side procedure

Run the Python 3 script supplied in the conversation from the existing `~/Projects/RI2-C34H-Source-Review` folder. It:
- Verifies required files are present in `evidence/original-ci/{arm64,x64}`.
- Checks whether `ffmpeg-source-sha.txt` mentions pinned FFmpeg commit `db69d06eeeab4f46da15030a80d539efb4503ca8`.
- Compares exact bytes of `buildconf.txt` across architectures and checks expected feature flags (no GPL/nonfree enabling flags).
- Summarizes provenance and relocated-link file sizes/hashes, and reports dependency-version mentions without treating them as proof of historical bottle identity.
- Writes only a sanitized content-verification summary to `C3.4-L-EVIDENCE-REVIEW.txt` in the review root. Does not publish raw provenance or absolute paths.
- Reports `PASS` for successful execution and source/config consistency; a pass does not mean legal approval.

## Acceptance boundary

Do not mark C3.4-L closed until user supplies actual report. If FFmpeg source SHA file uses an abbreviated hash or differently formatted text, review before interpreting as failure. The historical Homebrew bottle/formula/patch exception remains open unless independently supported by primary evidence. The actual `configure.log` and `PROVENANCE.txt` may contain environment-specific paths; never automatically publish raw contents.

No modifications to Working, main, Draft PR #14, binaries, runtime export gates, or release. **Distribution NO-GO.**
