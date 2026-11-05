'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  Calendar,
  Award,
  Edit2,
  Check,
  X,
  Camera,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { Entry } from '@/lib/types';

interface EmployeeProfile {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  experience_years: number;
  phone: string;
  email: string;
  joined_on: string;
  bio: string;
  avatar_url: string;
  is_senior?: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inline editing state: which field is currently in edit mode
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>('');
  const [savingField, setSavingField] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfileAndEntries();
  }, []);

  async function fetchProfileAndEntries() {
    setLoading(true);
    try {
      const [profileRes, entriesRes] = await Promise.all([
        fetch('/api/employees/me'),
        fetch('/api/entries?my=true'),
      ]);

      const profileData = await profileRes.json();
      const entriesData = await entriesRes.json();

      if (profileRes.ok && profileData.employee) {
        setProfile(profileData.employee);
      } else {
        setError(profileData.error || 'Failed to load employee profile');
      }

      if (entriesRes.ok && entriesData.entries) {
        setMyEntries(entriesData.entries || []);
      }
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  function startEditing(field: keyof EmployeeProfile, value: string | number) {
    setEditingField(field);
    setFieldValue(String(value ?? ''));
    setError('');
    setSuccess('');
  }

  function cancelEditing() {
    setEditingField(null);
    setFieldValue('');
  }

  async function saveField(field: keyof EmployeeProfile) {
    if (!profile) return;
    setSavingField(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, any> = {
        [field]: field === 'experience_years' ? parseInt(fieldValue, 10) || 0 : fieldValue,
      };

      const res = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.employee) {
        setProfile(data.employee);
        setEditingField(null);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch {
      setError('Failed to communicate with server');
    } finally {
      setSavingField(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo exceeds 10 MB limit');
      return;
    }

    setUploadingAvatar(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error || 'Failed to upload photo');
        setUploadingAvatar(false);
        return;
      }

      // Update avatar_url in employee profile
      const patchRes = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: uploadData.url }),
      });
      const patchData = await patchRes.json();

      if (patchRes.ok && patchData.employee) {
        setProfile(patchData.employee);
        setSuccess('Avatar updated successfully');
      } else {
        setError(patchData.error || 'Failed to link avatar');
      }
    } catch {
      setError('Photo upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Profile not accessible</p>
        <p className="text-xs text-slate-500 mt-1">{error || 'This account may not be an employee.'}</p>
      </div>
    );
  }

  const isSenior = profile.is_senior || profile.experience_years >= 10;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner & Large Profile Picture with Name next to it */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        {/* Single clean cover banner behind header (soft gradient, no tiled pattern) */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900" />

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Much Larger Profile Picture */}
            <div className="relative group shrink-0">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white p-1.5 shadow-xl border-2 border-white overflow-hidden">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center font-display font-bold text-3xl">
                    {profile.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-slate-900/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold"
                title="Change Profile Photo"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span>{uploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Employee Name right next to picture */}
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {profile.full_name}
                </h1>
                {isSenior && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Senior
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                {profile.designation} &bull; {profile.department}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Factory User ID
            </span>
            <span className="font-mono text-base font-bold text-slate-800 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 inline-block mt-0.5">
              {profile.employee_code}
            </span>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Personnel Details Grid with Inline Pencil Editing */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Personnel Details
            </h3>
            <p className="text-xs text-slate-500">
              Click the pencil icon next to any field to edit and update your information.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            Live Record
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Full Name
              </span>
              {editingField !== 'full_name' ? (
                <button
                  type="button"
                  onClick={() => startEditing('full_name', profile.full_name)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit full name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'full_name' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('full_name')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.full_name}</p>
            )}
          </div>

          {/* Designation */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Designation
              </span>
              {editingField !== 'designation' ? (
                <button
                  type="button"
                  onClick={() => startEditing('designation', profile.designation)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit designation"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'designation' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('designation')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.designation}</p>
            )}
          </div>

          {/* Department */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Department
              </span>
              {editingField !== 'department' ? (
                <button
                  type="button"
                  onClick={() => startEditing('department', profile.department)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit department"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'department' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('department')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.department}</p>
            )}
          </div>

          {/* Years of Experience */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                Shopfloor Experience
              </span>
              {editingField !== 'experience_years' ? (
                <button
                  type="button"
                  onClick={() => startEditing('experience_years', profile.experience_years)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit experience"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'experience_years' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('experience_years')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {profile.experience_years} {profile.experience_years === 1 ? 'Year' : 'Years'}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </span>
              {editingField !== 'phone' ? (
                <button
                  type="button"
                  onClick={() => startEditing('phone', profile.phone)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit phone"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'phone' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('phone')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Email */}
          <div className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Work Email
              </span>
              {editingField !== 'email' ? (
                <button
                  type="button"
                  onClick={() => startEditing('email', profile.email)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit email"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            {editingField === 'email' ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="email"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => saveField('email')}
                  disabled={savingField}
                  className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.email || 'Not provided'}</p>
            )}
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-6 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Specialization &amp; Bio
            </span>
            {editingField !== 'bio' ? (
              <button
                type="button"
                onClick={() => startEditing('bio', profile.bio)}
                className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                title="Edit bio"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
          {editingField === 'bio' ? (
            <div className="space-y-2">
              <textarea
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1 rounded-xl bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveField('bio')}
                  disabled={savingField}
                  className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Save Bio
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {profile.bio || 'No bio written yet. Add notes about your machine specialties.'}
            </p>
          )}
        </div>
      </div>

      {/* RECENT ENTRIES CONTRIBUTIONS SECTION BELOW PERSONNEL DETAILS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Your Recorded Entries ({myEntries.length})
            </h3>
            <p className="text-xs text-slate-500">
              Approved, pending, and revised entries authored by you.
            </p>
          </div>
          <Link
            href="/app/entries"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Manage All Entries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myEntries.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No entries recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Draft your first shop-floor trick in the Entries section.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {myEntries.slice(0, 5).map((entry) => (
              <Link
                key={entry.id}
                href={`/app/entries?view=${entry.id}`}
                className="group p-3.5 rounded-2xl border border-slate-200/90 hover:border-emerald-500/40 hover:bg-slate-50/50 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                    {entry.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Cpu className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {entry.status === 'approved' && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {entry.status === 'pending' && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full border border-amber-200">
                          Pending
                        </span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.2 rounded-full border border-red-200">
                          Rejected
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {entry.machine?.name || 'General'}
                      </span>
                    </div>

                    <h4 className="font-display text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {entry.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                  <span className="hidden sm:inline">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
