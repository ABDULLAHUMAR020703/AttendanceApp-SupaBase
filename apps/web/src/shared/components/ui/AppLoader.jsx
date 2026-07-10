export function AppLoader({ label = 'Loading workspace…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0F172A,#1E3A8A,#3B82F6)]" />
      <div className="absolute -left-40 -top-24 h-[28rem] w-[28rem] rounded-full bg-blue-400/20 blur-3xl animate-float-slow" />
      <div className="relative text-center px-6 animate-fade-in">
        <div className="mx-auto mb-5 h-12 w-12 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl grid place-items-center shadow-glass">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-300">Hadir.ai Admin</p>
      </div>
    </div>
  );
}
