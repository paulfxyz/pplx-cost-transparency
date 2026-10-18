#!/bin/bash
# Optional, manual macOS Comet policy helper. MIT License.
# No downloads, global unblock, browser restart, password logging or daemon kills.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SCRIPT="${SCRIPT_DIR}/setup.sh"
ENGINE="${SCRIPT_DIR}/policy.js"
POLICY_DIR='/Library/Managed Preferences'
POLICY="${POLICY_DIR}/ai.perplexity.comet.plist"
STATE_BASE='/Library/Application Support/Perplexity Cost Transparency/Comet helper'
LOCK="${STATE_BASE}/.operation-lock"
WORK=''
STAGE=''
LOCK_OWNED=0

usage() {
  printf '%s\n' \
    'Perplexity Cost Transparency: optional macOS Comet setup' \
    '' \
    'Usage: /bin/bash comet/setup.sh status EXTENSION_ID' \
    '       /bin/bash comet/setup.sh preview EXTENSION_ID' \
    '       /bin/bash comet/setup.sh apply EXTENSION_ID' \
    '       /bin/bash comet/setup.sh migrate OLD_ID NEW_ID' \
    '       /bin/bash comet/setup.sh undo EXTENSION_ID' \
    '' \
    'Requires macOS and Node.js 20+ (the browser extension itself does not).' \
    'status/preview never change policy or request administrator access.' \
    'apply/migrate/undo request sudo if needed, display their exact scope,' \
    'and require you to type the operation name before writing.' \
    'Only https://perplexity.ai and https://www.perplexity.ai are allowed.' \
    'No wildcard extension IDs or automatic browser restarts are supported.' \
    'Use the installed ID from chrome://extensions, not someone else’s ID.'
}

fail() {
  printf 'STOPPED: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [ -n "$STAGE" ] && [ -f "$STAGE" ]; then /bin/rm -f "$STAGE"; fi
  if [ -n "$WORK" ] && [ -d "$WORK" ]; then /bin/rm -rf "$WORK"; fi
  if [ "$LOCK_OWNED" -eq 1 ]; then /bin/rmdir "$LOCK" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

valid_id() {
  [[ "$1" =~ ^[a-p]{32}$ ]] || fail 'Expected a 32-letter extension ID containing only a-p.'
}

fingerprint() {
  [ ! -L "$POLICY" ] || fail 'The policy path is a symbolic link.'
  if [ -e "$POLICY" ]; then
    [ -f "$POLICY" ] || fail 'The policy path is not a regular file.'
    if [ "$ACTION" != 'status' ] && [ "$(/bin/ls -lde "$POLICY" | /usr/bin/wc -l | /usr/bin/tr -d ' ')" -gt 1 ]; then
      fail 'This policy has an ACL. Ask your administrator to preserve it with a manual change.'
    fi
    /usr/bin/shasum -a 256 "$POLICY" | /usr/bin/awk '{print $1}'
  else
    printf 'ABSENT\n'
  fi
}

ACTION="${1:-help}"
case "$ACTION" in
  help|-h|--help) usage; exit 0 ;;
  status|preview|apply|undo)
    [ "$#" -eq 2 ] || { usage; exit 2; }
    ID="$2"
    FROM=''
    ;;
  migrate)
    [ "$#" -eq 3 ] || { usage; exit 2; }
    FROM="$2"
    ID="$3"
    valid_id "$FROM"
    ;;
  *) usage; exit 2 ;;
esac
valid_id "$ID"
[ "$(/usr/bin/uname -s)" = 'Darwin' ] || fail 'This helper is for macOS only.'
[ -f "$ENGINE" ] || fail 'Keep setup.sh and policy.js together in the comet directory.'
NODE_BIN="${PCT_NODE_BINARY:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
[[ "$NODE_BIN" = /* ]] && [ -x "$NODE_BIN" ] || fail 'Node.js 20+ is required for this optional helper. No software will be installed automatically.'
"$NODE_BIN" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' ||
  fail 'Node.js 20+ is required for this optional helper.'
[ ! -L "$POLICY_DIR" ] || fail 'The managed-policy directory is a symbolic link.'
[ ! -L "$STATE_BASE" ] || fail 'The recovery directory is a symbolic link.'
ID_STATE="${STATE_BASE}/${ID}"
[ ! -L "$ID_STATE" ] || fail 'The extension recovery directory is a symbolic link.'

if [ "$ACTION" != 'status' ] && [ "$ACTION" != 'preview' ] && [ "$EUID" -ne 0 ]; then
  printf 'Administrator approval is needed for %s on extension %s.\n' "$ACTION" "$ID"
  printf 'You will still review and confirm the exact change before it is written.\n'
  exec /usr/bin/sudo /usr/bin/env "PCT_NODE_BINARY=$NODE_BIN" /bin/bash "$SCRIPT" "$@"
fi

BEFORE="$(fingerprint)"
WORK="$(/usr/bin/mktemp -d '/tmp/pct-comet-helper.XXXXXX')"
REQUEST="${WORK}/request.json"
PLAN="${WORK}/plan.json"
PLAN_ACTION="$ACTION"
[ "$ACTION" != 'preview' ] || PLAN_ACTION='apply'

# Existing policy data is kept in private temporary files and on stdin, never
# sent over the network or exposed as process arguments.
{
  printf '{"action":"%s","id":"%s","from":"%s","policy":' "$PLAN_ACTION" "$ID" "$FROM"
  if [ "$BEFORE" = 'ABSENT' ]; then
    printf 'null'
  else
    /usr/bin/plutil -convert json -o - "$POLICY"
  fi
  printf ',"record":'
  if [ "$ACTION" = 'undo' ]; then
    [ -f "${ID_STATE}/record.json" ] && [ ! -L "${ID_STATE}/record.json" ] ||
      fail 'No trusted recovery record exists for this ID. Pre-existing policies are not adopted.'
    /bin/cat "${ID_STATE}/record.json"
  else
    printf 'null'
  fi
  printf '}\n'
} > "$REQUEST"
"$NODE_BIN" "$ENGINE" plan < "$REQUEST" > "$PLAN"
plan_field() {
  "$NODE_BIN" "$ENGINE" field "$1" < "$PLAN"
}
printf '\n'
plan_field summary
printf '\nScope:\n'
plan_field changes
printf '\nPolicy file: %s\n' "$POLICY"

if [ "$ACTION" = 'status' ] || [ "$ACTION" = 'preview' ]; then
  printf '\nREAD ONLY: no policy, recovery record, or browser setting was changed.\n'
  exit 0
fi
if [ "$(plan_field changed)" = 'false' ]; then
  printf 'No changes made. An existing matching rule is not adopted for undo.\n'
  exit 0
fi
if [ "$ACTION" != 'undo' ] && [ -e "$ID_STATE" ]; then
  fail 'A recovery record for this ID already exists. Review it rather than overwrite it.'
fi

CONFIRM_WORD="$(printf '%s' "$ACTION" | /usr/bin/tr '[:lower:]' '[:upper:]')"
printf '\nThis changes a browser security boundary. No other extension is enabled.\n'
printf 'Type %s to proceed, or anything else to cancel: ' "$CONFIRM_WORD"
IFS= read -r answer || fail 'Confirmation was not provided.'
[ "$answer" = "$CONFIRM_WORD" ] || fail 'Cancelled. No policy was changed.'

/usr/bin/install -d -o root -g wheel -m 700 "$STATE_BASE"
/bin/mkdir -m 700 "$LOCK" || fail 'Another operation or an uncleared lock exists. Nothing was overwritten.'
LOCK_OWNED=1
[ "$(fingerprint)" = "$BEFORE" ] || fail 'The policy changed during review. Re-run and inspect the new plan.'

if [ ! -d "$POLICY_DIR" ]; then
  /usr/bin/install -d -o root -g wheel -m 755 "$POLICY_DIR"
fi

if [ "$ACTION" != 'undo' ]; then
  /bin/mkdir -m 700 "$ID_STATE"
  if [ "$BEFORE" != 'ABSENT' ]; then /bin/cp -p "$POLICY" "${ID_STATE}/before.plist"; fi
  printf '%s\n' "$BEFORE" > "${ID_STATE}/before.sha256"
  plan_field record > "${ID_STATE}/record.json"
fi

REMOVE="$(plan_field removePolicy)"
if [ "$ACTION" = 'undo' ] && [ "$REMOVE" = 'true' ]; then
  [ "$(fingerprint)" = "$BEFORE" ] || fail 'The policy changed before removal.'
  /bin/rm "$POLICY"
else
  STAGE="$(/usr/bin/mktemp "${POLICY_DIR}/.pct-comet.XXXXXX")"
  # With no intervening policy edits, undo restores the byte-for-byte backup.
  if [ "$ACTION" = 'undo' ] && [ -f "${ID_STATE}/after.sha256" ] &&
     [ -f "${ID_STATE}/before.plist" ] &&
     [ "$(cat "${ID_STATE}/after.sha256")" = "$BEFORE" ]; then
    [ ! -L "${ID_STATE}/before.plist" ] || fail 'The recovery backup is a symbolic link.'
    [ "$(/usr/bin/shasum -a 256 "${ID_STATE}/before.plist" | /usr/bin/awk '{print $1}')" = "$(cat "${ID_STATE}/before.sha256")" ] ||
      fail 'The recovery backup failed its integrity check.'
    /bin/cp -p "${ID_STATE}/before.plist" "$STAGE"
  else
    plan_field policy > "$STAGE"
    /usr/bin/plutil -convert xml1 "$STAGE"
  fi
  # Preserve current permissions even when restoring exact backup bytes.
  if [ "$BEFORE" = 'ABSENT' ]; then
    /usr/sbin/chown root:wheel "$STAGE"
    /bin/chmod 644 "$STAGE"
  else
    /usr/sbin/chown "$(/usr/bin/stat -f '%u:%g' "$POLICY")" "$STAGE"
    /bin/chmod "$(/usr/bin/stat -f '%Lp' "$POLICY")" "$STAGE"
  fi
  /usr/bin/plutil -lint "$STAGE" >/dev/null
  [ "$(fingerprint)" = "$BEFORE" ] || fail 'The policy changed before installation.'
  if [ "$BEFORE" = 'ABSENT' ]; then
    /bin/ln "$STAGE" "$POLICY" # Fails atomically if a file appeared.
    /bin/rm "$STAGE"
  else
    /bin/mv -f "$STAGE" "$POLICY"
  fi
  STAGE=''
fi

if [ "$ACTION" = 'undo' ]; then
  /usr/bin/install -d -o root -g wheel -m 700 "${STATE_BASE}/archive"
  ARCHIVE="$(/usr/bin/mktemp -d "${STATE_BASE}/archive/${ID}.XXXXXX")"
  /bin/mv "$ID_STATE" "${ARCHIVE}/recovery"
  printf '\nUNDONE. Recovery files retained at: %s\n' "$ARCHIVE"
else
  fingerprint > "${ID_STATE}/after.sha256"
  printf '\nAPPLIED. Recovery files: %s\n' "$ID_STATE"
fi
printf 'No browser restart, preference-daemon restart, global flag or network request was performed.\n'
printf 'Save your work, fully quit/reopen Comet, and verify ExtensionSettings is OK at chrome://policy.\n'
