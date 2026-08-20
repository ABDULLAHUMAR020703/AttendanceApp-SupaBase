import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useDismiss } from '../../lib/useDismiss';
import { Field, fieldId } from './Field';
import { DROPDOWN_MOTION } from './Menu';

const SIZE_CLASS = {
  sm: 'h-8 px-3 py-1 text-xs',
  md: 'min-h-[2.25rem] px-3.5 py-1.5 text-sm',
  lg: 'h-11 px-4 text-sm',
};

function flattenOptions(children, group = null) {
  const items = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'optgroup') {
      const label = child.props.label;
      items.push({ kind: 'group', key: `group-${label}`, label });
      items.push(...flattenOptions(child.props.children, label));
      return;
    }
    if (child.type === 'option') {
      items.push({
        kind: 'option',
        key: `${group || 'opt'}-${String(child.props.value ?? '')}`,
        value: child.props.value ?? '',
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
  return items;
}

function optionLabel(item) {
  if (item == null) return '';
  const { label } = item;
  if (label == null || label === false) return '';
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  return String(item.value ?? '');
}

export function Select({
  label,
  error,
  hint,
  size = 'md',
  optional,
  className = '',
  id,
  children,
  required,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedByProp,
  ...props
}) {
  const fallbackId = useId();
  const selectId = fieldId(id, label) || fallbackId;
  const listId = `${selectId}-list`;
  const reduceMotion = useReducedMotion();
  const items = useMemo(() => flattenOptions(children), [children]);
  const options = useMemo(() => items.filter((item) => item.kind === 'option'), [items]);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value ?? '');
  const selectedValue = value !== undefined ? value : uncontrolled;
  const selected = options.find((item) => String(item.value) === String(selectedValue)) || null;
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useDismiss(
    useCallback(() => setOpen(false), []),
    listRef,
  );
  const [placement, setPlacement] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : ariaDescribedByProp;

  const enabledIndexes = useMemo(
    () => options.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0),
    [options],
  );

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxWidth = Math.min(360, window.innerWidth - 16);
    const minWidth = Math.min(maxWidth, Math.max(rect.width, 160));
    const estimated = Math.min(options.length * 36 + 16, 280);
    const gap = 6;
    let top = rect.bottom + gap;
    if (top + estimated > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimated - gap);
    }
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - minWidth - 8);
    }
    setPlacement({ top, left, minWidth, maxWidth });
  }, [options.length]);

  useEffect(() => {
    if (!open) {
      setPlacement(null);
      return undefined;
    }
    place();
    const selectedIndex = Math.max(
      0,
      options.findIndex((item) => String(item.value) === String(selectedValue)),
    );
    setActiveIndex(selectedIndex);
    const frame = requestAnimationFrame(() => listRef.current?.focus());
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, options, selectedValue]);

  useEffect(() => {
    if (open && placement) listRef.current?.focus();
  }, [open, placement]);

  const commit = (next) => {
    if (value === undefined) setUncontrolled(next);
    onChange?.({
      target: { value: next, name },
      currentTarget: { value: next, name },
    });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (delta) => {
    if (!enabledIndexes.length) return;
    const at = enabledIndexes.indexOf(activeIndex);
    const from = at < 0 ? (delta > 0 ? -1 : 0) : at;
    const next = enabledIndexes[(from + delta + enabledIndexes.length) % enabledIndexes.length];
    setActiveIndex(next);
  };

  const onTriggerKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (enabledIndexes.length) setActiveIndex(enabledIndexes[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      if (enabledIndexes.length) setActiveIndex(enabledIndexes[enabledIndexes.length - 1]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = options[activeIndex];
      if (item && !item.disabled) commit(item.value);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const display = optionLabel(selected) || 'Select…';
  const triggerWidth = /\bw-auto\b/.test(className) ? '' : 'w-full';

  return (
    <Field id={selectId} label={label} required={required} optional={optional} error={error} hint={hint}>
      <div ref={rootRef} className={cn('relative', triggerWidth)}>
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={describedBy}
          onClick={() => !disabled && setOpen((current) => !current)}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            'ui-select-trigger inline-flex items-center justify-between gap-2 rounded-xl font-medium text-slate-700',
            'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20',
            open && 'border-slate-300 bg-slate-50',
            error && 'ui-input-invalid',
            SIZE_CLASS[size] || SIZE_CLASS.md,
            triggerWidth,
            className?.replace(/\bui-select\b/g, '').replace(/\bui-input-sm\b/g, ''),
          )}
        >
          <span className={cn('min-w-0 truncate', !selected && 'text-slate-400')}>{display}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out',
              open && 'rotate-180 text-slate-500',
            )}
            aria-hidden
          />
        </button>
        <select
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          disabled={disabled}
          value={selectedValue == null ? '' : String(selectedValue)}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          {...props}
        >
          {children}
        </select>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && placement ? (
              <motion.div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-labelledby={selectId}
                tabIndex={-1}
                onKeyDown={onListKeyDown}
                initial={reduceMotion ? false : DROPDOWN_MOTION.initial}
                animate={DROPDOWN_MOTION.animate}
                exit={reduceMotion ? undefined : DROPDOWN_MOTION.exit}
                transition={DROPDOWN_MOTION.transition}
                style={{
                  position: 'fixed',
                  top: placement.top,
                  left: placement.left,
                  minWidth: placement.minWidth,
                  width: 'max-content',
                  maxWidth: placement.maxWidth,
                  transformOrigin: 'top center',
                  zIndex: 80,
                }}
                className="ui-menu max-h-72 w-max min-w-full overflow-y-auto overscroll-contain"
                data-lenis-prevent
              >
                {items.map((item) => {
                  if (item.kind === 'group') {
                    return (
                      <p key={item.key} className="ui-menu-label">
                        {item.label}
                      </p>
                    );
                  }
                  const index = options.indexOf(item);
                  const isSelected = String(item.value) === String(selectedValue);
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="option"
                      disabled={item.disabled}
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => !item.disabled && commit(item.value)}
                      className={cn(
                        'ui-menu-item justify-between whitespace-nowrap',
                        isActive && 'ui-menu-item-active',
                        isSelected && 'ui-menu-item-selected',
                      )}
                    >
                      <span className="whitespace-nowrap text-left">{item.label}</span>
                      {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-[#00A3FF]" aria-hidden />}
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </Field>
  );
}
