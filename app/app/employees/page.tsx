'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  ChevronDown,
  X,
} from 'lucide-react';
import { Employee } from '@/lib/types';

export default function EmployeesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'dept' | 'designation'>('name_asc');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [seniorOnly, setSeniorOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  }

  // Derive unique departments & designations
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  const designations = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.designation) set.add(e.designation);
    });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  // Filtered and Sorted list
  const processedEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        // Search
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchName = emp.full_name.toLowerCase().includes(q);
          const matchDept = emp.department.toLowerCase().includes(q);
          const matchDesig = emp.designation.toLowerCase().includes(q);
          const matchCode = emp.employee_code.toLowerCase().includes(q);
          if (!matchName && !matchDept && !matchDesig && !matchCode) return false;
        }

        // Department filter
        if (selectedDept !== 'All' && emp.department !== selectedDept) return false;

        // Designation filter
        if (selectedDesignation !== 'All' && emp.designation !== selectedDesignation) return false;

        // Senior only filter
        const isSenior = emp.is_senior || emp.experience_years >= 10;
        if (seniorOnly && !isSenior) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name);
        if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name);
        if (sortBy === 'dept') return a.department.localeCompare(b.department);
        if (sortBy === 'designation') return a.designation.localeCompare(b.designation);
        return 0;
      });
  }, [employees, search, selectedDept, selectedDesignation, seniorOnly, sortBy]);

  const activeFilterCount =
    (selectedDept !== 'All' ? 1 : 0) +
    (selectedDesignation !== 'All' ? 1 : 0) +
    (seniorOnly ? 1 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header (No tagline pill) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Plant Experts &amp; Operators
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse technicians, machinists, and mentors. Click any employee to view their approved knowledge contributions.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, dept..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* FILTER & SORT BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Sort Controls */}
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
            <option value="dept">By Department</option>
            <option value="designation">By Designation</option>
          </select>
        </div>

        {/* Inline Filters / Drawer Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All Departments</option>
            {departments.filter((d) => d !== 'All').map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Designation Filter */}
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All Designations</option>
            {designations.filter((d) => d !== 'All').map((desig) => (
              <option key={desig} value={desig}>
                {desig}
              </option>
            ))}
          </select>

          {/* Senior Only Toggle */}
          <button
            type="button"
            onClick={() => setSeniorOnly(!seniorOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              seniorOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Senior Only</span>
          </button>

          {/* Clear Filters button */}
          {(activeFilterCount > 0 || search.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDept('All');
                setSelectedDesignation('All');
                setSeniorOnly(false);
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

      {/* Grid of Simplified Employee Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 bg-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : processedEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-700">No personnel found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {processedEmployees.map((emp) => {
            const isSenior = emp.is_senior || emp.experience_years >= 10;

            return (
              <Link
                key={emp.id}
                href={`/app/employees/${emp.id}`}
                className="group bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden"
              >
                {/* Verified Tag only for senior employees */}
                {isSenior && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                )}

                {/* Profile Picture: Large, front and center */}
                <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-slate-200 overflow-hidden shadow-sm flex items-center justify-center font-display font-bold text-xl text-slate-700 shrink-0 mb-4 group-hover:scale-105 transition-transform duration-200">
                  {emp.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.avatar_url}
                      alt={emp.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    emp.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>

                {/* Name */}
                <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight mb-1">
                  {emp.full_name}
                </h3>

                {/* Designation */}
                <p className="text-xs font-semibold text-slate-600 leading-snug">
                  {emp.designation}
                </p>

                {/* Department */}
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  {emp.department}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
