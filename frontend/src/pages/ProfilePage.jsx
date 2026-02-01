import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid, LogOut, User, Loader2, Camera, Settings, Lock, Trash2,
  Menu, Check, AlertTriangle, Mail, Shield
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MobileNav = ({ user, onLogout }) => (
  <Sheet>
    <SheetTrigger asChild>
      <button className="md:hidden p-2 text-gray-800">
        <Menu size={24} />
      </button>
    </SheetTrigger>
    <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          {user?.picture ? (
            <img src={user.picture.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
              <User size={20} />
            </div>
          )}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/profile" className="text-white font-medium py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

const ProfilePage = () => {
  const { user, logout, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      const updateData = { name };
      if (previewImage) {
        updateData.picture = previewImage;
      }

      const response = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update profile');
      }

      setProfileSuccess(true);
      setPreviewImage(null);
      await checkAuth(); // Refresh user data
      
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const response = await fetch(`${API}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update password');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API}/auth/account`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  const currentPicture = previewImage || (user.picture?.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture);
  const isGoogleUser = user.email && !user.password_hash;

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
          <Link to="/profile" className="text-gray-800 font-medium text-sm">Profile</Link>
        </nav>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2">
            {currentPicture ? (
              <img src={currentPicture} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>
            )}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-400 text-sm md:text-base">Manage your profile and account preferences.</p>
        </div>

        {/* Profile Section */}
        <form onSubmit={handleProfileUpdate} className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User size={18} className="text-orange-500" /> Profile Information
          </h3>
          
          {/* Profile Picture */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="relative">
              {currentPicture ? (
                <img src={currentPicture} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-gray-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#2a1a1a] flex items-center justify-center border-2 border-gray-700">
                  <User size={40} className="text-gray-600" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#e34c26] rounded-full flex items-center justify-center hover:bg-[#d14020] transition-colors"
              >
                <Camera size={16} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              {previewImage && (
                <p className="text-orange-500 text-xs mt-1">New image selected</p>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="mb-4">
            <Label className="text-gray-300 text-sm">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
              required
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-4">
            <Label className="text-gray-300 text-sm flex items-center gap-1">
              <Mail size={14} /> Email Address
            </Label>
            <Input
              value={user.email}
              disabled
              className="mt-1 bg-[#0f0f10] border-gray-700 text-gray-500 cursor-not-allowed"
            />
            <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
          </div>

          {profileError && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg mb-4">{profileError}</div>
          )}

          {profileSuccess && (
            <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg mb-4 flex items-center gap-2">
              <Check size={16} /> Profile updated successfully
            </div>
          )}

          <Button
            type="submit"
            disabled={profileLoading}
            className="w-full sm:w-auto bg-[#e34c26] hover:bg-[#d14020] text-white"
          >
            {profileLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </form>

        {/* Password Section */}
        <form onSubmit={handlePasswordUpdate} className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Lock size={18} className="text-orange-500" /> Change Password
          </h3>

          {isGoogleUser ? (
            <div className="text-gray-400 text-sm bg-gray-800/50 p-4 rounded-lg flex items-center gap-3">
              <Shield size={20} className="text-blue-400 flex-shrink-0" />
              <p>You signed in with Google. Password management is handled by your Google account.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Label className="text-gray-300 text-sm">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <Label className="text-gray-300 text-sm">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <Label className="text-gray-300 text-sm">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>

              {passwordError && (
                <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg mb-4">{passwordError}</div>
              )}

              {passwordSuccess && (
                <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg mb-4 flex items-center gap-2">
                  <Check size={16} /> Password updated successfully
                </div>
              )}

              <Button
                type="submit"
                disabled={passwordLoading}
                variant="outline"
                className="w-full sm:w-auto border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </>
          )}
        </form>

        {/* Danger Zone */}
        <div className="bg-[#1a1a1c] border border-red-900/50 rounded-lg p-4 md:p-6">
          <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Danger Zone
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Once you delete your account, there is no going back. All your sightings and data will be permanently removed.
          </p>
          <Button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <Trash2 size={16} className="mr-2" /> Delete Account
          </Button>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1a1a1c] border-gray-800 mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action is permanent and cannot be undone. All your train sightings, photos, and account data will be deleted forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300 w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePage;
