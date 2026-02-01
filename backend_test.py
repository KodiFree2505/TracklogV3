#!/usr/bin/env python3
"""
Backend API Testing for TrackLog App
Tests authentication and sightings endpoints with comprehensive scenarios
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        pass
    return "http://localhost:8001"  # fallback

BASE_URL = get_backend_url()
API_BASE = f"{BASE_URL}/api"

class TrackLogTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.session_token = None
        self.test_user_email = f"testuser.{int(datetime.now().timestamp())}@tracklog.com"
        self.test_user_password = "SecurePass123!"
        self.test_user_name = "Test User"
        self.created_sighting_id = None
        
    def log_result(self, test_name, success, message, response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'response_code': response.status_code if response else None,
            'response_body': response.text if response else None
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if response and not success:
            print(f"   Response Code: {response.status_code}")
            print(f"   Response Body: {response.text}")
        print()

    def test_register_new_user(self):
        """Test registering a new user with valid data"""
        print("Testing user registration...")
        
        payload = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ['user_id', 'email', 'name']):
                    # Check if session token is set in cookies
                    session_cookie = None
                    for cookie in response.cookies:
                        if cookie.name == 'session_token':
                            session_cookie = cookie.value
                            self.session_token = session_cookie
                            break
                    
                    if session_cookie:
                        self.log_result("Register New User", True, 
                                      f"User registered successfully with ID: {data['user_id']}", response)
                    else:
                        self.log_result("Register New User", False, 
                                      "User registered but no session token in cookies", response)
                else:
                    self.log_result("Register New User", False, 
                                  "Response missing required fields", response)
            else:
                self.log_result("Register New User", False, 
                              f"Registration failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Register New User", False, f"Exception occurred: {str(e)}")

    def test_duplicate_registration(self):
        """Test duplicate registration should fail"""
        print("Testing duplicate registration...")
        
        payload = {
            "email": self.test_user_email,  # Same email as before
            "password": "AnotherPass123!",
            "name": "Another User"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                self.log_result("Duplicate Registration", True, 
                              "Duplicate registration correctly rejected", response)
            else:
                self.log_result("Duplicate Registration", False, 
                              f"Expected 400 status, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Duplicate Registration", False, f"Exception occurred: {str(e)}")

    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        print("Testing login with valid credentials...")
        
        payload = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ['user_id', 'email', 'name']):
                    # Check if session token is set in cookies
                    session_cookie = None
                    for cookie in response.cookies:
                        if cookie.name == 'session_token':
                            session_cookie = cookie.value
                            self.session_token = session_cookie
                            break
                    
                    if session_cookie:
                        self.log_result("Login Valid Credentials", True, 
                                      f"Login successful for user: {data['email']}", response)
                    else:
                        self.log_result("Login Valid Credentials", False, 
                                      "Login successful but no session token in cookies", response)
                else:
                    self.log_result("Login Valid Credentials", False, 
                                  "Response missing required fields", response)
            else:
                self.log_result("Login Valid Credentials", False, 
                              f"Login failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Login Valid Credentials", False, f"Exception occurred: {str(e)}")

    def test_login_wrong_password(self):
        """Test login with wrong password should fail"""
        print("Testing login with wrong password...")
        
        payload = {
            "email": self.test_user_email,
            "password": "WrongPassword123!"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 401:
                self.log_result("Login Wrong Password", True, 
                              "Login correctly rejected with wrong password", response)
            else:
                self.log_result("Login Wrong Password", False, 
                              f"Expected 401 status, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Login Wrong Password", False, f"Exception occurred: {str(e)}")

    def test_get_current_user(self):
        """Test getting current user info with session token"""
        print("Testing get current user...")
        
        if not self.session_token:
            self.log_result("Get Current User", False, "No session token available for testing")
            return
        
        try:
            # Test with Authorization header
            response = self.session.get(
                f"{API_BASE}/auth/me",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ['user_id', 'email', 'name']):
                    if data['email'] == self.test_user_email:
                        self.log_result("Get Current User", True, 
                                      f"User info retrieved successfully: {data['name']}", response)
                    else:
                        self.log_result("Get Current User", False, 
                                      "Retrieved user email doesn't match expected", response)
                else:
                    self.log_result("Get Current User", False, 
                                  "Response missing required fields", response)
            else:
                self.log_result("Get Current User", False, 
                              f"Get user info failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Current User", False, f"Exception occurred: {str(e)}")

    def test_get_user_without_token(self):
        """Test getting user info without session token should fail"""
        print("Testing get current user without token...")
        
        try:
            response = requests.get(f"{API_BASE}/auth/me")
            
            if response.status_code == 401:
                self.log_result("Get User Without Token", True, 
                              "Correctly rejected request without token", response)
            else:
                self.log_result("Get User Without Token", False, 
                              f"Expected 401 status, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get User Without Token", False, f"Exception occurred: {str(e)}")

    def test_logout(self):
        """Test user logout"""
        print("Testing user logout...")
        
        if not self.session_token:
            self.log_result("User Logout", False, "No session token available for testing")
            return
        
        try:
            # Set the session token as a cookie for logout
            self.session.cookies.set('session_token', self.session_token)
            
            response = self.session.post(f"{API_BASE}/auth/logout")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'logged out' in data['message'].lower():
                    self.log_result("User Logout", True, 
                                  "User logged out successfully", response)
                    
                    # Test that session is invalidated
                    test_response = self.session.get(
                        f"{API_BASE}/auth/me",
                        headers={"Authorization": f"Bearer {self.session_token}"}
                    )
                    
                    if test_response.status_code == 401:
                        self.log_result("Session Invalidation", True, 
                                      "Session correctly invalidated after logout", test_response)
                    else:
                        self.log_result("Session Invalidation", False, 
                                      "Session still valid after logout", test_response)
                else:
                    self.log_result("User Logout", False, 
                                  "Unexpected logout response format", response)
            else:
                self.log_result("User Logout", False, 
                              f"Logout failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Logout", False, f"Exception occurred: {str(e)}")

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        print("Testing API connectivity...")
        
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                self.log_result("API Connectivity", True, 
                              f"API is accessible at {API_BASE}", response)
            else:
                self.log_result("API Connectivity", False, 
                              f"API returned status {response.status_code}", response)
                
        except requests.exceptions.ConnectionError:
            self.log_result("API Connectivity", False, 
                          f"Cannot connect to API at {API_BASE}")
        except Exception as e:
            self.log_result("API Connectivity", False, f"Exception occurred: {str(e)}")

    def test_create_sighting(self):
        """Test creating a new train sighting"""
        print("Testing create sighting...")
        
        if not self.session_token:
            self.log_result("Create Sighting", False, "No session token available for testing")
            return
        
        payload = {
            "train_number": "66057",
            "train_type": "Freight",
            "operator": "DB Cargo",
            "route": "Hamburg - Munich",
            "location": "Hamburg Central",
            "sighting_date": "2025-07-01",
            "sighting_time": "14:30",
            "notes": "Spotted during afternoon commute",
            "photos": []
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/sightings",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.session_token}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['sighting_id', 'user_id', 'train_number', 'train_type', 'operator', 'location']
                if all(key in data for key in required_fields):
                    self.created_sighting_id = data['sighting_id']
                    self.log_result("Create Sighting", True, 
                                  f"Sighting created successfully with ID: {data['sighting_id']}", response)
                else:
                    self.log_result("Create Sighting", False, 
                                  "Response missing required fields", response)
            else:
                self.log_result("Create Sighting", False, 
                              f"Create sighting failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Create Sighting", False, f"Exception occurred: {str(e)}")

    def test_get_all_sightings(self):
        """Test getting all sightings for current user"""
        print("Testing get all sightings...")
        
        if not self.session_token:
            self.log_result("Get All Sightings", False, "No session token available for testing")
            return
        
        try:
            response = self.session.get(
                f"{API_BASE}/sightings",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if our created sighting is in the list
                        sighting_found = any(s.get('sighting_id') == self.created_sighting_id for s in data)
                        if sighting_found:
                            self.log_result("Get All Sightings", True, 
                                          f"Retrieved {len(data)} sightings including our test sighting", response)
                        else:
                            self.log_result("Get All Sightings", True, 
                                          f"Retrieved {len(data)} sightings (test sighting not found, may be expected)", response)
                    else:
                        self.log_result("Get All Sightings", True, 
                                      "Retrieved empty sightings list", response)
                else:
                    self.log_result("Get All Sightings", False, 
                                  "Response is not a list", response)
            else:
                self.log_result("Get All Sightings", False, 
                              f"Get sightings failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get All Sightings", False, f"Exception occurred: {str(e)}")

    def test_get_sighting_stats(self):
        """Test getting sighting statistics"""
        print("Testing get sighting stats...")
        
        if not self.session_token:
            self.log_result("Get Sighting Stats", False, "No session token available for testing")
            return
        
        try:
            response = self.session.get(
                f"{API_BASE}/sightings/stats",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_sightings', 'this_month', 'unique_locations', 'unique_trains']
                if all(key in data for key in required_fields):
                    self.log_result("Get Sighting Stats", True, 
                                  f"Stats retrieved: {data['total_sightings']} total sightings", response)
                else:
                    self.log_result("Get Sighting Stats", False, 
                                  "Response missing required fields", response)
            else:
                self.log_result("Get Sighting Stats", False, 
                              f"Get stats failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Sighting Stats", False, f"Exception occurred: {str(e)}")

    def test_get_single_sighting(self):
        """Test getting a single sighting by ID"""
        print("Testing get single sighting...")
        
        if not self.session_token:
            self.log_result("Get Single Sighting", False, "No session token available for testing")
            return
            
        if not self.created_sighting_id:
            self.log_result("Get Single Sighting", False, "No sighting ID available for testing")
            return
        
        try:
            response = self.session.get(
                f"{API_BASE}/sightings/{self.created_sighting_id}",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('sighting_id') == self.created_sighting_id:
                    self.log_result("Get Single Sighting", True, 
                                  f"Retrieved sighting: {data['train_number']} at {data['location']}", response)
                else:
                    self.log_result("Get Single Sighting", False, 
                                  "Retrieved sighting ID doesn't match expected", response)
            elif response.status_code == 404:
                self.log_result("Get Single Sighting", False, 
                              "Sighting not found (404) - may indicate creation failed", response)
            else:
                self.log_result("Get Single Sighting", False, 
                              f"Get single sighting failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Single Sighting", False, f"Exception occurred: {str(e)}")

    def test_delete_sighting(self):
        """Test deleting a sighting"""
        print("Testing delete sighting...")
        
        if not self.session_token:
            self.log_result("Delete Sighting", False, "No session token available for testing")
            return
            
        if not self.created_sighting_id:
            self.log_result("Delete Sighting", False, "No sighting ID available for testing")
            return
        
        try:
            response = self.session.delete(
                f"{API_BASE}/sightings/{self.created_sighting_id}",
                headers={"Authorization": f"Bearer {self.session_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'deleted' in data['message'].lower():
                    self.log_result("Delete Sighting", True, 
                                  "Sighting deleted successfully", response)
                    
                    # Verify deletion by trying to get the sighting
                    verify_response = self.session.get(
                        f"{API_BASE}/sightings/{self.created_sighting_id}",
                        headers={"Authorization": f"Bearer {self.session_token}"}
                    )
                    
                    if verify_response.status_code == 404:
                        self.log_result("Verify Deletion", True, 
                                      "Sighting correctly not found after deletion", verify_response)
                    else:
                        self.log_result("Verify Deletion", False, 
                                      "Sighting still exists after deletion", verify_response)
                else:
                    self.log_result("Delete Sighting", False, 
                                  "Unexpected delete response format", response)
            elif response.status_code == 404:
                self.log_result("Delete Sighting", False, 
                              "Sighting not found for deletion (404)", response)
            else:
                self.log_result("Delete Sighting", False, 
                              f"Delete sighting failed with status {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Delete Sighting", False, f"Exception occurred: {str(e)}")

    def test_sightings_without_auth(self):
        """Test sightings endpoints without authentication should fail"""
        print("Testing sightings without authentication...")
        
        try:
            response = requests.get(f"{API_BASE}/sightings")
            
            if response.status_code == 401:
                self.log_result("Sightings Without Auth", True, 
                              "Correctly rejected sightings request without auth", response)
            else:
                self.log_result("Sightings Without Auth", False, 
                              f"Expected 401 status, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Sightings Without Auth", False, f"Exception occurred: {str(e)}")

    def run_all_tests(self):
        """Run all TrackLog API tests"""
        print(f"🚀 Starting TrackLog API Tests")
        print(f"Backend URL: {BASE_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        
        # Test API connectivity first
        self.test_api_connectivity()
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        self.test_register_new_user()
        self.test_duplicate_registration()
        self.test_login_valid_credentials()
        self.test_login_wrong_password()
        self.test_get_current_user()
        self.test_get_user_without_token()
        
        # Sightings tests (require authentication)
        print("\n🚂 SIGHTINGS API TESTS")
        print("-" * 40)
        self.test_sightings_without_auth()
        self.test_create_sighting()
        self.test_get_all_sightings()
        self.test_get_sighting_stats()
        self.test_get_single_sighting()
        self.test_delete_sighting()
        
        # Logout test (should be last)
        print("\n🚪 LOGOUT TEST")
        print("-" * 40)
        self.test_logout()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        print()
        
        if failed > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  - {result['test']}: {result['message']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result['status']:
                print(f"  - {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = TrackLogTester()
    tester.run_all_tests()