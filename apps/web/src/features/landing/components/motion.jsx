import { motion, useReducedMotion } from 'framer-motion';

/** Shared cubic-bezier deceleration used across scroll reveals */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

export const VIEWPORT = { once: true, amount: 0.2, margin: '-100px' };

const fadeTransition = (delay = 0) => ({
  duration: 0.6,
  delay,
  ease: EASE_OUT_EXPO,
});

/**
 * Scroll-triggered fade-up. Spec:
 * initial y:30 → 0, viewport once + margin -100px, ease [0.16,1,0.3,1]
 */
export function FadeIn({ children, className = '', delay = 0, y = 30 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={fadeTransition(delay)}
    >
      {children}
    </motion.div>
  );
}

/** Alias kept for existing imports */
export const FadeUp = FadeIn;

/**
 * Hero intro item — load sequence (not scroll), staggered fade + rise.
 */
export function HeroIntro({ children, className = '', delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Continuous levitation for the hero status card.
 * y: [0, -6, 0], 5s easeInOut infinite
 */
export function FloatingCard({ children, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Ambient brand glow pulse behind hero card.
 * opacity: [0.3, 0.6, 0.3], 4s loop
 */
export function PulsingGlow({ className = '', style }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className} style={{ ...style, opacity: 0.45 }} aria-hidden />;
  }

  return (
    <motion.div
      className={className}
      style={style}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    />
  );
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

/** Parent for staggered feature grids */
export function Stagger({ children, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/**
 * Dark feature card — hover lift + mint border glow.
 * whileHover={{ y: -4, scale: 1.01 }}
 */
export function DarkMotionCard({ children, className = '' }) {
  const reduce = useReducedMotion();
  const base =
    'rounded-[1.35rem] border border-[#2A2E35] bg-[#1A1D21] will-change-transform';

  if (reduce) {
    return <div className={`${base} ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      className={`${base} ${className}`}
      initial={false}
      whileHover={{
        y: -4,
        scale: 1.01,
        borderColor: 'rgba(160, 235, 207, 0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(160,235,207,0.12)',
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export const springSoft = { type: 'spring', stiffness: 400, damping: 30 };
