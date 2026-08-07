import { AlertCircle } from 'lucide-react';

/**
 * Label / control / message frame shared by every form control, so a text field, a
 * select and a textarea are indistinguishable in spacing and in how they report a
 * problem. The error replaces the hint rather than stacking under it — two lines of
 * guidance under one field is how forms start to feel heavy.
 */
export function Field({ id, label, required, optional, error, hint, children }) {
  return (
    <div>
      {label && (
        <label className="ui-label" htmlFor={id}>
          {label}
          {required && (
            <>
              <span className="text-danger-solid" aria-hidden>
                *
              </span>
              <span className="sr-only">(required)</span>
            </>
          )}
          {optional && !required && <span className="ui-label-optional">Optional</span>}
        </label>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="ui-error" role="alert">
          <AlertCircle aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="ui-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Stable id for label/control/message wiring when the caller doesn't pass one. */
export function fieldId(id, label) {
  if (id) return id;
  if (typeof label === 'string') return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return undefined;
}
