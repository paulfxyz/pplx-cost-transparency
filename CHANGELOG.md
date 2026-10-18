# Changelog

## 1.0.0 · 2026-10-18

First public version of Perplexity Cost Transparency. It adds a local USD equivalent to the two requested Perplexity credit displays.

- **Session usage:** Native-looking dollar icon, `Cost equi.` label and right-aligned USD value.
- **Organization credits:** Parenthesized USD equivalent alongside the available shared-pool balance.
- **Shared conversion:** Explicit $600 net / 50,000 credits assumption, equal to $0.012 per credit.
- **Synchronization:** Mutation-driven updates, rerender recovery, collapsed/remounted panels and single-page navigation.
- **Safe display:** No stale fallback to zero, no guessed compact amounts, no original balance replacement.
- **Distribution:** Manifest V3, no build needed to install, source repository, install ZIP and checksum.
- **Documentation:** Light/dark screenshots with sample values, original overview graphic, privacy notes and transparent compatibility limits.
