import { X } from 'lucide-react';

/**
 * Right-hand drawer for record detail and multi-field editing, where keeping the
 * list visible behind the panel matters. Use `Dialog` for short confirmations.
 */
export function SlideOverPanel({ open, onClose, title, description, children, footer }) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} role="presentation">
      <div
        className={`absolute inset-0 bg-[#0B2530]/35 backdrop-blur-md transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-hairline bg-white shadow-overlay transition-transform duration-200 ease-premium ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        aria-hidden={!open}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
              {description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="ui-icon-btn -mr-1.5 -mt-0.5" aria-label="Close panel">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-hairline bg-surface-subtle px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
