import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { getAllCompletedPapers, updateCompletion, deleteCompletedPaper, pbKey, syncReviewQueueForCompletionEdit } from '../firebase/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format, parseISO, startOfWeek } from 'date-fns';
import HistoryCharts from '../components/HistoryCharts';
import HistoryFilters from '../components/HistoryFilters';
import HistoryTable from '../components/HistoryTable';
import CompletionDetailsModal from '../components/CompletionDetailsModal';

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
  const [view, setView] = useState('table'); // 'table' | 'charts'
  const [personalBests, setPersonalBests] = useState({});

  const [editingPaper, setEditingPaper] = useState(null);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getAllCompletedPapers(currentUser.uid, { limit: PAGE_SIZE });
      setPapers(result.papers);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      setTotalFetched(result.papers.length + (result.hasMore ? 1 : 0));
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

  const filtered = papers.filter((p) => {
    if (filterSubject !== 'all' && p.subject !== filterSubject) return false;
    if (filterGrade !== 'all' && p.grade !== filterGrade) return false;
    if (search && !p.displayName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grades = [...new Set(papers.map((p) => p.grade).filter(Boolean))];

  const total = papers.length;
  const gradeMap = {};
  papers.forEach((p) => { if (p.grade) gradeMap[p.grade] = (gradeMap[p.grade] || 0) + 1; });
  const subjectMap = {};
  papers.forEach((p) => { subjectMap[p.subject] = (subjectMap[p.subject] || 0) + 1; });

  const gradeChartData = ALL_GRADES.map((g) => ({ grade: g, count: gradeMap[g] || 0 }));

  const subjectChartData = Object.entries(subjectMap).map(([s, count]) => ({
    name: subjectMeta[s]?.label || s,
    count,
  }));

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

  const pbSet = new Set();
  if (Object.keys(personalBests).length > 0) {
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

  function startEdit(p) {
    setEditingPaper(p);
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

  async function saveEdit(updates) {
    if (!editingPaper) return;
    setEditError('');
    try {
      await updateCompletion(currentUser.uid, editingPaper.id, updates);
      setPapers((prev) => prev.map((pp) => pp.id === editingPaper.id ? { ...pp, ...updates } : pp));
      await syncReviewQueueForCompletionEdit(currentUser.uid, {
        subject: editingPaper.subject,
        prevTopics: editingPaper.reviewTopics ?? [],
        nextTopics: updates.reviewTopics ?? [],
      }).catch(() => {});
      setEditingPaper(null);
    } catch (e) {
      setEditError('Failed to save: ' + e.message);
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
            {['table', 'charts'].map((v) => (
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
          total={total}
        />
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
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {editingPaper && (
        <CompletionDetailsModal
          mode="history"
          paper={editingPaper}
          onClose={() => setEditingPaper(null)}
          onSubmit={saveEdit}
          submitLabel="Save"
        />
      )}

      {editError && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm border border-red-200">
          {editError}
        </div>
      )}
    </div>
  );
}
