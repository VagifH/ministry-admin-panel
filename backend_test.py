import requests
import sys
import json
from datetime import datetime, timedelta

class MinistryAPITester:
    def __init__(self, base_url="https://ministry-admin-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail')
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        print(f"\n🔐 Testing login with {email}...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.current_user = response['user']
            print(f"✅ Login successful - User: {self.current_user['name']} ({self.current_user['role']})")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Stats: {response}")
        return success

    def test_user_management(self):
        """Test user management endpoints (Admin only)"""
        if self.current_user['role'] != 'Admin':
            print("⚠️  Skipping user management tests - Admin role required")
            return True

        # List users
        success, users = self.run_test(
            "List Users",
            "GET",
            "users",
            200
        )
        if not success:
            return False

        # Create a test user
        test_user_data = {
            "name": "Test Editor",
            "email": f"test_editor_{int(datetime.now().timestamp())}@ministry.local",
            "password": "TestPassword123!",
            "role": "Editor",
            "is_active": True
        }
        
        success, new_user = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data=test_user_data
        )
        if not success:
            return False

        user_id = new_user['id']
        print(f"✅ Created test user with ID: {user_id}")

        # Update user
        success, _ = self.run_test(
            "Update User",
            "PATCH",
            f"users/{user_id}",
            200,
            data={"name": "Updated Test Editor"}
        )
        if not success:
            return False

        # Delete user
        success, _ = self.run_test(
            "Delete User",
            "DELETE",
            f"users/{user_id}",
            200
        )
        return success

    def test_task_management(self):
        """Test task management endpoints"""
        # List tasks
        success, tasks = self.run_test(
            "List Tasks",
            "GET",
            "tasks",
            200
        )
        if not success:
            return False

        # Create a task (only Admin and Editor can create)
        if self.current_user['role'] == 'Approver':
            print("⚠️  Skipping task creation - Approvers cannot create tasks")
            return True

        future_date = (datetime.now() + timedelta(days=1)).isoformat()
        test_task_data = {
            "title": "Test Task for API Testing",
            "content_type": "Announcement",
            "avatar": "Avatar 1",
            "script": "This is a test script for API testing. It has more than 20 characters as required by validation.",
            "notes": "Test notes",
            "publish_datetime": future_date
        }
        
        success, new_task = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=test_task_data
        )
        if not success:
            return False

        task_id = new_task['id']
        print(f"✅ Created test task with ID: {task_id}")

        # Get specific task
        success, task = self.run_test(
            "Get Task Details",
            "GET",
            f"tasks/{task_id}",
            200
        )
        if not success:
            return False

        # Update task
        success, _ = self.run_test(
            "Update Task",
            "PATCH",
            f"tasks/{task_id}",
            200,
            data={"title": "Updated Test Task"}
        )
        if not success:
            return False

        # Change task status (Draft -> Submitted)
        success, _ = self.run_test(
            "Change Task Status",
            "PATCH",
            f"tasks/{task_id}/status",
            200,
            data={"status": "Submitted"}
        )
        if not success:
            return False

        # Add comment to task
        success, comment = self.run_test(
            "Add Comment",
            "POST",
            f"tasks/{task_id}/comments",
            200,
            data={"message": "This is a test comment"}
        )
        if not success:
            return False

        # Get task comments
        success, comments = self.run_test(
            "Get Task Comments",
            "GET",
            f"tasks/{task_id}/comments",
            200
        )
        if not success:
            return False

        return True

    def test_activity_logs(self):
        """Test audit log endpoints"""
        success, logs = self.run_test(
            "List Audit Logs",
            "GET",
            "audit-logs",
            200
        )
        return success

    def test_task_filters(self):
        """Test task filtering"""
        # Test search filter
        success, _ = self.run_test(
            "Search Tasks",
            "GET",
            "tasks?search=test",
            200
        )
        if not success:
            return False

        # Test status filter
        success, _ = self.run_test(
            "Filter Tasks by Status",
            "GET",
            "tasks?status=Draft",
            200
        )
        return success

    def test_validation_errors(self):
        """Test validation and error handling"""
        if self.current_user['role'] == 'Approver':
            print("⚠️  Skipping validation tests - Approvers cannot create tasks")
            return True

        # Test script validation (too short)
        future_date = (datetime.now() + timedelta(days=1)).isoformat()
        invalid_task_data = {
            "title": "Invalid Task",
            "content_type": "Announcement", 
            "avatar": "Avatar 1",
            "script": "Too short",  # Less than 20 characters
            "publish_datetime": future_date
        }
        
        success, _ = self.run_test(
            "Validation Error - Short Script",
            "POST",
            "tasks",
            422,  # Validation error
            data=invalid_task_data
        )
        
        # For validation tests, we expect failure (422)
        return success

def main():
    print("🏛️  Ministry Admin Panel API Testing")
    print("=" * 50)
    
    # Setup
    tester = MinistryAPITester()
    
    # Test login with default admin credentials
    if not tester.test_login("admin@ministry.local", "ChangeMe123!"):
        print("❌ Login failed, stopping tests")
        return 1

    # Run all tests
    tests = [
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("User Management", tester.test_user_management),
        ("Task Management", tester.test_task_management),
        ("Activity Logs", tester.test_activity_logs),
        ("Task Filters", tester.test_task_filters),
        ("Validation Errors", tester.test_validation_errors),
    ]

    failed_tests = []
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} tests...")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    
    if failed_tests:
        print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())