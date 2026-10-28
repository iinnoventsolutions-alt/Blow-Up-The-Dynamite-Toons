# R1.1 — Release Baseline and Candidate Checklist

Status: PREPARATION — no public release authorized.
Branch: `Working` (after approved R1.0 fast-forward).
R1.0 security assessment: [review record](R1_0_Security_Assessment.md).
Target: Apple Silicon (arm64) and Intel (x64), macOS 13+.

## Baseline decisions

- Retain application package version `1.0.0` and project-format version `1` until an explicit release-version decision. The schema version is independently `4`.
- Current build identifier is `10152026.1310`; record a new timestamped build identifier only when the release candidate is selected. Do not silently change project-format metadata.
- Existing CI workflow and DMG filenames explicitly reference `1.0.0`. A version bump must update those assertions and the lockfile consistently.
- The current security-trial DMGs are **ad-hoc signed and unnotarized**. They are appropriate for controlled validation, **not a cleared public macOS distribution**.
- Keep `Release` as the final candidate branch, then promote `main` only after explicit approval.

## R1.1 acceptance checklist

- [x] Merge the approved R1.0 assessment and regression tests into `Working`.
- [ ] Verify the first post-merge `Working` CI run and record its URL.
- [ ] Confirm target release version, build number, minimum OS, architecture support and installer names.
- [ ] Prepare release notes describing camera, offline help, five-frame onion-skin controls and security changes; verify feature claims against app behavior.
- [ ] Document installation, first launch, local project backup and recovery, and known limitations.
- [ ] Select controlled-testing vs public-distribution path, including Developer ID credentials and notarization requirements where applicable.
- [ ] Freeze the R1.1 baseline only after acceptance of the above.

## Later release gates

- **R1.2:** Real M1 and Intel hardware install/launch, file association, save/recovery, camera/onion/audio/PDF, upgrade, and performance testing. Use [native Mac validation plan](Milestone_7_Mac_Release_Validation.md).
- **R1.3:** Developer ID signing, hardened runtime and notarization for public distribution; verify Gatekeeper behavior. Ad-hoc signatures do not satisfy this gate.
- **R1.4:** Compare `Release` to `Working` before updating it, run full candidate CI and installer integrity checks, record SHA-256 checksums and release artifacts.
- **R1.5:** Require explicit authorization before publishing or promoting `main`.

## Known outstanding limits

No native hardware results have been recorded in the repository's validation plan. Successful CI packaging is not proof of install/launch on both CPU architectures. No notarization or public Gatekeeper clearance has been established.
