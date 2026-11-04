'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Layers,
  Cpu,
  Plus,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  X,
  Upload,
  Edit,
  Trash2,
} from 'lucide-react';
import { Machine } from '@/lib/types';

export default function LibraryPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [userRole, setUserRole] = useState<'employee' | 'industry'>('employee');

  // Admin Add Machine Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingMachine, setSubmittingMachine] = useState(false);
  const [machineError, setMachineError] = useState('');
  const [newMachine, setNewMachine] = useState({
    name: '',
    category: 'General',
    description: '',
    specifications: '',
    common_issues: '',
    safety_notes: '',
    image_url: '',
  });

  const categories = [
    'All',
    'Turning & Machining',
    'Forming & Stamping',
    'Material Handling',
    'CNC Machining',
    'Pneumatics & Utilities',
    'Steam & Thermal',
    'General',
  ];

  useEffect(() => {
    fetchSessionRole();
    fetchMachines();
  }, [search, selectedCategory]);

  async function fetchSessionRole() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.session) {
        setUserRole(data.session.role);
      }
    } catch {
      // ignore
    }
  }

  async function fetchMachines() {
    try {
      let url = '/api/machines?';
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
      url += params.toString();

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setMachines(data.machines || []);
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMachine(e: React.FormEvent) {
    e.preventDefault();
    setMachineError('');
    if (!newMachine.name.trim()) {
      setMachineError('Machine name is required');
      return;
    }

    setSubmittingMachine(true);
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMachine),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewMachine({
          name: '',
          category: 'General',
          description: '',
          specifications: '',
          common_issues: '',
          safety_notes: '',
          image_url: '',
        });
        fetchMachines();
      } else {
        setMachineError(data.error || 'Failed to create machine');
      }
    } catch {
      setMachineError('Server error while saving machine');
    } finally {
      setSubmittingMachine(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setNewMachine((prev) => ({ ...prev, image_url: data.url }));
      } else {
        setMachineError(data.error || 'Image upload failed');
      }
    } catch {
      setMachineError('Image upload failed due to network error');
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${
              userRole === 'industry'
                ? 'bg-rose-50 text-rose-800'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Equipment Register</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Plant Machine Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official machine profiles, operating specs, failure symptoms, and safety baselines.
          </p>
        </div>

        {/* Industry Admin "Add Machine" Button */}
        {userRole === 'industry' && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-rose-600 text-white font-semibold text-xs shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Machine</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? userRole === 'industry'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machines..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Machine Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
          <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-slate-700">No equipment found</h3>
          <p className="text-xs text-slate-500 mt-1">Try selecting another category or clear the search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Link
              key={machine.id}
              href={`/app/library/${machine.id}`}
              className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-soft hover:shadow-hover hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Machine Card Image / Placeholder */}
                <div className="h-44 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {machine.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={machine.image_url}
                      alt={machine.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <Cpu className="w-10 h-10 mb-1 opacity-40" />
                      <span className="text-[11px] font-mono uppercase tracking-wider">
                        {machine.category}
                      </span>
                    </div>
                  )}

                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                    {machine.category}
                  </span>
                </div>

                {/* Machine Details */}
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {machine.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                    {machine.description}
                  </p>

                  {/* Safety Alert indicator */}
                  {machine.safety_notes && (
                    <div className="mt-3 p-2 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-1.5 text-[11px] text-amber-900 font-medium line-clamp-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="truncate">{machine.safety_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                  <span>View Specifications & Entries</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ADMIN ADD MACHINE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Register Machine to Library
                </h3>
                <p className="text-xs text-slate-500">
                  Add plant equipment specs, failure modes, and safety guidelines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {machineError && (
              <div className="my-3 p-3 rounded-2xl bg-red-50 text-red-700 text-xs font-medium">
                {machineError}
              </div>
            )}

            <form onSubmit={handleCreateMachine} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Name *
                  </label>
                  <input
                    type="text"
                    value={newMachine.name}
                    onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                    placeholder="e.g. Lathe #4"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newMachine.category}
                    onChange={(e) => setNewMachine({ ...newMachine, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    {categories.filter(c => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newMachine.description}
                  onChange={(e) => setNewMachine({ ...newMachine, description: e.target.value })}
                  placeholder="Primary factory purpose, bed size, or bay placement..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technical Specifications
                </label>
                <textarea
                  rows={2}
                  value={newMachine.specifications}
                  onChange={(e) => setNewMachine({ ...newMachine, specifications: e.target.value })}
                  placeholder="Dimensions, voltage, tonnage, hydraulic pressure, motor rating..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Common Issues & Known Quirks
                </label>
                <textarea
                  rows={2}
                  value={newMachine.common_issues}
                  onChange={(e) => setNewMachine({ ...newMachine, common_issues: e.target.value })}
                  placeholder="Typical wear points, morning startup quirks, vibration frequencies..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-red-700 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Mandatory Safety Notes
                </label>
                <textarea
                  rows={2}
                  value={newMachine.safety_notes}
                  onChange={(e) => setNewMachine({ ...newMachine, safety_notes: e.target.value })}
                  placeholder="Critical interlocks, LOTO procedures, emergency stop protocols..."
                  className="w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50/30 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Machine Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMachine}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {submittingMachine ? 'Saving...' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

