import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useDismiss } from '../../../shared/lib/useDismiss';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS = ['AM', 'PM'];

const DATE_POPOVER = { width: 300, height: 368 };
const TIME_POPOVER = { width: 240, height: 232 };

const TRIGGER = {
  field:
    'mt-1.5 flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-[#D0ECF9] bg-[#F0F9FD] px-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-[#70C9EF] focus:border-[#00BCFF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[rgba(0,188,255,0.25)]',
  compact:
    'mt-1 flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-[#D0ECF9] bg-[#F0F9FD] px-2.5 pr-2.5 text-xs font-medium text-slate-800 transition-all duration-200 hover:border-[#70C9EF] focus:border-[#00BCFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(0,163,255,0.25)]',
  input:
    'flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-[#D0ECF9] bg-white px-3.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-[#70C9EF] focus:border-[#00BCFF] focus:outline-none focus:ring-4 focus:ring-[rgba(0,188,255,0.25)]',
  toolbar:
    'flex h-9 min-w-[11rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-[#00B0FF]/50 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20',
};

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
          data-lenis-prevent
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function DatePickerField({
  value,
  onChange,
  labelledBy,
  id,
  size = 'field',
  allowClear = true,
  'aria-label': ariaLabel,
}) {
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
  const triggerStyle = TRIGGER[size] || TRIGGER.field;

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
        id={id}
        type="button"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerStyle}
      >
        <Calendar className={`${size === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 text-[#00B0FF]`} aria-hidden />
        <span className={`min-w-0 flex-1 text-left ${size === 'compact' ? 'text-[11px] leading-none' : ''} ${display ? 'text-slate-800' : 'text-[#8898AA]'}`}>
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
        <div className="overflow-hidden rounded-2xl border border-[#DCEFF7] bg-white shadow-[0_18px_44px_-16px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between border-b border-[#E6F4FA] bg-[#F8FCFD] px-3 py-2.5">
            <p className="px-1 text-sm font-semibold tracking-tight text-slate-800">{formatMonthTitle(viewMonth)}</p>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-[#00B0FF] transition-colors hover:bg-[#E6F4FA]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-[#00B0FF] transition-colors hover:bg-[#E6F4FA]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="px-3 pb-3 pt-2">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8]">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 place-items-center gap-y-0.5">
            {cells.map((cell) => {
              const selected = cell.key === selectedKey;
              const isToday = cell.key === todayKey;
              if (!cell.inMonth) {
                return (
                  <span key={cell.key} className="flex h-9 w-9 items-center justify-center text-sm text-slate-300 pointer-events-none">
                    {cell.date.getDate()}
                  </span>
                );
              }
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => selectDay(cell.key)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-150 ${
                    selected
                      ? 'bg-[#00B0FF] font-semibold text-white shadow-[0_6px_14px_-4px_rgba(0,176,255,0.55)]'
                      : `text-slate-700 hover:bg-[#E6F4FA] hover:text-[#00B0FF] ${
                          isToday ? 'font-semibold text-[#00B0FF] ring-1 ring-[#00B0FF]/35' : ''
                        }`
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className={`mt-2 flex items-center border-t border-[#E6F4FA] px-1 pt-2.5 ${allowClear ? 'justify-between' : 'justify-end'}`}>
            {allowClear && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-sm font-semibold text-[#00B0FF] transition-colors hover:text-[#0090C4]"
            >
              Clear
            </button>
            )}
            <button
              type="button"
              onClick={() => {
                const next = toDateKey(new Date());
                setViewMonth(new Date());
                selectDay(next);
              }}
              className="text-sm font-semibold text-[#00B0FF] transition-colors hover:text-[#0090C4]"
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
    <div
      className="flex max-h-48 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-1.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-lenis-prevent
    >
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

export function TimePickerField({ value, onChange, labelledBy, size = 'field' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const rootRef = useDismiss(close, panelRef);
  const hasTime = Boolean(formatTimeDisplay(value));
  const parts = parseTimeParts(value);
  const display = formatTimeDisplay(value);
  const triggerStyle = TRIGGER[size] || TRIGGER.field;

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
        className={triggerStyle}
      >
        <Clock className={`${size === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 text-[#00B0FF]`} aria-hidden />
        <span className={`min-w-0 flex-1 text-left ${size === 'compact' ? 'text-[11px] leading-none' : ''} ${display ? 'text-slate-800' : 'text-[#8898AA]'}`}>
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
        <div className="rounded-2xl border border-[#DCEFF7] bg-white p-3 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.22)]">
          <div className="flex rounded-xl bg-[#F8FCFD]">
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
