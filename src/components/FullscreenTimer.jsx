import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimerContext } from '../contexts/TimerContext';
import { formatTime } from '../lib/timeUtils';
import { getPaperPB, getUserSettings, completePaper } from '../firebase/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import CompletionDetailsModal from './CompletionDetailsModal';
import XpCelebration from './XpCelebration';
import PbBadge from './PbBadge';
import SubjectBadge from './SubjectBadge';

const MinimiseIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
  </svg>
);

export default function FullscreenTimer() {
  const { currentUser } = useAuth();
  const {
    session, isFullscreen, setFullscreen,
    pauseSession, resumeSession, stopSession,
  } = useTimerContext();

  const [pb, setPb] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [error, setError] = useState('');
  const [reviewModeEnabled, setReviewModeEnabled] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserSettings(currentUser.uid)
      .then((s) => setReviewModeEnabled(s?.reviewModeEnabled ?? true))
      .catch(() => setReviewModeEnabled(true));
  }, [currentUser?.uid]);

  // Load PB when session's paper changes
  useEffect(() => {
    if (!currentUser?.uid || !session?.subject || !session?.paperPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPb(null);
      return;
    }
    getPaperPB(currentUser.uid, session.subject, session.paperPath)
      .then(setPb)
      .catch(() => setPb(null));
  }, [currentUser?.uid, session?.subject, session?.paperPath]);

  if (!session) return null;

  const elapsedSecs = Math.round(session.elapsedSeconds ?? 0);
  const expectedSecs = (session.expectedMins ?? 0) * 60;
  const isOvertime = expectedSecs > 0 && elapsedSecs > expectedSecs;
  const progressPct = expectedSecs > 0 ? Math.min((elapsedSecs / expectedSecs) * 100, 100) : 0;

  // ── Minimised pill ─────────────────────────────────────────────────────────
  if (!isFullscreen) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[55] flex items-center gap-2 bg-indigo-600 text-white rounded-full px-4 py-2 shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors"
        onClick={() => setFullscreen(true)}
        title={session.displayName}
      >
        <span className={`font-mono text-sm font-bold ${isOvertime ? 'text-rose-200' : ''}`}>
          {formatTime(elapsedSecs)}
        </span>
        <span className="text-xs max-w-[120px] truncate opacity-80">{session.displayName}</span>
      </div>
    );
  }

  // ── Completion handler (called from CompletionDetailsModal) ────────────────────
  async function handleComplete(paperIndex, updates) {
    setError('');
    try {
      const actualDurationSeconds = elapsedSecs;

      const statsSnapBefore = await getDoc(doc(db, 'userPublicStats', currentUser.uid));
      const prevLevel = statsSnapBefore.exists() ? (statsSnapBefore.data().level ?? 1) : 1;

      const completionResult = await completePaper(currentUser.uid, {
        source: session.source,
        subject: session.subject,
        displayName: session.displayName,
        paperPath: session.paperPath,
        weekId: session.weekId,
        paperIndex: session.paperIndex,
        marks: updates.marks ?? null,
        grade: updates.grade ?? null,
        comment: updates.comment ?? null,
        actualDurationSeconds,
        expectedTime: session.expectedMins,
        reviewTopics: updates.reviewTopics ?? [],
      });

      const { xpEarned, newBadges, isPB, breakdown } = completionResult;

      await stopSession();

      const statsSnapAfter = await getDoc(doc(db, 'userPublicStats', currentUser.uid));
      const newLevel = statsSnapAfter.exists() ? (statsSnapAfter.data().level ?? prevLevel) : prevLevel;

      setCompleting(false);
      setCelebration({ xpEarned, newBadges, prevLevel, newLevel, isPB, breakdown });
    } catch (e) {
      setError('Failed to save: ' + e.message);
    }
  }

  const gradientClass = isOvertime
    ? 'from-rose-500 to-red-600'
    : 'from-indigo-500 to-violet-600';

  // ── Fullscreen overlay ─────────────────────────────────────────────────────
  return (
    <>
      <div className={`fixed inset-0 z-[60] bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center text-white transition-all duration-500 overflow-y-auto py-8`}>
        {/* Minimise button */}
        <button
          onClick={() => setFullscreen(false)}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 transition-colors"
          aria-label="Minimise timer"
        >
          <MinimiseIcon />
        </button>

        {/* Subject badge */}
        {session.subject && (
          <div className="mb-3 opacity-90">
            <SubjectBadge subject={session.subject} />
          </div>
        )}

        {/* Paper name */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-center px-8 mb-2 leading-tight">
          {session.displayName}
        </h2>

        {/* Expected time */}
        {session.expectedMins && (
          <p className="text-sm opacity-60 mb-4">{session.expectedMins} min expected</p>
        )}

        {/* Elapsed time */}
        <div className={`text-7xl md:text-8xl font-mono font-extrabold tabular-nums my-4 transition-colors ${isOvertime ? 'text-rose-200' : 'text-white'}`}>
          {formatTime(elapsedSecs)}
        </div>

        {/* Overtime label */}
        {isOvertime && (
          <p className="text-rose-200 text-sm mb-2 font-semibold">
            {Math.floor((elapsedSecs - expectedSecs) / 60)}m {(elapsedSecs - expectedSecs) % 60}s over
          </p>
        )}

        {/* Progress bar */}
        {!isOvertime && expectedSecs > 0 && (
          <div className="w-64 h-1.5 bg-[var(--color-surface)]/20 rounded-full overflow-hidden mb-4">
            <div
              className="h-1.5 bg-[var(--color-surface)] rounded-full transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* PB badge */}
        {pb != null && (
          <div className="mb-5">
            <PbBadge seconds={pb} />
          </div>
        )}

        {/* Complete Paper */}
        <button
          onClick={() => setCompleting(true)}
          className="px-8 py-3 bg-[var(--color-surface)] text-indigo-700 rounded-xl font-bold text-sm hover:bg-[var(--color-surface)]/90 transition-all shadow-lg active:scale-95 mb-4"
        >
          Complete Paper
        </button>

        {/* Pause / Resume */}
        <div className="flex items-center gap-3 mb-4">
          {session.isRunning ? (
            <button
              onClick={pauseSession}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-surface)]/15 hover:bg-[var(--color-surface)]/25 border border-white/20 rounded-xl font-semibold text-sm transition-all"
            >
              <PauseIcon />
              Pause
            </button>
          ) : (
            <button
              onClick={resumeSession}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-surface)]/15 hover:bg-[var(--color-surface)]/25 border border-white/20 rounded-xl font-semibold text-sm transition-all"
            >
              <PlayIcon />
              Resume
            </button>
          )}
        </div>

        {/* Stop without completing */}
        <button
          onClick={stopSession}
          className="text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          Stop timer
        </button>

        {error && <p className="mt-3 text-xs text-rose-200 bg-[var(--color-surface)]/10 rounded px-3 py-1">{error}</p>}
      </div>

      {completing && (
        <CompletionDetailsModal
          mode="scheduled"
          paper={{
            subject: session.subject,
            displayName: session.displayName,
            duration: session.expectedMins,
            completed: false,
            marks: null,
            grade: null,
            comment: null,
            reviewTopics: [],
          }}
          actualDurationSeconds={elapsedSecs}
          showReviewTopics={reviewModeEnabled}
          onSubmit={(updates) => handleComplete(session.paperIndex, updates)}
          onClose={() => setCompleting(false)}
        />
      )}

      {celebration && (
        <XpCelebration
          {...celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </>
  );
}
