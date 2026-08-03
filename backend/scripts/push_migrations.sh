#!/usr/bin/env bash
# push_migrations.sh — Push local supabase/migrations/ to the linked Supabase project.
#
# Prerequisites:
#   npx supabase link --project-ref <ref> --password <db-password>    (one-time)
#
# Usage:
#   ./scripts/push_migrations.sh                  — push all new migrations
#   ./scripts/push_migrations.sh --dry-run         — show what would be pushed
#   ./scripts/push_migrations.sh --include-seed    — include seed data
#   ./scripts/push_migrations.sh --include-roles   — include role definitions
#   ./scripts/push_migrations.sh --include-all     — include all (seed + roles)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

ARGS=("db" "push" "--linked" "--yes")

# Pass through any extra flags
if [[ $# -gt 0 ]]; then
  ARGS+=("$@")
fi

echo "Pushing migrations from supabase/migrations/ ..."
npx supabase "${ARGS[@]}"
echo "Done."
