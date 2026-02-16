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

### Task Status Flow
Draft -> Submitted -> Producing -> Review -> (Scheduled or Rejected) -> Published

### Role Permissions
- **Editor:** Create/edit non-finalized tasks, submit for review
- **Approver:** Approve/reject tasks in 'Review' state
- **Admin:** Full access to all data and status transitions

### Business Rules
- Task fields become read-only for Editor/Approver once 'Scheduled'
- Tasks cannot be 'Published' without a video (Phase 2)
- Inline validation errors required

### Pages
- Dashboard: Overview of task status counts
- Tasks: Search, filter, sort with Create Task modal
- Task Details: Tabs for Details, Comments, Activity, Video
- Calendar: Month/week view of tasks by publish date
- Activity Log: Audit trail with filters
- Settings: User management (Admin-only)

### Authentication
- JWT-based custom authentication
- Default admin: admin@ministry.local / ChangeMe123!

## Technology Stack
- **Frontend:** React, React Router, Tailwind CSS, Shadcn UI
- **Backend:** FastAPI, Python, MongoDB (Pymongo)
- **Authentication:** JSON Web Tokens (JWT)

## What's Been Implemented

### Feb 16, 2026
- **P0 Completed: Design System Lock**
  - Verified webpack error overlay is not reproducible (no errors found)
  - Refactored ALL frontend components to use design tokens from `tailwind.config.js`
  - Files refactored: Login.js, Tasks.js, TaskDetails.js, Calendar.js, ActivityLog.js, Dashboard.js, Settings.js, Layout.js
  - Replaced hardcoded hex colors with `ministry.*` token classes
  - Status colors: `bg-ministry-status-{status}` for Draft, Submitted, Producing, Review, Scheduled, Published, Rejected
  - Text colors: `text-ministry-text-primary`, `text-ministry-text-secondary`, `text-ministry-text-muted`
  - Background: `bg-ministry-bg-primary`, `bg-ministry-bg-secondary`, `bg-ministry-bg-tertiary`
  - Borders: `border-ministry-border-default`
  - Brand colors: `bg-ministry-brand-primary`, `bg-ministry-brand-hover`
  - Border radius: `rounded-ministry` (8px)
  - Shadows: `shadow-ministry-card`, `shadow-ministry-dialog`

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
- Frontend: 100% pass rate
- All pages load and function correctly
- Design tokens properly applied
- Navigation, forms, validation working
- Status colors verified matching Fluent design

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] Fix Webpack Error Overlay (not reproducible)
- [x] Design System Lock - refactor UI to use design tokens

### P1 (Important) - Backlog
- [ ] Video Upload Implementation (Phase 2)
  - File upload UI
  - Backend storage logic
  - Business rule: tasks cannot publish without video

### P2 (Nice-to-have) - Backlog
- [ ] Accessibility improvements (aria-describedby for dialogs)
- [ ] React Hook dependencies cleanup (ESLint warnings)

## Credentials
- **Admin:** admin@ministry.local / ChangeMe123!
