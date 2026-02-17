# Ministry Admin Panel - Product Requirements Document

## Original Problem Statement
Build a web admin panel for a Ministry with a Microsoft/Fluent-inspired UI. The application supports three user roles (Admin, Editor, Approver) with specific permissions.

## Core Requirements

### UI Design
- Left sidebar navigation
- Top command bar
- Table-first pages
- Light neutral theme with subtle borders
- 8px radius on cards/elements
- Segoe UI/system-ui typography

### Data Models
- **User:** name, email, role, is_active, password_hash
- **Task:** title, content_type, avatar, script, notes, publish_datetime, status, owner
- **Comment:** task_id, author, message, created_at
- **AuditLog:** actor, action, object_type, object_id, old_value, new_value, created_at
- **Video:** id, task_id, filename, file_size, mime_type, status, uploaded_by
- **Avatar:** id, name, has_photo, photo_data (base64)

### Task Status Flow
Draft -> Submitted -> InProgress -> ReadyForReview -> (Approved/ChangesRequested/Rejected) -> Scheduled -> Published

### Role Permissions
- **Editor:** Create/edit non-finalized tasks, submit for review, upload videos
- **Approver:** Approve/reject tasks in 'ReadyForReview' state, download videos
- **Admin:** Full access to all data and status transitions, manage avatars

### Business Rules
- Task fields become read-only for Editor/Approver once 'Scheduled'
- Tasks cannot be 'Published' without a video (dependent on content type)
- Inline validation errors required

### Pages
- Dashboard: Overview of task status counts
- Tasks: Search, filter, sort with Create Task modal
- Task Details: Tabs for Details, Comments, Activity, Video
- Calendar: Month view with interactive day cells and task popovers
- Activity Log: Audit trail with filters
- Settings: User management + Avatars management (Admin-only)

### Authentication
- JWT-based custom authentication
- Default admin: admin@ministry.local / ChangeMe123!

## Technology Stack
- **Frontend:** React, React Router, Tailwind CSS, Shadcn UI
- **Backend:** FastAPI, Python, MongoDB (Pymongo)
- **Authentication:** JSON Web Tokens (JWT)

## What's Been Implemented

### Feb 17, 2026
- **P0 Completed: FEATURE — SETTINGS → AVATARS**
  - Backend API endpoints:
    - `GET /api/avatars` - Returns all 3 fixed avatars
    - `POST /api/avatars/{id}/photo` - Upload avatar photo (Admin only, max 2MB, JPG/PNG/WebP)
    - `DELETE /api/avatars/{id}/photo` - Remove avatar photo (Admin only)
  - Photos stored as base64 in MongoDB (fast MVP)
  - Frontend implementation:
    - Settings page with Users and Avatars tabs
    - Avatar cards with circular preview, name, status, upload/remove buttons
    - AvatarContext for global state management
    - AvatarDisplay component for thumbnails
  - UI Integration:
    - Tasks list shows avatar thumbnails in Avatar column
    - Task Details header shows avatar thumbnail
    - Create Task modal shows thumbnails in avatar dropdown
    - Task Details avatar dropdown shows thumbnails
  - File validation: max 2MB, formats JPG/PNG/WebP
  - Role-based access: Only Admin can upload/remove photos
  - Testing: 17/17 backend tests passed, frontend verified

### Previous Sessions
- Full backend implementation with FastAPI
- All MongoDB models and API endpoints
- JWT authentication with login/logout
- All frontend pages with routing
- Microsoft Fluent-inspired design
- Task CRUD operations
- Comment system
- Audit logging
- User management
- Video module (local storage)
- Calendar with interactions and micro-polish
- Centralized configuration files (statusConfig, contentTypeConfig, permissionsMatrix, videoRules)
- Status system migration

## Design Tokens (tailwind.config.js)
```javascript
ministry: {
  bg: { primary: '#fafafa', secondary: '#ffffff', tertiary: '#f3f2f1' },
  text: { primary: '#323130', secondary: '#605e5c', muted: '#8a8886' },
  brand: { primary: '#0078d4', hover: '#106ebe', light: '#deecf9' },
  border: { default: '#e5e5e5', focus: '#0078d4' },
  status: {
    success: '#107c10', warning: '#ffaa44', error: '#d13438',
    draft: '#8a8886', submitted: '#0078d4', producing: '#8764b8',
    review: '#ffaa44', scheduled: '#107c10', published: '#498205', rejected: '#d13438'
  }
}
```

## Test Results

### Stability Validation - Feb 16, 2026 (PASS)
All 22 test cases passed:

**1) Auth & Routing**
- ✓ Unauth access redirects to login
- ✓ Login flow works correctly

**2) Tasks Page**
- ✓ Search functionality works
- ✓ Status/Type/Avatar filters work
- ✓ Clear filters returns full list WITHOUT page refresh
- ✓ Create Task modal: opens, validates, submits successfully

**3) Task Details**
- ✓ All tabs (Details, Comments, Activity, Video) switch without state glitches
- ✓ Add comment works and appears immediately
- ✓ Long text wraps properly (no overflow)

**4) Calendar**
- ✓ Month/Week view toggle works
- ✓ Month navigation works

**5) Activity Log**
- ✓ Filters apply correctly
- ✓ Clear filters returns full data WITHOUT refresh

**6) Settings**
- ✓ Create/Edit User modals open/close, validation works
- ✓ Role assignment persists

**7) Console**
- ✓ No application errors detected
- ✓ No duplicate toasts

### Previous Test Results
- Frontend: 100% pass rate
- All pages load and function correctly
- Design tokens properly applied
- Navigation, forms, validation working
- Status colors verified matching Fluent design

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] Fix Webpack Error Overlay (not reproducible)
- [x] Design System Lock - refactor UI to use design tokens
- [x] UX Logic Hardening - loading, empty, error states
- [x] PHASE 2 Stability Validation - 22/22 tests PASS
- [x] Video Upload Implementation
- [x] Calendar interactions and micro-polish
- [x] Centralized configuration files
- [x] Status system migration
- [x] FEATURE — SETTINGS → AVATARS (17/17 tests PASS)

### P1 (Important) - Backlog
- [ ] Cloud Storage for Videos (AWS S3/GCS integration)
- [ ] Calendar hover effects on individual tasks within cells

### P2 (Nice-to-have) - Backlog
- [ ] Accessibility improvements (aria-describedby for dialogs)
- [ ] React Hook dependencies cleanup (ESLint warnings)

## Credentials
- **Admin:** admin@ministry.local / ChangeMe123!
