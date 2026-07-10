import { useEffect } from 'react';
import { Button } from './Button';

export function Dialog({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} rounded-card border border-white/20 bg-slate-900/90 backdrop-blur-2xl shadow-glass-lg animate-fade-up`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 id="dialog-title" className="text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-input p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close dialog">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
