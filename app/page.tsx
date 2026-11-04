'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Building2,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Sparkles,
  BookOpen,
  HelpCircle,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'employee' | 'industry'>('employee');

  // Form states
  const [employeeCode, setEmployeeCode] = useState('2511377');
  const [orgName, setOrgName] = useState('Aurobindo Manufacturing');
  const [password, setPassword] = useState('mukesh_siva');
  const [showPassword, setShowPassword] = useState(false);

  // Industry admin states
  const [adminOrgName, setAdminOrgName] = useState('Aurobindo Manufacturing');
  const [adminPassword, setAdminPassword] = useState('aurobindo47');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Handle Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const payload =
        activeTab === 'employee'
          ? { role: 'employee', employeeCode, orgName, password }
          : { role: 'industry', orgName: adminOrgName, password: adminPassword };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Authenticated successfully. Loading workspace...');
      router.push('/app/ask');
      router.refresh();
    } catch {
      setErrorMsg('A network or server error occurred. Please try again.');
      setLoading(false);
    }
  }

  // Handle Password Reset
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (forgotNewPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: activeTab,
          identifier: forgotIdentifier,
          email: forgotEmail,
          newPassword: forgotNewPassword,
          orgName: activeTab === 'employee' ? orgName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || 'Password reset request failed.');
        setForgotLoading(false);
        return;
      }

      setForgotMessage(data.message || 'If an account matches, the password has been reset.');
      setForgotLoading(false);
    } catch {
      setForgotError('An unexpected network error occurred.');
      setForgotLoading(false);
    }
  }

  function setDemoEmployee() {
    setActiveTab('employee');
    setEmployeeCode('2511377');
    setPassword('mukesh_siva');
    setOrgName('Aurobindo Manufacturing');
    setErrorMsg('');
  }

  function setDemoAdmin() {
    setActiveTab('industry');
    setAdminOrgName('Aurobindo Manufacturing');
    setAdminPassword('aurobindo47');
    setErrorMsg('');
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-800">
      {/* LEFT SPLIT: Branding & Value Proposition */}
      <div className="relative w-full lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle decorative glowing mesh */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-display font-black text-2xl text-slate-950">A</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none">
                Anubhav
              </h1>
              <p className="text-[12px] text-slate-400 font-medium tracking-wide">
                Institutional Knowledge Vault
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Vercel + Supabase Active
          </span>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-12 lg:my-0 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Built for Modern Smart Manufacturing</span>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Every expert&apos;s experience, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              saved forever.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            When a senior technician retires, decades of critical machine-specific instincts
            vanish. Anubhav captures shop-floor tricks, validates them with strict plant oversight,
            and empowers freshers with a zero-hallucination factory AI.
          </p>

          {/* Three Key Pillar Badges */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Shop-Floor Tricks</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Real machine nuances recorded by veterans.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Admin Approved</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Strict organization review and quality gating.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-rose-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Grounded AI</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Answers ONLY from approved shopfloor records.</p>
            </div>
          </div>
        </div>

        {/* Bottom Footer Quote */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Aurobindo Manufacturing Plant System</span>
          </p>
          <span className="font-mono text-slate-500">v1.0.0</span>
        </div>
      </div>

      {/* RIGHT SPLIT: Modern Tabbed Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Quick Fill Pills for Demo Reviewers */}
          <div className="mb-6 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Demo Quick-Fill Credentials:</span>
              <span className="text-[10px] text-emerald-600 font-normal">Click to test</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={setDemoEmployee}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Mukesh (Employee: 2511377)</span>
              </button>
              <button
                type="button"
                onClick={setDemoAdmin}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Aurobindo Admin</span>
              </button>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-8">
            {/* Split Screen Tabs: Employee vs Industry */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('employee');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'employee'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>Employee</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('industry');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'industry'
                    ? 'bg-white text-rose-800 shadow-sm border border-rose-100 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>Industry Admin</span>
              </button>
            </div>

            {/* Title & Prompt */}
            <div className="mb-6">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                {activeTab === 'employee' ? 'Welcome Back' : 'Plant Administration'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {activeTab === 'employee'
                  ? 'Sign in with your assigned factory User ID.'
                  : 'Manage employee authorizations and approve shopfloor knowledge.'}
              </p>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {activeTab === 'employee' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Employee User ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        placeholder="e.g. 2511377"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Aurobindo Manufacturing"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all bg-white"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Industry / Organization Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={adminOrgName}
                      onChange={(e) => setAdminOrgName(e.target.value)}
                      placeholder="e.g. Aurobindo Manufacturing"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Password field with show/hide toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotIdentifier(activeTab === 'employee' ? employeeCode : adminOrgName);
                      setForgotError('');
                      setForgotMessage('');
                    }}
                    className={`text-xs font-semibold transition-colors ${
                      activeTab === 'employee'
                        ? 'text-emerald-700 hover:text-emerald-800'
                        : 'text-rose-700 hover:text-rose-800'
                    }`}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={activeTab === 'employee' ? password : adminPassword}
                    onChange={(e) =>
                      activeTab === 'employee'
                        ? setPassword(e.target.value)
                        : setAdminPassword(e.target.value)
                    }
                    placeholder="Enter password"
                    required
                    className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all bg-white ${
                      activeTab === 'employee'
                        ? 'focus:ring-emerald-500/20 focus:border-emerald-600'
                        : 'focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-2xl text-white font-semibold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'
                } ${
                  activeTab === 'employee'
                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200'
                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-200'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {activeTab === 'employee' ? 'Operator Vault' : 'Admin Console'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Reset Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify account & update security credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="my-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {forgotError}
              </div>
            )}

            {forgotMessage && (
              <div className="my-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {forgotMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeTab === 'employee' ? 'Employee User ID' : 'Organization Name'}
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder={activeTab === 'employee' ? 'e.g. 2511377' : 'e.g. Aurobindo Manufacturing'}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Factory Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. mukesh@aurobindo-mfg.com"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Must match the email on your personnel record.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {forgotLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

