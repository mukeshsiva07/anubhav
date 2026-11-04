'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TipTapEditor } from '@/components/TipTapEditor';
import { Machine, Entry } from '@/lib/types';
import {
  FileEdit,
  Send,
  Save,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Layers,
  Tag,
  AlertTriangle,
  RotateCcw,
  X,
} from 'lucide-react';
import { sanitizeContent } from '@/lib/sanitize';

const AUTOSAVE_KEY = 'anubhav_record_draft';

export default function RecordInfoPage() {
  // Machines for dropdown
  const [machines, setMachines] = useState<Machine[]>([]);
  // Employee's recent entries
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Form State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryStatus, setEditingEntryStatus] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [machineId, setMachineId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSafetyCritical, setIsSafetyCritical] = useState(false);
  const [contentHtml, setContentHtml] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // View modal for an existing entry
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);

  // Load machines and employee's recent entries on mount
  useEffect(() => {
    fetchMachines();
    fetchRecentEntries();
    loadDraftFromStorage();
  }, []);

  // Autosave draft to localStorage every 4 seconds if dirty
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!editingEntryId && (title || contentHtml)) {
        const draft = {
          title,
          machineId,
          tagsInput,
          isSafetyCritical,
          contentHtml,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
        setSaveStatus('Draft autosaved locally');
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [title, machineId, tagsInput, isSafetyCritical, contentHtml, editingEntryId]);

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
          setSaveStatus('Loaded autosaved draft');
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
      if (res.ok) {
        setMachines(data.machines || []);
      }
    } catch {
      // ignore
    }
  }

  async function fetchRecentEntries() {
    setLoadingEntries(true);
    try {
      const res = await fetch('/api/entries?my=true');
      const data = await res.json();
      if (res.ok) {
        setRecentEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingEntries(false);
    }
  }

  function clearForm() {
    setEditingEntryId(null);
    setEditingEntryStatus(null);
    setTitle('');
    setMachineId('');
    setTagsInput('');
    setIsSafetyCritical(false);
    setContentHtml('');
    setErrorMessage('');
    setSuccessMessage('');
    localStorage.removeItem(AUTOSAVE_KEY);
    setSaveStatus('');
  }

  // Load an existing entry into the editor
  function handleEditEntry(entry: Entry) {
    setEditingEntryId(entry.id);
    setEditingEntryStatus(entry.status);
    setTitle(entry.title);
    setMachineId(entry.machine_id || '');
    setTagsInput((entry.tags || []).join(', '));
    setIsSafetyCritical(entry.is_safety_critical);
    setContentHtml(entry.content_html);
    setErrorMessage('');
    setSuccessMessage(
      entry.status === 'approved'
        ? 'Editing an approved entry creates a new pending revision for admin review.'
        : `Editing ${entry.status} entry.`
    );
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Save manual draft or submit for approval
  async function handleSubmit(isDraft: boolean) {
    setErrorMessage('');
    setSuccessMessage('');

    if (!title.trim()) {
      setErrorMessage('Please provide a descriptive title for this entry.');
      return;
    }

    if (!contentHtml.trim() || contentHtml === '<p></p>') {
      setErrorMessage('Please describe the procedure or observation in the editor.');
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        machine_id: machineId || null,
        tags: tagsArray,
        is_safety_critical: isSafetyCritical,
        content_html: contentHtml,
        status: isDraft ? 'pending' : 'pending',
        resubmit: !isDraft,
      };

      let res;
      if (editingEntryId) {
        // Update existing entry (or creates revision if approved)
        res = await fetch(`/api/entries/${editingEntryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new entry
        res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit entry.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        data.isRevision
          ? 'Revision submitted successfully! Awaiting plant administrator review.'
          : isDraft
          ? 'Draft recorded successfully in pending queue.'
          : 'Entry submitted! Status is now Pending Approval by the plant administrator.'
      );

      clearForm();
      fetchRecentEntries();
    } catch {
      setErrorMessage('Network error while saving entry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
            <FileEdit className="w-3.5 h-3.5" />
            <span>Institutional Memory Recorder</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Record Shop-Floor Wisdom
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Capture machine-specific quirks, uncommon failure modes, and calibration tricks.
          </p>
        </div>

        {editingEntryId && (
          <button
            type="button"
            onClick={clearForm}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Edit / New Entry</span>
          </button>
        )}
      </div>

      {/* Editor Main Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8 space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Inputs Above Editor */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Machine Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Target Machine (Optional)
              </label>
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                <option value="">General Plant / Not Specific</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Search Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. vibration, thermal, tailstock, spindle"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Safety Risk Toggle */}
          <div className="pt-2">
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
                    This involves a safety risk or critical interlock
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Flags this entry with high priority red citation in AI answers and safety audits.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* TipTap Rich Text Editor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Rich Text Procedure & Advice *
          </label>
          <TipTapEditor
            content={contentHtml}
            onChange={(html) => setContentHtml(html)}
          />
        </div>

        {/* Form Actions & Auto-save Status */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            {saveStatus && (
              <>
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveStatus}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {editingEntryId && editingEntryStatus === 'approved'
                      ? 'Submit Revision for Approval'
                      : 'Submit for Approval'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RECENT ENTRIES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Your Knowledge Contributions ({recentEntries.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entries recorded by you. Pending and rejected entries can be edited and resubmitted.
            </p>
          </div>
        </div>

        {loadingEntries ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
            <FileEdit className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No recorded entries yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Draft your first shop-floor trick using the editor above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {entry.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Approval
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100/90 px-2.5 py-0.5 rounded-full border border-red-200">
                        <XCircle className="w-3 h-3 text-red-600" />
                        Rejected
                      </span>
                    )}

                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {entry.machine?.name || 'General Factory'}
                    </span>

                    {entry.is_safety_critical && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        Safety Critical
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-900 truncate">
                    {entry.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {entry.content_text}
                  </p>

                  {/* Rejection Reason Notice */}
                  {entry.status === 'rejected' && entry.rejection_reason && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                      <strong>Admin Feedback:</strong> {entry.rejection_reason}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-0.5">
                    <span>Created: {new Date(entry.created_at).toLocaleDateString()}</span>
                    {entry.approved_at && (
                      <span>Approved: {new Date(entry.approved_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setViewingEntry(entry)}
                    className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="View Formatted Entry"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditEntry(entry)}
                    className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    title={
                      entry.status === 'approved'
                        ? 'Create a pending revision from this approved text'
                        : 'Edit and resubmit'
                    }
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW ENTRY MODAL */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
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
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      viewingEntry.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingEntry.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {viewingEntry.status.toUpperCase()}
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

            <div
              className="py-6 text-sm text-slate-700 leading-relaxed tiptap-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(viewingEntry.content_html),
              }}
            />

            {viewingEntry.tags && viewingEntry.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setViewingEntry(null);
                  handleEditEntry(viewingEntry);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                Edit in Recorder
              </button>
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
    </div>
  );
}

