'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Award,
  Eye,
  EyeOff,
  Wand2,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Employee } from '@/lib/types';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'dept' | 'designation' | 'status'>('name_asc');
  const [deptFilter, setDeptFilter] = useState('all');
  const [desigFilter, setDesigFilter] = useState('all');
  const [seniorFilter, setSeniorFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    designation: 'Technician',
    department: 'Operations',
    experience_years: '2',
    phone: '',
    email: '',
    bio: '',
    password: '',
    is_senior: false,
  });

  // Change Password Modal (Admin sets a new password, min 8 chars)
  const [changePasswordModal, setChangePasswordModal] = useState<{
    open: boolean;
    employee: Employee | null;
    newPassword: string;
    showPass: boolean;
    saving: boolean;
    error: string;
  }>({
    open: false,
    employee: null,
    newPassword: '',
    showPass: false,
    saving: false,
    error: '',
  });

  // Temporary password display modal (shown once after auto-generated registration)
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
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/admin/employees');
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

  // Unique options for filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const designations = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.designation) set.add(e.designation);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered & sorted employees
  const processedEmployees = useMemo(() => {
    let result = [...employees];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== 'all') {
      result = result.filter((e) => e.department === deptFilter);
    }
    if (desigFilter !== 'all') {
      result = result.filter((e) => e.designation === desigFilter);
    }
    if (seniorFilter) {
      result = result.filter((e) => e.is_senior || (e.experience_years && e.experience_years >= 10));
    }
    if (statusFilter !== 'all') {
      result = result.filter((e) => (e.status || 'active') === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name);
      if (sortBy === 'dept') return a.department.localeCompare(b.department);
      if (sortBy === 'designation') return a.designation.localeCompare(b.designation);
      if (sortBy === 'status') return (a.status || 'active').localeCompare(b.status || 'active');
      return 0;
    });

    return result;
  }, [employees, search, deptFilter, desigFilter, seniorFilter, statusFilter, sortBy]);

  function generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '9A!';
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (newEmployee.password && newEmployee.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
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
        setSuccess(`Registered employee: ${data.employee.full_name} (${data.employee.employee_code})`);
        setTimeout(() => setSuccess(''), 4000);

        setNewEmployee({
          full_name: '',
          designation: 'Technician',
          department: 'Operations',
          experience_years: '2',
          phone: '',
          email: '',
          bio: '',
          password: '',
          is_senior: false,
        });

        // If the admin auto-generated or let the system set the password, show temp password modal
        if (data.tempPassword) {
          setTempPasswordModal({
            open: true,
            name: data.employee.full_name,
            code: data.employee.employee_code,
            password: data.tempPassword,
          });
        }

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

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!changePasswordModal.employee) return;
    if (changePasswordModal.newPassword.length < 8) {
      setChangePasswordModal((prev) => ({ ...prev, error: 'Password must be at least 8 characters long.' }));
      return;
    }

    setChangePasswordModal((prev) => ({ ...prev, saving: true, error: '' }));

    try {
      const res = await fetch(`/api/admin/employees/${changePasswordModal.employee.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: changePasswordModal.newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        const empName = changePasswordModal.employee.full_name;
        setChangePasswordModal({
          open: false,
          employee: null,
          newPassword: '',
          showPass: false,
          saving: false,
          error: '',
        });
        setSuccess(`Password updated successfully for ${empName}.`);
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setChangePasswordModal((prev) => ({
          ...prev,
          saving: false,
          error: data.error || 'Failed to update password',
        }));
      }
    } catch {
      setChangePasswordModal((prev) => ({
        ...prev,
        saving: false,
        error: 'Network failure resetting password',
      }));
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
    const text = `Anubhav Plant Access:\nUser ID: ${tempPasswordModal.code}\nPassword: ${tempPasswordModal.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header - No tagline pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Manage Factory Employees
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authorize new technicians, set credentials, update seniority & designations, or retire records.
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

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, User ID, department..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="name_asc">Sort: A to Z</option>
              <option value="name_desc">Sort: Z to A</option>
              <option value="dept">Sort: Department</option>
              <option value="designation">Sort: Designation</option>
              <option value="status">Sort: Status</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Designation Filter */}
            <select
              value={desigFilter}
              onChange={(e) => setDesigFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">All Roles</option>
              {designations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Senior Verified Toggle Filter */}
            <button
              type="button"
              onClick={() => setSeniorFilter(!seniorFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                seniorFilter
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Senior Only</span>
            </button>
          </div>
        </div>
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
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading factory roster...
                  </td>
                </tr>
              ) : processedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employees matching the current filters.
                  </td>
                </tr>
              ) : (
                processedEmployees.map((emp) => {
                  const isSenior = emp.is_senior || (emp.experience_years && emp.experience_years >= 10);
                  const status = emp.status || 'active';

                  return (
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900">{emp.full_name}</p>
                              {isSenior && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>
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

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {status}
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
                            onClick={() => {
                              setChangePasswordModal({
                                open: true,
                                employee: emp,
                                newPassword: '',
                                showPass: false,
                                saving: false,
                                error: '',
                              });
                            }}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Change Password"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {changePasswordModal.open && changePasswordModal.employee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold text-slate-900">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModal((prev) => ({ ...prev, open: false }))}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Set a new login password for <strong>{changePasswordModal.employee.full_name}</strong> (
              <span className="font-mono">{changePasswordModal.employee.employee_code}</span>). Minimum 8 characters.
            </p>

            {changePasswordModal.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                {changePasswordModal.error}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setChangePasswordModal((prev) => ({
                        ...prev,
                        newPassword: generatePassword(),
                        showPass: true,
                      }))
                    }
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={changePasswordModal.showPass ? 'text' : 'password'}
                    value={changePasswordModal.newPassword}
                    onChange={(e) =>
                      setChangePasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChangePasswordModal((prev) => ({ ...prev, showPass: !prev.showPass }))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {changePasswordModal.showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordModal((prev) => ({ ...prev, open: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordModal.saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {changePasswordModal.saving ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <span className="text-slate-500 font-sans font-semibold">Password:</span>
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

              {/* Password Field (Admin creates or generates password, min 8 chars) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password * (min 8 chars)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmployee({ ...newEmployee, password: generatePassword() });
                      setShowAddPassword(true);
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Create login password (min 8 characters)"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Senior / Verified Toggle */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Mark as Senior / Verified</p>
                  <p className="text-[11px] text-slate-500">Grants verified credentials badge in rosters and directory.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEmployee.is_senior}
                    onChange={(e) => setNewEmployee({ ...newEmployee, is_senior: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
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
                  {adding ? 'Registering...' : 'Register Employee'}
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

              {/* Senior / Verified Toggle */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Senior / Verified Technician</p>
                  <p className="text-[11px] text-slate-500">Enable verified badge in roster and company library.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingEmployee.is_senior)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, is_senior: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={editingEmployee.status || 'active'}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
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
