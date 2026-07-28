import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from 'lucide-react';
import { springSoft } from './motion';

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `+ ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Vibrant-white glass status card — Apple-style materials, sharp SF Pro type.
 */
export function LiveStatusCard() {
  const checkInAt = useMemo(() => {
    const d = new Date();
    d.setHours(9, 28, 0, 0);
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const [now, setNow] = useState(() => Date.now());
  const [avatarKey, setAvatarKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setAvatarKey((k) => k + 1), 8000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedLabel = formatElapsed(now - checkInAt.getTime());

  return (
    <div className="landing-status-card relative overflow-hidden rounded-[1.85rem] p-5 sm:p-6">
      {/* Soft inner specular */}
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
        aria-hidden
      />

      <div className="flex justify-center">
        <span className="landing-text inline-flex items-center rounded-full border border-white/90 bg-white/55 px-3.5 py-1 text-[11px] font-medium tracking-[-0.01em] text-[#5C6570] shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur-md">
          Wed March 12, 2026
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="relative h-14 w-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={avatarKey}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
              style={{
                background: 'linear-gradient(145deg, #014871 0%, #3BAF96 55%, #A0EBCF 100%)',
                boxShadow:
                  '0 0 0 2px rgba(255,255,255,0.95), 0 10px 24px rgba(1,72,113,0.18), inset 0 1px 1px rgba(255,255,255,0.35)',
              }}
              initial={{ opacity: 0, scale: 0.86, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.06, rotate: 8 }}
              transition={springSoft}
            >
              <User className="h-7 w-7 text-white" strokeWidth={1.75} />
            </motion.div>
          </AnimatePresence>
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" />
        </div>

        <motion.p
          className="landing-display mt-4 text-[1.65rem] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[1.85rem]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          Hermann Hesse
        </motion.p>

        {/* Hairline brushed divider */}
        <div
          className="mt-4 h-px w-16"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(120,130,140,0.45) 20%, rgba(180,190,200,0.55) 50%, rgba(120,130,140,0.45) 80%, transparent)',
          }}
          aria-hidden
        />

        <p className="landing-text mt-4 text-[13px] text-[#6B7280]">Checked in at</p>

        <motion.p
          className="landing-display mt-1 text-[1.85rem] font-bold tracking-[-0.04em] text-[#014871] sm:text-[2.1rem]"
          key={elapsedLabel}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          aria-live="polite"
        >
          {elapsedLabel}
        </motion.p>

        <p className="landing-text mt-1 text-[12px] text-[#9AA3AE]">
          since <span className="font-medium text-[#6B7280]">09:28</span>
        </p>
      </div>
    </div>
  );
}
