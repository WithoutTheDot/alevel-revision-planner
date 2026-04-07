import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { getAllCompletedPapers, updateCompletion, deleteCompletedPaper, pbKey, getReviewQueue, updateReviewQueueItem, deleteReviewQueueItem, getUserSettings, computeTopicFrequency } from '../firebase/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format, parseISO, startOfWeek } from 'date-fns';
import { secsToInput, inputToSecs } from '../lib/timeUtils';
import HistoryCharts from '../components/HistoryCharts';
import HistoryFilters from '../components/HistoryFilters';
import HistoryTable from '../components/HistoryTable';

const ALL_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];

const PAGE_SIZE = 50;

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const { subjects, subjectMeta } = useSubjects();
  const [papers, setPapers] = useState([]);
  const [, setTotalFetched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('table'); // 'table' | 'charts' | 'review'
  const [personalBests, setPersonalBests] = useState({});
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewModeEnabled, setReviewModeEnabled] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(null); // item id
  const [weekPickerValue, setWeekPickerValue] = useState('');
  const [reviewActionError, setReviewActionError] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editMarks, setEditMarks] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editActualDuration, setEditActualDuration] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [result, queue, settings] = await Promise.all([
        getAllCompletedPapers(currentUser.uid, { limit: PAGE_SIZE }),
        getReviewQueue(currentUser.uid),
        getUserSettings(currentUser.uid),
      ]);
      setPapers(result.papers);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      setTotalFetched(result.papers.length + (result.hasMore ? 1 : 0));
      setReviewQueue(queue);
      setReviewModeEnabled(settings?.reviewModeEnabled ?? false);
      // Load personal bests map
      try {
        const statsSnap = await getDoc(doc(db, 'userPublicStats', currentUser.uid));
        if (statsSnap.exists()) {
          setPersonalBests(statsSnap.data().personalBests ?? {});
        }
      } catch (_) {}
    } catch (e) {
      setLoadError('Failed to load history: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getAllCompletedPapers(currentUser.uid, { limit: PAGE_SIZE, startAfter: lastDoc });
      setPapers((prev) => [...prev, ...result.papers]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      setLoadError('Failed to load more: ' + e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  // b. Case-insensitive search
  const filtered = papers.filter((p) => {
    if (filterSubject !== 'all' && p.subject !== filterSubject) return false;
    if (filterGrade !== 'all' && p.grade !== filterGrade) return false;
    if (search && !p.displayName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grades = [...new Set(papers.map((p) => p.grade).filter(Boolean))];

  // Stats
  const total = papers.length;
  const gradeMap = {};
  papers.forEach((p) => { if (p.grade) gradeMap[p.grade] = (gradeMap[p.grade] || 0) + 1; });
  const subjectMap = {};
  papers.forEach((p) => { subjectMap[p.subject] = (subjectMap[p.subject] || 0) + 1; });

  // d. Chart data — force all grades in domain
  const gradeChartData = ALL_GRADES.map((g) => ({ grade: g, count: gradeMap[g] || 0 }));

  const subjectChartData = Object.entries(subjectMap).map(([s, count]) => ({
    name: subjectMeta[s]?.label || s,
    count,
  }));

  // Papers per week (line chart) — last 12 weeks
  const weekMap = {};
  papers.forEach((p) => {
    if (!p.completedAt) return;
    const mon = format(startOfWeek(new Date(p.completedAt), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    weekMap[mon] = (weekMap[mon] || 0) + 1;
  });
  const weekChartData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, count]) => ({ week: format(parseISO(week), 'd MMM'), count }));

  // Study hours per week — only for papers with actualDurationSeconds
  const hoursWeekMap = {};
  papers.forEach((p) => {
    if (!p.completedAt || p.actualDurationSeconds == null) return;
    const mon = format(startOfWeek(new Date(p.completedAt), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    hoursWeekMap[mon] = (hoursWeekMap[mon] || 0) + p.actualDurationSeconds / 3600;
  });
  const studyHoursPerWeekData = Object.entries(hoursWeekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, hours]) => ({ week: format(parseISO(week), 'd MMM'), hours: Math.round(hours * 100) / 100 }));

  // Build pbSet: set of paper doc IDs that are the current PB for their paperKey
  const pbSet = new Set();
  if (Object.keys(personalBests).length > 0) {
    // Group papers by their pb key, find min actualDurationSeconds per key
    const bestPerKey = {};
    papers.forEach((p) => {
      if (!p.actualDurationSeconds || !p.subject || !p.paperPath) return;
      const key = pbKey(p.subject, p.paperPath);
      const storedPB = personalBests[key];
      if (storedPB != null && p.actualDurationSeconds === storedPB) {
        if (!bestPerKey[key] || p.actualDurationSeconds < bestPerKey[key].secs) {
          bestPerKey[key] = { id: p.id, secs: p.actualDurationSeconds };
        }
      }
    });
    Object.values(bestPerKey).forEach(({ id }) => pbSet.add(id));
  }

  // Topic frequency (review mode stats)
  const topicFrequency = computeTopicFrequency(papers, filterSubject !== 'all' ? filterSubject : undefined);
  const topicChartData = topicFrequency.slice(0, 10).map((t) => ({
    topic: t.topic,
    count: t.count,
    subject: t.subject,
  }));

  // Review queue sections
  const queuePending = reviewQueue.filter((i) => i.status === 'pending');
  const queueScheduled = reviewQueue.filter((i) => i.status === 'scheduled');
  const queueDone = reviewQueue.filter((i) => i.status === 'done');

  async function handleQueueForWeek(item) {
    // Snap input to Monday
    const d = new Date(weekPickerValue);
    if (isNaN(d.getTime())) return;
    const monday = new Date(d);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const mondayStr = monday.toISOString().slice(0, 10);
    try {
      await updateReviewQueueItem(currentUser.uid, item.id, { status: 'scheduled', scheduledWeekId: mondayStr });
      setReviewQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'scheduled', scheduledWeekId: mondayStr } : i));
      setWeekPickerOpen(null);
    } catch (e) {
      setReviewActionError('Failed to schedule: ' + e.message);
    }
  }

  async function handleMarkDone(item) {
    try {
      await updateReviewQueueItem(currentUser.uid, item.id, { status: 'done', completedAt: new Date().toISOString() });
      setReviewQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done', completedAt: new Date().toISOString() } : i));
    } catch (e) {
      setReviewActionError('Failed to mark done: ' + e.message);
    }
  }

  async function handleDeleteQueueItem(item) {
    if (!window.confirm(`Remove "${item.topic}" from review queue?`)) return;
    try {
      await deleteReviewQueueItem(currentUser.uid, item.id);
      setReviewQueue((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setReviewActionError('Failed to delete: ' + e.message);
    }
  }

  // c. CSV export
  function exportCsv() {
    const header = ['Paper', 'Subject', 'Week', 'Marks', 'Grade', 'Time (s)', 'Date'];
    const rows = filtered.map((p) => [
      p.displayName ?? '',
      subjectMeta[p.subject]?.label || p.subject,
      p.weekId ?? '',
      p.marks ?? '',
      p.grade ?? '',
      p.actualDurationSeconds ?? '',
      p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'history-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // a. Inline edit
  function startEdit(p) {
    setEditingId(p.id);
    setEditMarks(p.marks ?? '');
    setEditGrade(p.grade ?? '');
    setEditComment(p.comment ?? '');
    setEditActualDuration(p.actualDurationSeconds != null ? secsToInput(p.actualDurationSeconds) : '');
    setEditError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError('');
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.displayName}" from history? This cannot be undone.`)) return;
    try {
      await deleteCompletedPaper(currentUser.uid, p.id);
      setPapers((prev) => prev.filter((pp) => pp.id !== p.id));
    } catch (e) {
      setLoadError('Failed to delete: ' + e.message);
    }
  }

  async function saveEdit(p) {
    setEditSaving(true);
    setEditError('');
    try {
      const updates = {
        marks: editMarks.trim() || null,
        grade: editGrade || null,
        comment: editComment.trim() || null,
        actualDurationSeconds: inputToSecs(editActualDuration),
      };
      await updateCompletion(currentUser.uid, p.id, updates);
      // Optimistically update local state
      setPapers((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, ...updates } : pp));
      setEditingId(null);
    } catch (e) {
      setEditError('Failed to save: ' + e.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">History</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{total} paper{total !== 1 ? 's' : ''} completed</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {view === 'table' && papers.length > 0 && (
            <button onClick={exportCsv}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
              Export CSV
            </button>
          )}
          <div className="flex border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {(reviewModeEnabled ? ['table', 'charts', 'review'] : ['table', 'charts']).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={'px-4 py-2 text-sm font-medium capitalize transition-colors ' +
                  (view === v
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]')}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{loadError}</div>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : view === 'charts' ? (
        <HistoryCharts
          gradeChartData={gradeChartData}
          weekChartData={weekChartData}
          subjectChartData={subjectChartData}
          studyHoursPerWeekData={studyHoursPerWeekData}
          topicChartData={topicChartData}
          subjectMeta={subjectMeta}
          total={total}
        />
      ) : view === 'review' ? (
        <div className="space-y-6">
          {reviewActionError && <div className="p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{reviewActionError}</div>}

          {/* Pending */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Pending ({queuePending.length})</h2>
            {queuePending.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No pending topics. Complete a paper and tag topics to add them here.</p>
            ) : (
              <div className="space-y-2">
                {queuePending.map((item) => {
                  const sm = subjectMeta[item.subject];
                  return (
                    <div key={item.id} className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${sm?.color ?? 'bg-gray-400'}`}>{item.topic}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{sm?.label ?? item.subject}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">Added {new Date(item.addedAt).toLocaleDateString()}</span>
                      <div className="ml-auto flex items-center gap-2 flex-wrap">
                        {weekPickerOpen === item.id ? (
                          <div className="flex items-center gap-2">
                            <input type="date" value={weekPickerValue} onChange={(e) => setWeekPickerValue(e.target.value)}
                              className="text-xs border border-[var(--color-border)] rounded px-2 py-1" />
                            <button onClick={() => handleQueueForWeek(item)}
                              className="text-xs font-medium text-[var(--color-accent)] hover:underline">Confirm</button>
                            <button onClick={() => setWeekPickerOpen(null)}
                              className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setWeekPickerOpen(item.id); setWeekPickerValue(''); }}
                            className="text-xs font-medium text-[var(--color-accent)] hover:underline">Queue for week</button>
                        )}
                        <button onClick={() => handleMarkDone(item)}
                          className="text-xs font-medium text-emerald-600 hover:underline">Mark done</button>
                        <button onClick={() => handleDeleteQueueItem(item)}
                          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled */}
          {queueScheduled.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Scheduled ({queueScheduled.length})</h2>
              <div className="space-y-2">
                {queueScheduled.map((item) => {
                  const sm = subjectMeta[item.subject];
                  return (
                    <div key={item.id} className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${sm?.color ?? 'bg-gray-400'}`}>{item.topic}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{sm?.label ?? item.subject}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">Week of {item.scheduledWeekId}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => handleMarkDone(item)}
                          className="text-xs font-medium text-emerald-600 hover:underline">Mark done</button>
                        <button onClick={() => handleDeleteQueueItem(item)}
                          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done */}
          {queueDone.length > 0 && (
            <details>
              <summary className="text-sm font-semibold text-[var(--color-text-muted)] cursor-pointer mb-2">
                Done ({queueDone.length})
              </summary>
              <div className="space-y-2 mt-2">
                {queueDone.map((item) => {
                  const sm = subjectMeta[item.subject];
                  return (
                    <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex flex-wrap items-center gap-3 opacity-60">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${sm?.color ?? 'bg-gray-400'}`}>{item.topic}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{sm?.label ?? item.subject}</span>
                      {item.completedAt && <span className="text-xs text-[var(--color-text-muted)]">Reviewed {new Date(item.completedAt).toLocaleDateString()}</span>}
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      ) : (
        <>
          <HistoryFilters
            search={search}
            onSearch={setSearch}
            filterSubject={filterSubject}
            onFilterSubject={setFilterSubject}
            filterGrade={filterGrade}
            onFilterGrade={setFilterGrade}
            subjects={subjects}
            grades={grades}
          />

          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm">No papers match your filters.</p>
          ) : (
            <HistoryTable
              filtered={filtered}
              pbSet={pbSet}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              editingId={editingId}
              editMarks={editMarks}
              editGrade={editGrade}
              editComment={editComment}
              editError={editError}
              editSaving={editSaving}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onEditMarksChange={setEditMarks}
              onEditGradeChange={setEditGrade}
              onEditCommentChange={setEditComment}
              editActualDuration={editActualDuration}
              onEditActualDurationChange={setEditActualDuration}
              onDelete={handleDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
