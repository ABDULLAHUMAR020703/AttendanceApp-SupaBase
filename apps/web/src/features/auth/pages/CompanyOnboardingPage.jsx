import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, IS_API_GATEWAY_CONFIGURED } from '../../../core/config/api';

const LOGO_PATH = '/logo.jpeg';

const fieldClass =
  'w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2.5 text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#014871]/40 focus:ring-2 focus:ring-[#A0EBCF]/40';

function HadirMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="2" y="11" width="3.5" height="7" rx="1" />
      <rect x="8.25" y="6" width="3.5" height="12" rx="1" />
      <rect x="14.5" y="2" width="3.5" height="16" rx="1" />
    </svg>
  );
}

export function CompanyOnboardingPage() {
  const [logoSrc, setLogoSrc] = useState(LOGO_PATH);
  const [logoFailed, setLogoFailed] = useState(false);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [requiresKey, setRequiresKey] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [superAdminName, setSuperAdminName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [onboardingKey, setOnboardingKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    if (!IS_API_GATEWAY_CONFIGURED) {
      setStatusError('API gateway URL is not configured (set VITE_API_GATEWAY_URL).');
      setStatusLoading(false);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/auth/onboarding-status'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not load onboarding status');
      }
      setBootstrapAvailable(Boolean(data.bootstrapAvailable));
      setRequiresKey(Boolean(data.requiresOnboardingKey));
    } catch (e) {
      setStatusError(e.message || 'Network error');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess(null);
    if (!IS_API_GATEWAY_CONFIGURED) {
      setFormError('API gateway URL is not configured.');
      return;
    }
    if (requiresKey && !onboardingKey.trim()) {
      setFormError('Onboarding key is required for additional companies.');
      return;
    }
    setSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (requiresKey && onboardingKey.trim()) {
        headers['X-Onboarding-Key'] = onboardingKey.trim();
      }
      const res = await fetch(apiUrl('/api/auth/onboard-company'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyName: companyName.trim(),
          superAdminName: superAdminName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }
      setSuccess(data);
      setPassword('');
    } catch (err) {
      setFormError(err.message || 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FBFC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-[#D0E8F8] to-[#A6D5FA] opacity-70 blur-[120px]" />
        <div className="absolute right-1/5 top-1/3 h-[24rem] w-[24rem] rounded-full bg-[#A0EBCF] opacity-55 blur-[130px]" />
        <div className="absolute bottom-10 left-1/2 h-[18rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#014871] opacity-[0.12] blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link
            to="/"
            className="mb-6 flex items-center justify-center gap-2 text-[#111827]"
          >
            <HadirMark className="h-[18px] w-[18px]" />
            <span className="text-[15px] font-semibold tracking-tight">Hadir.ai</span>
          </Link>

          {!logoFailed && (
            <div className="mb-5 flex justify-center">
              <img
                src={logoSrc}
                alt="Logo"
                className="h-14 w-14 rounded-2xl border border-white/80 object-cover shadow-[0_12px_30px_rgba(1,72,113,0.12)]"
                onError={() => {
                  setLogoFailed(true);
                  setLogoSrc('/logo.jpeg');
                }}
              />
            </div>
          )}

          {success ? (
            <div className="space-y-3 rounded-[1.35rem] border border-emerald-200/60 bg-white/80 p-6 shadow-[0_20px_50px_-10px_rgba(1,72,113,0.12)] backdrop-blur-xl">
              <h1 className="text-2xl font-semibold text-[#111827]">Company ready</h1>
              <p className="text-sm text-[#4B5563]">
                {success.company?.name} is set up. Sign in as <strong>{success.user?.username}</strong>{' '}
                using the password you chose.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex rounded-full bg-[#0D0F12] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form
              className="space-y-4 rounded-[1.35rem] border border-white/80 bg-white/75 p-6 shadow-[0_20px_50px_-10px_rgba(1,72,113,0.12)] backdrop-blur-xl md:p-7"
              onSubmit={onSubmit}
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Create company</h1>
                <p className="text-sm text-[#6B7280]">
                  Register a new tenant with a Management department and super admin.
                </p>
              </div>

              {statusLoading && <p className="text-sm text-[#6B7280]">Checking onboarding…</p>}
              {statusError && <p className="text-sm text-red-600">{statusError}</p>}
              {!statusLoading && !requiresKey && (
                <p className="rounded-lg border border-[#A0EBCF]/50 bg-[#F0FAF7] px-3 py-2 text-xs text-[#014871]">
                  First company: no server key required. For additional companies, configure{' '}
                  <code className="font-medium">COMPANY_ONBOARDING_SECRET</code> and enter it below.
                </p>
              )}
              {!statusLoading && requiresKey && (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#6B7280]">Onboarding key</span>
                  <input
                    className={fieldClass}
                    placeholder="Server secret from COMPANY_ONBOARDING_SECRET"
                    value={onboardingKey}
                    onChange={(e) => setOnboardingKey(e.target.value)}
                    autoComplete="off"
                  />
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#6B7280]">Company name</span>
                <input
                  required
                  className={fieldClass}
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#6B7280]">Super admin full name</span>
                <input
                  required
                  className={fieldClass}
                  placeholder="Jane Doe"
                  value={superAdminName}
                  onChange={(e) => setSuperAdminName(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#6B7280]">Username</span>
                <input
                  required
                  autoCapitalize="none"
                  className={fieldClass}
                  placeholder="jane.admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#6B7280]">Email</span>
                <input
                  required
                  type="email"
                  className={fieldClass}
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#6B7280]">Password (min 8 characters)</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  className={fieldClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitting || statusLoading}
                className="w-full rounded-full bg-[#0D0F12] p-3 font-semibold text-white transition hover:bg-black active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create company & super admin'}
              </button>

              <p className="text-center text-sm text-[#6B7280]">
                <Link to="/login" className="font-medium text-[#014871] hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
