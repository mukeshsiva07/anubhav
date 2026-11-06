'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Cpu,
  Plus,
  ArrowRight,
  X,
  Upload,
  Edit,
  Trash2,
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Machine, MachineStatus } from '@/lib/types';

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc'>('name_asc');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [userRole, setUserRole] = useState<'employee' | 'industry'>('employee');

  // Admin Add / Edit Machine Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [submittingMachine, setSubmittingMachine] = useState(false);
  const [machineError, setMachineError] = useState('');
  const [machineForm, setMachineForm] = useState<{
    name: string;
    category: string;
    department: string;
    status: MachineStatus;
    description: string;
    specifications: string;
    common_issues: string;
    safety_notes: string;
    image_url: string;
    gallery: string[];
  }>({
    name: '',
    category: 'General',
    department: 'Machining & Fabrication',
    status: 'active',
    description: '',
    specifications: '',
    common_issues: '',
    safety_notes: '',
    image_url: '',
    gallery: [],
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

  const departments = [
    'All',
    'Machining & Fabrication',
    'Heavy Machining',
    'Plant Utilities',
    'Mechatronics & Robotics',
    'Plant Maintenance',
    'Operations',
  ];

  const statuses: Array<{ value: string; label: string }> = [
    { value: 'All', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'under_maintenance', label: 'Under Maintenance' },
    { value: 'retired', label: 'Retired' },
  ];

  useEffect(() => {
    fetchSessionRole();
    fetchMachines();
  }, []);

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
      const res = await fetch('/api/machines');
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

  function openAddModal() {
    setEditingMachineId(null);
    setMachineForm({
      name: '',
      category: 'General',
      department: 'Machining & Fabrication',
      status: 'active',
      description: '',
      specifications: '',
      common_issues: '',
      safety_notes: '',
      image_url: '',
      gallery: [],
    });
    setMachineError('');
    setIsAddModalOpen(true);
  }

  function openEditModal(machine: Machine) {
    setEditingMachineId(machine.id);
    setMachineForm({
      name: machine.name,
      category: machine.category || 'General',
      department: machine.department || 'Machining & Fabrication',
      status: machine.status || 'active',
      description: machine.description || '',
      specifications: machine.specifications || '',
      common_issues: machine.common_issues || '',
      safety_notes: machine.safety_notes || '',
      image_url: machine.image_url || '',
      gallery: machine.gallery || (machine.image_url ? [machine.image_url] : []),
    });
    setMachineError('');
    setIsAddModalOpen(true);
  }

  async function handleSaveMachine(e: React.FormEvent) {
    e.preventDefault();
    setMachineError('');
    if (!machineForm.name.trim()) {
      setMachineError('Machine name is required');
      return;
    }

    setSubmittingMachine(true);
    try {
      let res;
      if (editingMachineId) {
        res = await fetch(`/api/machines/${editingMachineId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(machineForm),
        });
      } else {
        res = await fetch('/api/machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(machineForm),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchMachines();
      } else {
        setMachineError(data.error || 'Failed to save machine');
      }
    } catch {
      setMachineError('Server error while saving machine');
    } finally {
      setSubmittingMachine(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setMachineForm((prev) => {
            const newGallery = [...prev.gallery, data.url];
            return {
              ...prev,
              gallery: newGallery,
              image_url: prev.image_url || data.url,
            };
          });
        }
      } catch {
        // ignore
      }
    }
  }

  // Filtered & Sorted Machines
  const processedMachines = useMemo(() => {
    return machines
      .filter((m) => {
        // Search
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchDesc = m.description.toLowerCase().includes(q);
          const matchCategory = m.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCategory) return false;
        }

        // Category filter
        if (selectedCategory !== 'All' && m.category !== selectedCategory) return false;

        // Department filter
        if (selectedDepartment !== 'All' && m.department !== selectedDepartment) return false;

        // Status filter
        if (selectedStatus !== 'All') {
          const mStatus = m.status || 'active';
          if (mStatus !== selectedStatus) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [machines, search, selectedCategory, selectedDepartment, selectedStatus, sortBy]);

  // Status badge styling helper
  function renderStatusBadge(status?: MachineStatus) {
    const st = status || 'active';
    switch (st) {
      case 'active':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
            Inactive
          </span>
        );
      case 'under_maintenance':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
            Under Maintenance
          </span>
        );
      case 'retired':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 shadow-xs">
            Retired
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header (No tagline pill) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Machines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official machine profiles, operating specs, failure symptoms, and safety baselines.
          </p>
        </div>

        {/* Industry Admin "Register Machine" Button */}
        {userRole === 'industry' && (
          <button
            type="button"
            onClick={openAddModal}
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-rose-600 text-white font-semibold text-xs shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Machine</span>
          </button>
        )}
      </div>

      {/* FILTER & SORT BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Sort & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="name_asc">A &rarr; Z (Name)</option>
              <option value="name_desc">Z &rarr; A (Name)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machines..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Filters: Category, Department, Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Departments' : d}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {statuses.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Reset button */}
          {(selectedCategory !== 'All' ||
            selectedDepartment !== 'All' ||
            selectedStatus !== 'All' ||
            search.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedDepartment('All');
                setSelectedStatus('All');
                setSearch('');
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Machine Cards Grid (Simplified: image, name, category, and status badge ONLY) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : processedMachines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
          <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-700">No equipment found</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedMachines.map((machine) => (
            <div
              key={machine.id}
              className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-soft hover:shadow-hover hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
            >
              <Link href={`/app/library/${machine.id}`} className="block">
                {/* Machine Image */}
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
                      <Cpu className="w-10 h-10 mb-1 opacity-40 text-emerald-400" />
                      <span className="text-[11px] font-mono uppercase tracking-wider">
                        {machine.category}
                      </span>
                    </div>
                  )}

                  {/* Status Badge overlay at top-left */}
                  <div className="absolute top-3 left-3">
                    {renderStatusBadge(machine.status)}
                  </div>

                  {/* Category Pill overlay at top-right */}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                    {machine.category}
                  </span>
                </div>

                {/* Machine Name */}
                <div className="p-5 pb-3">
                  <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {machine.name}
                  </h3>
                  {machine.department && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {machine.department}
                    </p>
                  )}
                </div>
              </Link>

              {/* Card Footer: View link & optional admin edit button */}
              <div className="px-5 pb-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                <Link
                  href={`/app/library/${machine.id}`}
                  className="pt-2 text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {userRole === 'industry' && (
                  <button
                    type="button"
                    onClick={() => openEditModal(machine)}
                    className="p-1.5 mt-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    title="Edit machine profile"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADMIN ADD / EDIT MACHINE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {editingMachineId ? 'Edit Machine' : 'Register Machine to Vault'}
                </h3>
                <p className="text-xs text-slate-500">
                  Manage technical specs, operating status, department, and gallery photos.
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

            <form onSubmit={handleSaveMachine} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Name *
                  </label>
                  <input
                    type="text"
                    value={machineForm.name}
                    onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
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
                    value={machineForm.category}
                    onChange={(e) => setMachineForm({ ...machineForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={machineForm.department}
                    onChange={(e) => setMachineForm({ ...machineForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    {departments.filter((d) => d !== 'All').map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Status
                  </label>
                  <select
                    value={machineForm.status}
                    onChange={(e) => setMachineForm({ ...machineForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="under_maintenance">Under Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={machineForm.description}
                  onChange={(e) => setMachineForm({ ...machineForm, description: e.target.value })}
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
                  value={machineForm.specifications}
                  onChange={(e) => setMachineForm({ ...machineForm, specifications: e.target.value })}
                  placeholder="Dimensions, voltage, tonnage, hydraulic pressure, motor rating..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Common Issues &amp; Known Quirks
                </label>
                <textarea
                  rows={2}
                  value={machineForm.common_issues}
                  onChange={(e) => setMachineForm({ ...machineForm, common_issues: e.target.value })}
                  placeholder="Typical wear points, morning startup quirks, vibration frequencies..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-red-700">
                  Mandatory Safety Notes
                </label>
                <textarea
                  rows={2}
                  value={machineForm.safety_notes}
                  onChange={(e) => setMachineForm({ ...machineForm, safety_notes: e.target.value })}
                  placeholder="Critical interlocks, LOTO procedures, emergency stop protocols..."
                  className="w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50/30 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Gallery Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Machine Photo Gallery ({machineForm.gallery.length})
                  </label>
                  <label className="cursor-pointer text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {machineForm.gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {machineForm.gallery.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden h-16 border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-around p-1 text-white">
                          <button
                            type="button"
                            onClick={() => setMachineForm((prev) => ({ ...prev, image_url: url }))}
                            className={`p-1 rounded ${machineForm.image_url === url ? 'text-emerald-400 font-bold' : 'text-white'}`}
                            title="Set as main thumbnail"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMachineForm((prev) => ({
                                ...prev,
                                gallery: prev.gallery.filter((_, i) => i !== idx),
                                image_url: prev.image_url === url ? prev.gallery[0] || '' : prev.image_url,
                              }))
                            }
                            className="p-1 rounded text-red-400 hover:text-red-300"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  {submittingMachine ? 'Saving...' : editingMachineId ? 'Save Changes' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
