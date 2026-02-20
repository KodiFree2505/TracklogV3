import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Menu,
  Clock3,
  CalendarDays
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
const MAX_PHOTOS = 5;

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

function MobileNav({ user, onLogout }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="md:hidden p-2 text-gray-800" aria-label="Open menu">
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

          <Link to="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
          <Link to="/sightings" className="text-gray-300 hover:text-white">My Sightings</Link>
          <Link to="/log-sighting" className="text-white font-medium">Log Sighting</Link>
          <Link to="/profile" className="text-gray-300 hover:text-white">Profile</Link>

          <button type="button" onClick={onLogout} className="text-red-400 hover:text-red-300 text-left">
            <LogOut size={18} className="inline mr-2" /> Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function LogSighting() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
