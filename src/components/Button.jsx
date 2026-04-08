const SIZE = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const VARIANT = {
  primary: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white',
  secondary: 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]',
  ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]',
  danger: 'text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-bg)]',
};

export default function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
