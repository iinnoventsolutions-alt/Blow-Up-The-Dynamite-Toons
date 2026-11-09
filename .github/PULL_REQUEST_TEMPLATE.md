## Scope and source baseline
- Source branch / base Working SHA:
- Accepted source commit or known-good installer:
- Intended files/features:
- Dependencies or source files intentionally *not* included (with rationale):

## Acceptance-preservation ledger
- [ ] Compare transferred implementation **and existing tests** against accepted source commit
- [ ] Onion-skin geometry / zoom alignment remains correct
- [ ] Drawing playback camera-border clipping remains corrected
- [ ] Color Picker coordinates remain accurate
- [ ] Audio rapid release and editing persist
- [ ] Sequential camera IN/OUT/intermediates, clipboard, rotation remain correct
- [ ] Unrelated changes reviewed and excluded

## Validation
- [ ] New defect: failing regression recorded before correction (link):
- [ ] `npm test` and `npm run test:ui` PASS
- [ ] Full-regression, audio-regression, security PR jobs PASS
- [ ] Electron builder and malware-scan checks PASS
- [ ] ARM64 manual acceptance (scope and result):
- [ ] Explicit user merge authorization obtained
- [ ] Post-merge `Working` SHA CI and smoke test planned

References: `docs/integration-guardrails.md`. **Never modify `main` without separate approval.**
