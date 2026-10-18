# Validation

This project has two small UI additions and one shared conversion rule. Automated tests use synthetic balances, never a real account.

## Acceptance inventory

| Requirement | Check |
| --- | --- |
| Dollar icon, `Cost equi.`, right-aligned USD below Session usage | DOM assertions and rendered light/dark screenshots |
| Parenthesized USD beside Available org credits | Exact label targeting, placement and balance-change assertions |
| $600 net per 50,000 credits | Shared parser/converter unit tests, including 218.77 → $2.63 |
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

Comet installation in the user's own profile remains a manual acceptance step. A browser restriction on extensions cannot be validated away by a passing Chromium test, and this project does not change those restrictions.

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
