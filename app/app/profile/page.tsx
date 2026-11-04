'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  KeyRound,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';

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
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/employees/me');
      const data = await res.json();
      if (res.ok) {
        setProfile(data.employee);
      } else {
        setError(data.error || 'Failed to load employee profile');
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

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo exceeds 5 MB limit');
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/employees/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Error communicating with server');
    } finally {
      setPasswordLoading(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner & Avatar */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        {/* Decorative emerald gradient header */}
        <div className="h-28 sm:h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* Avatar with upload trigger */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-md border border-slate-200 overflow-hidden">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center font-display font-bold text-2xl">
                    {profile.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-slate-900/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold"
                title="Change Profile Photo"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>{uploadingAvatar ? 'Uploading...' : 'Change'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  {profile.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Verified Operator
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {profile.designation} • {profile.department}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Factory User ID (Read-only)
            </span>
            <span className="font-mono text-base font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 inline-block mt-0.5">
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

      {/* Personnel Details Grid with Inline Edit Icons */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Personnel Profile
            </h3>
            <p className="text-xs text-slate-500">
              Click the pencil icon next to any field to edit and save individually.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            Live Shopfloor Record
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

          {/* Joined Date (Read-only) */}
          <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Joined Plant On
            </span>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {profile.joined_on ? new Date(profile.joined_on).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-6 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Specialization & Bio
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

      {/* Change Password Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Security & Credentials
            </h3>
            <p className="text-xs text-slate-500">
              Update your account password (current password verification required)
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing password"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password (min 8 characters)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-5 py-2.5 rounded-2xl text-white font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            {passwordLoading ? 'Verifying...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

