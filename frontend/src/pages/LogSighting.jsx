import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid, LogOut, User, Loader2, Camera, X, Upload,
  Train, MapPin, FileText, CheckCircle, Menu, Clock3, CalendarDays, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MAX_PHOTOS = 5;

const TRAIN_TYPES = [
  'Passenger', 'Freight', 'High-Speed', 'Commuter',
  'Metro/Subway', 'Light Rail', 'Heritage/Steam', 'Other'
];

const TRACTION_TYPES = [
  'Electric', 'Diesel', 'Steam', 'Diesel-Electric',
  'Hybrid', 'Battery', 'Hydrogen', 'Other'
];

function MobileNav({ user, onLogout }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="md:hidden p-2 text-gray-800" aria-label="Open menu">
          <Menu size={24} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
        <div className="flex flex-col gap-6 mt-8">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
            {user?.picture ? (
              <img
                src={user.picture.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={20} />
              </div>
            )}
            <span className="text-white font-medium truncate">{user?.name}</span>
          </div>
          <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
          <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
          <Link to="/log-sighting" className="text-white font-medium py-2">Log Sighting</Link>
          <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
          <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
            <LogOut size={18} className="inline mr-2" /> Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhotoPreview({ src, onRemove }) {
  return (
    <div className="relative group w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border border-gray-700">
      <img src={src} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid="remove-photo-btn"
      >
        <X size={14} className="text-white" />
      </button>
    </div>
  );
}

export default function LogSighting() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    train_number: '',
    train_type: '',
    traction_type: '',
    operator: '',
    route: '',
    location: '',
    sighting_date: new Date().toISOString().split('T')[0],
    sighting_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    setError('');
    const newPhotos = [];
    for (const file of files) {
      const base64 = await fileToBase64(file);
      newPhotos.push(base64);
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.train_number || !form.train_type || !form.traction_type || !form.operator || !form.location) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (photos.length > 0) {
        // Use FormData/multipart for file uploads
        const formData = new FormData();
        formData.append('train_number', form.train_number);
        formData.append('train_type', form.train_type);
        formData.append('traction_type', form.traction_type);
        formData.append('operator', form.operator);
        formData.append('route', form.route || '');
        formData.append('location', form.location);
        formData.append('sighting_date', form.sighting_date);
        formData.append('sighting_time', form.sighting_time);
        formData.append('notes', form.notes || '');
        formData.append('is_public', 'false');
        // Convert base64 photos to File objects
        for (let i = 0; i < photos.length; i++) {
          const base64 = photos[i];
          const blob = await fetch(base64).then(r => r.blob());
          formData.append('photos', blob, `photo_${i}.jpg`);
        }
        res = await fetch(`${API}/sightings/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      } else {
        // Use JSON for no-photo submissions
        const payload = { ...form, photos: [] };
        res = await fetch(`${API}/sightings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = `Error ${res.status}`;
        try {
          const data = JSON.parse(text);
          if (typeof data.detail === 'string') msg = data.detail;
          else if (Array.isArray(data.detail)) msg = data.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        } catch(e) {
          if (text) msg = text.slice(0, 200);
        }
        throw new Error(msg);
      }

      setSuccess(true);
      setTimeout(() => navigate('/sightings'), 1500);
    } catch (err) {
      console.error('[LogSighting] Submit error:', err);
      setError(err.message || 'Network error - please check your connection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
        <div className="text-center" data-testid="sighting-success">
          <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Sighting Logged!</h2>
          <p className="text-gray-400">Redirecting to your sightings...</p>
        </div>
      </div>
    );
  }

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
          <Link to="/log-sighting" className="text-gray-800 font-medium text-sm">Log Sighting</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user?.picture ? (
              <img
                src={user.picture.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-1">Log a Sighting</h1>
          <p className="text-gray-400 text-sm md:text-base">Record the details of your train sighting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="log-sighting-form">
          {/* Train Details */}
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Train size={18} className="text-orange-500" />
              <h2 className="text-white font-semibold">Train Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">Train Number *</Label>
                <Input
                  data-testid="train-number-input"
                  placeholder="e.g. 43102"
                  value={form.train_number}
                  onChange={(e) => handleChange('train_number', e.target.value)}
                  className="bg-[#0f0f10] border-gray-700 text-white placeholder:text-gray-600"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">Operator *</Label>
                <Input
                  data-testid="operator-input"
                  placeholder="e.g. Great Western Railway"
                  value={form.operator}
                  onChange={(e) => handleChange('operator', e.target.value)}
                  className="bg-[#0f0f10] border-gray-700 text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">Train Type *</Label>
                <Select value={form.train_type} onValueChange={(v) => handleChange('train_type', v)}>
                  <SelectTrigger data-testid="train-type-select" className="bg-[#0f0f10] border-gray-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-gray-700">
                    {TRAIN_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-white hover:bg-gray-800">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block flex items-center gap-1">
                  <Zap size={14} className="text-orange-500" /> Traction Type *
                </Label>
                <Select value={form.traction_type} onValueChange={(v) => handleChange('traction_type', v)}>
                  <SelectTrigger data-testid="traction-type-select" className="bg-[#0f0f10] border-gray-700 text-white">
                    <SelectValue placeholder="Select traction" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-gray-700">
                    {TRACTION_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-white hover:bg-gray-800">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Route</Label>
              <Input
                data-testid="route-input"
                placeholder="e.g. London Paddington to Bristol"
                value={form.route}
                onChange={(e) => handleChange('route', e.target.value)}
                className="bg-[#0f0f10] border-gray-700 text-white placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Location & Time */}
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-orange-500" />
              <h2 className="text-white font-semibold">Location & Time</h2>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Location *</Label>
              <Input
                data-testid="location-input"
                placeholder="e.g. London Paddington Station"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="bg-[#0f0f10] border-gray-700 text-white placeholder:text-gray-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block flex items-center gap-1">
                  <CalendarDays size={14} className="text-orange-500" /> Date
                </Label>
                <Input
                  data-testid="sighting-date-input"
                  type="date"
                  value={form.sighting_date}
                  onChange={(e) => handleChange('sighting_date', e.target.value)}
                  className="bg-[#0f0f10] border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block flex items-center gap-1">
                  <Clock3 size={14} className="text-orange-500" /> Time
                </Label>
                <Input
                  data-testid="sighting-time-input"
                  type="time"
                  value={form.sighting_time}
                  onChange={(e) => handleChange('sighting_time', e.target.value)}
                  className="bg-[#0f0f10] border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-orange-500" />
              <h2 className="text-white font-semibold">Photos</h2>
              <span className="text-gray-500 text-sm ml-auto">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {photos.map((src, i) => (
                <PhotoPreview key={i} src={src} onRemove={() => removePhoto(i)} />
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-lg border-2 border-dashed border-gray-700 hover:border-orange-500/50 flex flex-col items-center justify-center gap-1 transition-colors"
                  data-testid="add-photo-btn"
                >
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-gray-500 text-[10px]">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotos}
              className="hidden"
              data-testid="photo-file-input"
            />
          </div>

          {/* Notes */}
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-orange-500" />
              <h2 className="text-white font-semibold">Notes</h2>
            </div>
            <Textarea
              data-testid="notes-textarea"
              placeholder="Any additional observations..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="bg-[#0f0f10] border-gray-700 text-white placeholder:text-gray-600 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm" data-testid="form-error">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold py-5 flex-1"
              data-testid="submit-sighting-btn"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              {submitting ? 'Saving...' : 'Log Sighting'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sightings')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 py-5"
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
