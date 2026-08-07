import { cn } from '../../lib/cn';
import { Field, fieldId } from './Field';

const SIZES = {
  sm: 'ui-input-sm',
  md: '',
  lg: 'ui-input-lg',
};

export function Select({
  label,
  error,
  hint,
  size = 'md',
  optional,
  className = '',
  id,
  children,
  required,
  ...props
}) {
  const selectId = fieldId(id, label);
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <Field id={selectId} label={label} required={required} optional={optional} error={error} hint={hint}>
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('ui-select', SIZES[size], error && 'ui-input-invalid', className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
