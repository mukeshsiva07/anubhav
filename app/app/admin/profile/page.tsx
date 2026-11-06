'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Edit2,
  Save,
  X,
  Upload,
  Copy,
  Check,
  Lock,
  Phone,
  Mail,
  MapPin,
  User,
  Factory,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Organization } from '@/lib/types';

export default function IndustryProfilePage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    org_email: '',
    industry_type: 'Precision Engineering & Machining',
    description: '',
    admin_name: '',
    address: '',
    logo_url: '',
  });

  const industryTypes = [
    'Precision Engineering & Machining',
    'Automotive & Heavy Components',
    'Aerospace & Defense Fabrication',
    'Chemical & Process Industries',
    'Electronics & Semiconductor Assembly',
    'Steel & Metallurgy',
    'Textiles & Garment Manufacturing',
    'Food Processing & Packaging',
    'General Manufacturing',
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile');
      const data = await res.json();
      if (res.ok && data.organization) {
        setOrg(data.organization);
        setFormData({
          name: data.organization.name || '',
          contact_phone: data.organization.contact_phone || '',
          org_email: data.organization.org_email || '',
          industry_type: data.organization.industry_type || 'Precision Engineering & Machining',
          description: data.organization.description || '',
          admin_name: data.organization.admin_name || '',
          address: data.organization.address || '',
          logo_url: data.organization.logo_url || '',
        });
      } else {
        setError(data.error || 'Failed to load industry profile');
      }
    } catch {
      setError('Connection failure loading organization data');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelEdit() {
    if (org) {
      setFormData({
        name: org.name || '',
        contact_phone: org.contact_phone || '',
        org_email: org.org_email || '',
        industry_type: org.industry_type || 'Precision Engineering & Machining',
        description: org.description || '',
        admin_name: org.admin_name || '',
        address: org.address || '',
        logo_url: org.logo_url || '',
      });
    }
    setEditing(false);
    setError('');
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files (PNG, JPG, WebP) are allowed for logo');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Logo file size cannot exceed 10 MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      // 1. Get signed upload URL
      const signRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (signRes.ok) {
        const signData = await signRes.json();
        if (signData.signedUrl && signData.publicUrl) {
          // Direct upload to Supabase Storage
          const uploadRes = await fetch(signData.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (uploadRes.ok) {
            setFormData((prev) => ({ ...prev, logo_url: signData.publicUrl }));
            setSuccess('Logo uploaded. Click Save to persist changes.');
            setTimeout(() => setSuccess(''), 4000);
            return;
          }
        }
      }

      // Fallback: multipart server route
      const form = new FormData();
      form.append('file', file);
      const directRes = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const directData = await directRes.json();
      if (directRes.ok && directData.url) {
        setFormData((prev) => ({ ...prev, logo_url: directData.url }));
        setSuccess('Logo uploaded. Click Save to persist changes.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(directData.error || 'Failed to upload logo');
      }
    } catch {
      setError('Network failure uploading logo file');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Industry name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.organization) {
        setOrg(data.organization);
        setEditing(false);
        setSuccess('Industry profile updated successfully.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch {
      setError('Network failure saving profile');
    } finally {
      setSaving(false);
    }
  }

  function copyOrgCode() {
    if (!org || !org.org_code) return;
    navigator.clipboard.writeText(org.org_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-400">
        Loading industry profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Industry Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Industry identity, facility classification, enterprise contact details, and organization access code.
          </p>
        </div>

        <div>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        {/* Clean Cover Banner */}
        <div className="h-32 bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 relative" />

        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          {/* Logo & Top Info */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center font-bold text-slate-700 shrink-0">
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt={formData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-rose-600 opacity-80" />
                  )}
                </div>

                {editing && (
                  <label className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">
                      {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {org?.name || 'Factory Organization'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {org?.industry_type || 'Manufacturing Facility'}
                </p>
              </div>
            </div>

            {/* Read-Only Organization Code Badge */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Organization Code
                </span>
                <span className="font-mono text-sm font-extrabold text-slate-800">
                  {org?.org_code || 'ORG-XXXXXX'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copyOrgCode}
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
                  title="Copy Org Code"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <div
                  className="p-1.5 text-slate-400"
                  title="Auto-generated read-only key"
                >
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form / Display */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Industry Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Facility Name *
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Apex Precision Forgings Ltd."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1">
                    {org?.name || '—'}
                  </p>
                )}
              </div>

              {/* Industry Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry Classification
                </label>
                {editing ? (
                  <select
                    value={formData.industry_type}
                    onChange={(e) => setFormData({ ...formData, industry_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    {industryTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1">
                    {org?.industry_type || '—'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Administrator Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Administrator
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.admin_name}
                    onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                    placeholder="e.g. Vikram Sundaram (Works Manager)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{org?.admin_name || 'Admin User'}</span>
                  </p>
                )}
              </div>

              {/* Official Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hotline / Contact Phone
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 44 2654..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{org?.contact_phone || '—'}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Org Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.org_email}
                    onChange={(e) => setFormData({ ...formData, org_email: e.target.value })}
                    placeholder="contact@company.internal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{org?.org_email || '—'}</span>
                  </p>
                )}
              </div>

              {/* Physical Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Facility Address
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Plot 42, SIDCO Industrial Estate, Guindy, Chennai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 py-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{org?.address || '—'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Overview &amp; Knowledge Scope
              </label>
              {editing ? (
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Primary manufacturing lines, CNC machine bays, shift schedules, and technical domain..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed py-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {org?.description || 'No description provided for this facility.'}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
