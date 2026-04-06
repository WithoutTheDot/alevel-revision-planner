export default function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between mb-6 ${className}`}>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
