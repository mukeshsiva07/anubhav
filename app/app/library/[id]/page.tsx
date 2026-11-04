'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Cpu,
  ShieldAlert,
  AlertTriangle,
  Wrench,
  FileText,
  CheckCircle2,
  Eye,
  X,
  Edit3,
  Trash2,
  Upload,
} from 'lucide-react';
import { Machine, Entry } from '@/lib/types';
import { sanitizeContent } from '@/lib/sanitize';

export default function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const machineId = resolvedParams.id;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'employee' | 'industry'>('employee');

  // Read-only modal
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Admin Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Partial<Machine>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Admin Delete confirm dialog
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSession();
    fetchMachineDetail();
  }, [machineId]);

  async function fetchSession() {
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

  async function fetchMachineDetail() {
    try {
      const res = await fetch(`/api/machines/${machineId}`);
      const data = await res.json();
      if (res.ok) {
        setMachine(data.machine);
        setEntries(data.entries || []);
        setEditingMachine(data.machine);
      } else {
        setError(data.error || 'Failed to fetch equipment data');
      }
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMachine),
      });
      const data = await res.json();

      if (res.ok) {
        setMachine(data.machine);
        setIsEditModalOpen(false);
      } else {
        setEditError(data.error || 'Failed to update machine');
      }
    } catch {
      setEditError('Server communication error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteMachine() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/machines/${machineId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/app/library');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete machine');
        setDeleting(false);
      }
    } catch {
      alert('Delete failed due to network error');
      setDeleting(false);
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
        setEditingMachine((prev) => ({ ...prev, image_url: data.url }));
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-6 bg-slate-200 w-32 rounded-lg" />
        <div className="h-72 bg-slate-200 rounded-3xl" />
        <div className="h-44 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
        <p className="text-sm font-bold text-slate-700">{error || 'Equipment not found'}</p>
        <Link
          href="/app/library"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/library"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Machine Library</span>
        </Link>

        {/* Industry Admin Action Buttons */}
        {userRole === 'industry' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingMachine(machine);
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Equipment</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Hero Machine Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Image */}
          <div className="md:col-span-5 bg-slate-900 min-h-[260px] relative flex items-center justify-center overflow-hidden">
            {machine.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={machine.image_url}
                alt={machine.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <Cpu className="w-16 h-16 mb-2 opacity-50" />
                <span className="font-mono text-xs uppercase">{machine.category}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {machine.category}
                </span>
                <span className="text-xs text-slate-400">
                  Updated {new Date(machine.updated_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="font-display text-3xl font-extrabold text-slate-900">
                {machine.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                {machine.description}
              </p>
            </div>

            {/* Quick spec badge */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Institutional Status:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                Active in Production Bay
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Common Quirks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Technical Specifications
              </h3>
              <p className="text-[11px] text-slate-400">Standard operating parameters</p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-mono bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {machine.specifications || 'No technical specifications documented yet.'}
          </div>
        </div>

        {/* Common Issues */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Common Issues & Quirks
              </h3>
              <p className="text-[11px] text-slate-400">Known symptoms recorded on the line</p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-amber-50/40 p-4 rounded-2xl border border-amber-100">
            {machine.common_issues || 'No frequent issues reported.'}
          </div>
        </div>
      </div>

      {/* Mandatory Safety Notes Box */}
      {machine.safety_notes && (
        <div className="bg-red-50/80 rounded-3xl border-2 border-red-200/80 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-red-950">
                Mandatory Safety Protocols
              </h3>
              <p className="text-xs text-red-700">Strict zero-exception operating guidelines</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-red-900 leading-relaxed whitespace-pre-line pl-1">
            {machine.safety_notes}
          </p>
        </div>
      )}

      {/* Approved Entries Linked to this Machine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Approved Shop-Floor Entries ({entries.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Field tips, adjustments, and edge-case fixes specifically for {machine.name}.
            </p>
          </div>

          <Link
            href="/app/record"
            className="px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Record New Tip</span>
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No approved tips for this machine yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Experienced operators can record new adjustments in the &quot;Record Info&quot; section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="group bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft hover:shadow-hover hover:border-emerald-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Author: <strong>{entry.employee?.full_name || entry.author_name_cache || 'Former Employee'}</strong>
                    </span>
                    {entry.is_safety_critical && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                        <ShieldAlert className="w-3 h-3 text-red-600" />
                        Safety Critical
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2">
                    {entry.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {entry.content_text}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Approved on {entry.approved_at ? new Date(entry.approved_at).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Read entry
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* READ-ONLY ENTRY DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                    {machine.name}
                  </span>
                  {selectedEntry.is_safety_critical && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      Safety Critical
                    </span>
                  )}
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                    Approved
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedEntry.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authored by {selectedEntry.employee?.full_name || selectedEntry.author_name_cache || 'Former Employee'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sanitized Rich Text */}
            <div
              className="py-6 text-sm text-slate-700 leading-relaxed tiptap-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(selectedEntry.content_html),
              }}
            />

            {/* Tags */}
            {selectedEntry.tags && selectedEntry.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-slate-400 mr-1">Tags:</span>
                {selectedEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT MACHINE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display text-xl font-bold text-slate-900">
                Edit Machine Specifications
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="my-3 p-3 rounded-2xl bg-red-50 text-red-700 text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Name
                  </label>
                  <input
                    type="text"
                    value={editingMachine.name || ''}
                    onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingMachine.category || ''}
                    onChange={(e) => setEditingMachine({ ...editingMachine, category: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingMachine.description || ''}
                  onChange={(e) => setEditingMachine({ ...editingMachine, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specifications
                </label>
                <textarea
                  rows={2}
                  value={editingMachine.specifications || ''}
                  onChange={(e) => setEditingMachine({ ...editingMachine, specifications: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Common Issues
                </label>
                <textarea
                  rows={2}
                  value={editingMachine.common_issues || ''}
                  onChange={(e) => setEditingMachine({ ...editingMachine, common_issues: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1">
                  Safety Notes
                </label>
                <textarea
                  rows={2}
                  value={editingMachine.safety_notes || ''}
                  onChange={(e) => setEditingMachine({ ...editingMachine, safety_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50/30 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Photo
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
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
                >
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong>{machine.name}</strong> from the equipment library?
              Linked approved entries will retain their text records.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMachine}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

