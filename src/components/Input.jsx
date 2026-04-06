const BASE = 'w-full border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent placeholder:text-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-shadow';

export default function Input({ as: Tag = 'input', className = '', children, ...rest }) {
  return (
    <Tag className={`${BASE} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
