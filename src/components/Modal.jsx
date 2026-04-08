import { useEffect, useRef, useId } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(document.activeElement);
  const titleId = useId();

  // ESC to close
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap + restore focus on close
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    // Move focus into modal after paint
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector(FOCUSABLE);
      first?.focus();
    });

    function trapFocus(e) {
      if (!panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', trapFocus);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', trapFocus);
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] w-full ${maxWidth} mx-4 p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xl leading-none"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
