'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building,
  Award,
  Calendar,
  BookOpen,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  Eye,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { Employee, Entry } from '@/lib/types';
import { sanitizeContent } from '@/lib/sanitize';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read-only modal state
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  useEffect(() => {
    fetchEmployeeDetail();
  }, [employeeId]);

  async function fetchEmployeeDetail() {
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      const data = await res.json();
      if (res.ok) {
        setEmployee(data.employee);
        setEntries(data.entries || []);
      } else {
        setError(data.error || 'Failed to load employee record');
      }
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-6 bg-slate-200 w-32 rounded-lg" />
        <div className="h-44 bg-slate-200 rounded-3xl" />
        <div className="h-72 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
        <p className="text-sm font-bold text-slate-700">{error || 'Personnel not found'}</p>
        <Link
          href="/app/employees"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/app/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Personnel Directory</span>
        </Link>
      </div>

      {/* Top Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-display font-bold text-2xl text-slate-700 shrink-0 shadow-sm">
              {employee.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.avatar_url}
                  alt={employee.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                employee.full_name.slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  {employee.full_name}
                </h1>
                {(employee.is_senior || employee.experience_years >= 10) && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Senior
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {employee.designation} • {employee.department}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 justify-center sm:justify-start text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>{employee.experience_years} Years</strong> Experience
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {new Date(employee.joined_on).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Contact Details */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                {employee.phone && (
                  <a
                    href={`tel:${employee.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{employee.phone}</span>
                  </a>
                )}
                {employee.email && (
                  <a
                    href={`mailto:${employee.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{employee.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Employee User ID
            </span>
            <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 inline-block mt-0.5">
              {employee.employee_code}
            </span>
          </div>
        </div>

        {employee.bio && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{employee.bio}&rdquo;
          </div>
        )}
      </div>

      {/* Approved Knowledge Contributions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Approved Entries ({entries.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified institutional procedures authored by this specialist.
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No approved records yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Entries pending approval or revisions are strictly private to the author and plant admin.
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
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {entry.machine?.name || 'General Factory'}
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
                    {selectedEntry.machine?.name || 'General'}
                  </span>
                  {selectedEntry.is_safety_critical && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      Safety Critical Protocol
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
                  Authored by {employee.full_name} • Approved for plant operations
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

            {/* Sanitized Rich Text Content */}
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
    </div>
  );
}

