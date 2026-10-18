# Scoped Comet setup on macOS

Perplexity Cost Transparency 1.0.0 was verified in an installed macOS Comet browser after an explicitly approved exception for that extension alone and a full restart. The default unpacked installation did not inject on Perplexity pages.

This is a browser security configuration change, not an automatic extension feature. Do not apply it on a managed device without your administrator's approval; Perplexity documents Comet's managed-policy support, and the general per-extension approach is described by another extension maintainer ([Comet policies and controls](https://www.perplexity.ai/help-center/en/articles/13529668-comet-policies-and-controls), [Quorum's macOS notes](https://github.com/JacobStephens2/quorum-perplexity-council-tracker/blob/main/docs/comet-setup.md)).

## Keep the exception specific

Find your own installed extension ID on `chrome://extensions` with Developer mode enabled. Use that ID, not `*` and not an ID copied from someone else's machine.

The verified policy used `ExtensionSettings` with exactly these two allowed hosts. This JSON illustrates the intended policy structure; it is not a shell command or a ready-to-install plist:

```json
{
  "ExtensionSettings": {
    "YOUR_EXTENSION_ID": {
      "runtime_allowed_hosts": [
        "https://perplexity.ai",
        "https://www.perplexity.ai"
      ],
      "runtime_blocked_hosts": []
    }
  }
}
```

The macOS managed-preferences location used in the verified setup was:

```text
/Library/Managed Preferences/ai.perplexity.comet.plist
```

An administrator must encode the rule as a valid plist and preserve any existing configuration. Never overwrite an existing policy file with this example; inspect and back it up, then merge only the approved extension entry ([Quorum's macOS notes](https://github.com/JacobStephens2/quorum-perplexity-council-tracker/blob/main/docs/comet-setup.md)).

Our one-time setup was deliberately stricter: it stopped if a policy file already existed, created only the approved entry, and recorded the resulting file's hash for guarded rollback. No administrator password, installed extension ID, private balances or personal policy file is distributed in this repository.

## Restart and verify

Save unsaved browser work before a full, normal Comet quit and restart. In the verified installation, refreshing the policy page alone was insufficient to load the new file.

After restarting:

1. Open `chrome://policy` and confirm `ExtensionSettings` is present with status `OK`.
2. Check that its value contains only your intended extension ID and the two approved hosts.
3. Open a fresh Computer session, expand Usage, and confirm one `Cost equi.` row.
4. Open organization Usage and confirm one parenthesized USD equivalent beside the balance.
5. Confirm the displayed equivalents match the visible counts and continue to follow changes.

The installed extension must produce the UI itself. Running the source through DevTools or browser automation is not a valid substitute for that acceptance check.

If the scoped rule is not recognized or the extension still cannot run, stop and investigate with your administrator. Do not silently change the key to `*`, run a global extension-enablement patch, or change unrelated browser flags.

## Updates and undo

Keep an unpacked extension in the same permanent folder when updating it. Moving or re-adding it can change its ID and stop the scoped exception from matching ([Quorum's macOS notes](https://github.com/JacobStephens2/quorum-perplexity-council-tracker/blob/main/docs/comet-setup.md)).

Before installation, record the original policy state and the exact rule being added. To undo, have the administrator restore that state or remove only this extension's added exception, preserving all other policies.

Our tested one-time rollback only removes the policy file if it was originally absent and its current hash still matches the file that the installer created. If it has changed, rollback stops rather than deleting someone else's configuration.

Restart Comet after an approved removal or policy change and verify the result. No global scripting flag or preference-daemon restart was needed in the successful test; other versions and managed environments may behave differently.
