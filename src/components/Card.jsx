export default function Card({ className = '', padding = 'p-5', children, ...rest }) {
  return (
    <div
      className={`bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] ${padding} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
