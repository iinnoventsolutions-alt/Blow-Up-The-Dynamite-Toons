# RI2.15.4 conditional closure and RI2.15.5 private-distribution readiness audit

**Decision date:** 2026-11-20. **Scope:** noncommercial application distributed privately only to the development team and individually invited testers. No public downloads, app store, enterprise rollout, or general audience.

## RI2.15.4 — conditionally CLOSED

Developer ID signing and Apple notarization are **deferred, not technically completed**. Existing ad-hoc signing (`package.json` mac identity `-`) is retained for development/private testing. Gatekeeper may block or warn on downloaded unnotarized applications; provide Apple-supported per-app review instructions to trusted recipients rather than asking anyone to disable Gatekeeper or SIP. Do not represent the app as notarized or universally installable. Reopen this gate **before** any public download, broader uncontrolled sharing, managed deployment, or other distribution change. Noncommercial status does not itself exempt an application from macOS Gatekeeper checks.

## RI2.15.5 — current evidence and outstanding gates

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| ARM64 and Intel clean-host compatibility | PASS (user-attested) | RI2.14.4, 18/18 tests; preserve machine logs privately |
| Internal FFmpeg WebM build and relocation | PASS (CI) | Actions run 44661662574, both architectures |
| Exact-version third-party license inventory | PASS (CI, **inventory only**) | Actions run 44675561723; FFmpeg n7.1.1, libvpx 1.16.0, opus 1.6.1 |
| Developer ID signing/notarization | DEFERRED CONDITIONALLY | Private invited-user scope only; not a public release clearance |
| Actual binary license classification | OPEN | Capture `ffmpeg -L` for both final staged architectures; verify LGPL status and linkage |
| Corresponding source and copyright obligations | OPEN | Provide FFmpeg corresponding source/build scripts, component notices, libvpx/opus sources and source-access instructions as required; private redistribution still invokes license obligations |
| Final package content / SBOM / checksums | OPEN | Generate manifest from final *actual* installer and embedded runtime; verify versions, signatures, hashes, paths and absence of unexpected dependencies |
| Private installer acceptance | OPEN | Install, launch, export, update/reinstall, uninstall and verify user-data preservation on clean ARM64 and Intel Macs; record Gatekeeper handling without bypassing global protections |
| Security/privacy review | OPEN | Audit Electron IPC, external process invocation, filesystem permissions, archive/extraction safety, dependency scan and test-only secret handling |
| Distribution authorization | BLOCKED | Explicit approval required; no production FFmpeg distribution or release authorized |

## Efficient incremental route

1. **RI2.15.5-A**: Close binary-specific FFmpeg license evidence and exact-version source/notice delivery design, without publishing artifacts.
2. **RI2.15.5-B**: Produce a read-only SBOM/checksum/installer-content validation plan and automated test; run CI.
3. **RI2.15.5-C**: Perform private installer acceptance on native ARM64 and Intel hosts and review security findings.
4. **RI2.15.5-D**: Final release-readiness decision; require explicit user authorization before any distribution, merge, or release.

**Protected:** Do not modify Working, main or Draft PR #14. Do not activate production FFmpeg distribution, merge branches, or initiate a release.
