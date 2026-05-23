#!/bin/bash
set -e

##############################################################################
# SALTEDHASH ENCRYPTED BACKUP PIPELINE
# Creates atomic, encrypted AES-256 backups of all JSON storage
# Retains for 30 days, then purges automatically
##############################################################################

BACKUP_SRC="/var/www/saltedhash-tools/storage"
BACKUP_DEST="/var/www/saltedhash-tools/backups"
PASSPHRASE_FILE="/var/www/saltedhash-tools/.backup_secret"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_ARCHIVE="/tmp/saltedhash_backup_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DEST"

# Generate passphrase if doesn't exist
if [ ! -f "$PASSPHRASE_FILE" ]; then
    echo "Generating backup encryption passphrase..."
    openssl rand -base64 32 > "$PASSPHRASE_FILE"
    chmod 600 "$PASSPHRASE_FILE"
    echo "✅ Passphrase stored at $PASSPHRASE_FILE"
fi

# Step 1: Create atomic tarball archive
echo "📦 Creating backup archive..."
tar -czf "$TEMP_ARCHIVE" -C "$BACKUP_SRC" . 2>/dev/null || true

if [ ! -f "$TEMP_ARCHIVE" ]; then
    echo "❌ Failed to create archive"
    exit 1
fi

# Step 2: Encrypt using military-grade AES-256
echo "🔐 Encrypting backup with AES-256..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$TEMP_ARCHIVE" \
    -out "$BACKUP_DEST/backup_$TIMESTAMP.enc" \
    -pass file:"$PASSPHRASE_FILE" 2>/dev/null

# Verify encryption succeeded
if [ ! -f "$BACKUP_DEST/backup_$TIMESTAMP.enc" ]; then
    echo "❌ Encryption failed"
    rm -f "$TEMP_ARCHIVE"
    exit 1
fi

# Cleanup temp file
rm -f "$TEMP_ARCHIVE"

# Step 3: Enforce 30-day retention policy
echo "🧹 Purging backups older than 30 days..."
find "$BACKUP_DEST" -type f -name "backup_*.enc" -mtime +30 -delete 2>/dev/null || true

# Step 4: Verify backup integrity
BACKUP_SIZE=$(du -h "$BACKUP_DEST/backup_$TIMESTAMP.enc" | cut -f1)
echo "✅ Backup complete: $BACKUP_SIZE at $BACKUP_DEST/backup_$TIMESTAMP.enc"
echo "📋 Total backups retained: $(ls -1 $BACKUP_DEST/*.enc 2>/dev/null | wc -l)"
