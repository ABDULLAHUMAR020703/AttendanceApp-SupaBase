import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  outline: 'ui-btn-outline',
  ghost: 'ui-btn-ghost',
  danger: 'ui-btn-danger',
  dangerSoft: 'ui-btn-danger-soft',
  success: 'ui-btn-success',
};

const SIZES = {
  sm: 'ui-btn-sm',
  md: '',
  lg: 'ui-btn-lg',
};

/** The spinner sits on a filled surface for primary/danger/success, ink elsewhere. */
const SPINNER_TONE = {
  primary: 'border-white/35 border-t-white',
  danger: 'border-white/35 border-t-white',
  dangerSoft: 'border-white/35 border-t-white',
  success: 'border-white/35 border-t-white',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size],
        /*
         * Loading hides the label in place by making it transparent rather than
         * unmounting it, so the button keeps its exact width and the row it sits in
         * cannot reflow mid-request.
         */
        loading && 'ui-btn-loading text-transparent',
        className
      )}
      {...props}
    >
      {children}
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span
            className={cn(
              'h-4 w-4 animate-spin rounded-full border-2',
              SPINNER_TONE[variant] || 'border-accent-600/25 border-t-accent-600'
            )}
          />
        </span>
      )}
    </button>
  );
}

/** Square, label-less action for toolbars and card headers. */
export function IconButton({ label, size = 'md', className = '', children, type = 'button', ...props }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn('ui-icon-btn', size === 'sm' && 'ui-icon-btn-sm', className)}
      {...props}
    >
      {children}
    </button>
  );
}
