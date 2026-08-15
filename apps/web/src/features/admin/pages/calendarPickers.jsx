import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useDismiss } from '../../../shared/lib/useDismiss';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS = ['AM', 'PM'];

const DATE_POPOVER = { width: 288, height: 352 };
const TIME_POPOVER = { width: 240, height: 232 };

const triggerClass =
  'mt-1.5 flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-[#F0F9FD] px-3 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 hover:border-[#70C8F4]/70 focus:border-[#00B0FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#70C8F4]/30';

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).split('T')[0];
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateDisplay(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function buildSundayMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function parseTimeParts(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(value || '').trim());
  if (!match) return { hour: 10, minute: 0, period: 'AM' };
  const hours = Number(match[1]);
  const minute = Number(match[2]);
  const period = hours >= 12 ? 'PM' : 'AM';
  let hour = hours % 12;
  if (hour === 0) hour = 12;
  return { hour, minute, period };
}

function toTime24(hour, minute, period) {
  let hours = Number(hour) % 12;
  if (period === 'PM') hours += 12;
  return `${pad(hours)}:${pad(minute)}`;
}

function formatTimeDisplay(value) {
  if (!/^([01]?\d|2[0-3]):([0-5]\d)/.test(String(value || '').trim())) return '';
  const { hour, minute, period } = parseTimeParts(value);
  return `${pad(hour)}:${pad(minute)} ${period}`;
}

function PickerPopover({ open, triggerRef, panelRef, width, height, label, children }) {
  const [placement, setPlacement] = useState(null);

  useEffect(() => {
    if (!open) {
      setPlacement(null);
      return undefined;
    }

    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 8;
      let top = rect.bottom + gap;
      let left = rect.left;
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - height - gap);
      }
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      if (left < 8) left = 8;
      setPlacement({ top, left });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, triggerRef, width, height]);

  return createPortal(
    <AnimatePresence>
      {open && placement ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ position: 'fixed', top: placement.top, left: placement.left, width, zIndex: 80, transformOrigin: 'top left' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function DatePickerField({ value, onChange, labelledBy }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseDate(value) || new Date());
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const rootRef = useDismiss(close, panelRef);
  const cells = useMemo(() => buildSundayMonthCells(viewMonth), [viewMonth]);
  const todayKey = toDateKey(new Date());
  const selectedKey = value || '';
  const display = formatDateDisplay(value);

  useEffect(() => {
    if (!open) return;
    setViewMonth(parseDate(value) || new Date());
  }, [open, value]);

  function selectDay(key) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={labelledBy}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#00B0FF]" aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-left ${display ? 'text-slate-800' : 'text-[#8898AA]'}`}>
          {display || 'Select date'}
        </span>
      </button>

      <PickerPopover
        open={open}
        triggerRef={triggerRef}
        panelRef={panelRef}
        width={DATE_POPOVER.width}
        height={DATE_POPOVER.height}
        label="Choose date"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#F0F9FD] px-4 py-3">
            <p className="text-sm font-bold text-slate-800">{formatMonthTitle(viewMonth)}</p>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#00B0FF] transition-colors hover:bg-white"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#00B0FF] transition-colors hover:bg-white"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="p-3">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-xs font-semibold tracking-wider text-[#8898AA]">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 place-items-center gap-y-1">
            {cells.map((cell) => {
              const selected = cell.key === selectedKey;
              const isToday = cell.key === todayKey;
              if (!cell.inMonth) {
                return (
                  <span key={cell.key} className="flex h-8 w-8 items-center justify-center text-sm text-slate-300 pointer-events-none">
                    {cell.date.getDate()}
                  </span>
                );
              }
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => selectDay(cell.key)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm transition-all ${
                    selected
                      ? 'bg-[#00B0FF] font-bold text-white shadow-md shadow-[#00B0FF]/30'
                      : `text-slate-700 hover:bg-[#F0F9FD] hover:text-[#00B0FF] ${isToday ? 'ring-1 ring-[#70C8F4]/80' : ''}`
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-xs font-medium text-[#8898AA] transition-colors hover:text-slate-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const next = toDateKey(new Date());
                setViewMonth(new Date());
                selectDay(next);
              }}
              className="text-xs font-semibold text-[#00B0FF] hover:underline"
            >
              Today
            </button>
          </div>
          </div>
        </div>
      </PickerPopover>
    </div>
  );
}

function TimeColumn({ items, active, onSelect, format = (item) => item }) {
  return (
    <div className="flex max-h-48 flex-1 flex-col gap-1 overflow-y-auto px-1.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const selected = item === active;
        return (
          <button
            key={item}
            type="button"
            data-active={selected ? 'true' : undefined}
            onClick={() => onSelect(item)}
            className={
              selected
                ? 'rounded-lg bg-[#00B0FF] px-3 py-1.5 text-center text-sm font-bold text-white shadow-sm shadow-[#00B0FF]/20'
                : 'cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm font-medium text-[#8898AA] transition-all hover:bg-[#F0F9FD] hover:text-slate-800'
            }
          >
            {format(item)}
          </button>
        );
      })}
    </div>
  );
}

export function TimePickerField({ value, onChange, labelledBy }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const rootRef = useDismiss(close, panelRef);
  const hasTime = Boolean(formatTimeDisplay(value));
  const parts = parseTimeParts(value);
  const display = formatTimeDisplay(value);

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelectorAll('[data-active="true"]').forEach((node) => {
        node.scrollIntoView({ block: 'center' });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function commit(next) {
    const merged = { ...parts, ...next };
    onChange(toTime24(merged.hour, merged.minute, merged.period));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={labelledBy}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <Clock className="h-4 w-4 shrink-0 text-[#00B0FF]" aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-left ${display ? 'text-slate-800' : 'text-[#8898AA]'}`}>
          {display || 'Select time'}
        </span>
      </button>

      <PickerPopover
        open={open}
        triggerRef={triggerRef}
        panelRef={panelRef}
        width={TIME_POPOVER.width}
        height={TIME_POPOVER.height}
        label="Choose time"
      >
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl">
          <div className="flex rounded-xl bg-[#F0F9FD]">
            <TimeColumn items={HOURS} active={hasTime ? parts.hour : null} onSelect={(hour) => commit({ hour })} format={pad} />
            <div className="w-px shrink-0 bg-[#E2E8F0]" aria-hidden />
            <TimeColumn items={MINUTES} active={hasTime ? parts.minute : null} onSelect={(minute) => commit({ minute })} format={pad} />
            <div className="w-px shrink-0 bg-[#E2E8F0]" aria-hidden />
            <TimeColumn items={PERIODS} active={hasTime ? parts.period : null} onSelect={(period) => commit({ period })} />
          </div>
        </div>
      </PickerPopover>
    </div>
  );
}
