export default function Card({ className = '', padding = 'p-5', children, ...rest }) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] ${padding} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
