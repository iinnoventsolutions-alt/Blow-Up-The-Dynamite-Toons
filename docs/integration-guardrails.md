# Integration safety and acceptance baseline

The target for accepted integration is `Working`. `main` remains separately protected and requires explicit user authorization. A successful build is **not** proof that a previously accepted feature was preserved.

## Non-negotiable process

1. Start each correction or enhancement from the latest `Working` SHA on a short-lived, narrowly scoped branch. Record the exact base SHA.
2. For an existing defect, add a failing, feature-level regression **before** production remediation; capture the red CI run and reproduce the reported behavior.
3. When reusing fixes from an old/diverged branch, transfer the **implementation, dependent files, and the accepted regression tests** together. Compare the source acceptance commit to the destination and record any intentionally omitted files. Do not merge an entire divergent integration branch just because one fix is needed.
4. Keep an acceptance baseline ledger below. A fix is not integrated if its acceptance test has been omitted from the mandatory test suite.
5. Run full unit/UI regressions, security checks, PR checks, and the appropriate macOS installer test. PR checks must target `Working` even when source branch names differ.
6. Before merge: read-only compare the PR to `Working`; verify accepted behavior, tests, unexpected file changes, mergeability, and required checks. Require explicit user authorization for the merge.
7. After merge: run CI **on the `Working` merge SHA**, then a focused real-app smoke test covering every touched/adjacent rendering or interaction feature. Do not declare final closure with a known regression.
8. Never change or merge `main` without separate user approval. Keep the separate RB0 draft PR untouched unless explicitly instructed.

## Accepted-feature regression ledger

| Contract | Known-good reference/evidence | Mandatory regression gate | Important invariant |
|---|---|---|---|
| Onion-skin sizing and zoom alignment | Run [42450733526](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42450733526), commit `78e052ce5b16f7cf2e6bf9b6f96fcc1c9afce7c1`; RC1.1-F1.2 M1 accepted | `tests/ui-onion.mjs`, `tests/ui-onion-alignment.mjs` | Ghost and active drawing use identical 25% extended canvas geometry, including zoom |
| Drawing camera playback border/clipping | C2.4 accepted on `RFDR-Integration-Testing`, 8/8 M1 | `tests/ui-camera.mjs` | Off-canvas artwork visible within moved camera frame is not clipped |
| Color Picker | C2.5 accepted on `RFDR-Integration-Testing`, 10/10 M1 | `tests/ui-camera.mjs` | Cursor sampling includes drawing margin at zoom/pan |
| Audio rapid-release snapback | E2-AUD-01 F4 accepted, 8/8 M1 | `tests/diagnostics/e2-aud-01-rapid-release.mjs`, `tests/diagnostics/e2-aud-01-f3-event-trace.mjs` | Clip edits persist on rapid pointer release, Undo/Redo, reopen |
| Animatic export (WebM / Electron) | E2-AUD-01-Resolution run [42450733526](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42450733526), commit `78e052ce5b16f7cf2e6bf9b6f96fcc1c9afce7c1`; RFDR-A1.1 red contract run [42751485783](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42751485783) | `tests/animatic-electron-handshake.test.mjs`, `tests/ui-audio.mjs`, packaged Electron ARM64 manual export | Explicit canvas frame submission, optional audio track, encoded frame/audio content, finite duration and final data flush; verify real Electron after build |
| Sequential camera / clipboard / rotation | Run 42450733526; C2.3 M1 10/10 | `tests/ui-camera-sequential.mjs`, `tests/sequential-camera.test.ts`, `tests/sequential-camera-clipboard.test.ts` | Scene-local IN/OUT inheritance and intermediate keyframe continuity |

## Why C3.5 was needed

The accepted source commit contained `src/OnionSkin.tsx` with `drawingMargin=.25` and `tests/ui-onion-alignment-f0.mjs`. A later selective camera integration carried other source files but **omitted both**. `Working` retained a 1920x1080 onion canvas while the drawing canvas was 2400x1350. A narrow feature regression on the isolated C3.5 branch caught the missing geometry contract. The restored test is now part of `npm run test:ui`.

## Required PR review questions

- Which accepted build or commit is the source of truth for each changed feature?
- Did every dependent source file and regression test transfer?
- Have all changed rendering paths (drawing, onion, camera, playback, export) been checked for shared coordinate-space contracts?
- Are the PR HEAD, `Working` base, and CI-tested SHA identical to what is being approved?
- Have the required PR jobs and a post-merge `Working` run completed successfully?
- Has manual acceptance on a real ARM64 installer been recorded?
