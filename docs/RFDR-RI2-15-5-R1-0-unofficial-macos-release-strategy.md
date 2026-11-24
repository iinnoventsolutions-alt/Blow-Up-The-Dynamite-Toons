# RI2.15.5-R1.0 — Unofficial macOS distribution strategy and release gates

**Status: STRATEGY DECISION RECORDED; NO PRODUCTION BUILD OR DISTRIBUTION AUTHORIZED.**

## Owner decision

On 2026-11-20, the project owner confirmed **no Apple Developer ID certificate is available** and requested treating IInnovent Professional Storyboard as an **unofficial product**.

## Revised strategy

- Target a limited, independently distributed macOS release for **Apple Silicon (arm64)** and **Intel (x64)**, preserving both previously accepted architectures.
- **Developer ID signing and Apple notarization deferred**, not represented as completed or unnecessary for Gatekeeper-friendly distribution.
- Preserve integrity checks and any appropriate ad hoc signing for local build validation; ad hoc signing is **not** equivalent to Developer ID signing or notarization.
- Document that Gatekeeper may prevent or warn on first launch of an unnotarized downloaded app. Provide safe, user-initiated per-app opening guidance through macOS settings if applicable; do not recommend disabling Gatekeeper globally, removing quarantine broadly, or bypassing security checks.
- Production FFmpeg export remains gated until separately authorized production packaging and end-to-end acceptance.
- Legal/compliance review outcome is **user-reported no adjustments requested**, recorded in C3.4-O. Ensure required source and notices are actually included or accessible per reviewer-approved arrangement before any recipient distribution; no independently inspected L1–L5 reviewer signoff is claimed.

## Remaining release gates

1. **R1.1 — Read-only production package design:** enumerate architecture-specific runtime assets, package inclusion, notices/source access, checksums, and fail-closed verification.
2. **R1.2 — Explicit build authorization:** request project-owner permission before changing code, packaging, FFmpeg gates, or binaries.
3. **R1.3 — Production validation:** only after authorization, build/inspect each architecture, verify linkage, integrity, existing exports and FFmpeg-specific export, cancellation/recovery and save/reopen.
4. **R1.4 — Distribution documentation and acceptance:** record Gatekeeper limitations, safe install/open procedure, source/notice access, checksum verification and explicit final owner release approval.

**Current decision:** unofficial release path approved in principle; **release NO-GO** until technical and packaging gates complete. No modifications to `Working`, `main`, Draft PR #14, runtimes, export gates, or released artifacts.
