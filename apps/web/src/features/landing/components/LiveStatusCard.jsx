import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

export const DEFAULT_EMPLOYEE_CARDS = [
  {
    id: 'emp-1',
    name: 'Muhammad Ali',
    date: 'Wed March 12, 2026',
    time: '09:28',
    status: 'Clocked in at',
  },
  {
    id: 'emp-2',
    name: 'Ayesha Khan',
    date: 'Wed March 12, 2026',
    time: '09:15',
    status: 'Clocked in at',
  },
  {
    id: 'emp-3',
    name: 'Hamza Tariq',
    date: 'Wed March 12, 2026',
    time: '08:50',
    status: 'Clocked in at',
  },
  {
    id: 'emp-4',
    name: 'Zainab Ahmed',
    date: 'Wed March 12, 2026',
    time: '09:05',
    status: 'Clocked in at',
  },
];

const springConfig = { stiffness: 280, damping: 26, mass: 0.9 };

function StackedEmployeeCard({ employee, index, total, scrollProgress }) {
  const reverseIndex = total - 1 - index;
  const collapsedY = -reverseIndex * 8;
  const expandedY = -reverseIndex * 28;
  const collapsedScale = 1 - reverseIndex * 0.02;
  const expandedScale = 1 - reverseIndex * 0.04;
  const collapsedOpacity = 1 - reverseIndex * 0.08;
  const expandedOpacity = Math.max(0.4, 1 - reverseIndex * 0.2);

  const rawY = useTransform(scrollProgress, [0.1, 0.6], [collapsedY, expandedY]);
  const rawScale = useTransform(scrollProgress, [0.1, 0.6], [collapsedScale, expandedScale]);
  const rawOpacity = useTransform(scrollProgress, [0.1, 0.6], [collapsedOpacity, expandedOpacity]);

  const y = useSpring(rawY, springConfig);
  const scale = useSpring(rawScale, springConfig);
  const opacity = useSpring(rawOpacity, springConfig);

  return (
    <motion.article
      style={{
        y,
        scale,
        opacity,
        zIndex: total - reverseIndex,
      }}
      className="absolute inset-x-0 bottom-8 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center">
        <span className="inline-flex items-center rounded-full border border-[#00BFFF]/20 bg-[#E0F6FC] px-3 py-0.5 text-[11px] font-medium text-[#00BFFF]">
          {employee.date}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-[#0F172A]">
        {employee.name}
      </h3>

      <div className="mt-6 flex items-center justify-between border-t border-[#DCEFF7] pt-3.5 text-[13px]">
        <span className="font-medium text-[#64748B]">{employee.status}</span>
        <span className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)] animate-pulse" />
          {employee.time}
        </span>
      </div>
    </motion.article>
  );
}

/**
 * Scroll-linked SaaS hero card deck.
 * @param {{ employees?: Array<{ id?: string, name: string, date?: string, time?: string, status?: string }>, className?: string }} props
 */
export function LiveStatusCard({ employees = DEFAULT_EMPLOYEE_CARDS, className = '' }) {
  const containerRef = useRef(null);
  const cards = employees.slice(0, 4).map((employee, index) => ({
    id: employee.id || `${employee.name}-${index}`,
    date: employee.date || 'Wed March 12, 2026',
    status: employee.status || 'Clocked in at',
    time: employee.time || '09:28',
    ...employee,
  }));

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto flex h-[360px] w-full max-w-[380px] items-end justify-center pb-8 ${className}`}
    >
      {cards.map((employee, index) => (
        <StackedEmployeeCard
          key={employee.id}
          employee={employee}
          index={index}
          total={cards.length}
          scrollProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}
