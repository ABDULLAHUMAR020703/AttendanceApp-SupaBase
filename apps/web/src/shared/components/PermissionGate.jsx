import { hasAnyPermission, hasPermission } from '../../features/admin/permissions';
import { useAuthStore } from '../../features/auth/store/authStore';
import { GlassCard } from './GlassCard';

export function AccessDenied({ className = '' }) {
  return (
    <GlassCard className={`max-w-md p-6 text-center ${className}`}>
      <h1 className="text-xl font-semibold text-ink">Access Denied</h1>
      <p className="mt-2 text-sm text-ink-muted">
        You do not have permission to view this section. Contact your administrator if you believe this is incorrect.
      </p>
    </GlassCard>
  );
}

export function usePermission(permission) {
  const user = useAuthStore((s) => s.user);
  if (!permission) return true;
  return hasPermission(user, permission);
}

export function useAnyPermission(permissions = []) {
  const user = useAuthStore((s) => s.user);
  if (!permissions?.length) return true;
  return hasAnyPermission(user, permissions);
}

export function PermissionGate({ permission, anyOf, fallback = null, children }) {
  const canAccess = anyOf?.length ? useAnyPermission(anyOf) : usePermission(permission);
  if (!canAccess) return fallback || <AccessDenied />;
  return children;
}
