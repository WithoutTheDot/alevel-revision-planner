import { useState } from 'react';
import Modal from './Modal';
import SubjectBadge from './SubjectBadge';

export default function StartTimerModal({ paper, onStart, onClose }) {
  const [expectedMins, setExpectedMins] = useState(paper?.duration ?? 90);

  function handleSubmit(e) {
    e.preventDefault();
    const mins = Number(expectedMins);
    if (mins > 0) onStart(mins);
  }

  return (
    <Modal open onClose={onClose} title="Start Timer">
      {/* Paper info card */}
      <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2">
          <SubjectBadge subject={paper?.subject} />
        </div>
        <p className="text-base font-semibold text-[var(--color-text-primary)] leading-snug">{paper?.displayName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-60">
              <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v3.5l2.25 1.3a.75.75 0 1 1-.75 1.3L7.5 8.645V4a.75.75 0 0 1 .5-.75Z" clipRule="evenodd" />
            </svg>
            {paper?.duration} min
          </span>
          {paper?.scheduledDay && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-60">
                <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.75A2.25 2.25 0 0 1 15 5.25v7.5A2.25 2.25 0 0 1 12.75 15H3.25A2.25 2.25 0 0 1 1 12.75v-7.5A2.25 2.25 0 0 1 3.25 3H4V1.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.5h11v-.5a.75.75 0 0 0-.75-.75H3.25ZM2.5 7.25v5.5c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75v-5.5h-11Z" clipRule="evenodd" />
              </svg>
              {paper.scheduledDay}
              {paper.scheduledStart && ` · ${paper.scheduledStart}`}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Expected time (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={600}
            value={expectedMins}
            onChange={(e) => setExpectedMins(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
            Start
          </button>
        </div>
      </form>
    </Modal>
  );
}
