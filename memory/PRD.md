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
- **Avatar:** id, name, display_name, is_active, has_photo, photo_data (base64), created_at, updated_at

### Task Status Flow
Draft -> Submitted -> InProgress -> ReadyForReview -> (Approved/ChangesRequested/Rejected) -> Scheduled -> Published

### Role Permissions
- **Editor (Ministry Editor):** Create/edit non-finalized tasks, submit for review, schedule/publish approved tasks
- **Producer (V Studio):** Start production, submit for review, resume after changes requested
- **Approver:** Approve/reject tasks in 'ReadyForReview' state
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
- **P0 COMPLETED: AUDIT LOG HARDENING (ENTERPRISE GRADE)**
  - Created centralized audit service: `/app/backend/services/audit_service.py`
    - `AuditLogger` class with convenience methods for all actions
    - `AuditAction` constants: LOGIN_SUCCESS, LOGIN_FAILED, CREATE, UPDATE, DELETE, STATUS_CHANGE, UPLOAD, etc.
    - `EntityType` constants: User, Task, Video, Avatar, Comment, Session
    - `safe_log()` method with try/catch wrapper for non-breaking logging
  - All audit logs now include enterprise-grade fields:
    - `user_id` - UUID of the acting user
    - `user_role` - Role of the acting user (Admin, Editor, Producer, Approver)
    - `action` - Action type (CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN_SUCCESS, etc.)
    - `entity_type` - Type of entity affected (User, Task, Video, Avatar, Comment, Session)
    - `entity_id` - UUID of the affected entity
    - `old_value` - Previous value (for updates/deletes)
    - `new_value` - New value (for creates/updates)
    - `timestamp` - ISO 8601 timestamp with timezone
    - `ip_address` - Client IP from X-Forwarded-For/X-Real-IP headers
  - Complete endpoint coverage:
    - **Auth:** LOGIN_SUCCESS, LOGIN_FAILED
    - **Users:** CREATE, UPDATE, DELETE
    - **Tasks:** CREATE, UPDATE, DELETE, STATUS_CHANGE
    - **Comments:** CREATE
    - **Videos:** CREATE, UPLOAD, UPLOAD_FAILED, DELETE, STATUS_CHANGE
    - **Avatars:** UPDATE, UPLOAD (photo), DELETE (photo)
  - Safety: All audit_logger calls wrapped in try/catch - failures never break main endpoints
  - Backward compatibility: Legacy fields (actor_id, actor_name, object_type, object_id) maintained
  - Testing: 100% pass rate (16/16 backend tests)

- **P0 Completed: VIDEO MODULE HARDENING**
  - Created storage abstraction layer: `/app/backend/services/storage_service.py`
    - `save_file()` - Save file to storage with unique filename
    - `stream_file()` - Async generator for streaming file content
    - `get_file_response()` - Returns FastAPI StreamingResponse with proper headers
    - `delete_file()` - Delete file and cleanup empty directories
    - `file_exists()` / `get_file_size()` - File existence and size checks
  - Updated Video model with `storage_path` field for abstraction
  - Refactored upload/download/delete endpoints to use storage service
  - Download endpoint returns streaming response with:
    - Content-Type: video mime type
    - Content-Disposition: attachment with original filename
    - Content-Length: file size
  - Backward compatible with legacy `storage_key` format
  - S3-ready architecture (just swap StorageService implementation)

- **P0 Completed: PERMISSIONS & ROLES ENGINE (RBAC)**
  - Centralized backend RBAC configuration (PAGE_PERMISSIONS, ACTION_PERMISSIONS)
  - `require_action()` and `require_page_access()` dependency factories for route protection
  - New endpoint: `GET /api/auth/permissions` - Returns user's accessible pages, actions, and workflow transitions
  - Server-side enforcement: 403 responses with clear error messages for unauthorized access
  - Frontend permissions matrix (`permissionsMatrix.js`) with `canPerformAction()` and `canAccessPage()` helpers
  - ProtectedRoute component updated to check page-level access
  - Layout sidebar dynamically filters nav items by user role
  - Create Task button visibility based on role permissions
  - Access Denied page with clear role-based messaging
  - Testing: 100% pass rate (25/25 backend tests, all frontend features verified)
  
  **Permission Matrix:**
  - Admin: Full access (all pages, all actions)
  - Editor: Dashboard, Tasks, Calendar, Activity Log; can create/edit tasks
  - Producer: Dashboard, Tasks, Calendar; can produce tasks, no create
  - Approver: Dashboard, Tasks, Calendar; can approve/reject, no create/edit

- **P0 Completed: AVATAR SYSTEM FINALIZATION**
  - Extended Avatar model with: `display_name`, `is_active`, `created_at`, `updated_at`
  - New backend endpoint: `PATCH /api/avatars/{id}` - Update display_name and is_active (Admin only)
  - Microsoft admin-style table UI in Settings → Avatars:
    - Columns: Avatar | Preview | Display Name | Active | Updated | Actions
    - Inline editing: Click display_name → input appears with Save/Cancel buttons
    - Toggle switches for is_active status
    - Replace photo (primary button), Remove photo (ghost button, only when photo exists)
  - AvatarDisplay component with initials fallback (A1, A2, A3 when no photo)
  - Global integration of display_name:
    - Tasks list: Shows photo/initials + display_name
    - Create Task dropdown: Shows photo/initials + display_name, inactive avatars disabled
    - TaskDetails header: Shows large avatar circle + display_name below title
    - TaskDetails avatar dropdown: Shows photo/initials + display_name
    - Calendar day panel: Shows photo/initials + display_name
  - Inactive avatar handling: Cannot select inactive avatars when creating new tasks
  - Testing: 100% pass rate (17/17 backend tests, all frontend features verified)

- **PREVIOUS: FEATURE — SETTINGS → AVATARS**
  - Backend API endpoints:
    - `GET /api/avatars` - Returns all 3 fixed avatars
    - `POST /api/avatars/{id}/photo` - Upload avatar photo (Admin only, max 5MB, JPG/PNG/WebP)
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
  - Role-based access: Only Admin can upload/remove photos
  - Testing: 17/17 backend tests passed, frontend verified

- **UPGRADE: Avatar Image Optimization Pipeline**
  - Increased upload limit from 2MB to 5MB
  - Backend image processing using **Pillow 12.1.0**:
    - Center-crop to square
    - Resize to max 256×256 pixels
    - Convert to WebP format (quality 80)
    - Typical output: **~1-10KB** (vs original 200KB-5MB)
  - Validation: Rejects corrupted images with friendly error messages
  - Storage: Only optimized image stored (not original)

- **PHASE P1: WORKFLOW ENGINE (Action-Driven Status System)**
  - Removed manual status dropdown/select from UI
  - Implemented strict workflow transitions:
    ```
    Draft -> Submitted -> InProgress -> ReadyForReview 
    ReadyForReview -> Approved | ChangesRequested | Rejected
    ChangesRequested -> InProgress
    Approved -> Scheduled -> Published
    ```
  - Role-based permissions:
    - **Editor (Ministry):** Draft→Submitted, Approved→Scheduled, Scheduled→Published
    - **Producer (V Studio):** Submitted→InProgress, InProgress→ReadyForReview, ChangesRequested→InProgress
    - **Approver:** ReadyForReview → Approved/ChangesRequested/Rejected
    - **Admin:** All valid transitions
  - Backend validates all transitions server-side
  - All transitions logged in Activity Log
  - Action buttons styled by context (Approve=green, Reject=red, Changes=amber)

- **PHASE — VIDEO MVP (Preview + Download + Limits)**
  - Upload validation: max 100MB, allowed types: MP4, WebM, MOV
  - Frontend inline error + toast for invalid files
  - Upload progress UI with percentage
  - Video preview player (embedded HTML5 video)
  - Download button with proper headers (Content-Disposition: attachment)
  - Status-based UI: Ready (player), Processing (spinner), Failed (error + retry)
  - Backend streaming endpoint for preview playback
  - Backend download endpoint: GET /api/tasks/{task_id}/video/download
  - Permissions: Only logged-in users can access

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
- [x] AVATAR SYSTEM FINALIZATION - Full entity management with display_name, is_active, initials fallback
- [x] PERMISSIONS & ROLES ENGINE (RBAC) - Server-side + UI enforcement (25/25 tests PASS)
- [x] VIDEO MODULE HARDENING - Storage abstraction layer for S3-ready architecture

### P1 (Important) - Backlog
- [ ] Cloud Storage for Videos (AWS S3/GCS integration)
- [ ] Calendar hover effects on individual tasks within cells

### P2 (Nice-to-have) - Backlog
- [ ] Accessibility improvements (aria-describedby for dialogs)
- [ ] React Hook dependencies cleanup (ESLint warnings)

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ministry.local | ChangeMe123! |
| Ministry Editor | ministry.editor@test.local | TestEditor123! |
| V Studio Producer | vstudio.producer@test.local | TestProducer123! |
| Content Approver | approver@test.local | TestApprover123! |

## Credentials
- **Admin:** admin@ministry.local / ChangeMe123!
