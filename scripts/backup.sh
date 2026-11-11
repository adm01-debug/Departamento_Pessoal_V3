#!/bin/bash
# Backup Script for Departamento Pessoal System
# Usage: ./backup.sh [full|db|files|cleanup]

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/dp"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-departamento_pessoal}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS=30
S3_BUCKET="${S3_BUCKET:-}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)_$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logs em stderr: stdout das funções é só o caminho do arquivo (capturado por full_backup).
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Create backup directory
mkdir -p "$BACKUP_DIR"/{db,files,logs}

backup_database() {
    log "Starting database backup..."
    BACKUP_FILE="$BACKUP_DIR/db/db_${TIMESTAMP}.dump"
    
    if ! PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --no-password \
        --file="$BACKUP_FILE"; then
        rm -f "$BACKUP_FILE"
        error "Database backup failed."
    fi
    
    log "Database backup completed: $BACKUP_FILE"
    echo "$BACKUP_FILE"
}

backup_files() {
    log "Starting files backup..."
    BACKUP_FILE="$BACKUP_DIR/files/files_${TIMESTAMP}.tar.gz"
    
    local dirs=() dir rc=0
    for dir in /app/uploads /app/documents; do
        if [ -d "$dir" ]; then dirs+=("$dir"); else warn "Directory not found, left out of the backup: $dir"; fi
    done
    [ "${#dirs[@]}" -gt 0 ] || error "No backup source directories found (/app/uploads, /app/documents)."
    
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        "${dirs[@]}" || rc=$?
    # tar sai 1 quando um arquivo muda durante a leitura: o arquivo gerado continua válido.
    if [ "$rc" -gt 1 ]; then
        rm -f "$BACKUP_FILE"
        error "Files backup failed (tar exit $rc)."
    elif [ "$rc" -eq 1 ]; then
        warn "tar reported files changed while being read."
    fi
    
    log "Files backup completed: $BACKUP_FILE"
    echo "$BACKUP_FILE"
}

upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading to S3..."
        aws s3 cp "$1" "s3://$S3_BUCKET/backups/$(basename "$1")"
        log "Upload completed"
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    log "Cleanup completed"
}

full_backup() {
    log "=== Starting FULL backup ==="
    DB_FILE=$(backup_database)
    upload_to_s3 "$DB_FILE"
    FILES_FILE=$(backup_files)
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
