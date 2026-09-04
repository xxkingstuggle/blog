#!/usr/bin/env bash
set -euo pipefail

: "${R2_ACCOUNT_ID:?Set R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?Set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?Set R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET:?Set R2_BUCKET, for example blog-media-production}"
: "${BACKUP_DIR:?Set BACKUP_DIR to a dedicated backup directory}"

if [[ ! -d "$BACKUP_DIR" ]]; then
	printf 'Backup directory does not exist: %s\n' "$BACKUP_DIR" >&2
	exit 1
fi

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

rclone sync "r2:${R2_BUCKET}" "$BACKUP_DIR/$R2_BUCKET" --metadata --checksum --create-empty-src-dirs
rclone size "r2:${R2_BUCKET}" --json > "$BACKUP_DIR/$R2_BUCKET/latest-size.json"
printf 'R2 backup completed: %s\n' "$BACKUP_DIR/$R2_BUCKET"
