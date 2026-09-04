#!/usr/bin/env bash
set -euo pipefail

: "${D1_DATABASE_NAME:?Set D1_DATABASE_NAME, for example blog-production}"
: "${D1_EXPORT_DIR:?Set D1_EXPORT_DIR to a dedicated backup directory}"

mkdir -p "$D1_EXPORT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
npx wrangler d1 export "$D1_DATABASE_NAME" --remote --output="$D1_EXPORT_DIR/${D1_DATABASE_NAME}-${stamp}.sql"
printf 'D1 export completed: %s\n' "$D1_EXPORT_DIR/${D1_DATABASE_NAME}-${stamp}.sql"
