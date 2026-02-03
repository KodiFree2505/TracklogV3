import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  LogOut,
  User,
  Loader2,
  Camera,
  X,
  Upload,
  Train,
  MapPin,
  FileText,
  CheckCircle,
  Zap,
  Menu
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

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
  'Other'
];

const TRACTION_TYPES = [
  'Electric',
  'Diesel',
  'Steam',
  'Diesel-Electric',
  'Hybrid',
  'Battery',
  'Hydrogen',
  'Other'
];

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
          <span className="text-white font-medium">{user?.name}</span>
        </div>

        <Link to="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white">My Sightings</Link>
        <Link to="/log-sighting" className="text-white font-medium">Log Sighting</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white">Profile</Link>

        <button onClick={onLogout} className="text-red-400 hover:text-red-300 text-left">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

export default function LogSighting() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [trainNumber, setTrainNumber] = useState('');
  const [trainType, setTrainType] = useState('');
  const [tractionType, setTractionType] = useState('');
  const [operator, setOperator] = useState('');
  const [route, setRoute] = useState('');
  const [location, setLocation] = useState('');
  const [sightingDate, setSightingDate] = useState(today);
  const [sightingTime, setSightingTime] = useState(nowTime);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
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
      reader.onload = ev => setPhotos(p => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(p => p.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!trainType || !tractionType) {
      setError('Please select train type and traction type');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('train_number', trainNumber);
    formData.append('train_type', trainType);
    formData.append('traction_type', tractionType);
    formData.append('operator', operator);
    formData.append('route', route);
    formData.append('location', location);
    formData.append('sighting_date', sightingDate);
    formData.append('sighting_time', sightingTime);
    formData.append('notes', notes);

    photos.forEach((photo, i) => {
      formData.append('photos', dataURLtoBlob(photo), `photo_${i}.jpg`);
    });

    try {
      const res = await fetch(`${API}/sightings`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to log sighting');
      }

      setSuccess(true);
      setTimeout(() => navigate('/sightings'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e34c26]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold">Sighting Logged!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* HEADER */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold">TrackLog</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* FORM */}
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Train */}
          <section className="bg-[#1a1a1c] p-6 rounded-lg border border-gray-800">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Train size={18} /> Train Details
            </h3>

            <Label>Train Number *</Label>
            <Input value={trainNumber} onChange={e => setTrainNumber(e.target.value)} required />

            <Label>Train Type *</Label>
            <Select value={trainType} onValueChange={setTrainType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TRAIN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Label>Traction Type *</Label>
            <Select value={tractionType} onValueChange={setTractionType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TRACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Label>Operator *</Label>
            <Input value={operator} onChange={e => setOperator(e.target.value)} required />
          </section>

          {/* Photos */}
          <section className="bg-[#1a1a1c] p-6 rounded-lg border border-gray-800">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Camera size={18} /> Photos
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="rounded-lg" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 p-1 rounded-full">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current.click()} className="border-dashed border-2 p-6">
                  <Upload />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handlePhotoSelect}
            />
          </section>

          {error && <div className="text-red-500">{error}</div>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Log Sighting'}
          </Button>
        </form>
      </main>
    </div>
  );
}

function dataURLtoBlob(dataURL) {
  const [meta, data] = dataURL.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
