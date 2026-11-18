# RFDR-RI1.2 Controlled Integration Manifest

Status: PREPARATION ONLY — no implementation transfer authorized.

## Sources and boundaries
- Baseline: `Working` at branch creation.
- FFmpeg candidate: `RFDR-A1.5-D4.6.5-WebM-Muxing-Prototype` (validated commit `f206df87d4ee9e68f252358f22fc1b36586228ef`).
- Separate draft: PR #14 (`RFDR-Animatic` → `Working`), do not alter or merge.
- Protected: do not modify `Working` or `main` without explicit approval.

## Selective transfer candidates (NOT approved for transfer)
1. Deterministic frame scheduling, metadata, artwork, audio mixing, project adapter and coordinator (`src/deterministic-*`, `src/isolated-*`).
2. Isolated FFmpeg sink, runtime, sessions, backend, output lifecycle, IPC contract, bridge, registration and transport (`desktop/isolated-*`).
3. Narrow, reviewed changes to `desktop/main.cjs`, `desktop/preload.cjs`, `src/App.tsx`, and `src/desktop.d.ts`.
4. Matching N2/N3 production tests, security/resource-limit tests, packaged Electron end-to-end tests, and ARM64/Intel packaging gates.

## Explicit exclusions until separately approved
- Feasibility-only Mediabunny path, historical diagnostic scripts and experimental workflows.
- Direct wholesale prototype merge or cherry-pick of its entire history.
- Replacing the existing MediaRecorder animatic export before dual-path regression acceptance.
- Production enabling of test-only FFmpeg switches or distribution of the CI marker.

## Preservation / acceptance gates
- Camera: IN/OUT selection, scene-local inheritance, intermediates, rotation, copy/paste, mask, playback, cancellation.
- Drawing: clipping, onion-skin alignment, fill boundary, color picker, undo/redo.
- Audio: rapid drag/trim, synchronization, save/reopen.
- Export: existing animatic and isolated FFmpeg, real-project duration/audio/camera fidelity, cancellation/recovery, save/reopen.
- Security: strict IPC contracts, project trust boundaries, resource limits, no unbundled Homebrew runtime dependencies, non-GPL FFmpeg distribution audit.
- Platforms: packaged ARM64 and Intel x64 automated acceptance; manual acceptance before release.

## Next steps (read-only first)
1. Record baseline commit SHA and run existing `Working` regression gates on this branch.
2. Map source imports/IPC interfaces and required test coverage; identify conflicting files with PR #14.
3. Propose a file-level, ordered selective transfer for explicit approval.
4. After approval only: transfer in small checkpoints, verify regressions, then perform platform acceptance.

Release decision: NO-GO pending integration, regression and release approvals.
