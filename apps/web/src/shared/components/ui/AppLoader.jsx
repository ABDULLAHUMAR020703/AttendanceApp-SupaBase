export function AppLoader({ label = 'Loading workspace…' }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D0F12]">
      <div className="absolute -left-40 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#014871]/30 blur-3xl animate-float-slow" />
      <div className="absolute -right-32 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#A0EBCF]/15 blur-3xl animate-float-slower" />
      <div className="relative animate-fade-in px-6 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-[#2A2E35] bg-[#1A1D21] shadow-glass backdrop-blur-xl">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#A0EBCF]/25 border-t-[#A0EBCF]" />
        </div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-400">Hadir.ai Admin</p>
      </div>
    </div>
  );
}
