#!/usr/bin/env bash
# One-time Fleeced! Netlify Blob backup and CREATE-ONLY restore.
# Run locally; no secrets are ever printed, saved in repo, or sent to ChatGPT.
set -euo pipefail
umask 077

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required; install it before running." >&2
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo "Run this script in your own terminal for masked authentication and confirmation." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir/.."
backup_parent="$HOME/fleeced-private-archive"
mkdir -p "$backup_parent"
chmod 700 "$backup_parent"
backup_dir="$backup_parent/backup-$(date -u +%Y%m%d-%H%M%S)"

printf '\nThis will back up only the three approved Fleeced! Netlify Blob stores.\n'
printf 'Original and destination account tokens stay on this computer.\n'
read -r -s -p "Original Fleeced! Netlify account access token: " FLEECED_OLD_NETLIFY_TOKEN
printf '\n'
read -r -s -p "Replacement Fleeced! Netlify account access token: " FLEECED_NEW_NETLIFY_TOKEN
printf '\n'
export FLEECED_OLD_NETLIFY_TOKEN FLEECED_NEW_NETLIFY_TOKEN
trap 'unset FLEECED_OLD_NETLIFY_TOKEN FLEECED_NEW_NETLIFY_TOKEN' EXIT

echo "Installing repository's pinned Netlify Blobs client locally..."
npm install --no-save --package-lock=false
echo "Creating immutable local archives under: $backup_dir"
node scripts/migrate-fleeced-blobs.mjs backup --dir "$backup_dir"
node scripts/migrate-fleeced-blobs.mjs verify --dir "$backup_dir"
node scripts/migrate-fleeced-blobs.mjs plan --dir "$backup_dir"

printf '\nThe DRY RUN above is your final check. Existing keys will NEVER be overwritten.\n'
printf 'Type RESTORE to create missing destination keys, or press Enter to stop safely: '
read -r approval
if [[ "$approval" != "RESTORE" ]]; then
  echo "Stopped after completing verified local backups; no restore writes were made."
  exit 0
fi
node scripts/migrate-fleeced-blobs.mjs restore --dir "$backup_dir" --apply
echo "Read-back SHA-256 verification completed for created objects."
echo "Keep the private backup folder securely on your own computer: $backup_dir"
echo "Before publishing, the private Week 5 editor must be independently audited."
