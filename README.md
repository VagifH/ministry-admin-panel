# Ministry Admin Panel

A web-based content management system for ministry operations with role-based access control, task workflow management, and video content handling.

**Version:** 1.0.0  
**Status:** Production Ready (Pilot)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Running the Application](#running-the-application)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Task Status Workflow](#task-status-workflow)
6. [Seeding Test Users](#seeding-test-users)
7. [Backup & Restore](#backup--restore)
8. [Log Retention Policy](#log-retention-policy)
9. [API Health Check](#api-health-check)
10. [Smoke Test Checklist](#smoke-test-checklist)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd ministry-admin-panel

# 2. Setup backend
cd backend
cp .env.example .env  # Configure environment variables
pip install -r requirements.txt

# 3. Setup frontend
cd ../frontend
cp .env.example .env  # Configure environment variables
yarn install

# 4. Seed test users
cd ../backend
python seed_users.py

# 5. Start services
# Backend: uvicorn server:app --host 0.0.0.0 --port 8001
# Frontend: yarn start
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# MongoDB Connection (REQUIRED)
MONGO_URL=mongodb://localhost:27017
DB_NAME=ministry_db

# JWT Configuration (REQUIRED for production)
JWT_SECRET_KEY=your-secure-secret-key-change-in-production

# Storage Provider (optional, default: local)
STORAGE_PROVIDER=local

# GCS Configuration (only if STORAGE_PROVIDER=gcs)
# GCS_BUCKET_NAME=your-bucket-name
# GCS_PROJECT_ID=your-project-id
# GCS_CREDENTIALS_JSON={"type":"service_account",...}
```

### Frontend (`frontend/.env`)

```env
# Backend API URL (REQUIRED)
REACT_APP_BACKEND_URL=https://your-domain.com
```

---

## Running the Application

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The API will be available at `http://localhost:8001/api`

### Frontend

```bash
cd frontend

# Install dependencies
yarn install

# Run development server
yarn start
```

The application will be available at `http://localhost:3000`

---

## User Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | System administrator | Full access to all features, user management, avatar management |
| **Editor** | Ministry content editor | Create/edit tasks, upload videos, view activity logs |
| **Producer** | Video production team | Edit tasks in production, upload videos, update status |
| **Approver** | Content approver | Approve/reject tasks, view all tasks |

### Permission Matrix

| Action | Admin | Editor | Producer | Approver |
|--------|:-----:|:------:|:--------:|:--------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Tasks | ✓ | ✓ | ✓ | ✓ |
| Create Task | ✓ | ✓ | ✗ | ✗ |
| Edit Task | ✓ | ✓ | ✓ | ✗ |
| Delete Task | ✓ | ✗ | ✗ | ✗ |
| Upload Video | ✓ | ✓ | ✗ | ✗ |
| View Calendar | ✓ | ✓ | ✓ | ✓ |
| View Activity Log | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Manage AI Agents | ✓ | ✗ | ✗ | ✗ |

---

## Task Status Workflow

```
Draft → Submitted → InProgress → ReadyForReview → Approved → Scheduled → Published
                                      ↓
                              ChangesRequested
                                      ↓
                                  Rejected
```

### Status Transitions by Role

| From Status | To Status | Allowed Roles |
|-------------|-----------|---------------|
| Draft | Submitted | Admin, Editor |
| Submitted | InProgress | Admin, Producer |
| InProgress | ReadyForReview | Admin, Producer |
| ReadyForReview | Approved | Admin, Approver |
| ReadyForReview | ChangesRequested | Admin, Approver |
| ReadyForReview | Rejected | Admin, Approver |
| ChangesRequested | InProgress | Admin, Producer |
| Approved | Scheduled | Admin, Editor |
| Scheduled | Published | Admin, Editor |

---

## Seeding Test Users

Create test users for all roles:

```bash
cd backend
python seed_users.py
```

### Default Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ministry.local | ChangeMe123! |
| Editor | editor@ministry.local | ChangeMe123! |
| Producer | producer@ministry.local | ChangeMe123! |
| Approver | approver@ministry.local | ChangeMe123! |

> **Note:** Change passwords immediately in production!

---

## Backup & Restore

### Creating a Backup

```bash
cd scripts

# Set MongoDB connection string
export MONGO_URL="mongodb://localhost:27017/ministry_db"

# Run backup (creates timestamped archive)
./backup.sh ./backups
```

Output: `backups/ministry_backup_YYYYMMDD_HHMMSS.tar.gz`

### Restoring from Backup

```bash
cd scripts

# Set MongoDB connection string
export MONGO_URL="mongodb://localhost:27017/ministry_db"

# Run restore (will prompt for confirmation)
./restore.sh ./backups/ministry_backup_20260218_120000.tar.gz
```

> **Warning:** Restore will overwrite existing data!

---

## Log Retention Policy

Audit logs are automatically purged after **90 days**.

### Implementation

- TTL index on `audit_logs.timestamp` field
- MongoDB automatically removes expired documents
- No manual cleanup required

### Verification

```javascript
// Check TTL index in MongoDB shell
db.audit_logs.getIndexes()

// Expected output includes:
// { "key": { "timestamp": 1 }, "expireAfterSeconds": 7776000 }
```

---

## API Health Check

Monitor system health:

```bash
curl https://your-domain.com/api/health
```

### Response

```json
{
  "status": "ok",
  "version": "1.0.0",
  "time": "2026-02-18T12:00:00.000Z",
  "database": "connected"
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `ok` | All systems operational |
| `degraded` | Database connection issues |

---

## Smoke Test Checklist

See [docs/SMOKE_TEST.md](docs/SMOKE_TEST.md) for complete testing checklist.

### Quick Verification

```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. Login test
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ministry.local","password":"ChangeMe123!"}'

# 3. Rate limit test (should return 429 after 5 attempts)
for i in {1..7}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

---

## Troubleshooting

### Backend won't start

1. Check MongoDB connection: `mongosh $MONGO_URL`
2. Verify environment variables are set
3. Check logs: `tail -f /var/log/supervisor/backend.err.log`

### Frontend won't build

1. Clear node_modules: `rm -rf node_modules && yarn install`
2. Verify `REACT_APP_BACKEND_URL` is set
3. Check for TypeScript errors: `yarn build`

### Rate limiting issues

1. Wait 5 minutes for lockout to expire
2. Or restart the backend service (clears in-memory rate limiter)

### Video upload fails

1. Check file size (max 100MB)
2. Verify file type (mp4, webm, mov, avi, wmv)
3. Check disk space on server

---

## Support

For issues or questions, contact the development team.

---

**Ministry Admin Panel v1.0.0** - Production Ready for Pilot
