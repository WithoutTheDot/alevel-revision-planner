import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, subWeeks } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { getWeeklySchedule, getTermCalendar, getExamTimetable, getUserClasses, getClassLeaderboard, dismissOverdueWeek, getUserSettings, getAllCompletedPapers, computeTopicFrequency, getTotalStudySecondsFromCompletedPapers, completePaper } from '../firebase/db';
import SubjectBadge from '../components/SubjectBadge';
import WeekTypeBadge from '../components/WeekTypeBadge';
import CompletionDetailsModal from '../components/CompletionDetailsModal';
import Toast from '../components/Toast';
import LevelCard from '../components/LevelCard';
import StatCard from '../components/StatCard';
import UpcomingPapers from '../components/UpcomingPapers';
import ExamCountdown from '../components/ExamCountdown';
import { getMondayStr } from '../lib/dateUtils';
import PmtLinkButton from '../components/PmtLinkButton';
import { getPmtLinks } from '../lib/pmtLinks';
import { TOAST_DURATION_MS } from '../lib/constants';
import { DashboardSkeleton } from '../components/Skeleton';
import { useTimerContext } from '../contexts/TimerContext';
import StartTimerModal from '../components/StartTimerModal';
import TimerWidget from '../components/TimerWidget';
import XpCelebration from '../components/XpCelebration';

function progressLabel(pct) {
  if (pct === 0) return "Just getting started";
  if (pct < 50) return "Good momentum";
  if (pct < 100) return "Almost there";
  return "Week complete";
}

const StatIcons = {
  Flame: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M13.5 4.938a7 7 0 1 1-7.84 11.02 5.5 5.5 0 0 0 4.91-3.49 3 3 0 0 1-2.1.547 5.5 5.5 0 0 0 4.05-6.07 3 3 0 0 1-2.09.457A5.5 5.5 0 0 0 13.5 4.938Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M10 2a.75.75 0 0 1 .75.75 5.5 5.5 0 0 1-3.62 5.154.75.75 0 0 1-.53-1.399 4 4 0 0 0 2.4-3.755A.75.75 0 0 1 10 2Z" clipRule="evenodd" />
    </svg>
  ),
  Document: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 9h3.75M6.75 19.5h6.5A2.25 2.25 0 0 0 15.5 17.25V6.108c0-.414-.136-.806-.382-1.118L12.765 2.64A1.5 1.5 0 0 0 11.613 2H6.75A2.25 2.25 0 0 0 4.5 4.25v13a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  Clock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="10" cy="10" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6v4l2.5 2.5" />
    </svg>
  ),
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { subjectMeta } = useSubjects();
  const navigate = useNavigate();
  const weekId = getMondayStr(new Date());
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [schedule, setSchedule] = useState(null);
  const [weekEntry, setWeekEntry] = useState(null);
  const [examEntries, setExamEntries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalStudyMins, setTotalStudyMins] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(null);
  const [startingTimer, setStartingTimer] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const timerCtx = useTimerContext();
  const { session, startSession, stopSession, getTimerData, getElapsed, startTimer } = timerCtx ?? {};
  const [classWidget, setClassWidget] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(true);
  // Overdue count from previous week
  const [overdueCount, setOverdueCount] = useState(0);
  const [prevWeekId, setPrevWeekId] = useState('');
  const [reviewModeEnabled, setReviewModeEnabled] = useState(true);
  const [topReviewTopic, setTopReviewTopic] = useState(null); // { topic, count, subject }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const prevMonday = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
      const prevWId = format(prevMonday, 'yyyy-MM-dd');
      const [s, cal, exams, statsSnap, prevSchedule, userSettings, totalStudySeconds] = await Promise.all([
        getWeeklySchedule(currentUser.uid, weekId),
        getTermCalendar(currentUser.uid),
        getExamTimetable(currentUser.uid),
        getDoc(doc(db, 'userPublicStats', currentUser.uid)),
        getWeeklySchedule(currentUser.uid, prevWId),
        getUserSettings(currentUser.uid),
        getTotalStudySecondsFromCompletedPapers(currentUser.uid),
      ]);
      const reviewEnabled = userSettings?.reviewModeEnabled ?? true;
      setReviewModeEnabled(reviewEnabled);
      if (reviewEnabled) {
        try {
          const { papers: completedPapers } = await getAllCompletedPapers(currentUser.uid, { limit: 100 });
          const freq = computeTopicFrequency(completedPapers);
          setTopReviewTopic(freq[0] ?? null);
        } catch (_) { /* best-effort */ }
      }
      setSchedule(s);
      setWeekEntry(cal[weekId] || null);
      setExamEntries(exams);
      if (statsSnap.exists()) {
        const sd = statsSnap.data();
        setStreak(sd.currentStreak ?? 0);
        setLongestStreak(sd.longestStreak ?? 0);
        setXp(sd.xp ?? 0);
        setLevel(sd.level ?? 1);
      }
      setTotalStudyMins(Math.round((totalStudySeconds ?? 0) / 60));
      // Overdue: incomplete papers from previous week
      setPrevWeekId(prevWId);
      if (prevSchedule && !prevSchedule.dismissedOverdue) {
        const cnt = (prevSchedule.papers || []).filter((p) => !p.completed).length;
        setOverdueCount(cnt);
      } else {
        setOverdueCount(0);
      }
    } catch (e) {
      setError('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid, weekId]);

  useEffect(() => { load(); }, [load]);

  // Keep schedule in sync with Firestore so Calendar reorders are reflected immediately
  useEffect(() => {
    if (!currentUser?.uid || !weekId) return;
    const ref = doc(db, 'users', currentUser.uid, 'weeklySchedules', weekId);
    const unsub = onSnapshot(ref, (snap) => {
      setSchedule(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [currentUser.uid, weekId]);

  useEffect(() => {
    async function loadWidget() {
      setWidgetLoading(true);
      try {
        const classes = await getUserClasses(currentUser.uid);
        if (classes.length === 0) { setClassWidget('none'); return; }
        const cls = classes[Math.floor(Math.random() * classes.length)];
        const { entries } = await getClassLeaderboard(cls.id);
        const userRank = entries.findIndex((e) => e.uid === currentUser.uid) + 1;
        setClassWidget({ class: cls, entries: entries.slice(0, 5), userRank });
      } catch {
        setClassWidget('none');
      } finally {
        setWidgetLoading(false);
      }
    }
    loadWidget();
  }, [currentUser.uid]);

  async function handleComplete(idx, updates) {
    try {
      const paper = schedule.papers[idx];
      if (updates.completed && !paper.completed) {
        const timerKey = `timer_${weekId}_${idx}`;
        const timerData = getTimerData(timerKey);
        // Use the value the user confirmed in the modal (which is pre-filled from the timer);
        // fall back to session elapsed seconds if they somehow bypassed the field
        const actualDurationSeconds = updates.actualDurationSeconds
          ?? (session?.elapsedSeconds != null ? Math.round(session.elapsedSeconds) : null);
        const timeTaken = timerData ? getElapsed(timerKey) : null;
        const expectedTime = timerData ? timerData.expectedMins : (paper.duration || 90);
        if (session) await stopSession();
        const prevLevel = level;

        const { xpEarned, newBadges, isPB, breakdown } = await completePaper(currentUser.uid, {
          source: 'scheduled',
          subject: paper.subject,
          displayName: paper.displayName,
          paperPath: paper.paperPath,
          weekId,
          paperIndex: idx,
          marks: updates.marks ?? null,
          grade: updates.grade ?? null,
          comment: updates.comment ?? null,
          actualDurationSeconds,
          expectedTime,
          timeTaken,
          reviewTopics: updates.reviewTopics ?? [],
        });

        // Keep the "Study hours" stat feeling live without relying on cached counters.
        // Only increment when we have an explicit duration to avoid fabricating time.
        if (actualDurationSeconds != null) {
          setTotalStudyMins((m) => (m ?? 0) + Math.round(actualDurationSeconds / 60));
        }
        // Re-fetch accurate stats
        const statsSnap = await getDoc(doc(db, 'userPublicStats', currentUser.uid));
        if (statsSnap.exists()) {
          const sd = statsSnap.data();
          setStreak(sd.currentStreak ?? 0);
          setLongestStreak(sd.longestStreak ?? 0);
          setXp(sd.xp ?? 0);
          setLevel(sd.level ?? 1);
          const newLevel = sd.level ?? 1;
          if (xpEarned > 0 || newBadges.length > 0 || isPB) {
            setCelebration({ xpEarned, newBadges, prevLevel, newLevel, isPB, breakdown });
          }
        }
      }
      setSchedule((s) => {
        const papers = [...s.papers];
        papers[idx] = { ...papers[idx], ...updates };
        return { ...s, papers };
      });
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setCompleting(null);
    }
  }

  async function handleDismissOverdue() {
    try {
      await dismissOverdueWeek(currentUser.uid, prevWeekId);
      setOverdueCount(0);
    } catch (e) {
      setError('Failed to dismiss: ' + e.message);
    }
  }

  async function handleLogPaper(paperData) {
    try {
      const { xpEarned, newBadges, capReached } = await completePaper(currentUser.uid, {
        ...paperData,
        source: 'adhoc',
        expectedTime: paperData.durationMins,
      });

      if (paperData?.actualDurationSeconds != null) {
        setTotalStudyMins((m) => (m ?? 0) + Math.round(paperData.actualDurationSeconds / 60));
      }

      if (capReached) {
        setToast('Paper logged — daily XP limit reached for ad-hoc papers.');
      } else if (newBadges?.length > 0) {
        setToast(`Badge unlocked: ${newBadges[0].label}  +${newBadges[0].xpReward} XP`);
      } else if (xpEarned > 0) {
        setToast(`+${xpEarned} XP earned`);
      } else {
        setToast('Paper logged.');
      }
      setTimeout(() => setToast(''), 4000);
      // Refresh stats
      const statsSnap = await getDoc(doc(db, 'userPublicStats', currentUser.uid));
      if (statsSnap.exists()) {
        const sd = statsSnap.data();
        setXp(sd.xp ?? 0);
        setLevel(sd.level ?? 1);
      }
    } catch (e) {
      setError('Failed to log paper: ' + e.message);
    }
    setShowLogModal(false);
  }

  const completed = schedule?.papers.filter((p) => p.completed).length || 0;
  const total = schedule?.papers.length || 0;
  const pct = total ? Math.round(completed / total * 100) : 0;
  const studyHrs = (totalStudyMins / 60).toFixed(1);

  // The active timer paper (if any), otherwise the first incomplete paper
  const papersWithIdx = (schedule?.papers || []).map((p, idx) => ({ ...p, _idx: idx }));
  const activeTimerPaper = papersWithIdx.find((p) => {
    const key = `timer_${weekId}_${p._idx}`;
    return getTimerData(key) !== null;
  });
  const nextIncompletePaper = activeTimerPaper ?? papersWithIdx.find((p) => !p.completed) ?? null;

  const upcoming = (schedule?.papers || [])
    .map((p, idx) => ({ ...p, _idx: idx }))
    .filter((p) => !p.completed && p.scheduledStart)
    .sort((a, b) => {
      const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const d = dayOrder.indexOf(a.scheduledDay) - dayOrder.indexOf(b.scheduledDay);
      return d !== 0 ? d : a.scheduledStart.localeCompare(b.scheduledStart);
    })
    .slice(0, 3);

  const bySubject = {};
  (schedule?.papers || []).forEach((p) => {
    if (!bySubject[p.subject]) bySubject[p.subject] = { total: 0, done: 0 };
    bySubject[p.subject].total++;
    if (p.completed) bySubject[p.subject].done++;
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingExams = examEntries.filter((e) => e.date >= todayStr).slice(0, 3);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Week of {format(monday, 'd MMM')} – {format(addDays(monday, 6), 'd MMM yyyy')}
            {weekEntry && <WeekTypeBadge weekType={weekEntry.weekType} className="ml-2" />}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Log Paper
          </button>
          <button
            onClick={() => navigate('/generate')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded-[var(--radius-md)] text-sm">{error}</div>}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className={`grid gap-3 ${reviewModeEnabled ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Streak</p>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)] leading-none">{streak || '—'}</p>
              {longestStreak > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Best: {longestStreak}</p>
              )}
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Papers done</p>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)] leading-none">{completed}/{total}</p>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Study hours</p>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)] leading-none">{studyHrs}h</p>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Level</p>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)] leading-none">{level}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{xp} XP</p>
            </div>
            {reviewModeEnabled && (
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Top review topic</p>
                {topReviewTopic ? (
                  <>
                    <p className="text-base font-semibold text-[var(--color-text-primary)] leading-tight truncate">{topReviewTopic.topic}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {topReviewTopic.subject ? (subjectMeta[topReviewTopic.subject]?.label ?? topReviewTopic.subject) + ' · ' : ''}
                      {topReviewTopic.count}×
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">No topics tagged yet</p>
                )}
              </div>
            )}
          </div>

          {/* Timer widget */}
          {schedule && (
            <TimerWidget
              nextPaper={nextIncompletePaper}
              weekId={weekId}
              getTimerData={getTimerData}
              getElapsed={getElapsed}
              startTimer={startTimer}
              onComplete={(paper, idx) => setCompleting({ paper, index: idx })}
              onStartModal={(paper) => setStartingTimer({ paper, index: paper._idx })}
            />
          )}

          {/* b. Overdue warning card */}
          {overdueCount > 0 && (
            <div className="bg-[var(--color-danger-bg)] border border-red-200 rounded-[var(--radius-lg)] p-4 flex items-center justify-between">
              <p className="text-sm text-[var(--color-danger-text)] font-medium">
                {overdueCount} incomplete paper{overdueCount > 1 ? 's' : ''} from last week
              </p>
              <div className="flex items-center gap-3">
                <Link to={`/calendar?week=${prevWeekId}`} className="text-sm font-semibold text-red-600 hover:text-red-800">
                  View →
                </Link>
                <button onClick={handleDismissOverdue} className="text-sm text-red-400 hover:text-red-600">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {!schedule ? (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 space-y-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">No schedule for this week yet — here&apos;s how to get started:</p>
              <ol className="text-sm text-[var(--color-text-secondary)] space-y-2 list-decimal list-inside">
                <li>Go to <Link to="/term-schedule" className="text-[var(--color-accent)] underline font-medium">Term Schedule</Link> and paint your weeks as Week A, Week B, or Holiday.</li>
                <li>Go to <Link to="/templates" className="text-[var(--color-accent)] underline font-medium">Templates</Link> and set up your study time blocks for Week A and Week B.</li>
                <li>Come back here and click <strong>Generate</strong>, or head straight to <Link to="/generate" className="text-[var(--color-accent)] underline font-medium">Generate</Link>.</li>
              </ol>
              <button
                onClick={() => navigate('/generate')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Generate Schedule
              </button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">This Week</h2>
                  <span className="text-lg font-semibold text-[var(--color-accent)]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-1.5 bg-[var(--color-accent)] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{progressLabel(pct)}</p>
              </div>

              {/* Exam countdown */}
              <ExamCountdown exams={upcomingExams} />

              <div className="grid md:grid-cols-2 gap-4">
                {/* Upcoming papers */}
                <UpcomingPapers
                  upcoming={upcoming}
                  onComplete={(p) => setCompleting({ paper: p, index: p._idx })}
                  onStart={(p) => setStartingTimer({ paper: p, index: p._idx })}
                />

                {/* Subject breakdown */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
                  <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">By Subject</h2>
                  <div className="space-y-3">
                    {Object.entries(bySubject).map(([subject, counts]) => (
                      <div key={subject}>
                        <div className="flex justify-between text-xs mb-1">
                          <SubjectBadge subject={subject} />
                          <span className="text-[var(--color-text-muted)]">{counts.done}/{counts.total}</span>
                        </div>
                        <div className="h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div
                            className="h-1 rounded-full bg-[var(--color-accent)] transition-all"
                            style={{ width: `${counts.total ? counts.done / counts.total * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Class leaderboard widget */}
              {widgetLoading ? null : classWidget === 'none' ? (
                <div className="bg-[var(--color-accent-subtle)] border border-[var(--color-accent-subtle)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between">
                  <p className="text-sm text-[var(--color-accent-text)]">Join a class to see how you compare.</p>
                  <Link to="/classes" className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Join or create →</Link>
                </div>
              ) : classWidget ? (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{classWidget.class.name}</h2>
                    <Link to={`/classes/${classWidget.class.id}`} className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium">View full →</Link>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="px-5 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">#</th>
                        <th className="px-5 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                        <th className="px-5 py-2 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Papers</th>
                        <th className="px-5 py-2 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Streak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classWidget.entries.map((e, i) => {
                        const isMe = e.uid === currentUser.uid;
                        return (
                          <tr key={e.uid} className={`border-b border-[var(--color-border)] last:border-0 ${isMe ? 'bg-[var(--color-accent-subtle)]/40' : ''}`}>
                            <td className="px-5 py-2.5 text-[var(--color-text-muted)]">{i + 1}</td>
                            <td className={`px-5 py-2.5 ${isMe ? 'font-medium text-[var(--color-accent-text)]' : 'text-[var(--color-text-primary)]'}`}>
                              {e.displayName}{isMe && <span className="ml-1 text-xs text-[var(--color-text-muted)]">← You</span>}
                            </td>
                            <td className="px-5 py-2.5 text-right text-[var(--color-text-secondary)]">{e.papersCompleted ?? 0}</td>
                            <td className="px-5 py-2.5 text-right text-[var(--color-text-secondary)]">
                              {e.currentStreak > 0 ? `${e.currentStreak}d` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {classWidget.userRank > 5 && (
                    <p className="px-5 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">Your rank: #{classWidget.userRank}</p>
                  )}
                </div>
              ) : null}

              {/* All papers list */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[var(--color-text-primary)]">All Papers</h2>
                  <Link to="/calendar" className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium">View calendar →</Link>
                </div>
                <div>
                  {schedule.papers.map((p, idx) => {
                    const timerKey = `timer_${weekId}_${idx}`;
                    const timerData = getTimerData(timerKey);
                    const elapsedMins = timerData ? getElapsed(timerKey) : null;
                    const elapsedDisplay = elapsedMins != null
                      ? `${Math.floor(elapsedMins)}:${String(Math.floor((elapsedMins % 1) * 60)).padStart(2, '0')}`
                      : null;
                    return (
                      <div key={`${p.subject}-${p.paperPath}-${idx}`} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <svg viewBox="0 0 16 16" className={`w-3.5 h-3.5 flex-shrink-0 ${p.completed ? 'text-emerald-500' : 'text-[var(--color-border-strong)]'}`} fill="currentColor">
                            {p.completed
                              ? <path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0Z"/>
                              : <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16Z" clipRule="evenodd"/>
                            }
                          </svg>
                          <SubjectBadge subject={p.subject} />
                          <span className={`text-sm truncate ${p.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{p.displayName}</span>
                          {p.grade && <span className="text-xs font-medium text-[var(--color-accent-text)] bg-[var(--color-accent-subtle)] px-1.5 py-0.5 rounded-[var(--radius-sm)] flex-shrink-0">{p.grade}</span>}
                          {timerData && <span className="text-xs font-mono text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-1.5 py-0.5 rounded-[var(--radius-sm)] flex-shrink-0">{elapsedDisplay}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {(() => {
                            const links = getPmtLinks(p.subject, p.paperPath);
                            if (!links) return null;
                            return (
                              <>
                                {links.qp && <PmtLinkButton href={links.qp} label="QP" />}
                                {links.ms && <PmtLinkButton href={links.ms} label="MS" />}
                              </>
                            );
                          })()}
                          {!p.completed && !timerData && (
                            <button onClick={() => setStartingTimer({ paper: { ...p, _idx: idx }, index: idx })}
                              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-medium">
                              Start
                            </button>
                          )}
                          {p.completed && (
                            <button onClick={() => handleComplete(idx, { completed: false, marks: null, grade: null })}
                              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] font-medium">
                              Undo
                            </button>
                          )}
                          <button onClick={() => setCompleting({ paper: { ...p, _idx: idx }, index: idx })}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-medium">
                            {p.completed ? 'Edit' : 'Complete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {completing && (() => {
        const timerKey = `timer_${weekId}_${completing.index}`;
        const timerData = getTimerData(timerKey);
        // Prefer the new TimerContext session elapsed time; fall back to legacy localStorage timer
        const timerSecs = session?.elapsedSeconds != null
          ? Math.round(session.elapsedSeconds)
          : (timerData ? Math.round(getElapsed(timerKey) * 60) : null);
        return (
          <CompletionDetailsModal
            mode="scheduled"
            paper={completing.paper}
            actualDurationSeconds={timerSecs}
            onSubmit={(updates) => handleComplete(completing.index, updates)}
            onClose={() => setCompleting(null)}
          />
        );
      })()}

      {startingTimer && (
        <StartTimerModal
          paper={startingTimer.paper}
          onStart={(expectedMins) => {
            const isAdhoc = startingTimer.paper.source === 'adhoc';
            startSession(
              {
                ...startingTimer.paper,
                weekId: isAdhoc ? null : weekId,
                paperIndex: isAdhoc ? null : startingTimer.index,
              },
              expectedMins
            );
            setStartingTimer(null);
          }}
          onClose={() => setStartingTimer(null)}
        />
      )}

      {showLogModal && (
        <CompletionDetailsModal
          mode="adhoc"
          paper={{ subject: Object.keys(subjectMeta)?.[0] ?? '', displayName: '', marks: null, grade: null, comment: null }}
          onSubmit={handleLogPaper}
          onClose={() => setShowLogModal(false)}
          submitLabel="Log Paper"
        />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast} onDismiss={() => setToast('')} />
        </div>
      )}

      {celebration && (
        <XpCelebration
          {...celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
