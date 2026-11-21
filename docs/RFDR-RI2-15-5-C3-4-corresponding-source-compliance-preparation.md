# RI2.15.5-C3.4 — Corresponding-source and license compliance preparation

**Status: OPEN — documentation preparation only; not legal advice or release authorization.**

## Baseline

- Approved staged FFmpeg binaries self-report GNU LGPL v2.1-or-later (C3.2); source is upstream FFmpeg `n7.1.1` commit `db69d06eeeab4f46da15030a80d539efb4503ca8`.
- External codec components are libvpx ARM64 1.17.0 / Intel 1.16.0, Opus 1.6.1 both, from Homebrew bottles; historical exact bottle identity remains unresolved.
- Four notice files exist under `release-audit/licenses/`; existing inventory checks establish presence, **not completeness**.
- Production export remains gated; current distribution is not authorized.

## Compliance package to prepare (no distribution yet)

| Workstream | Required evidence | Owner / decision |
|---|---|---|
| Component bill of materials | Architecture, component, source URL/tag/commit, source SHA, actual binary hash, formula revision and patches; explicitly flag unknown historical bottle digests | Build engineering |
| FFmpeg corresponding source | Obtain exact n7.1.1 tree, configure flags, build commands/toolchain, all relevant local modifications and notices; confirm reproducibility scope | Build engineering |
| Codec corresponding materials | Obtain source releases and actual Homebrew build formula/patches per architecture; preserve source archives and notices; unresolved bottle identity must be disclosed | Build engineering |
| License inventory | Verify complete FFmpeg LGPL text, libvpx/Opus BSD-3-Clause terms, copyright notices, any other linked dependencies, and recipient accessibility | Release engineering + legal |
| LGPL compliance | Review dynamic/static linking, recipient library replacement/relinking feasibility, debugging/reverse-engineering restrictions, and license-specific source delivery/offer obligations | Legal + engineering |
| Recipient delivery | Specify how source/build materials and notices are made available to recipients and maintained for applicable retention period | Release owner + legal |
| Release prerequisites | Production export activation, packaged end-to-end acceptance, Apple Developer ID/notarization approach and explicit distribution approval | Release owner |

## Acceptance rules

C3.4 may close only after the required materials and decisions are independently checked. If exact bottle lineage cannot be established, record risk and reviewer disposition rather than marking it PASS. Existing technical tests do not substitute for licensing or distribution approval.

## Boundaries

Documentation-only on `RFDR-RI2-Production-Readiness`. Do not change binaries, Working, main, Draft PR #14, production export flags, package contents, or release channels without explicit authorization. **Distribution NO-GO.**
