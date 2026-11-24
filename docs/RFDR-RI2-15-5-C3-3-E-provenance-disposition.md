# RI2.15.5-C3.3-E — Provenance evidence-gap disposition

**Decision: Investigation complete with documented exceptions. C3.3 technical evidence collection can stop; provenance completeness is NOT PASS, and distribution remains NO-GO.**

## Verified

1. Original Actions run `44661662574` and evidence artifacts `14594904533` (ARM64), `14596167258` (Intel).
2. Both FFmpeg builds: upstream tag `n7.1.1`, commit `db69d06eeeab4f46da15030a80d539efb4503ca8`, minimal configuration and documented build commands.
3. Original CI dependency installations: ARM64 libvpx 1.17.0 / Opus 1.6.1; Intel libvpx 1.16.0 / Opus 1.6.1.
4. All six staged FFmpeg, libvpx, and Opus runtime SHA-256 values reconcile with original CI artifacts (see C3.3-A).
5. Historical Homebrew/core formula snapshots identify source archives, checksums, license declarations and bottle candidates (see C3.3-D).

## Explicitly unresolved

- Original CI logs and artifacts do **not** prove the exact Homebrew formula revision and downloaded bottle SHA-256 for each codec. ARM64 libvpx 1.17.0 has differing historical/current candidate bottle digests. Neither may be asserted as the installed artifact without more evidence.
- Historical formula snapshots do not prove original bottle patches, build inputs, or source-to-installed-dylib correspondence.
- Source package availability, build scripts, notices, LGPL obligations, and any recipient-facing corresponding-source mechanism require separate review.

## Decision boundary

Stop repetitive runtime and manual application tests; carry these exceptions into C3.4. If an auditor or release reviewer requires exact bottle identity, retrieve preserved Homebrew install receipts/manifests or archived bottle metadata; otherwise mark as unresolved, not verified. Do not recompile or modify binaries to make provenance appear complete.

No changes to Working/main/Draft PR #14, no activation, signing-policy change, merge, or distribution. **Release gate NO-GO.**
