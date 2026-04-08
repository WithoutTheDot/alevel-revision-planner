import { useSubjects } from '../contexts/SubjectsContext';

export default function SubjectBadge({ subject, className = '' }) {
  const { subjectMeta } = useSubjects();
  const meta = subjectMeta[subject] || { label: subject, light: 'bg-[var(--color-surface)]', text: 'text-[var(--color-text-secondary)]' };
  
  // Convert light background to dark mode equivalent if it's a tailwind color
  // e.g. bg-blue-100 -> dark:bg-blue-900/30 dark:text-blue-300
  let darkCls = '';
  if (meta.light.startsWith('bg-') && !meta.light.includes('[')) {
    const parts = meta.light.split('-');
    if (parts.length >= 2) {
      const colorBase = parts[1];
      darkCls = `dark:bg-${colorBase}-900/30 dark:text-${colorBase}-300`;
    }
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium ${meta.light} ${meta.text} ${darkCls} ${className}`}>
      {meta.label}
    </span>
  );
}
