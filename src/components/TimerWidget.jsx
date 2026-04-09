import { useState, useEffect } from 'react';
import SubjectBadge from './SubjectBadge';
import { formatTime } from '../lib/timeUtils';

export default function TimerWidget({ nextPaper, weekId, getTimerData, onComplete, onStartModal }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!nextPaper) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <p className="text-lg font-bold opacity-90">All done for the week!</p>
          <p className="text-sm opacity-60 mt-0.5">No papers remaining</p>
        </div>
        <div className="text-5xl opacity-20">✓</div>
      </div>
    );
  }

  const timerKey = `timer_${weekId}_${nextPaper._idx}`;
  const timerData = getTimerData(timerKey);
  // eslint-disable-next-line react-hooks/purity
  const elapsedSecs = timerData ? Math.floor((Date.now() - timerData.startedAt) / 1000) : 0;
  const expectedSecs = timerData ? timerData.expectedMins * 60 : 0;
  const isRunning = !!timerData;
  const isOverTime = isRunning && elapsedSecs > expectedSecs;
  const progressPct = isRunning && expectedSecs > 0
    ? Math.min(elapsedSecs / expectedSecs * 100, 100)
    : 0;

  return (
    <div className={`rounded-2xl p-6 text-white shadow-lg transition-all duration-500 ${
      isRunning
        ? isOverTime
          ? 'bg-gradient-to-br from-rose-500 to-red-600'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        : 'bg-gradient-to-br from-indigo-500 to-violet-600'
    }`}>
      {/* Paper info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
            {isRunning ? 'In Progress' : 'Up Next'}
          </p>
          <p className="text-xl font-extrabold leading-tight truncate">{nextPaper.displayName}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <SubjectBadge subject={nextPaper.subject} className="opacity-90" />
            <span className="text-xs opacity-60">{nextPaper.duration} min</span>
            {nextPaper.scheduledDay && (
              <span className="text-xs opacity-60">· {nextPaper.scheduledDay}</span>
            )}
          </div>
        </div>

        {/* Timer display */}
        {isRunning && (
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-4xl font-mono font-extrabold tabular-nums leading-none">
              {formatTime(elapsedSecs)}
            </p>
            <p className="text-xs opacity-60 mt-1">
              {isOverTime
                ? `${Math.floor((elapsedSecs - expectedSecs) / 60)}m over`
                : `${Math.floor((expectedSecs - elapsedSecs) / 60)}m left`}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar (only when running) */}
      {isRunning && (
        <div className="mb-4">
          <div className="h-1.5 bg-[var(--color-surface)]/20 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-[var(--color-surface)] rounded-full"
              style={{ width: `${progressPct}%`, transition: 'width 1000ms linear' }}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <button
            onClick={() => onStartModal(nextPaper)}
            className="flex-1 bg-[var(--color-surface)]/15 hover:bg-[var(--color-surface)]/25 backdrop-blur-sm border border-white/20 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
            </svg>
            Start Next Paper
          </button>
        ) : (
          <>
            <button
              onClick={() => onComplete(nextPaper, nextPaper._idx)}
              className="flex-1 bg-[var(--color-surface)] text-[var(--color-success-text)] font-bold py-3 rounded-xl text-sm transition-all hover:bg-[var(--color-surface)]/90 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              Mark Complete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
