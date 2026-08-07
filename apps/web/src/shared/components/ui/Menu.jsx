import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

/**
 * One dropdown system for the whole product: header menus, row overflow menus and
 * anything else that opens a short list of commands.
 *
 * Keyboard behaviour follows the menu pattern rather than tab order — arrows move a
 * real DOM focus between items, Escape closes and returns focus to the trigger, Tab
 * closes and lets focus continue past it. Focus is moved rather than tracked in
 * state so screen readers announce each item as it is reached.
 */
export function useMenuNavigation({ open, onClose, autoFocus = true }) {
  const containerRef = useRef(null);

  const itemsOf = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []),
    [],
  );

  useEffect(() => {
    if (!open || !autoFocus) return undefined;
    /* One frame so the panel is mounted and measurable before focus lands. */
    const frame = requestAnimationFrame(() => itemsOf()[0]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, autoFocus, itemsOf]);

  const onKeyDown = useCallback(
    (event) => {
      const items = itemsOf();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          items[current < 0 ? 0 : (current + 1) % items.length].focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          items[current <= 0 ? items.length - 1 : current - 1].focus();
          break;
        case 'Home':
          event.preventDefault();
          items[0].focus();
          break;
        case 'End':
          event.preventDefault();
          items[items.length - 1].focus();
          break;
        case 'Escape':
          event.preventDefault();
          onClose?.();
          break;
        case 'Tab':
          onClose?.();
          break;
        default:
          break;
      }
    },
    [itemsOf, onClose],
  );

  return { containerRef, onKeyDown };
}

export function MenuLabel({ children }) {
  return <p className="ui-menu-label">{children}</p>;
}

export function MenuSeparator() {
  return <div className="ui-menu-separator" role="separator" />;
}

/**
 * A single command. Icons are tinted cyan for neutral actions so the eye can scan
 * the glyph column, and inherit the danger ink when the action destroys something.
 */
export function MenuItem({ icon: Icon, tone, disabled, onSelect, children, className = '' }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn('ui-menu-item', tone === 'danger' && 'ui-menu-item-danger', className)}
    >
      {Icon && (
        <Icon
          className={cn('shrink-0', tone === 'danger' ? 'text-current' : 'text-accent-600')}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/** Panel shell. Use inside a `relative` popover root for trigger-anchored menus. */
export function MenuPanel({ label, header, footer, className = '', containerRef, onKeyDown, style, children }) {
  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={style}
      className={cn('ui-menu', className)}
    >
      {header}
      {children}
      {footer}
    </div>
  );
}

/**
 * Portalled, fixed-position menu for triggers inside a clipped container — a table
 * row's overflow menu would otherwise be cut off by the table shell.
 *
 * Coordinates are captured once on open, so any scroll or resize closes the menu
 * rather than leaving it floating away from its trigger.
 */
export function AnchoredMenu({ open, onClose, placement, width, label, containerRef, onKeyDown, children }) {
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  if (!open || !placement) return null;

  return createPortal(
    <MenuPanel
      label={label}
      containerRef={containerRef}
      onKeyDown={onKeyDown}
      className="fixed z-50"
      style={{ left: placement.left, top: placement.top, width }}
    >
      {children}
    </MenuPanel>,
    document.body,
  );
}
