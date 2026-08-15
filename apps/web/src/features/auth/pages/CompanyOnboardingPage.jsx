import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, IS_API_GATEWAY_CONFIGURED } from '../../../core/config/api';
import { HalftoneAura } from '../../../shared/components/HalftoneAura';
import { Input } from '../../../shared/components/ui/Input';
import { PasswordInput } from '../../../shared/components/PasswordInput';
import { Field } from '../../../shared/components/ui/Field';
import { Button } from '../../../shared/components/ui/Button';
import { Alert } from '../../../shared/components/ui/Alert';

const LOGO_PATH = '/logo.jpeg';


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
    <div className="auth-page relative overflow-y-auto bg-page">
      <HalftoneAura />

      <div className="relative z-10 flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-ink">
            <img
              src={LOGO_PATH}
              alt="Hadir.ai logo"
              className="h-8 w-8 rounded-2xl object-cover shadow-hair"
            />
            <span className="text-subheading font-semibold tracking-[-0.02em]">Hadir.ai</span>
          </Link>

          {!logoFailed && (
            <div className="mb-5 flex justify-center">
              <img
                src={logoSrc}
                alt=""
                className="h-14 w-14 rounded-2xl border border-white object-cover shadow-raise"
                onError={() => {
                  setLogoFailed(true);
                  setLogoSrc('/logo.jpeg');
                }}
                aria-hidden
              />
            </div>
          )}

          {success ? (
            <div className="space-y-3 rounded-3xl border border-hairline bg-white p-8 shadow-pop">
              <h1 className="text-title font-semibold text-ink">Company ready</h1>
              <p className="text-label text-ink-muted">
                {success.company?.name} is set up. Sign in as{' '}
                <strong className="font-semibold text-ink">{success.user?.username}</strong> using the
                password you chose.
              </p>
              <Link to="/login" className="ui-btn-primary mt-2 inline-flex">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form
              className="space-y-5 rounded-3xl border border-hairline bg-white p-8 shadow-pop"
              onSubmit={onSubmit}
            >
              <div className="space-y-1">
                <h1 className="text-title font-semibold text-ink">Create company</h1>
                <p className="text-label text-ink-muted">
                  Register a new tenant with a Management department and super admin.
                </p>
              </div>

              {statusLoading && <p className="text-label text-ink-muted">Checking onboarding…</p>}
              {statusError && <Alert type="error">{statusError}</Alert>}
              {!statusLoading && !requiresKey && (
                <Alert type="info">
                  First company: no server key required. For additional companies, configure{' '}
                  <code className="font-semibold">COMPANY_ONBOARDING_SECRET</code> and enter it below.
                </Alert>
              )}
              {!statusLoading && requiresKey && (
                <Input
                  label="Onboarding key"
                  placeholder="Server secret from COMPANY_ONBOARDING_SECRET"
                  value={onboardingKey}
                  onChange={(e) => setOnboardingKey(e.target.value)}
                  autoComplete="off"
                />
              )}

              <Input
                label="Company name"
                required
                placeholder="Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <Input
                label="Super admin full name"
                required
                placeholder="Jane Doe"
                value={superAdminName}
                onChange={(e) => setSuperAdminName(e.target.value)}
              />

              <Input
                label="Username"
                required
                autoCapitalize="none"
                placeholder="jane.admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Input
                label="Email"
                required
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Field id="onboard-password" label="Password" hint="At least 8 characters.">
                <PasswordInput
                  id="onboard-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {formError && <Alert type="error">{formError}</Alert>}

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                disabled={statusLoading}
                className="w-full"
              >
                Create company &amp; super admin
              </Button>

              <p className="text-center text-label text-ink-muted">
                <Link
                  to="/login"
                  className="font-semibold text-accent-600 transition-colors duration-fast hover:text-accent-700 hover:underline"
                >
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
