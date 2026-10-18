# Changelog

## 1.1.0 · 2026-10-18

Adds an optional, manual macOS Comet helper and documents moving a developer-mode installation to a permanent directory. The extension's browser permissions and USD conversion rate are unchanged.

- **Optional helper:** Read-only status/preview, explicitly confirmed setup, ID migration and guarded undo.
- **Safety:** Rejects wildcard IDs and conflicting entries, retains private recovery snapshots, preserves unrelated policies and detects concurrent changes.
- **No automatic changes:** Requires macOS and Node.js 20+ only for the optional helper; does not install software, restart browsers, contact a server or change global scripting flags.
- **Relocation:** Explains which files can be deleted, why the active unpacked directory must remain, and how to update an ID-specific exception after moving.
- **Price-basis wording:** Aligns the tooltip, manifest and overview graphic with the author's `brut`/gross wording; the $0.012-per-credit calculation is unchanged.
- **Validation:** Adds policy-planner tests and macOS integration tests using redirected temporary fixtures, not the live browser policy.

## Verified scoped Comet setup · 2026-10-18

The installed extension now passed live Comet/macOS acceptance after a separately approved per-extension policy exception and a full browser restart. The runtime remains version 1.0.0; this was a browser configuration change, not a converter patch.

- **Scope:** Only the installed extension ID, and only the two HTTPS Perplexity origins. No all-extensions wildcard or global scripting flag was enabled.
- **Verification:** Both USD displays, a real session-counter update, native styling and collapse/reopen behavior passed.
- **Documentation:** Added a scoped setup and undo guide and replaced the previously unverified compatibility status with the observed result.
- **Author acceptance:** The author confirmed that both amounts were visible; the README now explains why enabling the extension alone was insufficient and what the approved setup required.

## Documentation correction · 2026-10-18

An installed Comet/macOS follow-up found that the enabled extension did not inject on Perplexity despite matching files and granted host access. The README and validation notes now make the Comet limitation explicit rather than describing it as only a possible managed-profile caveat.

- **No false fix:** The converter and observer have not been changed to imply that JavaScript can override a browser restriction.
- **No security changes:** No broad extension-enablement patch or browser policy was applied during diagnosis.
- **Acceptance boundary at that stage:** A separately approved policy exception still needed testing. The subsequent verified setup is recorded above.

## 1.0.0 · 2026-10-18

First public version of Perplexity Cost Transparency. It adds a local USD equivalent to the two requested Perplexity credit displays.

- **Session usage:** Native-looking dollar icon, `Cost equi.` label and right-aligned USD value.
- **Organization credits:** Parenthesized USD equivalent alongside the available shared-pool balance.
- **Shared conversion:** Explicit $600 net / 50,000 credits assumption, equal to $0.012 per credit.
- **Synchronization:** Mutation-driven updates, rerender recovery, collapsed/remounted panels and single-page navigation.
- **Safe display:** No stale fallback to zero, no guessed compact amounts, no original balance replacement.
- **Distribution:** Manifest V3, no build needed to install, source repository, install ZIP and checksum.
- **Documentation:** Light/dark screenshots with sample values, original overview graphic, privacy notes and transparent compatibility limits.
