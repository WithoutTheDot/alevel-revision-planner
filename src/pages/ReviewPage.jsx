import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import {
  getReviewQueue, updateReviewQueueItem, deleteReviewQueueItem,
  getAllCompletedPapers, computeTopicFrequency, getUserSettings,
} from '../firebase/db';
import { Link } from 'react-router-dom';
import HistoryCharts from '../components/HistoryCharts';
import { useAsyncData } from '../hooks/useAsyncData';

export default function ReviewPage() {
  const { currentUser } = useAuth();
  const { subjectMeta } = useSubjects();

  const [reviewQueue, setReviewQueue] = useState([]);
  const [topicChartData, setTopicChartData] = useState([]);
  const [reviewModeEnabled, setReviewModeEnabled] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(null);
  const [weekPickerValue, setWeekPickerValue] = useState('');
  const [actionError, setActionError] = useState('');

  const { loading, error } = useAsyncData(useCallback(async () => {
    const [queue, settings, { papers }] = await Promise.all([
      getReviewQueue(currentUser.uid),
      getUserSettings(currentUser.uid),
      getAllCompletedPapers(currentUser.uid, { limit: 100 }),
    ]);
    setReviewQueue(queue);
    setReviewModeEnabled(settings?.reviewModeEnabled ?? true);
    setTopicChartData(computeTopicFrequency(papers).slice(0, 10).map((t) => ({
      topic: t.topic, count: t.count, subject: t.subject,
    })));
  }, [currentUser.uid]), [currentUser.uid]);

  const queuePending   = reviewQueue.filter((i) => i.status === 'pending');
  const queueScheduled = reviewQueue.filter((i) => i.status === 'scheduled');
  const queueDone      = reviewQueue.filter((i) => i.status === 'done');

  async function handleQueueForWeek(item) {
    const d = new Date(weekPickerValue);
    if (isNaN(d.getTime())) return;
    const monday = new Date(d);
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    const mondayStr = monday.toISOString().slice(0, 10);
    try {
      await updateReviewQueueItem(currentUser.uid, item.id, { status: 'scheduled', scheduledWeekId: mondayStr });
      setReviewQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'scheduled', scheduledWeekId: mondayStr } : i));
      setWeekPickerOpen(null);
    } catch (e) {
      setActionError('Failed to schedule: ' + e.message);
    }
  }

  async function handleMarkDone(item) {
    try {
      const now = new Date().toISOString();
      await updateReviewQueueItem(currentUser.uid, item.id, { status: 'done', completedAt: now });
      setReviewQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done', completedAt: now } : i));
    } catch (e) {
      setActionError('Failed to mark done: ' + e.message);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Remove "${item.topic}" from review queue?`)) return;
    try {
      await deleteReviewQueueItem(currentUser.uid, item.id);
      setReviewQueue((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setActionError('Failed to delete: ' + e.message);
    }
  }

  function QueueItem({ item, showSchedule }) {
    const sm = subjectMeta[item.subject];
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${sm?.color ?? 'bg-gray-400'}`}>
          {item.topic}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{sm?.label ?? item.subject}</span>
        {item.scheduledWeekId && (
          <span className="text-xs text-[var(--color-text-muted)]">Week of {item.scheduledWeekId}</span>
        )}
        {!item.scheduledWeekId && item.addedAt && (
          <span className="text-xs text-[var(--color-text-muted)]">Added {new Date(item.addedAt).toLocaleDateString()}</span>
        )}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {showSchedule && (
            weekPickerOpen === item.id ? (
              <div className="flex items-center gap-2">
                <input type="date" value={weekPickerValue} onChange={(e) => setWeekPickerValue(e.target.value)}
                  className="text-xs border border-[var(--color-border)] rounded px-2 py-1 bg-white" />
                <button onClick={() => handleQueueForWeek(item)}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline">Confirm</button>
                <button onClick={() => setWeekPickerOpen(null)}
                  className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
              </div>
            ) : (
              <button onClick={() => { setWeekPickerOpen(item.id); setWeekPickerValue(''); }}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline">Queue for week</button>
            )
          )}
          <button onClick={() => handleMarkDone(item)}
            className="text-xs font-medium text-emerald-600 hover:underline">Mark done</button>
          <button onClick={() => handleDelete(item)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Review</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Topics to revisit from your completed papers</p>
      </div>

      {!loading && !reviewModeEnabled && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] text-sm text-amber-800">
          Review mode is off. Enable it in{' '}
          <Link to="/settings" className="font-medium underline">Settings</Link> to tag topics after each paper.
        </div>
      )}

      {(error || actionError) && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error || actionError}</div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          {/* Queue sections */}
          <div className="space-y-6">
            {/* Pending */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                Pending ({queuePending.length})
              </h2>
              {queuePending.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No pending topics. Complete a paper and tag topics to add them here.
                </p>
              ) : (
                <div className="space-y-2">
                  {queuePending.map((item) => <QueueItem key={item.id} item={item} showSchedule />)}
                </div>
              )}
            </div>

            {/* Scheduled */}
            {queueScheduled.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                  Scheduled ({queueScheduled.length})
                </h2>
                <div className="space-y-2">
                  {queueScheduled.map((item) => <QueueItem key={item.id} item={item} showSchedule={false} />)}
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${sm?.color ?? 'bg-gray-400'}`}>
                          {item.topic}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">{sm?.label ?? item.subject}</span>
                        {item.completedAt && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            Reviewed {new Date(item.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Topic frequency chart */}
          {topicChartData.length > 0 && (
            <HistoryCharts
              gradeChartData={[]}
              weekChartData={[]}
              subjectChartData={[]}
              topicChartData={topicChartData}
              subjectMeta={subjectMeta}
              total={0}
            />
          )}
        </div>
      )}
    </div>
  );
}
