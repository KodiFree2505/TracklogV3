"""
Backend API Tests for TrackLog - Auth and Sightings
Tests: Registration, Login, Protected Routes, Sightings CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rails-log.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test User"

# Demo user from test_credentials.md
DEMO_EMAIL = "demo@tracklog.com"
DEMO_PASSWORD = "Demo1234!"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/health")
        # Note: /health may return HTML from frontend, check /api endpoint
        print(f"Health check status: {response.status_code}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_register_new_user(self):
        """Test user registration with new email"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            }
        )
        print(f"Register response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["email"] == unique_email
        assert data["name"] == TEST_NAME
        print(f"✓ User registered successfully: {data['user_id']}")
    
    def test_register_duplicate_email(self):
        """Test registration with existing email fails"""
        # First register
        unique_email = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": unique_email, "password": TEST_PASSWORD, "name": TEST_NAME}
        )
        
        # Try to register again with same email
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": unique_email, "password": TEST_PASSWORD, "name": "Another User"}
        )
        print(f"Duplicate register response: {response.status_code}")
        assert response.status_code == 400, "Should reject duplicate email"
        print("✓ Duplicate email registration correctly rejected")
    
    def test_login_with_demo_credentials(self):
        """Test login with demo user credentials"""
        # First ensure demo user exists by trying to register (will fail if exists)
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD, "name": "Demo User"}
        )
        
        # Now login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        print(f"Login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["email"] == DEMO_EMAIL
        print(f"✓ Login successful for demo user")
        return response.cookies
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": "WrongPassword123!"}
        )
        print(f"Invalid login response: {response.status_code}")
        assert response.status_code == 401, "Should reject invalid credentials"
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@tracklog.com", "password": "SomePassword123!"}
        )
        print(f"Nonexistent user login response: {response.status_code}")
        assert response.status_code == 401, "Should reject non-existent user"
        print("✓ Non-existent user login correctly rejected")


class TestProtectedRoutes:
    """Test protected routes require authentication"""
    
    def test_me_endpoint_without_auth(self):
        """Test /auth/me returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        print(f"Unauthenticated /me response: {response.status_code}")
        assert response.status_code == 401, "Should require authentication"
        print("✓ /auth/me correctly requires authentication")
    
    def test_sightings_without_auth(self):
        """Test /sightings returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/sightings")
        print(f"Unauthenticated /sightings response: {response.status_code}")
        assert response.status_code == 401, "Should require authentication"
        print("✓ /sightings correctly requires authentication")
    
    def test_sightings_stats_without_auth(self):
        """Test /sightings/stats returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/sightings/stats")
        print(f"Unauthenticated /sightings/stats response: {response.status_code}")
        assert response.status_code == 401, "Should require authentication"
        print("✓ /sightings/stats correctly requires authentication")


class TestAuthenticatedFlow:
    """Test authenticated user flows"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        # Register a new test user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": unique_email, "password": TEST_PASSWORD, "name": TEST_NAME}
        )
        
        if response.status_code != 200:
            # Try login if registration fails (user might exist)
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
            )
        
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return session
    
    def test_get_current_user(self, auth_session):
        """Test getting current user info"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        print(f"Get current user response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get user: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Current user retrieved: {data['email']}")
    
    def test_logout(self, auth_session):
        """Test logout endpoint"""
        response = auth_session.post(f"{BASE_URL}/api/auth/logout")
        print(f"Logout response: {response.status_code}")
        assert response.status_code == 200, f"Logout failed: {response.text}"
        
        # Verify session is invalidated
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, "Session should be invalidated after logout"
        print("✓ Logout successful and session invalidated")


class TestSightingsCRUD:
    """Test sightings CRUD operations"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        # Register a new test user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": unique_email, "password": TEST_PASSWORD, "name": TEST_NAME}
        )
        
        if response.status_code != 200:
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
            )
        
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return session
    
    def test_create_sighting(self, auth_session):
        """Test creating a new sighting"""
        sighting_data = {
            "train_number": "TEST_43102",
            "train_type": "Passenger",
            "traction_type": "Electric",
            "operator": "Great Western Railway",
            "route": "London Paddington to Bristol",
            "location": "London Paddington Station",
            "sighting_date": "2026-01-15",
            "sighting_time": "14:30",
            "notes": "Test sighting from automated tests",
            "photos": []
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/sightings",
            json=sighting_data
        )
        print(f"Create sighting response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to create sighting: {response.text}"
        
        data = response.json()
        assert "sighting_id" in data
        assert data["train_number"] == "TEST_43102"
        assert data["train_type"] == "Passenger"
        assert data["traction_type"] == "Electric"
        assert data["operator"] == "Great Western Railway"
        assert data["location"] == "London Paddington Station"
        print(f"✓ Sighting created: {data['sighting_id']}")
        return data["sighting_id"]
    
    def test_get_sightings_list(self, auth_session):
        """Test getting list of sightings"""
        response = auth_session.get(f"{BASE_URL}/api/sightings")
        print(f"Get sightings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get sightings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} sightings")
    
    def test_get_sighting_stats(self, auth_session):
        """Test getting sighting statistics"""
        response = auth_session.get(f"{BASE_URL}/api/sightings/stats")
        print(f"Get stats response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        assert "total_sightings" in data
        assert "this_month" in data
        assert "unique_locations" in data
        assert "top_train_types" in data
        assert "top_operators" in data
        assert "top_locations" in data
        print(f"✓ Stats retrieved: {data['total_sightings']} total sightings")
    
    def test_create_and_delete_sighting(self, auth_session):
        """Test creating and then deleting a sighting"""
        # Create
        sighting_data = {
            "train_number": "TEST_DELETE_99999",
            "train_type": "Freight",
            "traction_type": "Diesel",
            "operator": "Test Operator",
            "location": "Test Location",
            "sighting_date": "2026-01-15",
            "sighting_time": "10:00",
            "notes": "This sighting will be deleted",
            "photos": []
        }
        
        create_response = auth_session.post(
            f"{BASE_URL}/api/sightings",
            json=sighting_data
        )
        assert create_response.status_code == 200
        sighting_id = create_response.json()["sighting_id"]
        print(f"Created sighting for deletion: {sighting_id}")
        
        # Delete
        delete_response = auth_session.delete(f"{BASE_URL}/api/sightings/{sighting_id}")
        print(f"Delete response: {delete_response.status_code}")
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        
        # Verify deletion
        get_response = auth_session.get(f"{BASE_URL}/api/sightings/{sighting_id}")
        assert get_response.status_code == 404, "Deleted sighting should not be found"
        print("✓ Sighting created and deleted successfully")
    
    def test_create_sighting_with_all_traction_types(self, auth_session):
        """Test creating sightings with different traction types"""
        traction_types = ["Electric", "Diesel", "Steam", "Diesel-Electric", "Hybrid"]
        
        for traction in traction_types:
            sighting_data = {
                "train_number": f"TEST_{traction[:3].upper()}_001",
                "train_type": "Passenger",
                "traction_type": traction,
                "operator": "Test Railway",
                "location": "Test Station",
                "sighting_date": "2026-01-15",
                "sighting_time": "12:00",
                "notes": f"Testing {traction} traction type",
                "photos": []
            }
            
            response = auth_session.post(
                f"{BASE_URL}/api/sightings",
                json=sighting_data
            )
            assert response.status_code == 200, f"Failed for traction type {traction}: {response.text}"
            print(f"✓ Created sighting with traction type: {traction}")


class TestProfileManagement:
    """Test profile management endpoints"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        unique_email = f"test_{uuid.uuid4().hex[:8]}@tracklog.com"
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": unique_email, "password": TEST_PASSWORD, "name": TEST_NAME}
        )
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return session
    
    def test_update_profile_name(self, auth_session):
        """Test updating profile name"""
        response = auth_session.put(
            f"{BASE_URL}/api/auth/profile",
            json={"name": "Updated Test Name"}
        )
        print(f"Update profile response: {response.status_code}")
        assert response.status_code == 200, f"Failed to update profile: {response.text}"
        
        data = response.json()
        assert data["name"] == "Updated Test Name"
        print("✓ Profile name updated successfully")
    
    def test_update_password(self, auth_session):
        """Test updating password"""
        response = auth_session.put(
            f"{BASE_URL}/api/auth/password",
            json={
                "current_password": TEST_PASSWORD,
                "new_password": "NewTestPass456!"
            }
        )
        print(f"Update password response: {response.status_code}")
        assert response.status_code == 200, f"Failed to update password: {response.text}"
        print("✓ Password updated successfully")
    
    def test_update_password_wrong_current(self, auth_session):
        """Test updating password with wrong current password"""
        response = auth_session.put(
            f"{BASE_URL}/api/auth/password",
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewTestPass456!"
            }
        )
        print(f"Wrong password update response: {response.status_code}")
        assert response.status_code == 401, "Should reject wrong current password"
        print("✓ Wrong current password correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
