# Security-Audit-W — sprintf-js advisory investigation

Date: 2026-10-16
Scope: Security-Audit-W only. No changes approved for Working/main.

## Baseline

- `package.json`: `electron-builder: ^26.15.3`.
- Locked baseline: `electron-builder@26.15.3`, `app-builder-lib@26.15.3`, nested `@electron/get@3.1.0`, `global-agent@3.0.0`, `roarr@2.15.4`, `sprintf-js@1.1.3`.
- Advisory: GHSA-hp3w-g68c-fv3c, unbounded precision specifiers / denial of service; no published patched `sprintf-js` at time of review.
- Local user baseline audit: 8 moderate, 0 production findings.
- GitHub CI trial 38930043879: temporary `electron-builder@26.17.0`, still 8 moderate, 0 production findings; 54/54 tests and build pass; ARM64 and x64 unsigned DMGs generated; packaging succeeds with `--publish never`.
- The `26.17.0` trial modified dependency resolution only inside the CI runner. Checked-in lockfile still resolves `26.15.3`.

## Dependency chain

```
electron-builder → app-builder-lib → @electron/get
                 → global-agent@3.0.0 → roarr@2.15.4 → sprintf-js@1.1.3
```

The advisory's eight affected package entries represent one transitive vulnerability chain; they are not eight independent confirmed flaws. npm's production-only audit found zero known vulnerabilities, but that is not proof the Electron runtime, developer machine, or build pipeline is secure.

## Risk and remediation decision

- Risk context: development/build dependency; exposure is primarily during build-time code execution, subject to actual crafted-format-string reachability.
- Do not automatically `npm audit fix --force`: it proposes a potentially breaking Electron Builder downgrade.
- Do not apply an unsupported direct override to a non-existent patched version.
- Do not treat successful DMG creation as an installation, signing, Gatekeeper, notarization, Intel hardware, or runtime security test.
- Keep the finding OPEN until the transitive chain is removed or a maintained, validated fix is identified.
- Re-run `npm audit --json` and `npm audit --omit=dev` when trialing future dependency changes. The isolated workflow now generates a baseline-versus-candidate summary.

## Next experiment

On Security-Audit-W, evaluate whether a maintained upstream Electron Builder / @electron/get release removes `global-agent` and `roarr`. If a concrete candidate exists: pin its exact version; compare `npm ls sprintf-js roarr global-agent @electron/get` and both audit JSON outputs; run all model and browser tests; package both macOS architectures with `--publish never`; then test ARM64 installation on the user's M1 Mac.

References:
- https://github.com/advisories/GHSA-hp3w-g68c-fv3c
- https://github.com/iinnoventsolutions-alt/IInovent-Storyboard-Pro/actions/runs/38930043879
