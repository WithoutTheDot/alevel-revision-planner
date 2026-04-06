import { useSubjects } from '../contexts/SubjectsContext';

export default function SubjectBadge({ subject, className = '' }) {
  const { subjectMeta } = useSubjects();
  const meta = subjectMeta[subject] || { label: subject, light: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium ${meta.light} ${meta.text} ${className}`}>
      {meta.label}
    </span>
  );
}
