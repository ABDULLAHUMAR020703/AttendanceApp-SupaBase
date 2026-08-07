import { motion } from 'framer-motion';

export function HalftoneAura({ dark = false }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className={`absolute inset-0 ${dark ? 'bg-[#080D14]' : 'bg-[#F8FDFC]'}`} />
      {/* Soft teal-blue atmospheric wash */}
      {!dark && (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 20% 18%, rgba(91, 197, 209, 0.22), transparent 55%),
              radial-gradient(ellipse 60% 50% at 82% 72%, rgba(0, 131, 143, 0.14), transparent 50%),
              radial-gradient(ellipse 50% 40% at 55% 40%, rgba(230, 247, 249, 0.85), transparent 60%),
              linear-gradient(165deg, #F8FDFC 0%, #E8F6F8 45%, #F4FBFC 100%)
            `,
          }}
        />
      )}
      <div className={`absolute inset-0 opacity-[0.26] ${dark ? 'bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)]'} bg-[size:48px_48px]`} />
      <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(circle_at_18%_16%,rgba(0,151,167,0.20),transparent_32%),radial-gradient(circle_at_86%_78%,rgba(0,151,167,0.16),transparent_34%)]' : 'bg-[radial-gradient(circle_at_18%_14%,rgba(0,151,167,0.20),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(0,151,167,0.16),transparent_36%)]'}`} />
      <motion.div className="absolute -left-[18%] -top-[30%] h-[76%] w-[86%] rotate-[-9deg] opacity-70 bg-[radial-gradient(circle,rgba(0,151,167,0.46)_2px,transparent_2.5px)] bg-[size:15px_15px] [mask-image:linear-gradient(135deg,#000_0%,#000_38%,transparent_76%)]" animate={{ x: [0, 12, 0], y: [0, -8, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-[30%] right-[-18%] h-[80%] w-[90%] rotate-[-9deg] opacity-60 bg-[radial-gradient(circle,rgba(0,151,167,0.40)_2px,transparent_2.5px)] bg-[size:15px_15px] [mask-image:linear-gradient(315deg,#000_0%,#000_42%,transparent_78%)]" animate={{ x: [0, -14, 0], y: [0, 10, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
      {!dark && <div className="absolute left-1/2 top-[44%] h-[34rem] w-[58rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/75 blur-[72px]" />}
    </div>
  );
}