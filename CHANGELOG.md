# Changelog

## Documentation correction · 2026-10-18

An installed Comet/macOS follow-up found that the enabled extension did not inject on Perplexity despite matching files and granted host access. The README and validation notes now make the Comet limitation explicit rather than describing it as only a possible managed-profile caveat.

- **No false fix:** The converter and observer have not been changed to imply that JavaScript can override a browser restriction.
- **No security changes:** No broad extension-enablement patch or browser policy was applied during diagnosis.
- **Next acceptance step:** A separately approved per-extension policy exception would need to be tested before claiming Comet compatibility.

## 1.0.0 · 2026-10-18

First public version of Perplexity Cost Transparency. It adds a local USD equivalent to the two requested Perplexity credit displays.

- **Session usage:** Native-looking dollar icon, `Cost equi.` label and right-aligned USD value.
- **Organization credits:** Parenthesized USD equivalent alongside the available shared-pool balance.
- **Shared conversion:** Explicit $600 net / 50,000 credits assumption, equal to $0.012 per credit.
- **Synchronization:** Mutation-driven updates, rerender recovery, collapsed/remounted panels and single-page navigation.
- **Safe display:** No stale fallback to zero, no guessed compact amounts, no original balance replacement.
- **Distribution:** Manifest V3, no build needed to install, source repository, install ZIP and checksum.
- **Documentation:** Light/dark screenshots with sample values, original overview graphic, privacy notes and transparent compatibility limits.
