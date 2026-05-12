import { useTimerContext } from '../contexts/TimerContext';
import { formatTime } from '../lib/timeUtils';

export default function TimerBubble() {
  const { session, pauseSession, resumeSession, setFullscreen } = useTimerContext();

  if (!session) return null;

  const elapsedSecs = Math.round(session.elapsedSeconds ?? 0);
  const expectedSecs = (session.expectedMins ?? 0) * 60;
  const isOvertime = expectedSecs > 0 && elapsedSecs > expectedSecs;
  const progressPct = expectedSecs > 0 ? Math.min((elapsedSecs / expectedSecs) * 100, 100) : 0;
  const minsLeft = Math.floor((expectedSecs - elapsedSecs) / 60);
  const minsOver = Math.floor((elapsedSecs - expectedSecs) / 60);

  return (
    <div
      className={`fixed bottom-4 left-4 z-[55] w-56 rounded-2xl text-white shadow-2xl p-4 transition-all duration-500 ${
        isOvertime
          ? 'bg-gradient-to-br from-rose-500 to-red-600'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5 truncate">
        {session.displayName}
      </p>

      <p className={`text-4xl font-mono font-extrabold tabular-nums leading-none ${isOvertime ? 'text-rose-100' : ''}`}>
        {formatTime(elapsedSecs)}
      </p>

      {!isOvertime && expectedSecs > 0 && (
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-1 bg-white rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <p className="text-xs opacity-60 mt-1">
        {isOvertime ? `${minsOver}m over` : `${minsLeft}m left`}
      </p>

      <div className="flex gap-2 mt-3">
        <button
          onClick={session.isRunning ? pauseSession : resumeSession}
          className="flex-1 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
        >
          {session.isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={() => setFullscreen(true)}
          className="flex-1 py-1.5 rounded-lg bg-white text-indigo-700 text-xs font-semibold hover:bg-white/90 transition-colors"
        >
          Complete
        </button>
      </div>
    </div>
  );
}
