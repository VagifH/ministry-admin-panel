# Ministry Admin Panel - Product Requirements Document

## Project Status: ✅ PILOT READY

## Original Problem Statement
Build a web admin panel for a Ministry with a Microsoft/Fluent-inspired UI, supporting multiple user roles (Admin, Editor, Producer, Approver) via a server-side Role-Based Access Control (RBAC) system.

## Core Requirements
- **UI:** Left sidebar, top command bar, table-first pages with sophisticated light/dark theme system
- **Data Models:** User, Task, Comment, Video, AuditLog, AI Agent
- **Task Status Flow:** Strict, role-based workflow for task statuses
- **Role Permissions (RBAC):** Centralized, server-enforced permissions
- **Pages:** Dashboard, Tasks, Task Details, Calendar, Activity Log, Settings
- **Video Module:** Local file upload (up to 100MB) with storage abstraction
- **Audit Logging:** All critical actions logged with 90-day TTL retention
- **Error Handling:** Unified backend error responses
- **Data Protection:** Soft delete and archive/restore for tasks

## What's Been Implemented

### Phase 1: Core Application (Complete)
- Full RBAC system with 4 roles (Admin, Editor, Producer, Approver)
- JWT authentication
- Task management with workflow states
- Comment system on tasks
- Video upload/download module
- Audit logging system

### Phase 2: Release Readiness (Complete)
- Rate limiting (429 responses)
- User seeding script (`seed_users.py`)
- Comprehensive documentation (`README.md`, `SMOKE_TEST.md`)

### Phase 3: Enterprise Theme System (Complete)
- CSS variable-based light/dark mode
- ThemeProvider and ThemeToggle components
- Microsoft Fluent-inspired design polish
- 3-tier surface layering system

### Phase 4: Production Readiness (Complete)
- Health endpoint (`GET /api/health`)
- 90-day TTL index on audit_logs
- Backup/restore scripts (`scripts/backup.sh`, `scripts/restore.sh`)
- Full operational documentation

### Phase 5: Project Export (Complete - Dec 2025)
- Created downloadable archive: `ministry_panel_export.tar.gz` (24MB)
- Excludes: node_modules, .git, __pycache__, .env files

### Phase 6: Pluggable Cloud Storage (Complete - Feb 2026)
- Added GCS (Google Cloud Storage) as optional storage provider
- Factory pattern for storage provider selection via `STORAGE_PROVIDER` env var
- Local storage remains default (no breaking changes)
- GCS streams through backend (keeps bucket private)
- Full documentation at `/app/docs/STORAGE.md`

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn UI
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **Auth:** JWT tokens
- **Security:** slowapi rate limiting
- **Storage:** Local filesystem (default) or Google Cloud Storage

## Test Credentials
- Admin: `admin@ministry.local` / `ChangeMe123!`
- Editor: `editor@ministry.local` / `ChangeMe123!`
- Producer: `producer@ministry.local` / `ChangeMe123!`
- Approver: `approver@ministry.local` / `ChangeMe123!`

## Future Backlog

### P1 - Calendar Enhancements
- Hover effects on calendar tasks
- "+X more" popover implementation

### P2 - Video Streaming
- Re-implement video player in VideoTab.js for streaming previews

### P3 - AWS S3 Storage Option
- Add S3 as additional storage provider option

## Key Files
- `/app/frontend/src/index.css` - Theme color tokens
- `/app/frontend/tailwind.config.js` - Tailwind theme config
- `/app/backend/server.py` - Main API with health endpoint
- `/app/backend/services/storage_service.py` - Pluggable storage (Local/GCS)
- `/app/scripts/backup.sh` & `restore.sh` - Operational scripts
- `/app/docs/SMOKE_TEST.md` - Manual testing checklist
- `/app/docs/STORAGE.md` - Storage configuration guide
