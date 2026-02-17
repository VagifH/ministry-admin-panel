"""
RBAC (Role-Based Access Control) Tests
Tests for Phase 5 - Permissions & Roles Engine

This module tests:
1. GET /api/auth/permissions - Returns correct pages/actions for each role
2. Admin can access /api/users (200)
3. Editor CANNOT access /api/users (403)
4. Producer CANNOT access /api/users (403)
5. Approver CANNOT access /api/users (403)
6. Editor CANNOT manage avatars - PATCH /api/avatars/{id} (403)
7. Producer CANNOT create tasks - POST /api/tasks (403)
8. Approver CANNOT create tasks - POST /api/tasks (403)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    'admin': {'email': 'admin@ministry.local', 'password': 'ChangeMe123!'},
    'editor': {'email': 'editor@ministry.local', 'password': 'Editor123!'},
    'producer': {'email': 'TEST_producer@ministry.local', 'password': 'Producer123!'},
    'approver': {'email': 'TEST_approver@ministry.local', 'password': 'Approver123!'}
}


class TestRBACSetup:
    """Setup tests - create test users if needed"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['admin'])
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()['token']
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print("SUCCESS: Admin login working")
    
    def test_create_editor_user_if_not_exists(self, admin_token):
        """Create editor user if doesn't exist"""
        # First check if Editor user exists via login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['editor'])
        if login_resp.status_code == 200:
            print("SUCCESS: Editor user already exists")
            return
        
        # Create editor user
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.post(f"{BASE_URL}/api/users", headers=headers, json={
            'email': TEST_USERS['editor']['email'],
            'password': TEST_USERS['editor']['password'],
            'name': 'Test Editor',
            'role': 'Editor'
        })
        assert response.status_code in [200, 201, 400], f"Unexpected error: {response.text}"
        if response.status_code == 400 and 'already exists' in response.text.lower():
            print("SUCCESS: Editor user already exists")
        else:
            print(f"SUCCESS: Editor user created: {response.status_code}")
    
    def test_create_producer_user_if_not_exists(self, admin_token):
        """Create producer user if doesn't exist"""
        # First check if Producer user exists via login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['producer'])
        if login_resp.status_code == 200:
            print("SUCCESS: Producer user already exists")
            return
        
        # Create producer user
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.post(f"{BASE_URL}/api/users", headers=headers, json={
            'email': TEST_USERS['producer']['email'],
            'password': TEST_USERS['producer']['password'],
            'name': 'Test Producer',
            'role': 'Producer'
        })
        assert response.status_code in [200, 201, 400], f"Unexpected error: {response.text}"
        if response.status_code == 400 and 'already exists' in response.text.lower():
            print("SUCCESS: Producer user already exists")
        else:
            print(f"SUCCESS: Producer user created: {response.status_code}")
    
    def test_create_approver_user_if_not_exists(self, admin_token):
        """Create approver user if doesn't exist"""
        # First check if Approver user exists via login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['approver'])
        if login_resp.status_code == 200:
            print("SUCCESS: Approver user already exists")
            return
        
        # Create approver user
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.post(f"{BASE_URL}/api/users", headers=headers, json={
            'email': TEST_USERS['approver']['email'],
            'password': TEST_USERS['approver']['password'],
            'name': 'Test Approver',
            'role': 'Approver'
        })
        assert response.status_code in [200, 201, 400], f"Unexpected error: {response.text}"
        if response.status_code == 400 and 'already exists' in response.text.lower():
            print("SUCCESS: Approver user already exists")
        else:
            print(f"SUCCESS: Approver user created: {response.status_code}")


class TestPermissionsEndpoint:
    """Test GET /api/auth/permissions for each role"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def test_admin_permissions(self):
        """Admin should have full access"""
        token = self.get_token('admin')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['role'] == 'Admin'
        assert 'pages' in data
        assert 'actions' in data
        assert 'workflow_transitions' in data
        
        # Admin should have access to ALL pages
        expected_pages = ['dashboard', 'tasks', 'task_details', 'calendar', 'activity_log', 'settings', 'avatars', 'users']
        for page in expected_pages:
            assert page in data['pages'], f"Admin should have access to {page}"
        
        # Admin should have critical actions
        critical_actions = ['create_task', 'view_users', 'manage_avatars', 'view_audit_logs']
        for action in critical_actions:
            assert action in data['actions'], f"Admin should have {action} permission"
        
        print(f"SUCCESS: Admin has {len(data['pages'])} pages, {len(data['actions'])} actions")
    
    def test_editor_permissions(self):
        """Editor should have limited access (no settings, yes activity_log)"""
        token = self.get_token('editor')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['role'] == 'Editor'
        
        # Editor should have access to: dashboard, tasks, task_details, calendar, activity_log
        assert 'dashboard' in data['pages']
        assert 'tasks' in data['pages']
        assert 'calendar' in data['pages']
        assert 'activity_log' in data['pages'], "Editor should have access to activity_log"
        
        # Editor should NOT have access to settings
        assert 'settings' not in data['pages'], "Editor should NOT have access to settings"
        
        # Editor should have create_task action
        assert 'create_task' in data['actions']
        
        # Editor should NOT have view_users or manage_avatars
        assert 'view_users' not in data['actions'], "Editor should NOT have view_users"
        assert 'manage_avatars' not in data['actions'], "Editor should NOT have manage_avatars"
        
        print(f"SUCCESS: Editor has {len(data['pages'])} pages, {len(data['actions'])} actions")
    
    def test_producer_permissions(self):
        """Producer should have limited access (no settings, no activity_log)"""
        token = self.get_token('producer')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['role'] == 'Producer'
        
        # Producer should have access to: dashboard, tasks, task_details, calendar
        assert 'dashboard' in data['pages']
        assert 'tasks' in data['pages']
        assert 'calendar' in data['pages']
        
        # Producer should NOT have access to settings or activity_log
        assert 'settings' not in data['pages'], "Producer should NOT have access to settings"
        assert 'activity_log' not in data['pages'], "Producer should NOT have access to activity_log"
        
        # Producer should NOT have create_task action
        assert 'create_task' not in data['actions'], "Producer should NOT have create_task"
        
        print(f"SUCCESS: Producer has {len(data['pages'])} pages, {len(data['actions'])} actions")
    
    def test_approver_permissions(self):
        """Approver should have limited access (no settings, no activity_log)"""
        token = self.get_token('approver')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['role'] == 'Approver'
        
        # Approver should have access to: dashboard, tasks, task_details, calendar
        assert 'dashboard' in data['pages']
        assert 'tasks' in data['pages']
        assert 'calendar' in data['pages']
        
        # Approver should NOT have access to settings or activity_log
        assert 'settings' not in data['pages'], "Approver should NOT have access to settings"
        assert 'activity_log' not in data['pages'], "Approver should NOT have access to activity_log"
        
        # Approver should NOT have create_task action
        assert 'create_task' not in data['actions'], "Approver should NOT have create_task"
        
        print(f"SUCCESS: Approver has {len(data['pages'])} pages, {len(data['actions'])} actions")


class TestUsersEndpointRBAC:
    """Test /api/users endpoint access for each role"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def test_admin_can_access_users(self):
        """Admin should be able to access /api/users (200)"""
        token = self.get_token('admin')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        
        assert response.status_code == 200, f"Admin should get 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin can access /api/users - returned {len(data)} users")
    
    def test_editor_cannot_access_users(self):
        """Editor should NOT be able to access /api/users (403)"""
        token = self.get_token('editor')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        
        assert response.status_code == 403, f"Editor should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Editor gets 403 on /api/users - message: {data['detail']}")
    
    def test_producer_cannot_access_users(self):
        """Producer should NOT be able to access /api/users (403)"""
        token = self.get_token('producer')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        
        assert response.status_code == 403, f"Producer should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Producer gets 403 on /api/users - message: {data['detail']}")
    
    def test_approver_cannot_access_users(self):
        """Approver should NOT be able to access /api/users (403)"""
        token = self.get_token('approver')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        
        assert response.status_code == 403, f"Approver should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Approver gets 403 on /api/users - message: {data['detail']}")


class TestAvatarsEndpointRBAC:
    """Test /api/avatars PATCH endpoint access for each role"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def test_admin_can_manage_avatars(self):
        """Admin should be able to PATCH avatars (200)"""
        token = self.get_token('admin')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=headers,
            json={'display_name': 'Host Alex'}
        )
        
        assert response.status_code == 200, f"Admin should get 200, got {response.status_code}: {response.text}"
        print("SUCCESS: Admin can manage avatars (PATCH returns 200)")
    
    def test_editor_cannot_manage_avatars(self):
        """Editor should NOT be able to PATCH avatars (403)"""
        token = self.get_token('editor')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=headers,
            json={'display_name': 'Should Fail'}
        )
        
        assert response.status_code == 403, f"Editor should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Editor gets 403 on PATCH /api/avatars - message: {data['detail']}")
    
    def test_producer_cannot_manage_avatars(self):
        """Producer should NOT be able to PATCH avatars (403)"""
        token = self.get_token('producer')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=headers,
            json={'display_name': 'Should Fail'}
        )
        
        assert response.status_code == 403, f"Producer should get 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Producer gets 403 on PATCH /api/avatars")
    
    def test_approver_cannot_manage_avatars(self):
        """Approver should NOT be able to PATCH avatars (403)"""
        token = self.get_token('approver')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=headers,
            json={'display_name': 'Should Fail'}
        )
        
        assert response.status_code == 403, f"Approver should get 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Approver gets 403 on PATCH /api/avatars")


class TestTasksEndpointRBAC:
    """Test POST /api/tasks endpoint access for each role"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def get_valid_task_payload(self):
        """Return valid task payload for testing"""
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=7)).isoformat()
        return {
            'title': f'TEST_RBAC_Task_{uuid.uuid4().hex[:8]}',
            'content_type': 'Announcement',
            'avatar': 'Avatar 1',
            'script': 'This is a test script that is at least twenty characters long for validation.',
            'notes': 'Test notes',
            'publish_datetime': future_date
        }
    
    def test_admin_can_create_tasks(self):
        """Admin should be able to create tasks (201)"""
        token = self.get_token('admin')
        headers = {'Authorization': f'Bearer {token}'}
        payload = self.get_valid_task_payload()
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=headers, json=payload)
        
        assert response.status_code in [200, 201], f"Admin should get 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'id' in data
        task_id = data['id']
        print(f"SUCCESS: Admin can create tasks (returned task id: {task_id})")
        
        # Cleanup - delete the task
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=headers)
    
    def test_editor_can_create_tasks(self):
        """Editor should be able to create tasks (201)"""
        token = self.get_token('editor')
        headers = {'Authorization': f'Bearer {token}'}
        payload = self.get_valid_task_payload()
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=headers, json=payload)
        
        assert response.status_code in [200, 201], f"Editor should get 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'id' in data
        print(f"SUCCESS: Editor can create tasks")
        
        # Note: Cannot delete as Editor doesn't have delete permission
    
    def test_producer_cannot_create_tasks(self):
        """Producer should NOT be able to create tasks (403)"""
        token = self.get_token('producer')
        headers = {'Authorization': f'Bearer {token}'}
        payload = self.get_valid_task_payload()
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=headers, json=payload)
        
        assert response.status_code == 403, f"Producer should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Producer gets 403 on POST /api/tasks - message: {data['detail']}")
    
    def test_approver_cannot_create_tasks(self):
        """Approver should NOT be able to create tasks (403)"""
        token = self.get_token('approver')
        headers = {'Authorization': f'Bearer {token}'}
        payload = self.get_valid_task_payload()
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=headers, json=payload)
        
        assert response.status_code == 403, f"Approver should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Approver gets 403 on POST /api/tasks - message: {data['detail']}")


class TestAuditLogsEndpointRBAC:
    """Test /api/audit-logs endpoint access for each role"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def test_admin_can_view_audit_logs(self):
        """Admin should be able to access /api/audit-logs (200)"""
        token = self.get_token('admin')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
        
        assert response.status_code == 200, f"Admin should get 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin can access /api/audit-logs - returned {len(data)} logs")
    
    def test_editor_can_view_audit_logs(self):
        """Editor should be able to access /api/audit-logs (200)"""
        token = self.get_token('editor')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
        
        assert response.status_code == 200, f"Editor should get 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Editor can access /api/audit-logs - returned {len(data)} logs")
    
    def test_producer_cannot_view_audit_logs(self):
        """Producer should NOT be able to access /api/audit-logs (403)"""
        token = self.get_token('producer')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
        
        assert response.status_code == 403, f"Producer should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Producer gets 403 on /api/audit-logs - message: {data['detail']}")
    
    def test_approver_cannot_view_audit_logs(self):
        """Approver should NOT be able to access /api/audit-logs (403)"""
        token = self.get_token('approver')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
        
        assert response.status_code == 403, f"Approver should get 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'detail' in data
        print(f"SUCCESS: Approver gets 403 on /api/audit-logs - message: {data['detail']}")


class TestDeleteTaskRBAC:
    """Test DELETE /api/tasks/{task_id} endpoint - Admin only"""
    
    def get_token(self, role):
        """Get token for a specific role"""
        creds = TEST_USERS[role]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Could not login as {role}: {response.text}")
        return response.json()['token']
    
    def test_editor_cannot_delete_tasks(self):
        """Editor should NOT be able to delete tasks (403)"""
        # First create a task as admin
        admin_token = self.get_token('admin')
        admin_headers = {'Authorization': f'Bearer {admin_token}'}
        
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=7)).isoformat()
        task_payload = {
            'title': f'TEST_Delete_Task_{uuid.uuid4().hex[:8]}',
            'content_type': 'Announcement',
            'avatar': 'Avatar 1',
            'script': 'Test script with at least twenty characters for validation.',
            'publish_datetime': future_date
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json=task_payload)
        assert create_resp.status_code in [200, 201]
        task_id = create_resp.json()['id']
        
        # Try to delete as Editor
        editor_token = self.get_token('editor')
        editor_headers = {'Authorization': f'Bearer {editor_token}'}
        
        response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=editor_headers)
        assert response.status_code == 403, f"Editor should get 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Editor gets 403 on DELETE /api/tasks")
        
        # Cleanup - delete as admin
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
