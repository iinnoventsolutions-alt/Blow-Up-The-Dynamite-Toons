# R1.0 Security and Vulnerability Assessment

Branch: `Security-Audit-W`. Baseline: `Working` commit `4ef8761bb372857968dcaef876582969082ae4d0`.

## Scope and release gate

Review security changes since the prior SA cycle before any merge to `Working`. The assessment covers Electron isolation and IPC, local project import/export and recovery, embedded media, camera and onion-skin data validation, dependencies, and macOS installer integrity. A successful CI run is necessary but does not replace native hardware testing, Developer ID signing, or notarization.

## Evidence reviewed

- Electron main window uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; denies popup windows and renderer navigation.
- Preload exposes fixed application operations. Main-process IPC sender validation checks the active window, main frame, and local application URL.
- Project import validates JSON structure, schema, IDs, camera ranges and frame boundaries, media URL formats, and a 128 MB file limit.
- Project save and recovery snapshots validate before writing. Atomic writes use exclusive private temporary files and rename; failed writes clean up staging files.
- PDF export checks ArrayBuffer type, a 128 MB limit, and the PDF header before presenting the save dialog. The check is a basic format check, not a full PDF parser.
- R1.0 regression tests added for malformed camera data and executable/remote image sources.
- CI evidence: [security trial #40635486832](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/40635486832) and [dependency audit #40635381151](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/40635381151) succeeded. The security trial includes model tests, browser regressions, dual-architecture packaging, checksums, and ClamAV scans.

## Risk register and follow-up

| Area | Observation | Status |
| --- | --- | --- |
| IPC sender trust | Authorization enforced for privileged channels | Reviewed; regression coverage present |
| Project validation | Structured import limits and camera validation present | Reviewed; targeted tests added |
| Persistence/recovery | Validated saves and private atomic staging files | Reviewed; targeted failure tests already present |
| PDF export | Header validation is not full document validation; output comes from the renderer and is written only after a save dialog | Documented limitation; no exploit confirmed |
| Dependency advisories | CI audit passed at tested commit | Recheck on final candidate |
| Signing/notarization | Installer workflow produces ad-hoc signed, unnotarized test builds | **Public distribution gate remains open** |
| Native Mac security behavior | CI cannot establish Gatekeeper or installer behavior on actual ARM64 and Intel Macs | **Hardware validation pending** |

## Exit criteria

1. All security and functional workflows pass on the final `Security-Audit-W` head.
2. No unresolved confirmed release-blocking vulnerability; remaining risks documented and approved.
3. Merge to `Working` only after R1.0 review and approval.
4. Preserve `Release` for candidate testing and keep `main` untouched until explicit promotion approval.

This is a living assessment record, not a claim of penetration testing or a certificate of security.
