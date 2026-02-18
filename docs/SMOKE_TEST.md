# Ministry Admin Panel - Smoke Test Checklist

**Version:** 1.0.0  
**Last Updated:** February 2026

Use this checklist to verify the system is functioning correctly after deployment.

---

## Pre-requisites

- [ ] Backend server is running
- [ ] Frontend is accessible
- [ ] MongoDB is connected
- [ ] Environment variables are configured

---

## Authentication & Security

### Login
- [ ] Navigate to login page
- [ ] Enter valid credentials (admin@ministry.local / ChangeMe123!)
- [ ] Verify successful login and redirect to Dashboard
- [ ] Verify user name and role displayed in sidebar

### Rate Limiting
- [ ] Attempt 6+ rapid login attempts with wrong password
- [ ] Verify HTTP 429 response after 5 attempts
- [ ] Verify "Too many requests" error message
- [ ] Wait 5 minutes and verify login works again

### Logout
- [ ] Click "Sign out" button
- [ ] Verify redirect to login page
- [ ] Verify protected routes are inaccessible

---

## Task Management

### Create Task
- [ ] Click "Create Task" button
- [ ] Fill in required fields (Title, Content Type, AI Agent, Script, Publish Date)
- [ ] Verify validation errors for empty fields
- [ ] Submit form and verify task appears in list

### View Task
- [ ] Click on a task row
- [ ] Verify Task Details page loads
- [ ] Verify all tabs are visible (Details, Comments, Activity, Video)
- [ ] Verify task information is displayed correctly

### Status Transitions
- [ ] Create a new task (status: Draft)
- [ ] Change status to Submitted → verify success
- [ ] Change status to InProgress → verify success
- [ ] Change status to ReadyForReview → verify success
- [ ] Change status to Approved → verify success
- [ ] Change status to Scheduled → verify success
- [ ] Change status to Published → verify success
- [ ] Verify status badge updates correctly

### Archive & Restore
- [ ] Archive a task using the archive button
- [ ] Verify task moves to "Archived" filter
- [ ] Verify archived task is read-only
- [ ] Verify "Archived" banner is displayed
- [ ] Restore the task
- [ ] Verify task returns to active list
- [ ] Verify task is editable again

---

## Video Management

### Upload Video
- [ ] Navigate to a task's Video tab
- [ ] Click "Upload Video" or drag-and-drop a file
- [ ] Verify progress indicator during upload
- [ ] Verify success message after upload
- [ ] Verify video metadata displayed

### Download Video
- [ ] Click "Download" button on uploaded video
- [ ] Verify file downloads correctly
- [ ] Verify downloaded file is playable

---

## Calendar

### Calendar View
- [ ] Navigate to Calendar page
- [ ] Verify current month is displayed
- [ ] Verify tasks appear on their publish dates
- [ ] Verify today's date is highlighted

### Calendar Navigation
- [ ] Click "Previous" arrow → verify month changes
- [ ] Click "Next" arrow → verify month changes
- [ ] Click "Today" button → verify returns to current month
- [ ] Toggle between Month/Week views

### Task Interaction
- [ ] Click on a task chip in calendar
- [ ] Verify navigation to Task Details page
- [ ] Click "+N more" link on days with multiple tasks
- [ ] Verify task list popover appears

---

## Activity Log

### View Logs
- [ ] Navigate to Activity Log page
- [ ] Verify audit entries are displayed
- [ ] Verify columns: User, Action, Object Type, Details, Timestamp

### Filters
- [ ] Filter by user → verify results filtered
- [ ] Filter by action → verify results filtered
- [ ] Clear filters → verify all results shown

---

## Settings (Admin Only)

### User Management
- [ ] Navigate to Settings > Users tab
- [ ] Verify user list is displayed
- [ ] Create a new user → verify appears in list
- [ ] Edit a user → verify changes saved
- [ ] Toggle user active status → verify badge updates

### AI Agents
- [ ] Navigate to Settings > AI Agents tab
- [ ] Verify avatar list is displayed
- [ ] Upload avatar photo → verify photo displayed
- [ ] Remove avatar photo → verify initials fallback
- [ ] Toggle avatar active status

---

## Dark Mode

### Theme Toggle
- [ ] Click theme toggle in sidebar header
- [ ] Verify dark mode activates
- [ ] Verify all pages maintain readability
- [ ] Verify buttons/inputs have visible borders
- [ ] Verify dropdowns are clearly visible
- [ ] Toggle back to light mode → verify no regressions

### Consistency Check
- [ ] Dashboard: Cards readable
- [ ] Tasks: Table rows visible, status badges clear
- [ ] Calendar: Day cells distinguishable, today highlighted
- [ ] Activity Log: Filters visible
- [ ] Settings: Forms usable
- [ ] Create Task Modal: Inputs clearly visible

---

## Health Check

### API Health
- [ ] Call `GET /api/health`
- [ ] Verify response: `{"status": "ok", "version": "1.0.0", "database": "connected"}`

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Engineer | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

**Notes:**
- All tests should pass before deploying to production
- Document any failures with screenshots and error messages
- Re-test after fixes are applied
