import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid, LogOut, User, Loader2, Camera, X, Upload, Train,
  MapPin, FileText, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TRAIN_TYPES = [
  'Passenger',
  'Freight',
  'High-Speed',
  'Commuter',
  'Metro/Subway',
  'Light Rail',
  'Heritage/Steam',
  'Diesel',
  'Electric',
  'Other'
];

const LogSighting = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [trainNumber, setTrainNumber] = useState('');
  const [trainType, setTrainType] = useState('');
  const [operator, setOperator] = useState('');
  const [route, setRoute] = useState('');
  const [location, setLocation] = useState('');
  const [sightingDate, setSightingDate] = useState(today);
  const [sightingTime, setSightingTime] = useState(nowTime);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = {
      train_number: trainNumber,
      train_type: trainType,
      operator: operator,
      route: route,
      location: location,
      sighting_date: sightingDate,
      sighting_time: sightingTime,
      notes: notes,
      photos: photos
    };

    try {
      const response = await fetch(`${API}/sightings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to log sighting');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/sightings');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Sighting Logged!</h2>
          <p className="text-gray-400">Redirecting to your sightings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-[#e34c26]"><LayoutGrid size={22} strokeWidth={2.5} /></div>
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-800 font-medium text-sm hover:text-gray-900">Log Sighting</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>
            )}
            <span className="text-gray-800 font-medium text-sm hidden md:block">{currentUser?.name}</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-white text-3xl font-bold mb-2">Log New Sighting</h1>
          <p className="text-gray-400">Record the details of your train sighting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Train size={18} className="text-orange-500" /> Train Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Train Number *</Label>
                <Input
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g., 66057, ICE 123"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Train Type *</Label>
                <Select onValueChange={setTrainType} value={trainType}>
                  <SelectTrigger className="mt-1 bg-[#0f0f10] border-gray-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-gray-700">
                    {TRAIN_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-white hover:bg-gray-800">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Operator *</Label>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="e.g., DB, SNCF, Amtrak"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Route</Label>
                <Input
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="e.g., London - Edinburgh"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-orange-500" /> Location & Time
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label className="text-gray-300 text-sm">Location *</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., King's Cross Station, Platform 9"
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Date *</Label>
                <Input
                  type="date"
                  value={sightingDate}
                  onChange={(e) => setSightingDate(e.target.value)}
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Time *</Label>
                <Input
                  type="time"
                  value={sightingTime}
                  onChange={(e) => setSightingTime(e.target.value)}
                  className="mt-1 bg-[#0f0f10] border-gray-700 text-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Camera size={18} className="text-orange-500" /> Photos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center hover:border-orange-500 transition-colors"
                >
                  <Upload size={24} className="text-gray-500 mb-2" />
                  <span className="text-gray-500 text-xs">Add Photo</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <p className="text-gray-500 text-xs">Up to 5 photos. JPG, PNG supported.</p>
          </div>

          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText size={18} className="text-orange-500" /> Notes
            </h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations..."
              className="bg-[#0f0f10] border-gray-700 text-white min-h-[100px]"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {submitting ? 'Saving...' : 'Log Sighting'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default LogSighting;
