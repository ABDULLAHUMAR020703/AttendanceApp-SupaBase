export function SlideOverPanel({ open, onClose, title, children, footer }) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} role="presentation">
      <div
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/20 bg-slate-900/85 backdrop-blur-2xl shadow-glass-lg transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        aria-hidden={!open}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-input p-1.5 text-slate-400 hover:bg-white/10" aria-label="Close panel">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/10 px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
