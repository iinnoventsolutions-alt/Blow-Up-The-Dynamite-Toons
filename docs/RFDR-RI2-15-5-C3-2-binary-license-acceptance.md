# RI2.15.5-C3.2 — FFmpeg binary-specific license evidence

**Status: PASS — ARM64 and Intel x64; C3.2 technical verification CLOSED.**

## User-executed evidence

User executed `shasum -a 256 bin/ffmpeg` and `bin/ffmpeg -hide_banner -L` against the staged C2 runtime for each architecture.

| Architecture | Observed SHA-256 | Previously approved B3 SHA-256 | Result |
|---|---|---|---|
| ARM64 | `b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f` | same | PASS |
| Intel x64 | `9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc` | same | PASS |

Both `ffmpeg -hide_banner -L` outputs state: `GNU Lesser General Public License`, version `2.1` or, at the recipient's option, any later version. Both include standard no-warranty text and license-copy notice. Outputs agree across architectures.

**Scope:** Binary-specific self-reported FFmpeg license output and hash match to approved staged executable. Does not by itself establish the license status or source obligations of separately bundled libvpx/libopus, full corresponding-source availability, complete LGPL compliance, or distribution authorization.

**Next:** C3.3 source provenance, exact component source archives/tags/checksums, patches, and build instructions; retain separate compliance/legal and distribution gates.

**Restrictions:** No binaries rebuilt, production export activation, installer distribution, or changes to Working/main/Draft PR #14. Documentation only on isolated branch.
