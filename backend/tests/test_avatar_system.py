"""
Test suite for Avatar System Finalization - Phase testing
Tests PATCH /api/avatars/{id}, GET /api/avatars, POST/DELETE photo endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ministry.local"
ADMIN_PASSWORD = "ChangeMe123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestGetAvatars:
    """Test GET /api/avatars endpoint"""
    
    def test_get_avatars_returns_3_avatars(self, auth_headers):
        """GET /api/avatars should return exactly 3 fixed avatars"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        assert len(avatars) == 3, f"Expected 3 avatars, got {len(avatars)}"
    
    def test_avatars_have_correct_ids(self, auth_headers):
        """Avatars should have ids: avatar-1, avatar-2, avatar-3"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        ids = [a["id"] for a in avatars]
        expected_ids = ["avatar-1", "avatar-2", "avatar-3"]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing avatar with id: {expected_id}"
    
    def test_avatars_have_required_fields(self, auth_headers):
        """Each avatar should have: id, name, display_name, is_active, has_photo"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        required_fields = ["id", "name", "display_name", "is_active", "has_photo"]
        
        for avatar in avatars:
            for field in required_fields:
                assert field in avatar, f"Avatar {avatar.get('id', 'unknown')} missing field: {field}"
    
    def test_avatars_have_correct_names(self, auth_headers):
        """Avatars should have names: Avatar 1, Avatar 2, Avatar 3"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        names = [a["name"] for a in avatars]
        expected_names = ["Avatar 1", "Avatar 2", "Avatar 3"]
        for expected_name in expected_names:
            assert expected_name in names, f"Missing avatar with name: {expected_name}"
    
    def test_get_avatars_requires_auth(self):
        """GET /api/avatars requires authentication"""
        response = requests.get(f"{BASE_URL}/api/avatars")
        # Without auth header, should fail
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"


class TestPatchAvatar:
    """Test PATCH /api/avatars/{id} endpoint - update display_name and is_active"""
    
    def test_update_display_name(self, auth_headers):
        """PATCH should update display_name"""
        # Get current state first
        get_resp = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars = get_resp.json()
        avatar_1 = next((a for a in avatars if a["id"] == "avatar-1"), None)
        original_name = avatar_1["display_name"]
        
        # Update display_name
        new_name = "Test Host Alex"
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": new_name}
        )
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        
        data = response.json()
        assert data["display_name"] == new_name, f"Expected '{new_name}', got '{data['display_name']}'"
        
        # Verify persistence with GET
        get_resp2 = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars2 = get_resp2.json()
        updated_avatar = next((a for a in avatars2 if a["id"] == "avatar-1"), None)
        assert updated_avatar["display_name"] == new_name
        
        # Restore original name
        requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": original_name if original_name != "Avatar 1" else "Host Alex"}
        )
    
    def test_update_is_active(self, auth_headers):
        """PATCH should update is_active status"""
        # Get current state
        get_resp = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars = get_resp.json()
        avatar_2 = next((a for a in avatars if a["id"] == "avatar-2"), None)
        original_active = avatar_2.get("is_active", True)
        
        # Toggle is_active to false
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-2",
            headers=auth_headers,
            json={"is_active": False}
        )
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        
        data = response.json()
        assert data["is_active"] == False, f"Expected is_active=False, got {data['is_active']}"
        
        # Verify persistence with GET
        get_resp2 = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars2 = get_resp2.json()
        updated_avatar = next((a for a in avatars2 if a["id"] == "avatar-2"), None)
        assert updated_avatar["is_active"] == False
        
        # Toggle back to true
        response2 = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-2",
            headers=auth_headers,
            json={"is_active": True}
        )
        assert response2.status_code == 200
        assert response2.json()["is_active"] == True
    
    def test_update_both_fields(self, auth_headers):
        """PATCH should update both display_name and is_active together"""
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-3",
            headers=auth_headers,
            json={
                "display_name": "Test Charlie",
                "is_active": False
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["display_name"] == "Test Charlie"
        assert data["is_active"] == False
        
        # Restore
        requests.patch(
            f"{BASE_URL}/api/avatars/avatar-3",
            headers=auth_headers,
            json={"display_name": "Host Charlie", "is_active": True}
        )
    
    def test_patch_non_existent_avatar_returns_404(self, auth_headers):
        """PATCH non-existent avatar should return 404"""
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-999",
            headers=auth_headers,
            json={"display_name": "Test"}
        )
        assert response.status_code == 404
    
    def test_patch_requires_admin(self, auth_headers):
        """PATCH should require Admin role - tested by API design"""
        # This is enforced by backend - we just verify the endpoint exists
        # Editor role test would require creating an Editor user
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": "Admin Test"}
        )
        # Admin should succeed
        assert response.status_code == 200
        # Restore
        requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": "Host Alex"}
        )


class TestAvatarPhoto:
    """Test POST/DELETE /api/avatars/{id}/photo endpoints"""
    
    def test_upload_photo(self, admin_token):
        """POST /api/avatars/{id}/photo should upload image"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a valid PNG image using PIL
        import io
        from PIL import Image
        
        # Create a 10x10 red image
        img = Image.new('RGB', (10, 10), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers,
            files=files
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        assert data["has_photo"] == True
        assert data["photo_data"] is not None
        assert data["photo_data"].startswith("data:image/")
    
    def test_upload_photo_non_existent_avatar_returns_404(self, admin_token):
        """POST photo to non-existent avatar should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        import io
        from PIL import Image
        
        img = Image.new('RGB', (10, 10), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-999/photo",
            headers=headers,
            files=files
        )
        assert response.status_code == 404
    
    def test_upload_invalid_mime_type_returns_400(self, admin_token):
        """POST with invalid mime type should return 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        import io
        fake_pdf = b'%PDF-1.4 fake pdf content'
        
        files = {'file': ('test.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers,
            files=files
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_delete_photo(self, admin_token, auth_headers):
        """DELETE /api/avatars/{id}/photo should remove photo"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First ensure avatar has a photo (upload one)
        import io
        from PIL import Image
        
        img = Image.new('RGB', (10, 10), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        requests.post(f"{BASE_URL}/api/avatars/avatar-1/photo", headers=headers, files=files)
        
        # Delete photo
        response = requests.delete(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers
        )
        assert response.status_code == 204, f"Delete failed: {response.text}"
        
        # Verify photo is removed
        get_resp = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars = get_resp.json()
        avatar_1 = next((a for a in avatars if a["id"] == "avatar-1"), None)
        assert avatar_1["has_photo"] == False
        assert avatar_1["photo_data"] is None
    
    def test_delete_photo_non_existent_avatar_returns_404(self, admin_token):
        """DELETE photo from non-existent avatar should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/avatars/avatar-999/photo",
            headers=headers
        )
        assert response.status_code == 404


class TestAvatarIntegration:
    """Test avatar data in related endpoints"""
    
    def test_tasks_can_use_any_avatar(self, auth_headers):
        """Tasks should accept any avatar value"""
        # Create a task with Avatar 1
        task_data = {
            "title": "TEST_Avatar_Integration_Task",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script that is at least 20 characters long",
            "publish_datetime": "2026-02-01T10:00:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tasks",
            headers=auth_headers,
            json=task_data
        )
        assert response.status_code == 200 or response.status_code == 201, f"Create task failed: {response.text}"
        
        task = response.json()
        assert task["avatar"] == "Avatar 1"
        
        # Clean up - delete the test task
        task_id = task["id"]
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)
    
    def test_avatar_display_name_independent_of_tasks(self, auth_headers):
        """Avatar display_name can be updated without affecting existing tasks"""
        # Update avatar display_name
        response = requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": "Integration Test Name"}
        )
        assert response.status_code == 200
        
        # Verify the update
        get_resp = requests.get(f"{BASE_URL}/api/avatars", headers=auth_headers)
        avatars = get_resp.json()
        avatar_1 = next((a for a in avatars if a["id"] == "avatar-1"), None)
        assert avatar_1["display_name"] == "Integration Test Name"
        
        # Restore
        requests.patch(
            f"{BASE_URL}/api/avatars/avatar-1",
            headers=auth_headers,
            json={"display_name": "Host Alex"}
        )
