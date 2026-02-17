"""
Test suite for Avatar feature - Settings -> Avatars
Tests:
- GET /api/avatars - list all avatars
- POST /api/avatars/{id}/photo - upload avatar photo
- DELETE /api/avatars/{id}/photo - remove avatar photo
"""

import pytest
import requests
import os
import base64
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ministry.local"
ADMIN_PASSWORD = "ChangeMe123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def create_editor_user(admin_token):
    """Create an editor user for permission testing"""
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    # Try to create a test editor
    user_data = {
        "name": "TEST_Editor",
        "email": "test_editor@ministry.local",
        "password": "TestPass123!",
        "role": "Editor"
    }
    response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=headers)
    
    if response.status_code == 400 and "Email already exists" in response.text:
        # User exists, just login
        pass
    
    # Login as editor
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test_editor@ministry.local", "password": "TestPass123!"}
    )
    if login_response.status_code == 200:
        return login_response.json()["token"]
    return None


class TestGetAvatars:
    """Tests for GET /api/avatars endpoint"""

    def test_get_avatars_returns_3_avatars(self, admin_headers):
        """GET /api/avatars should return exactly 3 avatars"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        avatars = response.json()
        assert isinstance(avatars, list), "Response should be a list"
        assert len(avatars) == 3, f"Expected 3 avatars, got {len(avatars)}"

    def test_avatars_have_correct_structure(self, admin_headers):
        """Each avatar should have required fields"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        required_fields = ["id", "name", "has_photo"]
        
        for avatar in avatars:
            for field in required_fields:
                assert field in avatar, f"Avatar missing field: {field}"

    def test_avatars_have_correct_ids(self, admin_headers):
        """Avatars should have IDs: avatar-1, avatar-2, avatar-3"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        avatar_ids = [a["id"] for a in avatars]
        
        assert "avatar-1" in avatar_ids, "Missing avatar-1"
        assert "avatar-2" in avatar_ids, "Missing avatar-2"
        assert "avatar-3" in avatar_ids, "Missing avatar-3"

    def test_avatars_have_correct_names(self, admin_headers):
        """Avatars should have names: Avatar 1, Avatar 2, Avatar 3"""
        response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        assert response.status_code == 200
        
        avatars = response.json()
        avatar_names = [a["name"] for a in avatars]
        
        assert "Avatar 1" in avatar_names, "Missing Avatar 1"
        assert "Avatar 2" in avatar_names, "Missing Avatar 2"
        assert "Avatar 3" in avatar_names, "Missing Avatar 3"

    def test_get_avatars_requires_auth(self):
        """GET /api/avatars should require authentication"""
        response = requests.get(f"{BASE_URL}/api/avatars")
        assert response.status_code == 401 or response.status_code == 403


class TestUploadAvatarPhoto:
    """Tests for POST /api/avatars/{id}/photo endpoint"""

    def _create_test_image(self, size_bytes=1024, format="JPEG"):
        """Create a test image file"""
        from PIL import Image
        import io
        
        # Create a simple colored image
        img = Image.new('RGB', (100, 100), color='blue')
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        return buffer

    def test_upload_avatar_photo_success(self, admin_token):
        """Admin should be able to upload avatar photo"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create test image
        image_buffer = self._create_test_image()
        files = {"file": ("test.jpg", image_buffer, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify response structure
        data = response.json()
        assert data["id"] == "avatar-2"
        assert data["has_photo"] == True
        assert "photo_data" in data
        assert data["photo_data"].startswith("data:image/")

    def test_upload_avatar_photo_updates_has_photo(self, admin_token, admin_headers):
        """After upload, has_photo should be True"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Upload photo
        image_buffer = self._create_test_image()
        files = {"file": ("test.jpg", image_buffer, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-3/photo",
            headers=headers,
            files=files
        )
        assert response.status_code == 200
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        avatars = get_response.json()
        avatar_3 = next((a for a in avatars if a["id"] == "avatar-3"), None)
        
        assert avatar_3 is not None
        assert avatar_3["has_photo"] == True

    def test_upload_rejects_invalid_mime_type(self, admin_token):
        """Upload should reject non-image files"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a text file
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Invalid file type" in response.text or "JPG, PNG, WebP" in response.text

    def test_upload_rejects_file_over_2mb(self, admin_token):
        """Upload should reject files larger than 2MB"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create large data (2.5MB)
        large_data = b"x" * (2 * 1024 * 1024 + 500000)
        files = {"file": ("large.jpg", large_data, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "too large" in response.text.lower() or "2MB" in response.text

    def test_upload_rejects_non_existent_avatar(self, admin_token):
        """Upload should return 404 for non-existent avatar"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        image_buffer = self._create_test_image()
        files = {"file": ("test.jpg", image_buffer, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-999/photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_upload_requires_admin_role(self, create_editor_user):
        """Only Admin should be able to upload avatar photos"""
        if create_editor_user is None:
            pytest.skip("Could not create editor user")
        
        headers = {"Authorization": f"Bearer {create_editor_user}"}
        
        # Use Pillow to create image
        from PIL import Image
        import io
        img = Image.new('RGB', (100, 100), color='blue')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        
        files = {"file": ("test.jpg", buffer, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-1/photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestDeleteAvatarPhoto:
    """Tests for DELETE /api/avatars/{id}/photo endpoint"""

    def test_delete_avatar_photo_success(self, admin_token, admin_headers):
        """Admin should be able to delete avatar photo"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First, ensure there's a photo to delete by uploading one
        from PIL import Image
        import io
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        
        files = {"file": ("test.jpg", buffer, "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=headers,
            files=files
        )
        
        # Now delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=admin_headers
        )
        
        assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}"
        
        # Verify deletion via GET
        get_response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        avatars = get_response.json()
        avatar_2 = next((a for a in avatars if a["id"] == "avatar-2"), None)
        
        assert avatar_2 is not None
        assert avatar_2["has_photo"] == False

    def test_delete_requires_admin_role(self, create_editor_user, admin_token):
        """Only Admin should be able to delete avatar photos"""
        if create_editor_user is None:
            pytest.skip("Could not create editor user")
        
        # First ensure photo exists
        from PIL import Image
        import io
        img = Image.new('RGB', (100, 100), color='green')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("test.jpg", buffer, "image/jpeg")}
        requests.post(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=admin_headers,
            files=files
        )
        
        # Try to delete as editor
        editor_headers = {
            "Authorization": f"Bearer {create_editor_user}",
            "Content-Type": "application/json"
        }
        
        response = requests.delete(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=editor_headers
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"

    def test_delete_returns_400_if_no_photo(self, admin_headers, admin_token):
        """DELETE should return 400 if avatar has no photo"""
        # First ensure avatar-2 has no photo
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Try to delete (might fail if no photo, which is expected)
        # First let's check if it has a photo
        get_response = requests.get(f"{BASE_URL}/api/avatars", headers=admin_headers)
        avatars = get_response.json()
        avatar_2 = next((a for a in avatars if a["id"] == "avatar-2"), None)
        
        if avatar_2 and avatar_2["has_photo"]:
            # Delete it first
            requests.delete(f"{BASE_URL}/api/avatars/avatar-2/photo", headers=admin_headers)
        
        # Now try to delete again (should fail with 400)
        response = requests.delete(
            f"{BASE_URL}/api/avatars/avatar-2/photo",
            headers=admin_headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "no photo" in response.text.lower()


class TestAvatarAuthentication:
    """Tests for avatar endpoint authentication"""

    def test_get_avatars_without_auth_fails(self):
        """GET /api/avatars without auth should return 401/403"""
        response = requests.get(f"{BASE_URL}/api/avatars")
        assert response.status_code in [401, 403]

    def test_upload_without_auth_fails(self):
        """POST /api/avatars/{id}/photo without auth should return 401/403"""
        response = requests.post(f"{BASE_URL}/api/avatars/avatar-1/photo")
        assert response.status_code in [401, 403]

    def test_delete_without_auth_fails(self):
        """DELETE /api/avatars/{id}/photo without auth should return 401/403"""
        response = requests.delete(f"{BASE_URL}/api/avatars/avatar-1/photo")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
