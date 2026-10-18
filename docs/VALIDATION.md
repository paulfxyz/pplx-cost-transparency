# Validation

This project has two small UI additions and one shared conversion rule. Automated tests use synthetic balances, never a real account.

## Acceptance inventory

| Requirement | Check |
| --- | --- |
| Dollar icon, `Cost equi.`, right-aligned USD below Session usage | DOM assertions and rendered light/dark screenshots |
| Parenthesized USD beside Available org credits | Exact label targeting, placement and balance-change assertions |
| $600 per 50,000 credits | Shared parser/converter unit tests, including 218.77 → $2.63 |
| Values stay current | Text-node changes, text replacement, panel rerenders and remounts |
| No duplicate or stale rows | Repeated injection, source removal, unavailable values and route cleanup |
| No confusion between usage and available pool | Decoy balance, refill, grant and usage-total fixtures |
| Native styling | Inherited theme colors, side-by-side row alignment and light/dark screenshots |
| Narrow layouts | Browser checks at 375 px, then back to desktop |
| No website networking or privileged extension APIs | Manifest review, source review and intercepted browser fixtures |
| Installable unpacked extension, not just script injection | Actual Manifest V3 loading in isolated Chromium |

## Validation boundary

The native session row and organization balance structure were inspected in the signed-in website on October 18, 2026. Only generic structural fixtures are committed; screenshots and public examples use synthetic values.

The automated browser suite loads the actual extension and substitutes local HTML fixtures at the relevant URLs. That verifies extension injection and UI behavior in Chromium, not installation in every Chrome or Comet release, live billing accuracy, or a browser's management policy.

An additional live-page DOM preview on the same date used temporary browser automation to run the source JavaScript and CSS. Both conversions matched their displayed source counts; the session row's placement, right alignment, font and color matched, and the organization suffix appeared inline with the native balance.

That preview did not install the extension, modify credit values, change billing settings or bypass an extension policy. The temporary tabs were closed after the checks, and no private screenshots or balances were added to the repository.

An installed Comet/macOS follow-up on October 18, 2026 did not pass: version 1.0.0 was enabled, the manifest and runtime files matched the release byte for byte, and both Perplexity domains were granted with no withheld permissions. The native usage anchor was present in a fresh session, but the extension's row and stylesheet were absent.

No security configuration was changed during that initial diagnosis. A passing Chromium test was not treated as proof of installed Comet compatibility; the separately approved follow-up below established the working configuration.

Other extension maintainers document Comet's default restriction on Perplexity pages, consistent with the observed failure ([Complexity's report](https://github.com/pnd280/complexity/blob/nxt/perplexity/extension/docs/articles/comet-enable-extensions-article.md), [Quorum's macOS notes](https://github.com/JacobStephens2/quorum-perplexity-council-tracker/blob/main/docs/comet-setup.md)). See the README's compatibility section rather than assuming that enabling the extension is sufficient.

## Installed Comet acceptance

On October 18, 2026, the user separately approved a policy exception for the installed extension ID on the two exact HTTPS Perplexity origins. Local administrator approval created a root-owned, mode-644 managed-preferences file containing only that entry, with a guarded undo record; no global extension-unblocking flag or preference daemon was changed.

Refreshing the policy page did not initially load the new setting. After a normal Comet quit and restart, the previous window and tab counts were restored, and `chrome://policy` showed the scoped `ExtensionSettings` rule with status `OK`.

The following checks then passed on freshly opened live pages, without manually injecting the extension source:

- **Session row:** Exactly one cost row directly below Session usage, with matching USD arithmetic, font, color and right alignment.
- **Organization balance:** Exactly one inline, parenthesized equivalent beside the native available-credit balance, with matching arithmetic and font.
- **Actual live update:** The native session credit count advanced between observations, and the installed extension's USD value matched the updated count.
- **Collapse and reopen:** The addition was hidden when Usage collapsed and returned once, with the correct value, when reopened.

This verifies the approved, scoped macOS Comet setup, not the default installation or every future Comet build. The extension itself is still version 1.0.0; the successful change was outside the extension, in explicitly approved browser policy.

## Release check

Version 1.0.0 passed 75 parser, conversion, DOM and manifest tests, plus the actual-extension Chromium browser flows. Light/dark screenshots and 375 px layouts were visually reviewed, including updated and unavailable states, without finding clipping, duplicated additions or stale fallback values in the covered cases.

The test suite is a regression check for the documented fixtures, not a guarantee against future website changes. See the validation boundary above for what remains manual.

## Run the checks

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run screenshots
npm run package
```

No live account, API key or browser profile is needed for these checks. The screenshots script uses the same extension-loading path as the browser suite.
