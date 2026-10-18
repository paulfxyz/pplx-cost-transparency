# Privacy

Perplexity Cost Transparency performs local arithmetic on credit amounts already displayed in a Perplexity tab. It has no account, server, API key, analytics SDK or telemetry.

## What it reads and changes

- **Computer sessions:** Finds the Session usage information button, reads the associated credit count and inserts a separate USD row.
- **Organization Usage:** Finds the exact available-organization-credits label, reads the associated balance and appends a parenthesized USD equivalent.
- **Navigation and page structure:** Observes DOM changes and the current path so additions stay in the intended context and update with the source.

The original credit numbers are not replaced. It does not purchase credits, change auto-refill, alter usage limits, submit forms or modify account settings.

## Permissions and scope

The manifest declares content-script access to the two HTTPS Perplexity origins. The origin-wide match is needed to handle navigation into a supported page without a full reload; code limits its UI behavior to Computer session URLs and the organization credits-usage URL.

Content-script access is technically broader than the two numbers being displayed. The source code shows how it is used: label discovery, bounded value reading and local DOM additions, without cookies, token extraction or API interception.

No `cookies`, `tabs`, `history`, `storage`, `scripting` or network interception API permissions are requested. There is no background service worker or remotely loaded extension code.

## Storage and networking

The extension makes no network requests and persists no information. It does not use local storage, extension storage, a database, logging of balances or an external relay.

The Perplexity website continues making its own requests independently. Downloading releases or viewing this repository contacts GitHub; the README's status badges are hosted by Shields.io, but none are loaded by the running extension.

## Removal and reporting

Remove the extension in the browser's Extensions page and reload the affected tabs to remove its DOM additions. There is no extension data store to clear.

When reporting an issue, redact private balances, account names, conversations and payment details. Public examples and repository screenshots use synthetic data.
