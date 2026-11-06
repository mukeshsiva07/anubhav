'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  FileEdit,
  Cpu,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  ArrowRight,
  Building,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Entry, Organization } from '@/lib/types';

export default function EmployeeHomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<{ name: string; industry_type?: string } | null>(null);

  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [entriesRes, orgRes] = await Promise.all([
        fetch('/api/entries'),
        fetch('/api/auth/me'),
      ]);

      const entriesData = await entriesRes.json();
      const orgData = await orgRes.json();

      if (entriesRes.ok && entriesData.entries) {
        setEntries(entriesData.entries || []);
      }

      if (orgRes.ok && orgData.session) {
        setOrg({
          name: orgData.session.orgName || 'Aurobindo Manufacturing',
          industry_type: 'Precision & Heavy Manufacturing',
        });
      }
    } catch (err) {
      console.error('Home page data error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Auto-slide every 4 seconds when not paused
  useEffect(() => {
    if (entries.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % entries.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [entries.length, isPaused]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? entries.length - 1 : prev - 1));
  }, [entries.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % entries.length);
  }, [entries.length]);

  // Touch / Drag swipe handling
  function handleTouchStart(e: React.TouchEvent | React.MouseEvent) {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
    touchEndX.current = null;
  }

  function handleTouchMove(e: React.TouchEvent | React.MouseEvent) {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchEndX.current = clientX;
  }

  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Left Header: Factory Name & Industry Name */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Building className="w-4 h-4 text-emerald-600" />
            <span className="uppercase tracking-wider font-bold text-slate-700">
              {org?.name || 'Aurobindo Manufacturing'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">
              {org?.industry_type || 'Smart Manufacturing Plant'}
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Knowledge Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verified institutional memory, operating nuances, and real shop-floor expertise.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/app/ask"
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask AI</span>
          </Link>
          <Link
            href="/app/entries"
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Record Entries</span>
          </Link>
        </div>
      </div>

      {/* RECENT ENTRIES AUTO-SLIDING CAROUSEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Recent Approved Entries
            </h2>
            <p className="text-xs text-slate-500">
              Shopfloor tricks and procedures approved by plant leadership.
            </p>
          </div>

          {entries.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-sm"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-sm"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display text-base font-bold text-slate-700">No approved entries yet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Be the first to record a shopfloor tip in the Entries section!
            </p>
            <Link
              href="/app/entries"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Create Entry</span>
            </Link>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-soft"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
          >
            {/* Carousel Item */}
            {(() => {
              const current = entries[currentIndex] || entries[0];
              const authorName =
                current.employee?.full_name || current.author_name_cache || 'Technician';
              const machineName = current.machine?.name || 'General Facility';
              const excerpt =
                current.content_text.length > 220
                  ? current.content_text.slice(0, 220) + '...'
                  : current.content_text;

              return (
                <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
                  {/* Thumbnail / Image container */}
                  <div className="w-full md:w-72 h-44 sm:h-52 rounded-2xl bg-slate-900 shrink-0 overflow-hidden relative flex items-center justify-center">
                    {current.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.thumbnail_url}
                        alt={current.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Cpu className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                        <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                          {machineName}
                        </span>
                      </div>
                    )}

                    {current.is_safety_critical && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-red-600 text-white shadow-sm">
                        Safety Critical
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {machineName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(current.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                      {current.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {excerpt}
                    </p>

                    {/* Author & Button */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-200">
                          {current.employee?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={current.employee.avatar_url}
                              alt={authorName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-slate-800">{authorName}</span>
                          {current.employee?.designation && (
                            <span className="text-[11px] text-slate-400 block">
                              {current.employee.designation}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/app/entries?view=${current.id}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
                      >
                        <span>View entry</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Dots Pagination */}
            {entries.length > 1 && (
              <div className="pb-4 pt-1 flex items-center justify-center gap-1.5">
                {entries.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex
                        ? 'w-6 bg-emerald-600'
                        : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUICK WORKSPACE TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/app/ask"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              AI Assistant
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ask questions in English or Tamil. Zero hallucinations, 100% cited from factory logs.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
            Open Chat →
          </span>
        </Link>

        <Link
          href="/app/entries"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileEdit className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
              Knowledge Entries
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Draft, revise, and review your shop-floor observations with voice dictation &amp; files.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-teal-700 flex items-center gap-1">
            Manage Entries →
          </span>
        </Link>

        <Link
          href="/app/library"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              Machines
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect technical specifications, operating quirks, and department equipment.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-blue-700 flex items-center gap-1">
            View Machines →
          </span>
        </Link>
      </div>
    </div>
  );
}

