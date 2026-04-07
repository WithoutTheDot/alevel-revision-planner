import { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { getWeeklySchedule, updatePaper, deletePaper, getAllCompletedPapers, recordCompletion, getExamTimetable, getUserSettings, addReviewTopics, getReviewQueue, updateReviewQueueItem } from '../firebase/db';
import { selectPaper } from '../lib/generateSchedule';
import { downloadIcs, downloadPdf } from '../lib/exportCalendar';
import SubjectBadge from '../components/SubjectBadge';
import Modal from '../components/Modal';
import PaperCompleteModal from '../components/PaperCompleteModal';
import { getMondayStr, timeToOffset, offsetToTime, PX_PER_MIN, TOTAL_MINS } from '../lib/dateUtils';
import { CALENDAR_GRID_START_HOUR as START_HOUR, CALENDAR_GRID_END_HOUR as END_HOUR } from '../lib/constants';
import { useAsyncData } from '../hooks/useAsyncData';
import { useTimerContext } from '../contexts/TimerContext';
import StartTimerModal from '../components/StartTimerModal';
import PmtLinkButton from '../components/PmtLinkButton';
import { getPmtLinks } from '../lib/pmtLinks';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function isPastWeek(weekDate) {
  const monday = startOfWeek(weekDate, { weekStartsOn: 1 });
  return isBefore(monday, startOfDay(startOfWeek(new Date(), { weekStartsOn: 1 })));
}

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const { subjectMeta } = useSubjects();
  const [weekDate, setWeekDate] = useState(new Date());
  const [schedule, setSchedule] = useState(null);
  const [examEntries, setExamEntries] = useState([]);
  const [completing, setCompleting] = useState(null); // { paper, index }
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const todayDayIdx = DAYS.indexOf(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]);
  const [activeDayIdx, setActiveDayIdx] = useState(todayDayIdx >= 0 ? todayDayIdx : 0);

  // Drag state
  const { session, startSession, stopSession, getTimerData, getElapsed } = useTimerContext() ?? {};
  const [startingTimer, setStartingTimer] = useState(null); // { paper, index }

  const [selectedPaper, setSelectedPaper] = useState(null); // paper detail panel

  const [dragState, setDragState] = useState(null);
  // dragState: { paperIdx, originDay, newDay, newStartPx, paper }
  const [ghostPos, setGhostPos] = useState(null);
  const dragMovedRef = useRef(false);

  const weekId = getMondayStr(weekDate);

  const [reviewModeEnabled, setReviewModeEnabled] = useState(false);
  const [reviewSessions, setReviewSessions] = useState([]); // items from reviewQueue for this week
  const [reviewConfirm, setReviewConfirm] = useState(null); // { id, topic }

  const { loading, error, data: loadedData } = useAsyncData(
    () => Promise.all([
      getWeeklySchedule(currentUser.uid, weekId),
      getExamTimetable(currentUser.uid),
      getUserSettings(currentUser.uid),
      getReviewQueue(currentUser.uid),
    ]).then(([s, exams, settings, queue]) => ({ schedule: s, examEntries: exams, settings, queue })),
    [currentUser.uid, weekId]
  );

  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (loadedData) {
      setSchedule(loadedData.schedule);
      setExamEntries(loadedData.examEntries);
      setReviewModeEnabled(loadedData.settings?.reviewModeEnabled ?? true);
      setReviewSessions(
        (loadedData.queue ?? []).filter((item) => item.scheduledWeekId === weekId && item.status !== 'done')
      );
    }
  }, [loadedData, weekId]);

  const displayError = localError || error;

  async function handleComplete(paperIndex, updates) {
    try {
      const paper = schedule.papers[paperIndex];
      await updatePaper(currentUser.uid, weekId, paperIndex, updates);
      // If marking complete, record to completedPapers for history + repeat-avoidance
      if (updates.completed && !paper.completed) {
        const timerKey = `timer_${weekId}_${paperIndex}`;
        const timerData = getTimerData(timerKey);
        const actualDurationSeconds = timerData
          ? Math.round(updates.actualDurationSeconds ?? session?.elapsedSeconds ?? 0)
          : (updates.actualDurationSeconds ?? null);
        const timeTaken = timerData ? getElapsed(timerKey) : null;
        const expectedTime = timerData ? timerData.expectedMins : null;
        if (timerData) await stopSession();
        await recordCompletion(currentUser.uid, {
          paperPath: paper.paperPath,
          subject: paper.subject,
          displayName: paper.displayName,
          weekId,
          marks: updates.marks ?? null,
          grade: updates.grade ?? null,
          comment: updates.comment ?? null,
          timeTaken,
          expectedTime,
          actualDurationSeconds,
          durationMins: paper.duration,
          reviewTopics: updates.reviewTopics ?? [],
        });
        if (updates.reviewTopics?.length > 0) {
          await addReviewTopics(currentUser.uid, updates.reviewTopics, paper.subject).catch(() => {});
        }
      }
      setSchedule((s) => {
        const papers = [...s.papers];
        papers[paperIndex] = { ...papers[paperIndex], ...updates };
        return { ...s, papers };
      });
    } catch (e) {
      setLocalError('Failed to save: ' + e.message);
    } finally {
      setCompleting(null);
    }
  }

  // c. Export includes grades
  function exportText() {
    if (!schedule) return;
    const lines = schedule.papers.map((p, i) => {
      let line = `${i + 1}. [${p.subject}] ${p.displayName} (${p.duration}min)`;
      if (p.scheduledDay) line += ` — ${p.scheduledDay} ${p.scheduledStart}`;
      if (p.completed) {
        const parts = [];
        if (p.grade) parts.push(`Grade: ${p.grade}`);
        if (p.marks) parts.push(p.marks);
        if (parts.length > 0) line += ` [${parts.join(' | ')}]`;
      }
      return line;
    });
    const text = `Week of ${weekId}\n\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  }

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    }
    if (exportOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  // Drag handlers
  function handlePaperMouseDown(e, paper) {
    e.preventDefault();
    dragMovedRef.current = false;
    setDragState({ paperIdx: paper._idx, paper, newDay: paper.scheduledDay, newStartPx: timeToOffset(paper.scheduledStart) });
    setGhostPos({ day: paper.scheduledDay, top: timeToOffset(paper.scheduledStart), height: Math.max(paper.duration * PX_PER_MIN, 22) });
  }

  function handleGridMouseMove(e, day) {
    if (!dragState) return;
    dragMovedRef.current = true;
    const gridEl = e.currentTarget;
    const rect = gridEl.getBoundingClientRect();
    const rawPx = e.clientY - rect.top;
    const clampedPx = Math.max(0, Math.min(rawPx, TOTAL_MINS * PX_PER_MIN - 1));
    setDragState((prev) => ({ ...prev, newDay: day, newStartPx: clampedPx }));
    setGhostPos({ day, top: clampedPx, height: Math.max(dragState.paper.duration * PX_PER_MIN, 22) });
  }

  async function handleGridMouseUp(day) {
    if (!dragState) return;
    if (!dragMovedRef.current) {
      // Click without drag — detail panel opened via onClick on the paper block
      setDragState(null);
      setGhostPos(null);
      return;
    }
    const { paperIdx, paper, newStartPx } = dragState;
    const newStart = offsetToTime(newStartPx);
    const startMins = parseInt(newStart.split(':')[0]) * 60 + parseInt(newStart.split(':')[1]);
    const endMins = startMins + (paper.duration ?? 90);
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const newEnd = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    const updates = { scheduledDay: day, scheduledStart: newStart, scheduledEnd: newEnd };
    try {
      await updatePaper(currentUser.uid, weekId, paperIdx, updates);
      setSchedule((s) => {
        const papers = [...s.papers];
        papers[paperIdx] = { ...papers[paperIdx], ...updates };
        return { ...s, papers };
      });
    } catch (e) {
      setLocalError('Failed to reschedule: ' + e.message);
    }
    setDragState(null);
    setGhostPos(null);
  }

  function handleGlobalMouseUp() {
    if (dragState) {
      setDragState(null);
      setGhostPos(null);
    }
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  });

  async function handleDeletePaper(paperIdx) {
    if (!confirm('Remove this paper from the schedule?')) return;
    try {
      await deletePaper(currentUser.uid, weekId, paperIdx);
      setSchedule((s) => {
        const papers = s.papers.filter((_, i) => i !== paperIdx);
        return { ...s, papers };
      });
    } catch (e) {
      setLocalError('Failed to delete: ' + e.message);
    }
  }

  async function handleRerollPaper(paper) {
    try {
      const weekExcluded = new Set(
        (schedule?.papers || [])
          .filter((p) => p !== paper)
          .map((p) => p.paperPath)
      );
      const { papers: allCompleted } = await getAllCompletedPapers(currentUser.uid, { limit: 500 });
      const allTimePaths = allCompleted.map((p) => p.paperPath);
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      const recentPaths = allCompleted
        .filter((p) => p.completedAt && new Date(p.completedAt) > threeWeeksAgo)
        .map((p) => p.paperPath);

      const newPaper = selectPaper(paper.subject, weekExcluded, recentPaths, {}, [], allTimePaths);
      if (!newPaper) return setLocalError('No alternative paper found for this subject.');

      const updates = {
        paperPath: newPaper.paperPath,
        path: newPaper.path,
        displayName: newPaper.displayName,
        duration: newPaper.duration ?? paper.duration,
      };
      await updatePaper(currentUser.uid, weekId, paper._idx, updates);
      setSchedule((s) => {
        const papers = [...s.papers];
        papers[paper._idx] = { ...papers[paper._idx], ...updates };
        return { ...s, papers };
      });
    } catch (e) {
      setLocalError('Failed to re-roll: ' + e.message);
    }
  }

  const monday = startOfWeek(weekDate, { weekStartsOn: 1 });
  const isPast = isPastWeek(weekDate);

  // Build a map of date string → exam entries for this week
  const examsByDay = {};
  DAYS.forEach((d, i) => {
    const dateStr = format(addDays(monday, i), 'yyyy-MM-dd');
    examsByDay[d] = examEntries.filter((e) => e.date === dateStr);
  });

  // Carry index alongside each paper so unscheduled list doesn't need findIndex
  const papersWithIdx = (schedule?.papers || []).map((p, idx) => ({ ...p, _idx: idx }));

  const scheduledByDay = {};
  DAYS.forEach((d) => { scheduledByDay[d] = []; });
  papersWithIdx.forEach((p) => {
    if (p.scheduledDay && scheduledByDay[p.scheduledDay]) {
      scheduledByDay[p.scheduledDay].push(p);
    }
  });

  const unscheduled = papersWithIdx.filter((p) => !p.scheduledDay);

  // Tutorial: find the first paper block across all days
  const firstScheduledDay = DAYS.find((d) => scheduledByDay[d]?.length > 0);
  const firstPaperIdx = firstScheduledDay != null ? scheduledByDay[firstScheduledDay][0]?._idx : null;

  // a. Overdue: incomplete papers in a past week
  const overduePapers = isPast
    ? papersWithIdx.filter((p) => !p.completed)
    : [];

  const totalHeight = TOTAL_MINS * PX_PER_MIN;

  return (
    <div onMouseUp={handleGlobalMouseUp}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekDate((d) => subWeeks(d, 1))} className="px-2 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">‹</button>
          <span className="text-sm font-medium text-[var(--color-text-secondary)] min-w-[180px] text-center">
            {format(monday, 'd MMM')} – {format(addDays(monday, 6), 'd MMM yyyy')}
          </span>
          <button onClick={() => setWeekDate((d) => addWeeks(d, 1))} className="px-2 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">›</button>
          <button onClick={() => setWeekDate(new Date())} className="px-3 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors ml-2">Today</button>
          {schedule && (() => {
            const incomplete = papersWithIdx.filter((p) => !p.completed);
            if (!incomplete.length) return null;
            return (
              <button
                onClick={() => {
                  const pick = incomplete[Math.floor(Math.random() * incomplete.length)];
                  setStartingTimer({ paper: pick, index: pick._idx });
                }}
                className="px-3 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Random
              </button>
            );
          })()}
          {schedule && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="px-3 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-colors"
                aria-label="Export schedule"
              >
                Export ▾
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] z-20 py-1">
                  {[
                    { label: 'Copy to clipboard', action: () => { exportText(); setExportOpen(false); } },
                    { label: 'Export ICS', action: () => { downloadIcs(schedule, weekId); setExportOpen(false); } },
                    { label: 'Export PDF', action: () => { downloadPdf(schedule, weekId); setExportOpen(false); } },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {displayError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{displayError}</div>}

      {/* a. Overdue banner for past weeks */}
      {isPast && overduePapers.length > 0 && schedule && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-sm text-red-700">
          {overduePapers.length} incomplete paper{overduePapers.length > 1 ? 's' : ''} in this past week.
        </div>
      )}

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
      ) : !schedule ? (
        <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          <p className="mb-2">No schedule for this week.</p>
          <p className="text-sm">Go to <a href="/generate" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Generate</a> to create one.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-4 bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                <span>Progress</span>
                <span>{schedule.papers.filter((p) => p.completed).length} / {schedule.papers.length} papers</span>
              </div>
              <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-[var(--color-accent)] rounded-full transition-all"
                  style={{ width: `${schedule.papers.length ? (schedule.papers.filter((p) => p.completed).length / schedule.papers.length * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile day selector */}
          <div className="flex md:hidden gap-1 mb-3">
            {DAYS.map((day, di) => {
              const date = addDays(monday, di);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <button
                  key={day}
                  onClick={() => setActiveDayIdx(di)}
                  className={`flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border transition-colors ${
                    activeDayIdx === di
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : isToday
                      ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] border-[var(--color-accent-subtle)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)]'
                  }`}
                >
                  <div>{day.slice(0, 1)}</div>
                  <div className="font-bold">{format(date, 'd')}</div>
                </button>
              );
            })}
          </div>

          {/* d. Calendar grid with accessibility attrs */}
          <div
            data-tutorial-id="calendar-grid"
            role="grid"
            aria-label="Weekly study schedule"
            className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <div className="flex md:min-w-[900px]">
                {/* Time axis */}
                <div className="w-14 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] relative" style={{ height: totalHeight }}>
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute text-xs text-[var(--color-text-muted)] pr-2 text-right w-full"
                      style={{ top: i * 60 * PX_PER_MIN - 7 }}
                    >
                      {String(START_HOUR + i).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((day, di) => {
                  const date = addDays(monday, di);
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={day} className={`flex-1 border-r border-[var(--color-border)] last:border-r-0 ${di !== activeDayIdx ? 'hidden md:block' : ''}`}>
                      <div className={`px-2 py-2 text-center border-b border-[var(--color-border)] text-xs font-medium ${isToday ? 'bg-[var(--color-accent-subtle)]/40 text-[var(--color-accent-text)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                        <div>{day.slice(0, 3)}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>{format(date, 'd')}</div>
                        {examsByDay[day]?.map((e) => (
                          <div key={e.id} className="mt-1 bg-red-500 text-white rounded-[var(--radius-sm)] px-1 py-0.5 text-[10px] font-semibold leading-tight">
                            EXAM: {e.paperLabel}
                          </div>
                        ))}
                      </div>
                      <div
                        className="relative"
                        style={{ height: totalHeight }}
                        onMouseMove={(e) => handleGridMouseMove(e, day)}
                        onMouseUp={() => handleGridMouseUp(day)}
                      >
                        {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                          <div key={i} className="absolute w-full border-t border-[var(--color-border)]" style={{ top: (i + 1) * 60 * PX_PER_MIN }} />
                        ))}
                        {/* Ghost preview block while dragging */}
                        {ghostPos && ghostPos.day === day && (
                          <div
                            className="absolute left-1 right-1 rounded-[var(--radius-sm)] px-1 py-0.5 bg-[var(--color-accent)] opacity-30 pointer-events-none z-10"
                            style={{ top: ghostPos.top, height: ghostPos.height }}
                          />
                        )}
                        {scheduledByDay[day].map((p) => {
                          const top = timeToOffset(p.scheduledStart);
                          const height = Math.max(p.duration * PX_PER_MIN, 22);
                          const sm = subjectMeta[p.subject];
                          const colorClass = sm ? `${sm.color} text-white` : 'bg-gray-400 text-white';
                          const isOverdue = isPast && !p.completed;
                          const timerKey = `timer_${weekId}_${p._idx}`;
                          const timerData = getTimerData(timerKey);
                          const elapsedMins = timerData ? getElapsed(timerKey) : null;
                          const elapsedDisplay = elapsedMins != null
                            ? `${Math.floor(elapsedMins)}:${String(Math.floor((elapsedMins % 1) * 60)).padStart(2, '0')}`
                            : null;
                          return (
                            <div
                              key={p._idx}
                              {...(p._idx === firstPaperIdx ? { 'data-tutorial-id': 'calendar-first-paper' } : {})}
                              onMouseDown={(e) => !p.completed && handlePaperMouseDown(e, p)}
                              onClick={() => { if (p.completed || !dragMovedRef.current) setSelectedPaper(p); }}
                              className={`absolute left-1 right-1 rounded px-1.5 py-1 text-left text-xs leading-tight overflow-hidden select-none ${colorClass} ${p.completed ? 'opacity-50' : ''} ${!p.completed ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                              style={{ top, height }}
                              title={p.displayName}
                            >
                              <div className="font-semibold truncate leading-snug">{p.displayName}</div>
                              {height >= 32 && (
                                <div className="text-[10px] opacity-75 truncate">{sm?.label || p.subject}</div>
                              )}
                              {timerData && elapsedDisplay && (
                                <div className="text-[9px] font-mono bg-white/20 rounded px-1 mt-0.5 inline-block">{elapsedDisplay}</div>
                              )}
                              {p.completed && (
                                <div className="text-[9px] opacity-90 mt-0.5">✓{p.grade ? ` ${p.grade}` : ''}</div>
                              )}
                              {isOverdue && (
                                <div className="text-[9px] bg-red-600 text-white rounded px-0.5 mt-0.5 inline-block">!</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Review sessions this week */}
          {reviewSessions.length > 0 && (
            <div className="mt-4 bg-white rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] p-4">
              <h3 className="font-medium text-[var(--color-text-secondary)] mb-3 text-sm">Review sessions ({reviewSessions.length})</h3>
              <div className="space-y-1">
                {reviewSessions.map((item) => {
                  const sm = subjectMeta[item.subject];
                  const borderCls = sm?.color ? sm.color.replace('bg-', 'border-') : 'border-gray-400';
                  return (
                    <div key={item.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-[var(--radius-md)] border-2 border-dashed gap-3 ${borderCls}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <SubjectBadge subject={item.subject} />
                        <span className="text-sm text-[var(--color-text-primary)] truncate">{item.topic}</span>
                        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">30 min · review</span>
                      </div>
                      <button
                        onClick={() => setReviewConfirm({ id: item.id, topic: item.topic })}
                        className="shrink-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-[var(--radius-sm)] hover:bg-emerald-50 transition-colors">
                        Mark done
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unscheduled papers */}
          {unscheduled.length > 0 && (
            <div className="mt-4 bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
              <h3 className="font-medium text-[var(--color-text-secondary)] mb-3 text-sm">Unscheduled ({unscheduled.length})</h3>
              <div className="space-y-1">
                {unscheduled.map((p) => {
                  const isOverdue = isPast && !p.completed;
                  const timerKey = `timer_${weekId}_${p._idx}`;
                  const timerData = getTimerData(timerKey);
                  const elapsedMins = timerData ? getElapsed(timerKey) : null;
                  const elapsedDisplay = elapsedMins != null
                    ? `${Math.floor(elapsedMins)}:${String(Math.floor((elapsedMins % 1) * 60)).padStart(2, '0')}`
                    : null;
                  return (
                    <button
                      key={p._idx}
                      onClick={() => setSelectedPaper(p)}
                      className="w-full flex items-center justify-between py-2 px-3 hover:bg-[var(--color-surface)] rounded-[var(--radius-md)] text-left transition-colors border border-transparent hover:border-[var(--color-border)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SubjectBadge subject={p.subject} />
                        <span className="text-sm text-[var(--color-text-primary)] truncate">{p.displayName}</span>
                        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">{p.duration}min</span>
                        {isOverdue && (
                          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-[var(--radius-sm)] flex-shrink-0">Overdue</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {timerData && (
                          <span className="text-xs font-mono text-[var(--color-accent)]">{elapsedDisplay}</span>
                        )}
                        {p.completed && (
                          <span className="text-xs text-emerald-600 font-medium">✓{p.grade ? ` ${p.grade}` : ''}</span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {completing && (() => {
        const timerKey = `timer_${weekId}_${completing.index}`;
        const timerData = getTimerData(timerKey);
        const timerSecs = timerData ? Math.round(session?.elapsedSeconds ?? 0) : null;
        return (
          <PaperCompleteModal
            paper={completing.paper}
            index={completing.index}
            actualDurationSeconds={timerSecs}
            onSave={handleComplete}
            onClose={() => setCompleting(null)}
            reviewModeEnabled={reviewModeEnabled}
          />
        );
      })()}

      {reviewConfirm && (
        <Modal open onClose={() => setReviewConfirm(null)} title="Mark review done?">
          <p className="text-sm text-[var(--color-text-secondary)] mb-5">
            Mark <strong>{reviewConfirm.topic}</strong> as reviewed?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setReviewConfirm(null)}
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">
              Cancel
            </button>
            <button
              onClick={async () => {
                const { id } = reviewConfirm;
                setReviewConfirm(null);
                setReviewSessions((prev) => prev.filter((s) => s.id !== id));
                await updateReviewQueueItem(currentUser.uid, id, {
                  status: 'done',
                  completedAt: new Date().toISOString(),
                }).catch(() => {});
              }}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              Mark done
            </button>
          </div>
        </Modal>
      )}

      {startingTimer && (
        <StartTimerModal
          paper={startingTimer.paper}
          onStart={(expectedMins) => {
            startSession(
              { ...startingTimer.paper, weekId, paperIndex: startingTimer.index },
              expectedMins
            );
            setStartingTimer(null);
          }}
          onClose={() => setStartingTimer(null)}
        />
      )}

      {selectedPaper && (() => {
        const p = selectedPaper;
        const timerKey = `timer_${weekId}_${p._idx}`;
        const timerData = getTimerData(timerKey);
        const elapsedMins = timerData ? getElapsed(timerKey) : null;
        const elapsedDisplay = elapsedMins != null
          ? `${Math.floor(elapsedMins)}:${String(Math.floor((elapsedMins % 1) * 60)).padStart(2, '0')}`
          : null;
        const _sm = subjectMeta[p.subject];
        const isOverdue = isPast && !p.completed;

        function close() { setSelectedPaper(null); }

        return (
          <Modal open onClose={close} title={p.displayName}>
            {/* Subject badge + meta */}
            <div className="flex flex-wrap items-center gap-2 mb-5 -mt-2">
              <SubjectBadge subject={p.subject} />
              <span className="text-xs text-[var(--color-text-muted)]">{p.duration} min</span>
              {p.scheduledDay && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {p.scheduledDay}{p.scheduledStart ? ` · ${p.scheduledStart}` : ''}
                </span>
              )}
              {isOverdue && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-sm)]">Overdue</span>
              )}
            </div>

            {/* Timer / completion status */}
            {timerData && elapsedDisplay && (
              <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-[var(--color-accent-subtle)] rounded-[var(--radius-md)]">
                <span className="text-xs text-[var(--color-accent-text)] font-medium">Timer running</span>
                <span className="font-mono text-lg font-bold text-[var(--color-accent)]">{elapsedDisplay}</span>
              </div>
            )}
            {p.completed && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-[var(--radius-md)]">
                <span className="text-emerald-700 font-semibold text-sm">Completed</span>
                {p.grade && <span className="text-sm text-emerald-600 font-medium">{p.grade}</span>}
                {p.marks && <span className="text-xs text-[var(--color-text-muted)]">{p.marks}</span>}
              </div>
            )}

            {/* PMT links */}
            {(() => {
              const links = getPmtLinks(p.subject, p.paperPath);
              if (!links) return null;
              return (
                <div className="flex gap-2 mb-4">
                  {links.qp && <PmtLinkButton href={links.qp} label="QP" />}
                  {links.ms && <PmtLinkButton href={links.ms} label="MS" />}
                </div>
              );
            })()}

            {/* Actions */}
            <div className="space-y-2">
              {!p.completed && !timerData && (
                <button
                  onClick={() => { close(); setStartingTimer({ paper: p, index: p._idx }); }}
                  className="w-full px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Start Timer
                </button>
              )}
              {!p.completed && (
                <button
                  onClick={() => { close(); setCompleting({ paper: p, index: p._idx }); }}
                  className={`w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-colors ${timerData ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}`}
                >
                  Mark Complete
                </button>
              )}
              {p.completed && (
                <>
                  <button
                    onClick={() => { close(); setCompleting({ paper: p, index: p._idx }); }}
                    className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Edit result
                  </button>
                  <button
                    onClick={() => { handleComplete(p._idx, { completed: false, marks: null, grade: null }); close(); }}
                    className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Mark incomplete
                  </button>
                </>
              )}
              {!p.completed && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { handleRerollPaper(p); close(); }}
                    className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Re-roll
                  </button>
                  <button
                    onClick={() => { handleDeletePaper(p._idx); close(); }}
                    className="flex-1 px-3 py-2 bg-white border border-[var(--color-danger)]/30 rounded-[var(--radius-md)] text-sm text-[var(--color-danger)] hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
