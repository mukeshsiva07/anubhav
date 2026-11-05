'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TipTapEditor } from '@/components/TipTapEditor';
import { Machine, Entry, EntryAttachment } from '@/lib/types';
import {
  FileEdit,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ShieldAlert,
  Save,
  Send,
  X,
  Layers,
  Tag,
  Cpu,
  RotateCcw,
  AlertTriangle,
  Calendar,
  User,
  Paperclip,
} from 'lucide-react';
import { sanitizeContent } from '@/lib/sanitize';

const AUTOSAVE_KEY = 'anubhav_entries_draft';

function EntriesContent() {
  const searchParams = useSearchParams();
  const initialViewId = searchParams.get('view');

  const [entries, setEntries] = useState<Entry[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  // Modals
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);

  // Editor Form State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryStatus, setEditingEntryStatus] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [machineId, setMachineId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSafetyCritical, setIsSafetyCritical] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [attachments, setAttachments] = useState<EntryAttachment[]>([]);

  // Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchMachines();
    fetchMyEntries();
    loadDraftFromStorage();
  }, []);

  // Check for view param on load
  useEffect(() => {
    if (initialViewId && entries.length > 0) {
      const match = entries.find((e) => e.id === initialViewId);
      if (match) {
        setViewingEntry(match);
      } else {
        // Fetch single entry directly
        fetchSingleEntry(initialViewId);
      }
    }
  }, [initialViewId, entries.length]);

  async function fetchSingleEntry(id: string) {
    try {
      const res = await fetch(`/api/entries/${id}`);
      const data = await res.json();
      if (res.ok && data.entry) {
        setViewingEntry(data.entry);
      }
    } catch {
      // ignore
    }
  }

  // Autosave draft locally
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isEditorModalOpen && !editingEntryId && (title || contentHtml)) {
        const draft = {
          title,
          machineId,
          tagsInput,
          isSafetyCritical,
          contentHtml,
          attachments,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
        setSaveStatus('Draft autosaved locally');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isEditorModalOpen, title, machineId, tagsInput, isSafetyCritical, contentHtml, attachments, editingEntryId]);

  function loadDraftFromStorage() {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved && !editingEntryId) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.contentHtml) {
          setTitle(parsed.title || '');
          setMachineId(parsed.machineId || '');
          setTagsInput(parsed.tagsInput || '');
          setIsSafetyCritical(!!parsed.isSafetyCritical);
          setContentHtml(parsed.contentHtml || '');
          setAttachments(parsed.attachments || []);
          setSaveStatus('Autosaved draft restored');
        }
      }
    } catch {
      // ignore
    }
  }

  async function fetchMachines() {
    try {
      const res = await fetch('/api/machines');
      const data = await res.json();
      if (res.ok) setMachines(data.machines || []);
    } catch {
      // ignore
    }
  }

  async function fetchMyEntries() {
    setLoading(true);
    try {
      const res = await fetch('/api/entries?my=true');
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingEntryId(null);
    setEditingEntryStatus(null);
    setTitle('');
    setMachineId('');
    setTagsInput('');
    setIsSafetyCritical(false);
    setContentHtml('');
    setAttachments([]);
    setFormError('');
    setFormSuccess('');
    loadDraftFromStorage();
    setIsEditorModalOpen(true);
  }

  function openEditModal(entry: Entry) {
    setEditingEntryId(entry.id);
    setEditingEntryStatus(entry.status);
    setTitle(entry.title);
    setMachineId(entry.machine_id || '');
    setTagsInput((entry.tags || []).join(', '));
    setIsSafetyCritical(entry.is_safety_critical);
    setContentHtml(entry.content_html);
    setAttachments(entry.attachments || []);
    setFormError('');
    setFormSuccess(
      entry.status === 'approved'
        ? 'Note: Editing an approved entry creates a pending revision for plant admin review.'
        : `Editing ${entry.status} entry.`
    );
    setIsEditorModalOpen(true);
  }

  async function handleSaveEntry(isDraft: boolean) {
    setFormError('');
    setFormSuccess('');

    if (!title.trim()) {
      setFormError('Please enter a descriptive title for this entry.');
      return;
    }

    if (!contentHtml.trim() || contentHtml === '<p></p>') {
      setFormError('Please describe the procedure or observation in the editor.');
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // Compute thumbnail: first image in content, or first image attachment
      let thumbnail: string | null = null;
      const imgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        thumbnail = imgMatch[1];
      } else if (attachments && attachments.length > 0) {
        const imgAtt = attachments.find(
          (a) => a && (a.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name || a.url))
        );
        if (imgAtt) thumbnail = imgAtt.url;
      }

      const payload = {
        title: title.trim(),
        machine_id: machineId || null,
        tags: tagsArray,
        is_safety_critical: isSafetyCritical,
        content_html: contentHtml,
        thumbnail_url: thumbnail,
        attachments,
        status: 'pending',
        resubmit: !isDraft,
      };

      let res;
      if (editingEntryId) {
        res = await fetch(`/api/entries/${editingEntryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to submit entry.');
        setSubmitting(false);
        return;
      }

      localStorage.removeItem(AUTOSAVE_KEY);
      setIsEditorModalOpen(false);
      fetchMyEntries();
    } catch {
      setFormError('Network error while saving entry.');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered entries list
  const filteredEntries = entries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchMachine = (e.machine?.name || '').toLowerCase().includes(q);
      const matchTags = (e.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchMachine || matchTags;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Knowledge Entries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your recorded shop-floor tips, machine calibration observations, and safety insights.
          </p>
        </div>

        {/* Create New Entry Button at Top Right */}
        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create new entry</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? `All (${entries.length})` : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your entries..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
          <FileEdit className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-700">No entries found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search.trim() || statusFilter !== 'all'
              ? 'Try clearing your filters or search query.'
              : 'Record your first factory insight by clicking "Create new entry" above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const machineName = entry.machine?.name || 'General Factory';
            return (
              <div
                key={entry.id}
                onClick={() => setViewingEntry(entry)}
                className="group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all flex items-center gap-4 cursor-pointer"
              >
                {/* Thumbnail on the left of each row */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                  {entry.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.thumbnail_url}
                      alt={entry.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="text-emerald-400">
                      <Cpu className="w-6 h-6 opacity-70" />
                    </div>
                  )}
                </div>

                {/* Entry Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {entry.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Approval
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100/90 px-2 py-0.5 rounded-full border border-red-200">
                        <XCircle className="w-3 h-3 text-red-600" />
                        Rejected
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {machineName}
                    </span>

                    {entry.is_safety_critical && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        Safety Critical
                      </span>
                    )}

                    {entry.attachments && entry.attachments.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        {entry.attachments.length}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                    {entry.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {entry.content_text}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-0.5">
                    <span>Date: {new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="shrink-0 p-2 text-slate-400 group-hover:text-emerald-600 transition-colors">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT WORD PROCESSOR MODAL */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {editingEntryId
                      ? editingEntryStatus === 'approved'
                        ? 'Create Revision for Approved Entry'
                        : 'Edit Knowledge Entry'
                      : 'Create New Knowledge Entry'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Capture operating tips, diagnostic methods, and machine nuances.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lathe #3: Tailstock Loosens After 2 Hours of Heavy Turning"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Machine & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Target Machine (Optional)
                  </label>
                  <select
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    <option value="">General Plant / Facility</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. vibration, thermal, tailstock"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Safety Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSafetyCritical}
                  onChange={(e) => setIsSafetyCritical(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    className={`w-4 h-4 ${
                      isSafetyCritical ? 'text-red-600 animate-bounce' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Involves a critical safety hazard or interlock protocol
                    </span>
                    <p className="text-[11px] text-slate-500">
                      High-priority warning banner highlighted in AI responses.
                    </p>
                  </div>
                </div>
              </label>

              {/* TipTap Rich Text Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detailed Procedure &amp; Advice *
                </label>
                <TipTapEditor
                  content={contentHtml}
                  onChange={(html) => setContentHtml(html)}
                  attachments={attachments}
                  onAttachmentsChange={(atts) => setAttachments(atts)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-400 font-mono">
                {saveStatus}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveEntry(true)}
                  className="px-4 py-2 rounded-2xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveEntry(false)}
                  className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ENTRY MODAL */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {viewingEntry.machine?.name || 'General Facility'}
                  </span>
                  {viewingEntry.is_safety_critical && (
                    <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                      Safety Critical
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${
                      viewingEntry.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingEntry.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {viewingEntry.status}
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {viewingEntry.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Rejection Reason Notice */}
              {viewingEntry.status === 'rejected' && viewingEntry.rejection_reason && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                  <strong>Admin Feedback:</strong> {viewingEntry.rejection_reason}
                </div>
              )}

              {/* HTML Content */}
              <div
                className="text-sm text-slate-800 leading-relaxed tiptap-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(viewingEntry.content_html),
                }}
              />

              {/* Attachments List */}
              {viewingEntry.attachments && viewingEntry.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">
                    Attached Files ({viewingEntry.attachments.length}):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingEntry.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Tags:</span>
                  {viewingEntry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  const entryToEdit = viewingEntry;
                  setViewingEntry(null);
                  openEditModal(entryToEdit);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                {viewingEntry.status === 'approved' ? 'Create Revision' : 'Edit & Resubmit'}
              </button>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense fallback={<div className="h-44 bg-slate-200 rounded-3xl animate-pulse" />}>
      <EntriesContent />
    </Suspense>
  );
}

