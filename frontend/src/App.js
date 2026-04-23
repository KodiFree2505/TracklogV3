import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import LogSighting from "./pages/LogSighting";
import MySightings from "./pages/MySightings";
import ProfilePage from "./pages/ProfilePage";
import PublicSighting from "./pages/PublicSighting";
import PublicProfile from "./pages/PublicProfile";
import PublicFeed from "./pages/PublicFeed";
import BookmarksPage from "./pages/BookmarksPage";
import DiscoverPage from "./pages/DiscoverPage";
import ResetPassword from "./pages/ResetPassword";
import MapView from "./pages/MapView";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/feed" element={<PublicFeed />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/log-sighting" element={<LogSighting />} />
            <Route path="/sightings" element={<MySightings />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/share/sighting/:shareId" element={<PublicSighting />} />
            <Route path="/share/user/:userId" element={<PublicProfile />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
