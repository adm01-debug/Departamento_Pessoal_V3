#!/bin/bash
# Backup Script for Departamento Pessoal System
# Usage: ./backup.sh [full|incremental|db|files]

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/dp"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-departamento_pessoal}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS=30
S3_BUCKET="${S3_BUCKET:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Create backup directory
mkdir -p "$BACKUP_DIR"/{db,files,logs}

backup_database() {
    log "Starting database backup..."
    BACKUP_FILE="$BACKUP_DIR/db/db_${TIMESTAMP}.dump"
    local -a pg_dump_args=(
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --no-password \
        --file="$BACKUP_FILE"
    )

    if [[ -n "${DB_PASSWORD:-}" ]]; then
        if ! PGPASSWORD="$DB_PASSWORD" pg_dump "${pg_dump_args[@]}"; then
            rm -f "$BACKUP_FILE"
            error "Database backup failed."
        fi
    elif ! pg_dump "${pg_dump_args[@]}"; then
        rm -f "$BACKUP_FILE"
        error "Database backup failed."
    fi

    log "Database backup completed: $BACKUP_FILE"
    printf '%s\n' "$BACKUP_FILE"
}

backup_files() {
    log "Starting files backup..."
    BACKUP_FILE="$BACKUP_DIR/files/files_${TIMESTAMP}.tar.gz"

    local -a source_dirs=()
    [[ -d /app/uploads ]] && source_dirs+=(/app/uploads)
    [[ -d /app/documents ]] && source_dirs+=(/app/documents)
    if [[ "${#source_dirs[@]}" -eq 0 ]]; then
        error "No backup source directories found (/app/uploads or /app/documents)."
    fi

    if ! tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        "${source_dirs[@]}"; then
        rm -f "$BACKUP_FILE"
        error "Files backup failed."
    fi

    log "Files backup completed: $BACKUP_FILE"
    printf '%s\n' "$BACKUP_FILE"
}

upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        local file="$1"
        log "Uploading to S3..."
        aws s3 cp "$file" "s3://$S3_BUCKET/backups/$(basename "$file")"
        log "Upload completed"
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -mtime "+$RETENTION_DAYS" -delete
    log "Cleanup completed"
}

full_backup() {
    log "=== Starting FULL backup ==="
    DB_FILE=$(backup_database)
    FILES_FILE=$(backup_files)
    upload_to_s3 "$DB_FILE"
    upload_to_s3 "$FILES_FILE"
    cleanup_old_backups
    log "=== FULL backup completed ==="
}

case "${1:-full}" in
    full) full_backup ;;
    db) backup_database ;;
    files) backup_files ;;
    cleanup) cleanup_old_backups ;;
    *) echo "Usage: $0 [full|db|files|cleanup]"; exit 1 ;;
esac
