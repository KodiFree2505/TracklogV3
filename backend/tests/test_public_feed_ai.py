"""
Test suite for TrackLog Public Feed and AI Summary features
Tests: GET /api/public/feed, GET /api/public/feed?search=, POST /api/ai/analytics-summary
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@tracklog.com"
TEST_PASSWORD = "Demo1234!"


class TestPublicFeed:
    """Public Feed endpoint tests - no auth required"""

    def test_public_feed_returns_200(self):
        """GET /api/public/feed should return 200 without auth"""
        response = requests.get(f"{BASE_URL}/api/public/feed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sightings" in data, "Response should contain 'sightings' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "page" in data, "Response should contain 'page' key"
        assert "pages" in data, "Response should contain 'pages' key"
        assert isinstance(data["sightings"], list), "sightings should be a list"

    def test_public_feed_pagination(self):
        """GET /api/public/feed with pagination params"""
        response = requests.get(f"{BASE_URL}/api/public/feed?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1, "Page should be 1"
        # Limit should be respected (max 5 items)
        assert len(data["sightings"]) <= 5, "Should return at most 5 sightings"

    def test_public_feed_search_filter(self):
        """GET /api/public/feed?search=HST should filter results"""
        response = requests.get(f"{BASE_URL}/api/public/feed?search=HST")
        assert response.status_code == 200
        
        data = response.json()
        # If there are results, they should match the search term
        for sighting in data["sightings"]:
            search_fields = [
                sighting.get("train_number", "").lower(),
                sighting.get("train_type", "").lower(),
                sighting.get("operator", "").lower(),
                sighting.get("location", "").lower(),
            ]
            assert any("hst" in field for field in search_fields), \
                f"Sighting should match search term 'HST': {sighting}"

    def test_public_feed_sighting_structure(self):
        """Verify sighting objects have required fields"""
        response = requests.get(f"{BASE_URL}/api/public/feed")
        assert response.status_code == 200
        
        data = response.json()
        if data["sightings"]:
            sighting = data["sightings"][0]
            required_fields = [
                "sighting_id", "share_id", "train_number", "train_type",
                "operator", "location", "sighting_date", "sighting_time",
                "created_at", "owner_name"
            ]
            for field in required_fields:
                assert field in sighting, f"Sighting should have '{field}' field"

    def test_public_feed_empty_search(self):
        """GET /api/public/feed?search= with empty search should return all"""
        response = requests.get(f"{BASE_URL}/api/public/feed?search=")
        assert response.status_code == 200
        
        data = response.json()
        assert "sightings" in data


class TestPublicSighting:
    """Public sighting detail endpoint tests"""

    def test_public_sighting_valid_share_id(self):
        """GET /api/public/sightings/{share_id} with valid ID"""
        # First get a share_id from the feed
        feed_response = requests.get(f"{BASE_URL}/api/public/feed")
        assert feed_response.status_code == 200
        
        data = feed_response.json()
        if data["sightings"]:
            share_id = data["sightings"][0]["share_id"]
            response = requests.get(f"{BASE_URL}/api/public/sightings/{share_id}")
            assert response.status_code == 200
            
            sighting = response.json()
            assert sighting["share_id"] == share_id

    def test_public_sighting_invalid_share_id(self):
        """GET /api/public/sightings/{share_id} with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/sightings/invalid_id_12345")
        assert response.status_code == 404


class TestAISummary:
    """AI Summary endpoint tests - requires auth"""

    @pytest.fixture
    def auth_session(self):
        """Login and return session with auth cookie"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        return session

    def test_ai_summary_requires_auth(self):
        """POST /api/ai/analytics-summary without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/ai/analytics-summary",
            json={"analytics": {}, "stats": {}, "user_name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_ai_summary_with_auth(self, auth_session):
        """POST /api/ai/analytics-summary with auth returns 200"""
        # First get real analytics data
        stats_response = auth_session.get(f"{BASE_URL}/api/sightings/stats")
        analytics_response = auth_session.get(f"{BASE_URL}/api/sightings/analytics")
        
        stats = stats_response.json() if stats_response.status_code == 200 else {}
        analytics = analytics_response.json() if analytics_response.status_code == 200 else {}
        
        response = auth_session.post(
            f"{BASE_URL}/api/ai/analytics-summary",
            json={
                "analytics": analytics,
                "stats": stats,
                "user_name": "Demo"
            }
        )
        
        # Should return 200 with summary
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary' key"
        assert isinstance(data["summary"], str), "Summary should be a string"
        assert len(data["summary"]) > 0, "Summary should not be empty"


class TestAuthFlow:
    """Auth flow tests for login"""

    def test_login_success(self):
        """POST /api/auth/login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        
        data = response.json()
        # Login returns user data directly (not nested under 'user' key)
        assert "email" in data, "Response should contain 'email'"
        assert data["email"] == TEST_EMAIL

    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401


class TestDashboardAPIs:
    """Dashboard-related API tests"""

    @pytest.fixture
    def auth_session(self):
        """Login and return session with auth cookie"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        return session

    def test_stats_endpoint(self, auth_session):
        """GET /api/sightings/stats returns stats"""
        response = auth_session.get(f"{BASE_URL}/api/sightings/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_sightings" in data
        assert "this_month" in data
        assert "unique_locations" in data

    def test_analytics_endpoint(self, auth_session):
        """GET /api/sightings/analytics returns analytics"""
        response = auth_session.get(f"{BASE_URL}/api/sightings/analytics")
        assert response.status_code == 200
        
        data = response.json()
        # Check for expected analytics keys
        expected_keys = ["by_train_type", "by_operator", "by_location"]
        for key in expected_keys:
            assert key in data, f"Analytics should contain '{key}'"
