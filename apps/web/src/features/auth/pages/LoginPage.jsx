import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LOGO_PATH = '/logo.jpeg';

function HadirMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="2" y="11" width="3.5" height="7" rx="1" />
      <rect x="8.25" y="6" width="3.5" height="12" rx="1" />
      <rect x="14.5" y="2" width="3.5" height="16" rx="1" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [logoSrc, setLogoSrc] = useState(LOGO_PATH);
  const [logoFailed, setLogoFailed] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await login(usernameOrEmail, password);
    if (!result.success) return;
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FBFC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-[#D0E8F8] to-[#A6D5FA] opacity-70 blur-[120px] animate-float-slow" />
        <div className="absolute right-1/5 top-1/3 h-[24rem] w-[24rem] rounded-full bg-[#A0EBCF] opacity-55 blur-[130px] animate-float-slower" />
        <div className="absolute bottom-10 left-1/2 h-[18rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#014871] opacity-[0.12] blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-6 sm:px-6">
        <header className="flex w-full items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-sm font-medium text-[#111827] shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-[#111827] transition hover:opacity-80">
            <HadirMark className="h-[18px] w-[18px]" />
            <span className="text-[15px] font-semibold tracking-tight">Hadir.ai</span>
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="w-full max-w-md animate-fade-up">
            {!logoFailed && (
              <div className="mb-5 flex justify-center animate-fade-in">
                <img
                  src={logoSrc}
                  alt="Hadir.ai Logo"
                  className="h-14 w-14 rounded-2xl border border-white/80 object-cover shadow-[0_12px_30px_rgba(1,72,113,0.12)]"
                  onError={() => {
                    setLogoFailed(true);
                    setLogoSrc('/logo.jpeg');
                  }}
                />
              </div>
            )}

            <form
              className="space-y-4 rounded-[1.35rem] border border-white/80 bg-white/75 p-6 shadow-[0_20px_50px_-10px_rgba(1,72,113,0.12)] backdrop-blur-xl md:p-7"
              onSubmit={onSubmit}
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                  Welcome back
                </h1>
                <p className="text-sm text-[#6B7280]">Sign in to your admin portal</p>
              </div>

              <input
                className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-3 text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#014871]/40 focus:ring-2 focus:ring-[#A0EBCF]/40"
                placeholder="Email or username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                autoComplete="username"
              />

              <div className="relative">
                <input
                  className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-3 pr-14 text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#014871]/40 focus:ring-2 focus:ring-[#A0EBCF]/40"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs text-[#6B7280] transition hover:bg-black/[0.04] hover:text-[#111827]"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-[#6B7280]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-black/20 text-[#014871] focus:ring-[#A0EBCF]/50"
                  />
                  Remember me
                </label>
                <a href="#" className="text-[#014871] transition hover:underline">
                  Forgot password?
                </a>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                className="w-full rounded-full bg-[#0D0F12] p-3 font-semibold text-white transition hover:bg-black active:scale-[0.99] disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-[#6B7280]">
              <Link to="/" className="font-medium text-[#014871] hover:underline">
                ← Back to Hadir.ai
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
