#!/bin/bash
# ============================================================================
# Ministry Admin Panel - Database Backup Script
# ============================================================================
# Usage: ./backup.sh [output_dir]
# 
# Requires:
#   - MONGO_URL environment variable (connection string)
#   - mongodump installed
#
# Output: Creates timestamped backup in specified directory (default: ./backups)
# ============================================================================

set -e

# Configuration
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ministry_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Validate environment
if [ -z "$MONGO_URL" ]; then
    echo "ERROR: MONGO_URL environment variable is not set"
    echo "Usage: MONGO_URL='mongodb://...' ./backup.sh [output_dir]"
    exit 1
fi

# Check mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "ERROR: mongodump is not installed or not in PATH"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "============================================"
echo "Ministry Admin Panel - Database Backup"
echo "============================================"
echo "Timestamp: $TIMESTAMP"
echo "Output: $BACKUP_PATH"
echo ""

# Run backup
echo "Starting backup..."
mongodump --uri="$MONGO_URL" --out="$BACKUP_PATH"

# Compress backup
echo "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo ""
echo "============================================"
echo "Backup completed successfully!"
echo "File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "============================================"
