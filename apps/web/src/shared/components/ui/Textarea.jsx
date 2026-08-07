import { cn } from '../../lib/cn';
import { Field, fieldId } from './Field';

export function Textarea({
  label,
  error,
  hint,
  optional,
  className = '',
  id,
  rows = 4,
  required,
  ...props
}) {
  const textareaId = fieldId(id, label);
  const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined;

  return (
    <Field id={textareaId} label={label} required={required} optional={optional} error={error} hint={hint}>
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('ui-textarea', error && 'ui-input-invalid', className)}
        {...props}
      />
    </Field>
  );
}
