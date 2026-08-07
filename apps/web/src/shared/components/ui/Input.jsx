import { cn } from '../../lib/cn';
import { Field, fieldId } from './Field';

const SIZES = {
  sm: 'ui-input-sm',
  md: '',
  lg: 'ui-input-lg',
};

/**
 * Labelled text field. `icon` renders a leading 16px glyph inside the control;
 * `trailing` slots an adornment (unit, toggle) on the right.
 */
export function Input({
  label,
  error,
  hint,
  icon,
  trailing,
  size = 'md',
  optional,
  className = '',
  id,
  required,
  ...props
}) {
  const inputId = fieldId(id, label);
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <Field id={inputId} label={label} required={required} optional={optional} error={error} hint={hint}>
      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center text-ink-faint"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'ui-input',
            SIZES[size],
            icon && 'ui-input-icon',
            trailing && 'pr-11',
            error && 'ui-input-invalid',
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-ink-muted">{trailing}</span>
        )}
      </div>
    </Field>
  );
}
