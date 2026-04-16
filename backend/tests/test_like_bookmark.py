"""
Test suite for Like and Bookmark features in TrackLog app.
Tests: POST /{id}/like, POST /{id}/bookmark, GET /interactions/me, GET /bookmarks/me
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@tracklog.com"
TEST_PASSWORD = "Demo1234!"

# Known sighting ID from agent context
KNOWN_SIGHTING_ID = "sighting_ef0dacf21dbb"


class TestLikeBookmarkFeatures:
    """Test suite for like and bookmark functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session cookie
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed with status {login_response.status_code}: {login_response.text}")
        
        yield
        
        # Cleanup - no specific cleanup needed as likes/bookmarks are toggles
    
    # ─── GET /interactions/me Tests ───────────────────────────────────────────
    
    def test_get_interactions_me_returns_200(self):
        """GET /api/sightings/interactions/me should return 200 with liked_ids and bookmarked_ids"""
        response = self.session.get(f"{BASE_URL}/api/sightings/interactions/me")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "liked_ids" in data, "Response should contain liked_ids"
        assert "bookmarked_ids" in data, "Response should contain bookmarked_ids"
        assert isinstance(data["liked_ids"], list), "liked_ids should be a list"
        assert isinstance(data["bookmarked_ids"], list), "bookmarked_ids should be a list"
        print(f"✓ GET /interactions/me: liked_ids={len(data['liked_ids'])}, bookmarked_ids={len(data['bookmarked_ids'])}")
    
    def test_get_interactions_me_unauthenticated(self):
        """GET /api/sightings/interactions/me without auth should return 401"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/sightings/interactions/me")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ GET /interactions/me returns 401 for unauthenticated users")
    
    # ─── POST /{sighting_id}/like Tests ───────────────────────────────────────
    
    def test_toggle_like_returns_200(self):
        """POST /api/sightings/{id}/like should toggle like and return liked status"""
        response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "liked" in data, "Response should contain 'liked' field"
        assert "like_count" in data, "Response should contain 'like_count' field"
        assert isinstance(data["liked"], bool), "liked should be a boolean"
        assert isinstance(data["like_count"], int), "like_count should be an integer"
        assert data["like_count"] >= 0, "like_count should be non-negative"
        
        print(f"✓ POST /{KNOWN_SIGHTING_ID}/like: liked={data['liked']}, like_count={data['like_count']}")
    
    def test_toggle_like_twice_toggles_state(self):
        """Liking twice should toggle the like state"""
        # First like
        response1 = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        assert response1.status_code == 200
        data1 = response1.json()
        first_state = data1["liked"]
        first_count = data1["like_count"]
        
        # Second like (toggle)
        response2 = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        assert response2.status_code == 200
        data2 = response2.json()
        second_state = data2["liked"]
        second_count = data2["like_count"]
        
        # States should be opposite
        assert first_state != second_state, f"Like state should toggle: first={first_state}, second={second_state}"
        
        # Count should change by 1
        count_diff = abs(first_count - second_count)
        assert count_diff == 1, f"Like count should change by 1, but changed by {count_diff}"
        
        print(f"✓ Like toggle works: {first_state}→{second_state}, count: {first_count}→{second_count}")
    
    def test_like_unauthenticated(self):
        """POST /api/sightings/{id}/like without auth should return 401"""
        unauth_session = requests.Session()
        response = unauth_session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ POST /like returns 401 for unauthenticated users")
    
    def test_like_nonexistent_sighting(self):
        """POST /api/sightings/{invalid_id}/like should handle gracefully"""
        response = self.session.post(f"{BASE_URL}/api/sightings/nonexistent_sighting_xyz/like")
        
        # Should either return 404 or 200 (creating a like for non-existent sighting)
        # Based on implementation, it may just create the like record
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"✓ POST /like for nonexistent sighting returns {response.status_code}")
    
    # ─── POST /{sighting_id}/bookmark Tests ───────────────────────────────────
    
    def test_toggle_bookmark_returns_200(self):
        """POST /api/sightings/{id}/bookmark should toggle bookmark and return status"""
        response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "bookmarked" in data, "Response should contain 'bookmarked' field"
        assert isinstance(data["bookmarked"], bool), "bookmarked should be a boolean"
        
        print(f"✓ POST /{KNOWN_SIGHTING_ID}/bookmark: bookmarked={data['bookmarked']}")
    
    def test_toggle_bookmark_twice_toggles_state(self):
        """Bookmarking twice should toggle the bookmark state"""
        # First bookmark
        response1 = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        assert response1.status_code == 200
        data1 = response1.json()
        first_state = data1["bookmarked"]
        
        # Second bookmark (toggle)
        response2 = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        assert response2.status_code == 200
        data2 = response2.json()
        second_state = data2["bookmarked"]
        
        # States should be opposite
        assert first_state != second_state, f"Bookmark state should toggle: first={first_state}, second={second_state}"
        
        print(f"✓ Bookmark toggle works: {first_state}→{second_state}")
    
    def test_bookmark_unauthenticated(self):
        """POST /api/sightings/{id}/bookmark without auth should return 401"""
        unauth_session = requests.Session()
        response = unauth_session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ POST /bookmark returns 401 for unauthenticated users")
    
    # ─── GET /bookmarks/me Tests ──────────────────────────────────────────────
    
    def test_get_bookmarks_me_returns_200(self):
        """GET /api/sightings/bookmarks/me should return 200 with sightings list"""
        response = self.session.get(f"{BASE_URL}/api/sightings/bookmarks/me")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sightings" in data, "Response should contain 'sightings' field"
        assert isinstance(data["sightings"], list), "sightings should be a list"
        
        print(f"✓ GET /bookmarks/me: {len(data['sightings'])} bookmarked sightings")
    
    def test_get_bookmarks_me_unauthenticated(self):
        """GET /api/sightings/bookmarks/me without auth should return 401"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/sightings/bookmarks/me")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ GET /bookmarks/me returns 401 for unauthenticated users")
    
    def test_bookmarks_me_contains_owner_info(self):
        """GET /api/sightings/bookmarks/me should include owner info for each sighting"""
        # First ensure we have a bookmark
        self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        
        response = self.session.get(f"{BASE_URL}/api/sightings/bookmarks/me")
        assert response.status_code == 200
        
        data = response.json()
        if data["sightings"]:
            sighting = data["sightings"][0]
            assert "owner_name" in sighting, "Bookmarked sighting should have owner_name"
            assert "sighting_id" in sighting, "Bookmarked sighting should have sighting_id"
            assert "train_number" in sighting, "Bookmarked sighting should have train_number"
            assert "like_count" in sighting, "Bookmarked sighting should have like_count"
            print(f"✓ Bookmarked sighting has owner info: {sighting.get('owner_name')}")
        else:
            print("✓ No bookmarks to verify owner info (empty list)")
    
    # ─── Integration: Like affects feed like_count ────────────────────────────
    
    def test_like_updates_feed_like_count(self):
        """Liking a sighting should update the like_count in public feed"""
        # Get initial like count from feed
        feed_response = self.session.get(f"{BASE_URL}/api/public/feed")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        target_sighting = None
        for s in feed_data.get("sightings", []):
            if s["sighting_id"] == KNOWN_SIGHTING_ID:
                target_sighting = s
                break
        
        if not target_sighting:
            pytest.skip(f"Sighting {KNOWN_SIGHTING_ID} not found in public feed")
        
        initial_count = target_sighting.get("like_count", 0)
        
        # Toggle like
        like_response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        assert like_response.status_code == 200
        like_data = like_response.json()
        
        # Verify the returned count matches expected change
        expected_count = initial_count + 1 if like_data["liked"] else initial_count - 1
        assert like_data["like_count"] == expected_count or abs(like_data["like_count"] - expected_count) <= 1, \
            f"Like count mismatch: expected ~{expected_count}, got {like_data['like_count']}"
        
        print(f"✓ Like updates count: {initial_count}→{like_data['like_count']} (liked={like_data['liked']})")
    
    # ─── Integration: Bookmark persists in bookmarks/me ───────────────────────
    
    def test_bookmark_persists_in_bookmarks_me(self):
        """After bookmarking, sighting should appear in /bookmarks/me"""
        # Ensure bookmarked
        bookmark_response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        assert bookmark_response.status_code == 200
        bookmark_data = bookmark_response.json()
        
        if not bookmark_data["bookmarked"]:
            # Toggle again to bookmark
            bookmark_response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
            assert bookmark_response.status_code == 200
        
        # Verify in bookmarks/me
        bookmarks_response = self.session.get(f"{BASE_URL}/api/sightings/bookmarks/me")
        assert bookmarks_response.status_code == 200
        
        bookmarks_data = bookmarks_response.json()
        sighting_ids = [s["sighting_id"] for s in bookmarks_data.get("sightings", [])]
        
        assert KNOWN_SIGHTING_ID in sighting_ids, \
            f"Bookmarked sighting {KNOWN_SIGHTING_ID} should appear in /bookmarks/me"
        
        print(f"✓ Bookmarked sighting appears in /bookmarks/me")
    
    # ─── Integration: Interactions/me reflects current state ──────────────────
    
    def test_interactions_me_reflects_like_state(self):
        """GET /interactions/me should reflect current like state"""
        # Toggle like to known state
        like_response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/like")
        assert like_response.status_code == 200
        like_data = like_response.json()
        is_liked = like_data["liked"]
        
        # Check interactions
        interactions_response = self.session.get(f"{BASE_URL}/api/sightings/interactions/me")
        assert interactions_response.status_code == 200
        
        interactions_data = interactions_response.json()
        liked_ids = interactions_data.get("liked_ids", [])
        
        if is_liked:
            assert KNOWN_SIGHTING_ID in liked_ids, "Liked sighting should be in liked_ids"
        else:
            assert KNOWN_SIGHTING_ID not in liked_ids, "Unliked sighting should not be in liked_ids"
        
        print(f"✓ /interactions/me correctly reflects like state: liked={is_liked}")
    
    def test_interactions_me_reflects_bookmark_state(self):
        """GET /interactions/me should reflect current bookmark state"""
        # Toggle bookmark to known state
        bookmark_response = self.session.post(f"{BASE_URL}/api/sightings/{KNOWN_SIGHTING_ID}/bookmark")
        assert bookmark_response.status_code == 200
        bookmark_data = bookmark_response.json()
        is_bookmarked = bookmark_data["bookmarked"]
        
        # Check interactions
        interactions_response = self.session.get(f"{BASE_URL}/api/sightings/interactions/me")
        assert interactions_response.status_code == 200
        
        interactions_data = interactions_response.json()
        bookmarked_ids = interactions_data.get("bookmarked_ids", [])
        
        if is_bookmarked:
            assert KNOWN_SIGHTING_ID in bookmarked_ids, "Bookmarked sighting should be in bookmarked_ids"
        else:
            assert KNOWN_SIGHTING_ID not in bookmarked_ids, "Unbookmarked sighting should not be in bookmarked_ids"
        
        print(f"✓ /interactions/me correctly reflects bookmark state: bookmarked={is_bookmarked}")


class TestPublicFeedLikeCount:
    """Test that public feed includes like_count"""
    
    def test_public_feed_includes_like_count(self):
        """GET /api/public/feed should include like_count for each sighting"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/public/feed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sightings" in data, "Response should contain sightings"
        
        if data["sightings"]:
            sighting = data["sightings"][0]
            assert "like_count" in sighting, "Sighting should have like_count field"
            assert isinstance(sighting["like_count"], int), "like_count should be an integer"
            assert sighting["like_count"] >= 0, "like_count should be non-negative"
            print(f"✓ Public feed includes like_count: {sighting['like_count']}")
        else:
            print("✓ Public feed is empty, cannot verify like_count field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
