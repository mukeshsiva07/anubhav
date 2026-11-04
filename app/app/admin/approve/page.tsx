'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Edit,
  RotateCcw,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Layers,
  User,
} from 'lucide-react';
import { Entry, Machine, Employee } from '@/lib/types';
import { sanitizeContent } from '@/lib/sanitize';
import { TipTapEditor } from '@/components/TipTapEditor';

export default function AdminApproveDataPage() {
  const [pendingEntries, setPendingEntries] = useState<Entry[]>([]);
  const [approvedEntries, setApprovedEntries] = useState<Entry[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bulk Selection for Pending Section
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  // Bulk Selection for Approved Section
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<string[]>([]);

  // Search & Filter State for Approved Section
  const [approvedSearch, setApprovedSearch] = useState('');
  const [filterMachineId, setFilterMachineId] = useState('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [filterSafetyOnly, setFilterSafetyOnly] = useState(false);

  // Rejection Reason Modal
  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    id?: string;
    isBulk?: boolean;
    reason: string;
  }>({ open: false, reason: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Edit Before Approving Modal
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMachineId, setEditMachineId] = useState('');
  const [editIsSafety, setEditIsSafety] = useState(false);
  const [editContentHtml, setEditContentHtml] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // View Entry Modal
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);

  // Delete Confirm Dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata();
    fetchEntries();
  }, []);

  useEffect(() => {
    fetchApprovedEntries();
  }, [approvedSearch, filterMachineId, filterEmployeeId, filterSafetyOnly]);

  async function fetchMetadata() {
    try {
      const [mRes, eRes] = await Promise.all([
        fetch('/api/machines'),
        fetch('/api/admin/employees'),
      ]);
      const mData = await mRes.json();
      const eData = await eRes.json();
      if (mRes.ok) setMachines(mData.machines || []);
      if (eRes.ok) setEmployees(eData.employees || []);
    } catch {
      // ignore
    }
  }

  async function fetchEntries() {
    setLoading(true);
    try {
      // Fetch all entries for org
      const res = await fetch('/api/entries?status=all');
      const data = await res.json();
      if (res.ok && data.entries) {
        const pending = (data.entries as Entry[]).filter((e) => e.status === 'pending');
        const approved = (data.entries as Entry[]).filter((e) => e.status === 'approved');
        setPendingEntries(pending);
        setApprovedEntries(approved);
      }
    } catch {
      setError('Failed to load knowledge entries.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchApprovedEntries() {
    try {
      const params = new URLSearchParams();
      params.set('status', 'approved');
      if (approvedSearch.trim()) params.set('q', approvedSearch.trim());
      if (filterMachineId !== 'all') params.set('machineId', filterMachineId);
      if (filterEmployeeId !== 'all') params.set('employeeId', filterEmployeeId);
      if (filterSafetyOnly) params.set('safety', 'true');

      const res = await fetch(`/api/entries?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.entries) {
        setApprovedEntries(data.entries);
      }
    } catch {
      // ignore
    }
  }

  // Action: Single Approve
  async function handleApprove(id: string) {
    setSubmittingAction(true);
    setError('');
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id }),
      });
      if (res.ok) {
        setSuccess('Entry approved and published to knowledge vault.');
        setTimeout(() => setSuccess(''), 3000);
        setSelectedPendingIds((prev) => prev.filter((i) => i !== id));
        fetchEntries();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to approve');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmittingAction(false);
    }
  }

  // Action: Reject Submission
  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectionModal.reason.trim()) {
      alert('Please provide a constructive rejection reason.');
      return;
    }

    setSubmittingAction(true);
    try {
      const payload = rejectionModal.isBulk
        ? { action: 'bulk-reject', ids: selectedPendingIds, reason: rejectionModal.reason }
        : { action: 'reject', id: rejectionModal.id, reason: rejectionModal.reason };

      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess('Entry rejection recorded and returned to author with reason.');
        setTimeout(() => setSuccess(''), 3000);
        setRejectionModal({ open: false, reason: '' });
        setSelectedPendingIds([]);
        fetchEntries();
      } else {
        const data = await res.json();
        alert(data.error || 'Rejection failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmittingAction(false);
    }
  }

  // Action: Bulk Approve
  async function handleBulkApprove() {
    if (!selectedPendingIds.length) return;
    if (!confirm(`Approve all ${selectedPendingIds.length} selected entries?`)) return;

    setSubmittingAction(true);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-approve', ids: selectedPendingIds }),
      });
      if (res.ok) {
        setSuccess(`Bulk approved ${selectedPendingIds.length} entries.`);
        setTimeout(() => setSuccess(''), 3000);
        setSelectedPendingIds([]);
        fetchEntries();
      }
    } catch {
      setError('Bulk approve failed');
    } finally {
      setSubmittingAction(false);
    }
  }

  // Action: Revert to Pending
  async function handleRevertToPending(id: string) {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert-to-pending', id }),
      });
      if (res.ok) {
        setSuccess('Entry moved back to pending queue.');
        setTimeout(() => setSuccess(''), 3000);
        fetchEntries();
      }
    } catch {
      alert('Network error');
    }
  }

  // Action: Delete Entry
  async function handleDeleteEntry() {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/entries/${deletingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Entry permanently deleted from system.');
        setTimeout(() => setSuccess(''), 3000);
        setDeletingId(null);
        fetchEntries();
      }
    } catch {
      alert('Delete failed');
    }
  }

  // Action: Edit Before Approving (or edit existing)
  function startEditing(entry: Entry) {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditMachineId(entry.machine_id || '');
    setEditIsSafety(entry.is_safety_critical);
    setEditContentHtml(entry.content_html);
  }

  async function handleSaveEditEntry(andApprove = false) {
    if (!editingEntry) return;
    setSavingEdit(true);

    try {
      const payload: Record<string, any> = {
        title: editTitle.trim(),
        machine_id: editMachineId || null,
        is_safety_critical: editIsSafety,
        content_html: editContentHtml,
      };

      const res = await fetch(`/api/entries/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (andApprove) {
          await handleApprove(editingEntry.id);
        } else {
          setSuccess('Entry revisions saved successfully.');
          setTimeout(() => setSuccess(''), 3000);
          fetchEntries();
        }
        setEditingEntry(null);
      } else {
        alert('Failed to save edit');
      }
    } catch {
      alert('Network error saving edit');
    } finally {
      setSavingEdit(false);
    }
  }

  // Toggle Pending Selection
  function togglePendingSelect(id: string) {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleAllPending() {
    if (selectedPendingIds.length === pendingEntries.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(pendingEntries.map((e) => e.id));
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Plant Knowledge Governance</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Knowledge Review & Approval
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review operator submissions for technical rigor and safety before publishing into the live vault.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP SECTION: PENDING APPROVAL */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Approval Queue
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
              {pendingEntries.length} Pending
            </span>
          </div>

          {/* Bulk Action Controls */}
          {pendingEntries.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllPending}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
              >
                {selectedPendingIds.length === pendingEntries.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Select All</span>
              </button>

              {selectedPendingIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    disabled={submittingAction}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    Approve Selected ({selectedPendingIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRejectionModal({ open: true, isBulk: true, reason: '' })
                    }
                    disabled={submittingAction}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                  >
                    Reject Selected
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : pendingEntries.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="font-display text-base font-bold text-slate-800">
              All Caught Up!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending submissions awaiting administrator review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingEntries.map((entry) => {
              const isSelected = selectedPendingIds.includes(entry.id);

              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-3xl border transition-all p-6 shadow-soft flex flex-col justify-between ${
                    isSelected
                      ? 'border-rose-400 ring-2 ring-rose-500/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Meta Bar */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePendingSelect(entry.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {entry.machine?.name || 'General Machinery'}
                        </span>
                      </div>

                      {entry.is_safety_critical && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                          Safety Critical
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
                      {entry.title}
                    </h3>

                    {/* Author & Date */}
                    <p className="text-xs text-slate-500 mb-4">
                      By{' '}
                      <strong className="text-slate-800">
                        {entry.employee?.full_name || entry.author_name_cache || 'Technician'}
                      </strong>{' '}
                      • Submitted on {new Date(entry.created_at).toLocaleDateString()}
                    </p>

                    {/* Rendered HTML Content */}
                    <div
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto tiptap-content mb-4"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeContent(entry.content_html),
                      }}
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(entry)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Before Approving</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setRejectionModal({
                            open: true,
                            id: entry.id,
                            isBulk: false,
                            reason: '',
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(entry.id)}
                        disabled={submittingAction}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: APPROVED DATA */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Approved Master Knowledge Base ({approvedEntries.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records accessible to all factory personnel and queried by Ask AI.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Search approved titles/text..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
            />
          </div>

          {/* Machine Filter */}
          <div>
            <select
              value={filterMachineId}
              onChange={(e) => setFilterMachineId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">All Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">All Authors</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Safety Only Checkbox */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer w-full">
              <input
                type="checkbox"
                checked={filterSafetyOnly}
                onChange={(e) => setFilterSafetyOnly(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
              />
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                Safety Critical Only
              </span>
            </label>
          </div>
        </div>

        {/* Approved Records Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Title & Summary</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Approved On</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {approvedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No approved records matching criteria.
                    </td>
                  </tr>
                ) : (
                  approvedEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Title */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-start gap-2">
                          {entry.is_safety_critical && (
                            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{entry.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {entry.content_text}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Machine */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-800 font-semibold">
                          {entry.machine?.name || 'General'}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {entry.employee?.full_name || entry.author_name_cache || 'Former employee'}
                        </p>
                      </td>

                      {/* Approved Date */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {entry.approved_at
                          ? new Date(entry.approved_at).toLocaleDateString()
                          : new Date(entry.updated_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingEntry(entry)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="View Full Entry"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditing(entry)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Edit Entry"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevertToPending(entry.id)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Move Back to Pending"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(entry.id)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* REJECTION REASON MODAL */}
      {rejectionModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Mandatory Rejection Feedback
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModal({ open: false, reason: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Explain why this submission cannot be approved (e.g. missing safety PPE, incorrect clearance, violation of machine limits).
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={rejectionModal.reason}
                onChange={(e) =>
                  setRejectionModal({ ...rejectionModal, reason: e.target.value })
                }
                placeholder="Specify the exact technical reason for rejection..."
                required
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectionModal({ open: false, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BEFORE APPROVING MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-display text-xl font-bold text-slate-900">
                Admin Entry Editor
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine
                  </label>
                  <select
                    value={editMachineId}
                    onChange={(e) => setEditMachineId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="">General</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsSafety}
                      onChange={(e) => setEditIsSafety(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600"
                    />
                    <span>Safety Critical Risk</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Content
                </label>
                <TipTapEditor
                  content={editContentHtml}
                  onChange={(html) => setEditContentHtml(html)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditEntry(false)}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200"
                >
                  Save Changes Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditEntry(true)}
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ENTRY MODAL */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {viewingEntry.machine?.name || 'General'}
                  </span>
                  {viewingEntry.is_safety_critical && (
                    <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                      Safety Critical
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                    Approved
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {viewingEntry.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authored by {viewingEntry.employee?.full_name || viewingEntry.author_name_cache || 'Former employee'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="py-6 text-sm text-slate-700 leading-relaxed tiptap-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(viewingEntry.content_html),
              }}
            />

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
              Confirm Delete
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this approved knowledge entry from the system?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

