'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SessionPayload } from '@/lib/types';
import {
  Home,
  Sparkles,
  FileEdit,
  Users,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Shield,
  KeyRound,
  Building,
  Cpu,
  Building2,
} from 'lucide-react';

interface AppShellProps {
  session: SessionPayload;
  children: React.ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminPassMessage, setAdminPassMessage] = useState('');
  const [adminPassError, setAdminPassError] = useState('');

  const isIndustry = session.role === 'industry';

  // Navigation items based on role
  const navItems = isIndustry
    ? [
        { label: 'Ask AI', href: '/app/ask', icon: Sparkles },
        { label: 'Manage Employees', href: '/app/admin/employees', icon: Users },
        { label: 'Manage Entries', href: '/app/admin/approve', icon: CheckCircle2 },
        { label: 'Manage Machines', href: '/app/library', icon: Cpu },
        { label: 'Help', href: '/app/admin/help', icon: HelpCircle },
      ]
    : [
        { label: 'Home', href: '/app/home', icon: Home },
        { label: 'Ask AI', href: '/app/ask', icon: Sparkles },
        { label: 'Entries', href: '/app/entries', icon: FileEdit },
        { label: 'Employees', href: '/app/employees', icon: Users },
        { label: 'Machines', href: '/app/library', icon: Cpu },
        { label: 'Help', href: '/app/help', icon: HelpCircle },
      ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  async function handleUpdateAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    setAdminPassError('');
    setAdminPassMessage('');
    if (newAdminPassword.length < 8) {
      setAdminPassError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'industry',
          identifier: session.orgName,
          email: 'admin@plant.internal',
          newPassword: newAdminPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAdminPassMessage('Admin password updated successfully.');
        setNewAdminPassword('');
      } else {
        setAdminPassError(data.error || 'Failed to update password.');
      }
    } catch {
      setAdminPassError('Network error occurred.');
    }
  }

  return (
    <div
      data-role={session.role}
      className={`min-h-screen bg-slate-50 flex flex-col ${
        isIndustry ? 'theme-industry' : ''
      }`}
    >
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={isIndustry ? '/app/ask' : '/app/home'} className="flex items-center gap-2">
            <Logo size={36} role={session.role} />
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs font-medium text-slate-500">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{session.orgName}</span>
          </div>
        </div>

        {/* Top Right Profile Section */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                isIndustry
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                session.name.slice(0, 2)
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {session.name}
              </span>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                {isIndustry ? 'Plant Admin' : `ID: ${session.employeeCode || 'Emp'}`}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block rotate-90" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{session.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {session.email || (isIndustry ? 'Organization Administrator' : 'Technical Staff')}
                  </p>
                  <span
                    className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      isIndustry
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isIndustry ? 'INDUSTRY' : 'EMPLOYEE'}
                  </span>
                </div>

                <div className="py-1">
                  {!isIndustry ? (
                    <>
                      <Link
                        href="/app/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>View Profile</span>
                      </Link>
                      <Link
                        href="/app/help"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                        <span>Help & FAQ</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/app/admin/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-700 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Industry Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-700 transition-colors text-left"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        <span>Change Password</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* BODY WITH FIXED COLLAPSED/EXPANDING SIDEBAR */}
      <div className="flex-1 flex relative">
        {/* DESKTOP SIDEBAR: Fixed, icon-only by default, expanding smoothly on hover */}
        <aside
          className="hidden md:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out group z-30 shadow-sm fixed top-16 bottom-0 left-0 w-[72px] hover:w-64 hover:shadow-xl overflow-hidden"
          style={{ willChange: 'width' }}
        >
          <div className="p-3 flex-1 flex flex-col gap-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/app/entries'
                  ? pathname === '/app/entries' || pathname.startsWith('/app/record')
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 whitespace-nowrap overflow-hidden ${
                    isActive
                      ? isIndustry
                        ? 'bg-rose-50 text-rose-700 font-bold shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isActive
                        ? isIndustry
                          ? 'text-rose-600 scale-110'
                          : 'text-emerald-600 scale-110'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Plant Role Info at bottom of sidebar on hover */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-50 text-slate-500 overflow-hidden">
              <Shield className="w-4 h-4 shrink-0 text-slate-400" />
              <div className="text-[11px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                <p className="font-semibold text-slate-700 truncate">{session.orgName}</p>
                <p className="text-[10px] text-slate-400">Strict RLS Active</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA: Independent scroll, left offset for fixed sidebar */}
        <main className="flex-1 md:ml-[72px] overflow-y-auto pb-20 md:pb-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/app/entries'
              ? pathname === '/app/entries' || pathname.startsWith('/app/record')
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? isIndustry
                    ? 'text-rose-700 bg-rose-50'
                    : 'text-emerald-800 bg-emerald-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive
                    ? isIndustry
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* ADMIN CHANGE PASSWORD MODAL */}
      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Change Industry Password
              </h3>
              <button
                type="button"
                onClick={() => setChangePasswordOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {adminPassError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                {adminPassError}
              </div>
            )}
            {adminPassMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                {adminPassMessage}
              </div>
            )}

            <form onSubmit={handleUpdateAdminPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Admin Password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
