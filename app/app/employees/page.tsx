'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users, Award, ChevronRight, UserCheck, Shield } from 'lucide-react';
import { Employee } from '@/lib/types';

export default function EmployeesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  async function fetchEmployees() {
    try {
      const url = search.trim() ? `/api/employees?q=${encodeURIComponent(search.trim())}` : '/api/employees';
      const res = await fetch(url);
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Factory Personnel Directory</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Plant Experts & Operators
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse technicians, machinists, and mentors. Click any employee to view their approved shop-floor knowledge contributions.
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
            placeholder="Search by name, dept, or code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Grid of Employees */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-soft">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-slate-700">No personnel found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <Link
              key={emp.id}
              href={`/app/employees/${emp.id}`}
              className="group bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft hover:shadow-hover hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-display font-bold text-base text-slate-700 shrink-0">
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
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {emp.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {emp.designation}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                    {emp.employee_code}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dept: <strong>{emp.department}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Experience: <strong>{emp.experience_years} years</strong></span>
                  </div>
                </div>

                {emp.bio && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    &ldquo;{emp.bio}&rdquo;
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  View Experience Record
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

