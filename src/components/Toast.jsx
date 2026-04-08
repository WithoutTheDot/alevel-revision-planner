import { useEffect } from 'react';

const BellIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
    <path d="M4.214 3.227a.75.75 0 0 0-1.156-.956 8.97 8.97 0 0 0-1.856 3.826.75.75 0 0 0 1.466.316 7.47 7.47 0 0 1 1.546-3.186ZM16.942 2.271a.75.75 0 0 0-1.157.956 7.47 7.47 0 0 1 1.547 3.186.75.75 0 0 0 1.466-.316 8.97 8.97 0 0 0-1.856-3.826ZM10 2a6 6 0 0 0-6 6v1.076a2 2 0 0 1-.243.957L2.5 12h15l-1.257-1.967A2 2 0 0 1 16 9.076V8a6 6 0 0 0-6-6ZM8.5 17.5a1.5 1.5 0 0 0 3 0H8.5Z" />
  </svg>
);

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg rounded-2xl min-w-64 max-w-sm">
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
        <BellIcon />
      </div>
      <p className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{message}</p>
      <button
        onClick={onDismiss}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-lg leading-none ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
