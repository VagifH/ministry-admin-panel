# Ministry Admin Panel

A web-based content management system for ministry video production workflow.

## Release Readiness - Ministry Pilot (v1.0.0)

### Quick Start

```bash
# 1. Ensure MongoDB is running
# 2. Set environment variables
cd backend
cp .env.example .env  # Edit with your settings

# 3. Install dependencies
pip install -r requirements.txt

# 4. Seed test users
python seed_users.py

# 5. Start the server
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ministry.local | ChangeMe123! |
| Editor | editor@ministry.local | ChangeMe123! |
| Producer | producer@ministry.local | ChangeMe123! |
| Approver | approver@ministry.local | ChangeMe123! |

**Note:** Change default passwords before production deployment.

---

## Configuration

All application settings are centralized in `/backend/config.py`:

### Upload Limits
- **Video:** 100MB max, MP4/WebM/MOV only
- **Avatar Images:** 5MB max, JPEG/PNG/WebP only

### Security Settings
- **Login Rate Limiting:** 5 attempts per minute per IP
- **Lockout Duration:** 5 minutes after exceeding limit
- **JWT Expiry:** 24 hours

---

## End-to-End Smoke Test

### Complete Workflow Test

Run this script to verify all features work correctly:

```bash
#!/bin/bash
# E2E Smoke Test Script

API_URL="https://your-domain.com"  # Replace with your URL

# 1. Login as Admin
echo "=== Step 1: Login ==="
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ministry.local","password":"ChangeMe123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "Token: ${TOKEN:0:20}..."

# 2. Create a task (Draft)
echo ""
echo "=== Step 2: Create Task (Draft) ==="
TASK=$(curl -s -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "E2E Test Task",
    "content_type": "Announcement",
    "avatar": "Avatar 1",
    "script": "This is an end-to-end test script for the ministry pilot.",
    "publish_datetime": "2025-12-30T10:00:00Z"
  }')
TASK_ID=$(echo $TASK | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "Task ID: $TASK_ID"

# 3. Status transitions: Draft -> Submitted -> InProgress -> ReadyForReview -> Approved -> Scheduled -> Published
echo ""
echo "=== Step 3: Status Transitions ==="

for STATUS in "Submitted" "InProgress" "ReadyForReview" "Approved" "Scheduled" "Published"; do
  curl -s -X PATCH "$API_URL/api/tasks/$TASK_ID/status" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"status\": \"$STATUS\"}" > /dev/null
  echo "  -> $STATUS"
done

# 4. Create another task for video/archive testing
echo ""
echo "=== Step 4: Create Second Task for Video Test ==="
TASK2=$(curl -s -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Video Test Task",
    "content_type": "Short Lesson",
    "avatar": "Avatar 2",
    "script": "This task tests video upload and download functionality.",
    "publish_datetime": "2025-12-31T10:00:00Z"
  }')
TASK2_ID=$(echo $TASK2 | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "Task 2 ID: $TASK2_ID"

# 5. Upload video
echo ""
echo "=== Step 5: Video Upload ==="
# Create a minimal test video file
python3 -c "open('/tmp/test.mp4','wb').write(b'\\x00\\x00\\x00\\x18ftypmp42\\x00\\x00\\x00\\x00mp42isom')"
curl -s -X POST "$API_URL/api/tasks/$TASK2_ID/video/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.mp4;type=video/mp4" > /dev/null
echo "Video uploaded"

# 6. Download video
echo ""
echo "=== Step 6: Video Download ==="
# First mark video as ready
curl -s -X PATCH "$API_URL/api/tasks/$TASK2_ID/video" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "ready"}' > /dev/null
# Download
curl -s -o /tmp/downloaded.mp4 "$API_URL/api/tasks/$TASK2_ID/video/download" \
  -H "Authorization: Bearer $TOKEN"
echo "Video downloaded to /tmp/downloaded.mp4"

# 7. Archive task
echo ""
echo "=== Step 7: Archive Task ==="
curl -s -X PATCH "$API_URL/api/tasks/$TASK2_ID/archive" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Task archived"

# 8. Restore task
echo ""
echo "=== Step 8: Restore Task ==="
curl -s -X PATCH "$API_URL/api/tasks/$TASK2_ID/restore" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Task restored"

# 9. Verify audit logs
echo ""
echo "=== Step 9: Verify Audit Logs ==="
curl -s "$API_URL/api/audit-logs" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
logs = json.load(sys.stdin)[:10]
print('Recent audit logs:')
for log in logs:
    action = log.get('action', 'N/A')
    entity = log.get('entity_type') or log.get('object_type', 'N/A')
    print(f'  - {action} {entity}')
"

# Cleanup
echo ""
echo "=== Cleanup ==="
# Archive and delete test tasks
curl -s -X PATCH "$API_URL/api/tasks/$TASK_ID/archive" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X PATCH "$API_URL/api/tasks/$TASK2_ID/archive" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$API_URL/api/tasks/$TASK2_ID/video" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$API_URL/api/tasks/$TASK_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$API_URL/api/tasks/$TASK2_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Test tasks cleaned up"

echo ""
echo "=========================================="
echo "E2E SMOKE TEST COMPLETE"
echo "=========================================="
```

---

## Backup & Restore

### MongoDB Backup

```bash
# Full database backup
mongodump --uri="mongodb://localhost:27017" --db=test_database --out=/backup/$(date +%Y%m%d_%H%M%S)

# Backup specific collections
mongodump --uri="mongodb://localhost:27017" --db=test_database \
  --collection=tasks --out=/backup/tasks_$(date +%Y%m%d)
mongodump --uri="mongodb://localhost:27017" --db=test_database \
  --collection=users --out=/backup/users_$(date +%Y%m%d)
mongodump --uri="mongodb://localhost:27017" --db=test_database \
  --collection=audit_logs --out=/backup/audit_$(date +%Y%m%d)
```

### MongoDB Restore

```bash
# Full database restore
mongorestore --uri="mongodb://localhost:27017" --db=test_database /backup/20250101_120000/test_database

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017" --db=test_database \
  --collection=tasks /backup/tasks_20250101/test_database/tasks.bson

# Restore with drop (replace existing data)
mongorestore --uri="mongodb://localhost:27017" --db=test_database --drop /backup/20250101_120000/test_database
```

### Video Files Backup

```bash
# Backup uploaded videos
tar -czvf /backup/videos_$(date +%Y%m%d).tar.gz /app/backend/uploads/videos/

# Restore videos
tar -xzvf /backup/videos_20250101.tar.gz -C /
```

### Automated Backup Script

```bash
#!/bin/bash
# /scripts/backup.sh - Run daily via cron

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
mongodump --uri="mongodb://localhost:27017" --db=test_database --out="$BACKUP_DIR/mongo_$DATE"
tar -czvf "$BACKUP_DIR/videos_$DATE.tar.gz" /app/backend/uploads/

# Cleanup old backups
find "$BACKUP_DIR" -type d -name "mongo_*" -mtime +$RETENTION_DAYS -exec rm -rf {} +
find "$BACKUP_DIR" -name "videos_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $DATE"
```

---

## Security Checklist

Before production deployment:

- [ ] Change default passwords for all test users
- [ ] Set strong JWT_SECRET_KEY in environment
- [ ] Configure HTTPS/TLS
- [ ] Review CORS_ORIGINS setting
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Test backup/restore procedure

---

## Role Permissions Matrix

| Action | Admin | Editor | Producer | Approver |
|--------|-------|--------|----------|----------|
| Create Task | ✓ | ✓ | ✗ | ✗ |
| Edit Task | ✓ | ✓ | ✗ | ✗ |
| Delete Task | ✓ | ✗ | ✗ | ✗ |
| Upload Video | ✓ | ✓ | ✗ | ✗ |
| Download Video | ✓ | ✓ | ✓ | ✓ |
| Approve/Reject | ✓ | ✗ | ✗ | ✓ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ |
| View Archived | ✓ | ✓ | ✗ | ✗ |

---

## Support

For issues or questions, contact the development team.

**Version:** 1.0.0-pilot  
**Last Updated:** February 2026
