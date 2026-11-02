#!/usr/bin/env bash
# One-time Fleeced! Netlify Week 3/4 BACKUP, VERIFY and DRY-RUN plan.
# Restoration is separately held behind an independently verified production publisher safety gate.
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

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir/.."
backup_parent="$HOME/fleeced-private-archive"
mkdir -p "$backup_parent"
chmod 700 "$backup_parent"
backup_dir="$backup_parent/backup-$(date -u +%Y%m%d-%H%M%S)"

printf '\nThis will back up ONLY 2026 Week 3 and Week 4 historical Inquirer archives.\n'
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

printf '\nSafety hold: the replacement site currently registers an ENABLED production Inquirer scheduled function.\n'
printf 'Its queue key is currently missing, but that is not an adequate permanent disablement.\n'
printf 'Verified local backups and dry-run are complete. No restore writes have been made.\n'
printf 'Do not apply restoration until the scheduled publisher has been independently disabled.\n'
echo "Keep the private backup folder securely on your computer: $backup_dir"
echo "Once schedule disablement is verified, see docs/blob-archive-recovery.md for the guarded create-only restore."
