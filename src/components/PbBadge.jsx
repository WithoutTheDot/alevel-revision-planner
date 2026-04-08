import { formatTime } from '../lib/timeUtils';

const StarIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default function PbBadge({ seconds }) {
  if (!seconds && seconds !== 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-full px-2 py-0.5">
      <StarIcon />
      {seconds === 0 ? 'No PB yet' : `PB: ${formatTime(seconds)}`}
    </span>
  );
}
