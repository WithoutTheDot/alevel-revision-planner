import SubjectBadge from './SubjectBadge';
import PbBadge from './PbBadge';
import { formatTime } from '../lib/timeUtils';

const GRADES_SELECT = ['A*', 'A', 'B', 'C', 'D', 'E', 'U', ''];
const inputSmCls = 'border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full';

function calcPct(marks) {
  if (!marks) return null;
  const m = String(marks).match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return Math.round(Number(m[1]) / Number(m[2]) * 100);
  return null;
}

export default function HistoryTable({
  filtered, pbSet, hasMore, loadingMore, onLoadMore,
  editingId, editMarks, editGrade, editComment, editActualDuration, editError, editSaving,
  onStartEdit, onCancelEdit, onSaveEdit,
  onEditMarksChange, onEditGradeChange, onEditCommentChange, onEditActualDurationChange,
  onDelete,
}) {
  return (
    <div>
      {/* Mobile card list */}
      <ul className="sm:hidden divide-y bg-white rounded-xl border overflow-hidden">
        {filtered.map((p) => {
          const pct = calcPct(p.marks);
          const isEditing = editingId === p.id;
          return (
            <li key={p.id} className="px-4 py-3 space-y-1">
              <div className="flex items-start justify-between">
                <p className="font-medium text-gray-800 text-sm">{p.displayName}</p>
                {!isEditing && (
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={() => onStartEdit(p)} className="text-gray-300 hover:text-indigo-500" title="Edit">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L3 14.172V17h2.828L17.414 5.414a2 2 0 0 0 0-2.828z" /></svg>
                    </button>
                    <button onClick={() => onDelete(p)} className="text-gray-300 hover:text-red-500" title="Delete">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-1.5 mt-1">
                  {editError && <p className="text-xs text-red-500">{editError}</p>}
                  <input type="text" value={editMarks} onChange={(e) => onEditMarksChange(e.target.value)} placeholder="Marks" className={inputSmCls} />
                  <select value={editGrade} onChange={(e) => onEditGradeChange(e.target.value)} className={inputSmCls}>
                    {GRADES_SELECT.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
                  </select>
                  <input type="text" value={editComment} onChange={(e) => onEditCommentChange(e.target.value)} placeholder="Comment" className={inputSmCls} />
                  <input type="text" value={editActualDuration} onChange={(e) => onEditActualDurationChange(e.target.value)} placeholder="Time (MM:SS)" className={inputSmCls} />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => onSaveEdit(p)} disabled={editSaving} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">{editSaving ? 'Saving…' : 'Save'}</button>
                    <button onClick={onCancelEdit} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <SubjectBadge subject={p.subject} />
                  {p.grade && <span className="font-semibold text-indigo-600 text-sm">{p.grade}</span>}
                  {p.marks && <span className="text-xs text-gray-500">{p.marks}{pct !== null ? ` (${pct}%)` : ''}</span>}
                  {p.actualDurationSeconds != null && (
                    <span className="text-xs font-mono text-gray-500">{formatTime(p.actualDurationSeconds)}</span>
                  )}
                  {pbSet?.has(p.id) && <PbBadge seconds={p.actualDurationSeconds} />}
                  <span className="text-xs text-gray-400">{p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '—'}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Paper</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => {
              const pct = calcPct(p.marks);
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.displayName}</p>
                    {!isEditing && p.comment && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate" title={p.comment}>{p.comment}</p>
                    )}
                    {isEditing && (
                      <div className="mt-1 space-y-1">
                        {editError && <p className="text-xs text-red-500">{editError}</p>}
                        <input type="text" value={editComment} onChange={(e) => onEditCommentChange(e.target.value)} placeholder="Comment" className={inputSmCls} />
                        <div className="flex gap-1 mt-0.5">
                          <button onClick={() => onSaveEdit(p)} disabled={editSaving} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">{editSaving ? 'Saving…' : 'Save'}</button>
                          <button onClick={onCancelEdit} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><SubjectBadge subject={p.subject} /></td>
                  <td className="px-4 py-3 text-gray-500">{p.weekId}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {isEditing ? (
                      <input type="text" value={editMarks} onChange={(e) => onEditMarksChange(e.target.value)} placeholder="e.g. 85/100" className={inputSmCls + ' w-24'} />
                    ) : (
                      <>
                        {p.marks ?? '—'}
                        {pct !== null && <span className="text-xs text-gray-400 ml-1">({pct}%)</span>}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select value={editGrade} onChange={(e) => onEditGradeChange(e.target.value)} className={inputSmCls + ' w-16'}>
                        {GRADES_SELECT.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
                      </select>
                    ) : p.grade ? (
                      <span className="font-semibold text-indigo-600">{p.grade}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {isEditing ? (
                      <input type="text" value={editActualDuration} onChange={(e) => onEditActualDurationChange(e.target.value)} placeholder="MM:SS" className={inputSmCls + ' w-24'} />
                    ) : p.actualDurationSeconds != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{formatTime(p.actualDurationSeconds)}</span>
                        {pbSet?.has(p.id) && <PbBadge seconds={p.actualDurationSeconds} />}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => onStartEdit(p)} className="text-gray-300 hover:text-indigo-500" title="Edit">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L3 14.172V17h2.828L17.414 5.414a2 2 0 0 0 0-2.828z" /></svg>
                        </button>
                        <button onClick={() => onDelete(p)} className="text-gray-300 hover:text-red-500" title="Delete">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 rounded-lg border text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
