'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  KeyRound,
  Trash2,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
  Copy,
  Building,
  Briefcase,
  Phone,
  Mail,
  Award,
} from 'lucide-react';
import { Employee } from '@/lib/types';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    designation: 'Technician',
    department: 'Operations',
    experience_years: '2',
    phone: '',
    email: '',
    bio: '',
  });

  // Temporary password display modal (shown once!)
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    open: boolean;
    name: string;
    code: string;
    password: string;
  }>({ open: false, name: '', code: '', password: '' });
  const [copied, setCopied] = useState(false);

  // Edit Employee Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm Dialog
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  async function fetchEmployees() {
    try {
      const url = search.trim()
        ? `/api/admin/employees?q=${encodeURIComponent(search.trim())}`
        : '/api/admin/employees';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      } else {
        setError(data.error || 'Failed to load employee list');
      }
    } catch {
      setError('Server connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });
      const data = await res.json();

      if (res.ok && data.employee) {
        setIsAddModalOpen(false);
        setNewEmployee({
          full_name: '',
          designation: 'Technician',
          department: 'Operations',
          experience_years: '2',
          phone: '',
          email: '',
          bio: '',
        });

        // Show temporary password modal ONCE
        setTempPasswordModal({
          open: true,
          name: data.employee.full_name,
          code: data.employee.employee_code,
          password: data.tempPassword,
        });

        fetchEmployees();
      } else {
        setError(data.error || 'Failed to add employee');
      }
    } catch {
      setError('Network error while creating employee');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;
    setSavingEdit(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmployee),
      });
      const data = await res.json();

      if (res.ok) {
        setIsEditModalOpen(false);
        setSuccess(`Updated details for ${editingEmployee.full_name}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchEmployees();
      } else {
        setError(data.error || 'Failed to update employee');
      }
    } catch {
      setError('Network error while updating employee');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetPassword(emp: Employee) {
    if (!confirm(`Reset password for ${emp.full_name} (${emp.employee_code})?`)) return;

    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.tempPassword) {
        setTempPasswordModal({
          open: true,
          name: emp.full_name,
          code: emp.employee_code,
          password: data.tempPassword,
        });
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch {
      alert('Network error resetting password');
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingEmployee) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || 'Employee removed successfully.');
        setDeletingEmployee(null);
        fetchEmployees();
      } else {
        setError(data.error || 'Failed to remove employee.');
      }
    } catch {
      setError('Network error removing employee.');
    } finally {
      setDeleting(false);
    }
  }

  function copyCredentials() {
    const text = `Anubhav Plant Access:\nUser ID: ${tempPasswordModal.code}\nTemporary Password: ${tempPasswordModal.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Personnel Management Console</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Manage Factory Employees
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authorize new technicians, reset credentials, update designations, or retire records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, designation, department, or User ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white shadow-sm"
        />
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Employee</th>
                <th className="py-3.5 px-4">User ID</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading factory roster...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No employees matching search criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name + Avatar */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
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
                          <p className="font-bold text-slate-900">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-400">{emp.designation}</p>
                        </div>
                      </div>
                    </td>

                    {/* User ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {emp.employee_code}
                      </span>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{emp.department}</p>
                      <p className="text-[11px] text-slate-500">
                        Joined {new Date(emp.joined_on).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Experience */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Award className="w-3.5 h-3.5 text-rose-600" />
                        {emp.experience_years} yrs
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      <p>{emp.email || 'No email'}</p>
                      <p className="text-slate-400">{emp.phone || 'No phone'}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Edit Employee Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetPassword(emp)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingEmployee(emp)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Remove Employee"
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

      {/* TEMPORARY PASSWORD DISPLAY MODAL (Shown once!) */}
      {tempPasswordModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="font-display text-xl font-bold text-slate-900">
              Credentials Generated
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Provide these initial credentials to <strong>{tempPasswordModal.name}</strong>.
              This temporary password will NOT be shown again.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-semibold">User ID:</span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {tempPasswordModal.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-semibold">Temp Password:</span>
                <span className="font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 select-all">
                  {tempPasswordModal.password}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTempPasswordModal({ open: false, name: '', code: '', password: '' })}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display text-xl font-bold text-slate-900">
                Register New Plant Employee
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                    placeholder="e.g. Lathe Specialist"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="e.g. Machining Bay"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={newEmployee.experience_years}
                    onChange={(e) => setNewEmployee({ ...newEmployee, experience_years: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="ramesh@plant.internal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="+91 98..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialty / Initial Bio
                </label>
                <textarea
                  rows={2}
                  value={newEmployee.bio}
                  onChange={(e) => setNewEmployee({ ...newEmployee, bio: e.target.value })}
                  placeholder="Primary machine specialties or apprenticeship history..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  disabled={adding}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {adding ? 'Registering...' : 'Register & Generate ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display text-xl font-bold text-slate-900">
                Edit Employee Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingEmployee.full_name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.designation}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.department}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingEmployee.experience_years}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, experience_years: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingEmployee.email || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editingEmployee.phone || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bio / Specialties
                </label>
                <textarea
                  rows={2}
                  value={editingEmployee.bio || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {savingEdit ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Remove Employee
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong>{deletingEmployee.full_name}</strong> ({deletingEmployee.employee_code})?
            </p>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium mb-6">
              * Per plant policy, all approved entries authored by this technician will be preserved in the knowledge base and credited as &quot;Former employee&quot;.
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
              >
                {deleting ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

