#!/bin/bash
# ============================================================================
# Ministry Admin Panel - Database Restore Script
# ============================================================================
# Usage: ./restore.sh <backup_file.tar.gz>
# 
# Requires:
#   - MONGO_URL environment variable (connection string)
#   - mongorestore installed
#
# WARNING: This will overwrite existing data!
# ============================================================================

set -e

# Validate arguments
if [ -z "$1" ]; then
    echo "ERROR: Backup file not specified"
    echo "Usage: MONGO_URL='mongodb://...' ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"

# Validate environment
if [ -z "$MONGO_URL" ]; then
    echo "ERROR: MONGO_URL environment variable is not set"
    echo "Usage: MONGO_URL='mongodb://...' ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

# Check mongorestore is available
if ! command -v mongorestore &> /dev/null; then
    echo "ERROR: mongorestore is not installed or not in PATH"
    exit 1
fi

# Check backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "============================================"
echo "Ministry Admin Panel - Database Restore"
echo "============================================"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "WARNING: This will overwrite existing data!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted directory
RESTORE_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "ministry_backup_*" | head -1)

if [ -z "$RESTORE_DIR" ]; then
    echo "ERROR: Could not find backup data in archive"
    exit 1
fi

echo "Restoring database..."
mongorestore --uri="$MONGO_URL" --drop "$RESTORE_DIR"

echo ""
echo "============================================"
echo "Restore completed successfully!"
echo "============================================"
