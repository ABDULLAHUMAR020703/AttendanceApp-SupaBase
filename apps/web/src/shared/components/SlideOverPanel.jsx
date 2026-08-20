import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { usePageScrollLock } from '../lib/usePageScrollLock';

const SIZE_CLASS = {
  md: 'max-w-md',
  lg: 'max-w-[680px]',
};

/**
 * Right-hand drawer for record detail and multi-field editing, where keeping the
 * list visible behind the panel matters. Use `Dialog` for short confirmations.
 */
export function SlideOverPanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerActions,
  size = 'md',
  bodyClassName = '',
}) {
  usePageScrollLock(open);

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} role="presentation">
      <div
        className={`absolute inset-0 bg-[#0B2530]/35 backdrop-blur-md transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden overflow-x-hidden border-l border-hairline bg-white shadow-overlay transition-transform duration-200 ease-premium',
          SIZE_CLASS[size] || SIZE_CLASS.md,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-modal="true"
        aria-hidden={!open}
        data-lenis-prevent
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
              {description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {headerActions}
              <button type="button" onClick={onClose} className="ui-icon-btn -mr-1.5 -mt-0.5" aria-label="Close panel">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        )}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain',
            bodyClassName || (title || footer ? 'px-5 py-5' : '')
          )}
        >
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-hairline bg-surface-subtle px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
