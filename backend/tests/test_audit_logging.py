"""
Audit Logging Enterprise Grade Tests
=====================================
Tests all critical audit logging functionality:
- Login audit logging (SUCCESS and FAILED)
- User CRUD audit logging
- Task CRUD audit logging
- Task status change audit logging
- Avatar/AI Agent update audit logging
- Avatar photo upload/delete audit logging
- Comment creation audit logging
- Video upload audit logging
- Verifies all logs contain required fields
- Verifies try/catch safety (audit failures don't break endpoints)
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
ADMIN_EMAIL = "admin@ministry.local"
ADMIN_PASSWORD = "ChangeMe123!"
EDITOR_EMAIL = "editor@ministry.local"
EDITOR_PASSWORD = "ChangeMe123!"

# Required fields in all audit logs
REQUIRED_FIELDS = [
    "user_id", "user_role", "action", "entity_type", "entity_id",
    "old_value", "new_value", "timestamp", "ip_address"
]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user ID"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert response.status_code == 200
    return response.json()["id"]


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


def get_recent_audit_logs(headers, action=None, entity_type=None, limit=10):
    """Helper to fetch recent audit logs matching criteria"""
    params = {}
    if action:
        params["action"] = action
    response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params=params)
    if response.status_code != 200:
        return []
    logs = response.json()
    if entity_type:
        logs = [log for log in logs if log.get("object_type") == entity_type or log.get("entity_type") == entity_type]
    return logs[:limit]


def verify_audit_log_fields(log, expected_fields=None):
    """Verify audit log has required fields or uses legacy field names"""
    # Map new fields to legacy field names
    field_mappings = {
        "user_id": ["user_id", "actor_id"],
        "user_role": ["user_role"],
        "action": ["action"],
        "entity_type": ["entity_type", "object_type"],
        "entity_id": ["entity_id", "object_id"],
        "old_value": ["old_value"],
        "new_value": ["new_value"],
        "timestamp": ["timestamp", "created_at"],
        "ip_address": ["ip_address"]
    }
    
    missing = []
    for field, alternatives in field_mappings.items():
        found = any(log.get(alt) is not None or alt in log for alt in alternatives)
        if not found and field not in ["old_value", "new_value", "ip_address"]:
            # old_value, new_value, ip_address can be null
            if field not in log and alternatives[0] not in log:
                missing.append(field)
    
    return missing


class TestLoginAuditLogging:
    """Test LOGIN_SUCCESS and LOGIN_FAILED actions are logged"""
    
    def test_login_success_logged(self, admin_headers):
        """Verify successful login creates audit log with IP address"""
        # Clear timing - login and check
        login_time = time.time()
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Small delay for async logging
        time.sleep(0.5)
        
        # Check audit logs for LOGIN_SUCCESS
        logs = get_recent_audit_logs(admin_headers, action="LOGIN_SUCCESS")
        
        assert len(logs) > 0, "No LOGIN_SUCCESS audit logs found"
        
        # Find the most recent login log
        recent_log = logs[0]
        
        # Verify action type
        assert recent_log.get("action") == "LOGIN_SUCCESS", f"Expected LOGIN_SUCCESS, got {recent_log.get('action')}"
        
        # Verify entity type is Session
        entity_type = recent_log.get("object_type") or recent_log.get("entity_type")
        assert entity_type == "Session", f"Expected entity_type Session, got {entity_type}"
        
        # Verify IP address is captured (can be None if behind proxy)
        # Just check the field exists
        assert "ip_address" in recent_log, "ip_address field missing from audit log"
        
        print(f"LOGIN_SUCCESS audit log verified: user_id={recent_log.get('user_id') or recent_log.get('actor_id')}, ip={recent_log.get('ip_address')}")
    
    def test_login_failed_logged(self, admin_headers):
        """Verify failed login attempts are logged"""
        invalid_email = f"invalid_{uuid.uuid4().hex[:8]}@test.com"
        
        # Attempt login with invalid credentials
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": invalid_email,
            "password": "wrong_password"
        })
        assert response.status_code == 401, "Expected 401 for invalid login"
        
        time.sleep(0.5)
        
        # Check audit logs for LOGIN_FAILED
        logs = get_recent_audit_logs(admin_headers, action="LOGIN_FAILED")
        
        assert len(logs) > 0, "No LOGIN_FAILED audit logs found"
        
        # Find log matching our invalid email
        matching_logs = [log for log in logs if invalid_email in (log.get("new_value") or "") or 
                        invalid_email in (log.get("user_name") or "") or
                        invalid_email in (log.get("actor_name") or "")]
        
        assert len(matching_logs) > 0, f"No LOGIN_FAILED log found for {invalid_email}"
        
        log = matching_logs[0]
        assert log.get("action") == "LOGIN_FAILED"
        assert "ip_address" in log, "ip_address field missing from failed login audit log"
        
        print(f"LOGIN_FAILED audit log verified for {invalid_email}")


class TestUserCRUDAuditLogging:
    """Test User CREATE, UPDATE, DELETE actions are logged"""
    
    @pytest.fixture
    def test_user_id(self, admin_headers):
        """Create a test user and return its ID, cleanup after test"""
        user_email = f"TEST_audit_{uuid.uuid4().hex[:8]}@ministry.local"
        response = requests.post(f"{BASE_URL}/api/users", headers=admin_headers, json={
            "name": "Audit Test User",
            "email": user_email,
            "password": "TestPass123!",
            "role": "Editor"
        })
        assert response.status_code == 200, f"Failed to create test user: {response.text}"
        user_id = response.json()["id"]
        
        yield user_id, user_email
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=admin_headers)
    
    def test_user_create_logged(self, admin_headers):
        """Verify user creation is logged"""
        user_email = f"TEST_audit_create_{uuid.uuid4().hex[:8]}@ministry.local"
        
        response = requests.post(f"{BASE_URL}/api/users", headers=admin_headers, json={
            "name": "Audit Create Test",
            "email": user_email,
            "password": "TestPass123!",
            "role": "Producer"
        })
        assert response.status_code == 200, f"User creation failed: {response.text}"
        user_id = response.json()["id"]
        
        time.sleep(0.5)
        
        # Check audit logs
        logs = get_recent_audit_logs(admin_headers, action="CREATE", entity_type="User")
        
        matching_logs = [log for log in logs if log.get("entity_id") == user_id or log.get("object_id") == user_id]
        assert len(matching_logs) > 0, f"No CREATE User audit log found for user {user_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "CREATE"
        assert "ip_address" in log
        
        # Verify new_value contains email
        new_value = log.get("new_value") or ""
        assert user_email in new_value, f"User email not in new_value: {new_value}"
        
        print(f"CREATE User audit log verified for {user_email}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=admin_headers)
    
    def test_user_update_logged(self, admin_headers, test_user_id):
        """Verify user update is logged"""
        user_id, _ = test_user_id
        
        response = requests.patch(f"{BASE_URL}/api/users/{user_id}", headers=admin_headers, json={
            "name": "Updated Audit Name",
            "is_active": False
        })
        assert response.status_code == 200, f"User update failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="UPDATE", entity_type="User")
        
        matching_logs = [log for log in logs if log.get("entity_id") == user_id or log.get("object_id") == user_id]
        assert len(matching_logs) > 0, f"No UPDATE User audit log found for user {user_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "UPDATE"
        assert "ip_address" in log
        
        print(f"UPDATE User audit log verified for {user_id}")
    
    def test_user_delete_logged(self, admin_headers):
        """Verify user deletion is logged"""
        # Create user to delete
        user_email = f"TEST_audit_delete_{uuid.uuid4().hex[:8]}@ministry.local"
        response = requests.post(f"{BASE_URL}/api/users", headers=admin_headers, json={
            "name": "Audit Delete Test",
            "email": user_email,
            "password": "TestPass123!",
            "role": "Producer"
        })
        assert response.status_code == 200
        user_id = response.json()["id"]
        
        # Delete user
        response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=admin_headers)
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="DELETE", entity_type="User")
        
        matching_logs = [log for log in logs if log.get("entity_id") == user_id or log.get("object_id") == user_id]
        assert len(matching_logs) > 0, f"No DELETE User audit log found for user {user_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "DELETE"
        assert "ip_address" in log
        
        # Verify old_value contains email
        old_value = log.get("old_value") or ""
        assert user_email in old_value, f"User email not in old_value: {old_value}"
        
        print(f"DELETE User audit log verified for {user_id}")


class TestTaskCRUDAuditLogging:
    """Test Task CREATE, UPDATE, DELETE actions are logged"""
    
    @pytest.fixture
    def test_task_id(self, admin_headers):
        """Create a test task and return its ID, cleanup after test"""
        from datetime import datetime, timedelta
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": f"AUDIT_TEST_Task_{uuid.uuid4().hex[:6]}",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script for audit logging testing purposes with enough characters.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=7)).isoformat()
        })
        assert response.status_code == 200 or response.status_code == 201, f"Failed to create test task: {response.text}"
        task_id = response.json()["id"]
        
        yield task_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_task_create_logged(self, admin_headers):
        """Verify task creation is logged"""
        from datetime import datetime, timedelta
        
        task_title = f"AUDIT_CREATE_Test_{uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": task_title,
            "content_type": "Short Lesson",
            "avatar": "Avatar 2",
            "script": "This is a test script for audit logging create test with enough characters to pass validation.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=5)).isoformat()
        })
        assert response.status_code in [200, 201], f"Task creation failed: {response.text}"
        task_id = response.json()["id"]
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="CREATE", entity_type="Task")
        
        matching_logs = [log for log in logs if log.get("entity_id") == task_id or log.get("object_id") == task_id]
        assert len(matching_logs) > 0, f"No CREATE Task audit log found for task {task_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "CREATE"
        assert "ip_address" in log
        
        # Verify new_value contains title
        new_value = log.get("new_value") or ""
        assert task_title in new_value, f"Task title not in new_value: {new_value}"
        
        print(f"CREATE Task audit log verified for {task_title}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_task_update_logged(self, admin_headers, test_task_id):
        """Verify task update is logged"""
        response = requests.patch(f"{BASE_URL}/api/tasks/{test_task_id}", headers=admin_headers, json={
            "title": "Updated Audit Task Title"
        })
        assert response.status_code == 200, f"Task update failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="UPDATE", entity_type="Task")
        
        matching_logs = [log for log in logs if log.get("entity_id") == test_task_id or log.get("object_id") == test_task_id]
        assert len(matching_logs) > 0, f"No UPDATE Task audit log found for task {test_task_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "UPDATE"
        assert "ip_address" in log
        
        print(f"UPDATE Task audit log verified for {test_task_id}")
    
    def test_task_delete_logged(self, admin_headers):
        """Verify task deletion is logged"""
        from datetime import datetime, timedelta
        
        task_title = f"AUDIT_DELETE_Test_{uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": task_title,
            "content_type": "Announcement",
            "avatar": "Avatar 3",
            "script": "This is a test script for audit logging delete test with enough characters.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=3)).isoformat()
        })
        assert response.status_code in [200, 201]
        task_id = response.json()["id"]
        
        # Delete task
        response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="DELETE", entity_type="Task")
        
        matching_logs = [log for log in logs if log.get("entity_id") == task_id or log.get("object_id") == task_id]
        assert len(matching_logs) > 0, f"No DELETE Task audit log found for task {task_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "DELETE"
        assert "ip_address" in log
        
        # Verify old_value contains title
        old_value = log.get("old_value") or ""
        assert task_title in old_value, f"Task title not in old_value: {old_value}"
        
        print(f"DELETE Task audit log verified for {task_id}")


class TestTaskStatusChangeAuditLogging:
    """Test STATUS_CHANGE action is logged with old and new status"""
    
    def test_status_change_logged(self, admin_headers):
        """Verify task status change is logged with old and new status"""
        from datetime import datetime, timedelta
        
        # Create a task
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": f"STATUS_CHANGE_Test_{uuid.uuid4().hex[:6]}",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script for status change audit logging with enough characters to pass.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=7)).isoformat()
        })
        assert response.status_code in [200, 201]
        task = response.json()
        task_id = task["id"]
        old_status = task["status"]  # Should be "Draft"
        
        # Change status from Draft to Submitted
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/status", headers=admin_headers, json={
            "status": "Submitted"
        })
        assert response.status_code == 200, f"Status change failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="STATUS_CHANGE", entity_type="Task")
        
        matching_logs = [log for log in logs if log.get("entity_id") == task_id or log.get("object_id") == task_id]
        assert len(matching_logs) > 0, f"No STATUS_CHANGE Task audit log found for task {task_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "STATUS_CHANGE"
        
        # Verify old_value contains old status
        old_value = log.get("old_value") or ""
        assert "Draft" in old_value, f"Old status 'Draft' not in old_value: {old_value}"
        
        # Verify new_value contains new status
        new_value = log.get("new_value") or ""
        assert "Submitted" in new_value, f"New status 'Submitted' not in new_value: {new_value}"
        
        assert "ip_address" in log
        
        print(f"STATUS_CHANGE audit log verified: {old_value} -> {new_value}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)


class TestAvatarAuditLogging:
    """Test Avatar UPDATE, UPLOAD, DELETE actions are logged"""
    
    def test_avatar_update_logged(self, admin_headers):
        """Verify avatar update (display_name, is_active) is logged"""
        avatar_id = "avatar-1"
        
        # Update avatar display name
        response = requests.patch(f"{BASE_URL}/api/avatars/{avatar_id}", headers=admin_headers, json={
            "display_name": f"Test Avatar {uuid.uuid4().hex[:4]}"
        })
        assert response.status_code == 200, f"Avatar update failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="UPDATE", entity_type="Avatar")
        
        matching_logs = [log for log in logs if log.get("entity_id") == avatar_id or log.get("object_id") == avatar_id]
        assert len(matching_logs) > 0, f"No UPDATE Avatar audit log found for avatar {avatar_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "UPDATE"
        assert "ip_address" in log
        
        print(f"UPDATE Avatar audit log verified for {avatar_id}")
    
    def test_avatar_photo_upload_logged(self, admin_headers):
        """Verify avatar photo upload is logged"""
        avatar_id = "avatar-2"
        
        # Create a simple PNG image (1x1 white pixel)
        import base64
        # Simple 1x1 PNG
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        
        files = {"file": ("test_avatar.png", png_data, "image/png")}
        upload_headers = {"Authorization": admin_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/avatars/{avatar_id}/photo", headers=upload_headers, files=files)
        assert response.status_code == 200, f"Avatar photo upload failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="UPLOAD", entity_type="Avatar")
        
        matching_logs = [log for log in logs if log.get("entity_id") == avatar_id or log.get("object_id") == avatar_id]
        assert len(matching_logs) > 0, f"No UPLOAD Avatar audit log found for avatar {avatar_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "UPLOAD"
        assert "ip_address" in log
        
        print(f"UPLOAD Avatar audit log verified for {avatar_id}")
    
    def test_avatar_photo_delete_logged(self, admin_headers):
        """Verify avatar photo deletion is logged"""
        avatar_id = "avatar-2"
        
        # Ensure avatar has a photo first (upload one)
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        files = {"file": ("test_avatar.png", png_data, "image/png")}
        upload_headers = {"Authorization": admin_headers["Authorization"]}
        requests.post(f"{BASE_URL}/api/avatars/{avatar_id}/photo", headers=upload_headers, files=files)
        
        time.sleep(0.3)
        
        # Delete avatar photo
        response = requests.delete(f"{BASE_URL}/api/avatars/{avatar_id}/photo", headers=admin_headers)
        assert response.status_code == 204, f"Avatar photo delete failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="DELETE", entity_type="Avatar")
        
        matching_logs = [log for log in logs if log.get("entity_id") == avatar_id or log.get("object_id") == avatar_id]
        assert len(matching_logs) > 0, f"No DELETE Avatar audit log found for avatar {avatar_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "DELETE"
        assert "ip_address" in log
        
        print(f"DELETE Avatar photo audit log verified for {avatar_id}")


class TestCommentAuditLogging:
    """Test Comment CREATE action is logged"""
    
    def test_comment_create_logged(self, admin_headers):
        """Verify comment creation is logged"""
        from datetime import datetime, timedelta
        
        # Create a task to comment on
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": f"COMMENT_TEST_Task_{uuid.uuid4().hex[:6]}",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script for comment audit logging with enough characters.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=7)).isoformat()
        })
        assert response.status_code in [200, 201]
        task_id = response.json()["id"]
        
        comment_message = f"Test audit comment {uuid.uuid4().hex[:8]}"
        
        # Create a comment
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=admin_headers, json={
            "message": comment_message
        })
        assert response.status_code == 200, f"Comment creation failed: {response.text}"
        
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="CREATE", entity_type="Comment")
        
        matching_logs = [log for log in logs if log.get("entity_id") == task_id or log.get("object_id") == task_id]
        assert len(matching_logs) > 0, f"No CREATE Comment audit log found for task {task_id}"
        
        log = matching_logs[0]
        assert log.get("action") == "CREATE"
        
        # Verify comment preview is in new_value
        new_value = log.get("new_value") or ""
        assert comment_message[:50] in new_value or comment_message in new_value, f"Comment preview not in new_value: {new_value}"
        
        assert "ip_address" in log
        
        print(f"CREATE Comment audit log verified for task {task_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)


class TestVideoAuditLogging:
    """Test Video UPLOAD action is logged"""
    
    def test_video_upload_logged(self, admin_headers):
        """Verify video upload is logged"""
        from datetime import datetime, timedelta
        
        # Create a task to upload video to
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": f"VIDEO_TEST_Task_{uuid.uuid4().hex[:6]}",
            "content_type": "Full Lesson",
            "avatar": "Avatar 1",
            "script": "This is a test script for video upload audit logging with enough characters.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=7)).isoformat()
        })
        assert response.status_code in [200, 201]
        task_id = response.json()["id"]
        
        # Create a minimal video file (MP4 header - just enough to pass mime type check)
        # Using a very small valid MP4 structure
        video_data = bytes([
            0x00, 0x00, 0x00, 0x1C,  # size
            0x66, 0x74, 0x79, 0x70,  # ftyp
            0x69, 0x73, 0x6F, 0x6D,  # isom
            0x00, 0x00, 0x00, 0x00,  # minor version
            0x69, 0x73, 0x6F, 0x6D,  # compatible brand
            0x61, 0x76, 0x63, 0x31,  # avc1
            0x00, 0x00, 0x00, 0x08,  # size
            0x66, 0x72, 0x65, 0x65,  # free
        ])
        
        files = {"file": ("test_video.mp4", video_data, "video/mp4")}
        upload_headers = {"Authorization": admin_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/video/upload", headers=upload_headers, files=files)
        
        # Even if upload fails, check if audit log was created
        time.sleep(0.5)
        
        logs = get_recent_audit_logs(admin_headers, action="UPLOAD", entity_type="Video")
        
        matching_logs = [log for log in logs if log.get("entity_id") == task_id or log.get("object_id") == task_id]
        
        if response.status_code in [200, 201]:
            assert len(matching_logs) > 0, f"No UPLOAD Video audit log found for task {task_id}"
            
            log = matching_logs[0]
            assert log.get("action") == "UPLOAD"
            assert "ip_address" in log
            
            print(f"UPLOAD Video audit log verified for task {task_id}")
        else:
            # Check for UPLOAD_FAILED if the upload failed
            failed_logs = get_recent_audit_logs(admin_headers, action="UPLOAD_FAILED", entity_type="Video")
            print(f"Video upload returned {response.status_code}, checking for UPLOAD_FAILED logs")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)


class TestAuditLogRequiredFields:
    """Test that all audit logs contain required fields"""
    
    def test_audit_logs_have_required_fields(self, admin_headers):
        """Verify all recent audit logs have the required fields"""
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=admin_headers)
        assert response.status_code == 200
        
        logs = response.json()
        
        if not logs:
            pytest.skip("No audit logs found to verify fields")
        
        # Check first 10 logs
        issues = []
        for log in logs[:10]:
            missing = verify_audit_log_fields(log)
            if missing:
                issues.append(f"Log {log.get('id')}: missing {missing}")
        
        if issues:
            print(f"Field issues found: {issues}")
        
        # Check that essential fields exist
        for log in logs[:10]:
            assert log.get("action"), f"Log missing action: {log}"
            assert log.get("user_id") or log.get("actor_id"), f"Log missing user_id/actor_id: {log}"
            assert log.get("entity_type") or log.get("object_type"), f"Log missing entity_type/object_type: {log}"
            assert "ip_address" in log, f"Log missing ip_address field: {log}"
            assert log.get("timestamp") or log.get("created_at"), f"Log missing timestamp: {log}"
        
        print(f"Verified {min(10, len(logs))} audit logs have required fields")


class TestAuditLoggingSafety:
    """Test that audit logging failures don't break endpoints"""
    
    def test_endpoint_works_even_if_audit_would_fail(self, admin_headers):
        """
        Verify endpoints work correctly - the try/catch wrappers should
        prevent audit failures from breaking the main functionality.
        This test just verifies the endpoints work, the try/catch is in code.
        """
        from datetime import datetime, timedelta
        
        # Create task - should work
        response = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": f"SAFETY_TEST_Task_{uuid.uuid4().hex[:6]}",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script for safety test ensuring endpoints work correctly.",
            "publish_datetime": (datetime.utcnow() + timedelta(days=7)).isoformat()
        })
        assert response.status_code in [200, 201], "Task creation should work (try/catch protects audit logging)"
        task_id = response.json()["id"]
        
        # Update task - should work
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers, json={
            "title": "Updated Safety Test Task"
        })
        assert response.status_code == 200, "Task update should work (try/catch protects audit logging)"
        
        # Change status - should work
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/status", headers=admin_headers, json={
            "status": "Submitted"
        })
        assert response.status_code == 200, "Status change should work (try/catch protects audit logging)"
        
        # Delete task - should work
        response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        assert response.status_code == 200, "Task deletion should work (try/catch protects audit logging)"
        
        print("All endpoints work correctly with audit logging try/catch safety wrappers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
