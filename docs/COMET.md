# Scoped Comet setup on macOS

Perplexity Cost Transparency versions 1.0.0 and 1.1.0 were verified in an installed macOS Comet browser after an explicitly approved exception for the loaded extension ID and a full restart. The default unpacked installation did not inject on Perplexity pages, and a later fresh installation in a different directory required setup for its new ID.

> [!WARNING]
> Do not assume an earlier exception still covers a moved or reinstalled copy. Check the actual loaded directory and ID, then inspect the current policy before choosing `apply` or `migrate`; a previous ID or a deleted policy cannot authorize the new installation.

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

## Using the optional helper

Version 1.1.0 includes `comet/setup.sh` and `comet/policy.js` in both the repository and install ZIP. The helper needs macOS and an existing Node.js 20+ installation; it never installs software, and Node is not required to run the browser extension.

Keep both helper files together. From the extension folder, use:

```sh
/bin/bash comet/setup.sh status YOUR_EXTENSION_ID
/bin/bash comet/setup.sh preview YOUR_EXTENSION_ID
/bin/bash comet/setup.sh apply YOUR_EXTENSION_ID
/bin/bash comet/setup.sh undo YOUR_EXTENSION_ID
```

- **Read-only modes:** `status` and `preview` do not request administrator access or write policy/recovery files.
- **Explicit consent:** `apply`, `migrate` and `undo` request administrator approval if necessary, display their scope, then require you to type the operation name in uppercase before writing. Enter passwords only in your local Terminal prompt, never in chat.
- **Narrow scope:** Only the selected extension ID and the two exact HTTPS hosts are allowed. Wildcard extension IDs and global-unblock commands are rejected.
- **Preserved configuration:** An apply operation refuses to overwrite an existing different rule for that ID, and retains unrelated policies. A matching pre-existing rule is a no-op, not silently adopted as the helper's own change.
- **Recovery:** Private, root-owned recovery records and original snapshots are kept under `/Library/Application Support/Perplexity Cost Transparency/Comet helper`. Undo validates the extension-specific entry, preserves newer unrelated policy edits, and refuses conflicting changes.
- **Concurrent changes:** If the policy changes while you review the plan, the operation stops. Recovery records are retained rather than overwritten when their state needs administrator review.
- **File safeguards:** Current ownership and mode are preserved when replacing an existing file. Policies with ACLs or data that cannot be safely converted are left for manual administrator handling rather than having their protection silently altered.
- **No automatic restart:** After a successful change, save your work, fully quit/reopen Comet and verify the policy and UI yourself.

The reusable helper does not adopt the earlier one-time installer's recovery record. If your existing exception predates this helper, use its original undo method, or use the explicit migration operation below when changing IDs.

## Moving an unpacked extension

An unpacked extension uses its source directory; deleting that directory is not the same as deleting the download archive ([Chrome extension formats](https://developer.chrome.com/docs/chromedriver/extensions)). You may keep it in any suitable permanent local folder, rather than leaving it in Downloads.

For an existing Comet installation:

1. Copy the extension to the permanent destination; retain the old copy until the move is verified.
2. In `chrome://extensions`, disable the old copy and load the new directory with **Load unpacked**.
3. Read and verify the new extension ID. Do not assume it stayed the same.
4. If the ID changed, preview the relevant policies with `status`, then run:

   ```sh
   /bin/bash comet/setup.sh migrate OLD_EXTENSION_ID NEW_EXTENSION_ID
   ```

5. Review the displayed old/new IDs and two hosts, approve locally, and type `MIGRATE`.
6. Save work and fully restart Comet; confirm both cost displays and live updates.
7. Only after verification, remove the old browser registration and archive or remove the obsolete folder.

Migration accepts the old ID only when its current rule exactly matches the helper's two-host scope, and refuses an already-occupied target entry. It removes the old exception and adds the new one in one policy-file update, preserving other settings.

`undo NEW_EXTENSION_ID` reverses that policy migration and restores the old ID's scoped exception, provided neither relevant entry has been changed incompatibly. It does not restore deleted files or browser registrations, so keep the old copy until you are satisfied.

## Fresh installation after deleting an earlier copy

Deleting the archive is harmless after extraction, but deleting the active extension folder removes files the unpacked installation relies on ([Chrome extension formats](https://developer.chrome.com/docs/chromedriver/extensions)). If you reinstall into another directory, inspect the current registration rather than assuming the old ID or exception still applies ([Chrome's ID notes](https://developer.chrome.com/docs/extensions/mv2/architecture-overview)).

Start by choosing a permanent local folder, extracting the ZIP, and loading the inner directory containing `manifest.json`. Read its actual ID from `chrome://extensions` and use `status` to check the current rule.

| Current policy state | Correct next step |
| --- | --- |
| No exception for the new ID, and the old exception is absent | Run `preview NEW_ID`, then `apply NEW_ID` with explicit local approval |
| The old ID still has the exact scoped rule, and the new ID has no entry | Run `migrate OLD_ID NEW_ID` with explicit local approval |
| The current ID already has the exact scoped rule | No policy write is needed; check the registered folder, restart if necessary, then verify |
| A relevant entry conflicts, or a recovery record needs review | Stop and ask the administrator to inspect it; do not overwrite it or delete recovery records to force a retry |

For a genuinely fresh setup, run these commands from the newly loaded extension folder, substituting the ID you just verified:

```sh
/bin/bash comet/setup.sh status NEW_EXTENSION_ID
/bin/bash comet/setup.sh preview NEW_EXTENSION_ID
/bin/bash comet/setup.sh apply NEW_EXTENSION_ID
```

The last command requests local administrator authorization and a typed `APPLY` confirmation. After it reports success, save your work, fully quit/reopen Comet, then check the policy and both USD displays.

This exact fresh-install path was verified with version 1.1.0 on October 18, 2026. The old policy was absent, so `apply`, not `migrate`, was the appropriate operation; the author confirmed both amounts were visible after restarting.

## Updates and undo

Keep an unpacked extension in the same permanent folder when updating it. Moving or re-adding it can change its ID and stop the scoped exception from matching ([Quorum's macOS notes](https://github.com/JacobStephens2/quorum-perplexity-council-tracker/blob/main/docs/comet-setup.md)).

Before installation, record the original policy state and the exact rule being added. To undo, have the administrator restore that state or remove only this extension's added exception, preserving all other policies.

The original one-time rollback only removes the policy file if it was originally absent and its current hash still matches the installer-created file. The reusable helper instead tracks its own extension-specific change, uses an exact backup restore when safe, or preserves unrelated newer policies during a scoped undo.

If the relevant extension entry has been changed, undo stops instead of overwriting someone else's configuration. Recovery files are archived after a successful undo rather than silently discarded.

Restart Comet after an approved removal or policy change and verify the result. No global scripting flag or preference-daemon restart was needed in the successful test; other versions and managed environments may behave differently.
