import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Password field with a show/hide toggle. The toggle uses the shared affix slot so
 * it matches every other in-field control and never changes the field's height.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  minLength,
  autoComplete = 'new-password',
  className = '',
  invalid = false,
  id,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const action = visible ? 'Hide password' : 'Show password';

  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        autoComplete={autoComplete}
        className={cn('ui-input pr-11', invalid && 'ui-input-invalid')}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="ui-field-affix"
        aria-label={action}
        aria-pressed={visible}
        title={action}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
