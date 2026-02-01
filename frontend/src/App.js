import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import LogSighting from "./pages/LogSighting";
import MySightings from "./pages/MySightings";
import ProfilePage from "./pages/ProfilePage";

// Router component that checks for session_id in URL hash
function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously during render
  // This prevents race conditions by processing session_id FIRST
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/log-sighting" element={<LogSighting />} />
      <Route path="/sightings" element={<MySightings />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
