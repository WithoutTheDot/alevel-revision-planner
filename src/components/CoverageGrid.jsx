import { useState, useMemo } from 'react';
import { BUILT_IN_FAMILIES } from '../lib/builtInFamilies';
import { parseBoard, gradeColor } from '../lib/coverageUtils';
import { format, parseISO } from 'date-fns';

const YEAR_FAMILIES = BUILT_IN_FAMILIES.filter(
  (f) => f.yearStart !== null && f.yearEnd !== null
);

function yearRange(start, end) {
  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

export default function CoverageGrid({ coverageData, subjects }) {
  const enrolledIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);

  const visibleFamilies = useMemo(
    () => YEAR_FAMILIES.filter((f) => enrolledIds.has(f.subject)),
    [enrolledIds]
  );

  const availableBoards = useMemo(() => {
    const boards = new Set();
    for (const f of visibleFamilies) {
      const b = parseBoard(f.id);
      if (b) boards.add(b);
    }
    return ['all', ...Array.from(boards).sort()];
  }, [visibleFamilies]);

  const [filterSubject, setFilterSubject] = useState('all');
  const [filterBoard, setFilterBoard] = useState('all');

  const filtered = useMemo(() => {
    return visibleFamilies.filter((f) => {
      if (filterSubject !== 'all' && f.subject !== filterSubject) return false;
      if (filterBoard !== 'all' && parseBoard(f.id) !== filterBoard) return false;
      return true;
    });
  }, [visibleFamilies, filterSubject, filterBoard]);

  // Group by subject
  const groups = useMemo(() => {
    const map = new Map();
    for (const f of filtered) {
      if (!map.has(f.subject)) map.set(f.subject, []);
      map.get(f.subject).push(f);
    }
    return map;
  }, [filtered]);

  const subjectLabel = (id) => subjects.find((s) => s.id === id)?.label ?? id;

  if (visibleFamilies.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)] text-sm">
        No paper families found for your subjects.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-secondary)]">Subject</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text-primary)]"
          >
            <option value="all">All</option>
            {subjects
              .filter((s) => enrolledIds.has(s.id) && visibleFamilies.some((f) => f.subject === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-secondary)]">Board</label>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text-primary)]"
          >
            {availableBoards.map((b) => (
              <option key={b} value={b}>{b === 'all' ? 'All boards' : b.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade key */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>Key:</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-green-500" /> A* / A</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-amber-400" /> B / C</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-500" /> D / E / U</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded border border-[var(--color-border)]" /> Not done</span>
      </div>

      {/* Groups */}
      {Array.from(groups.entries()).map(([subjectId, families]) => {
        const minYear = Math.min(...families.map((f) => f.yearStart));
        const maxYear = Math.max(...families.map((f) => f.yearEnd));
        const years = yearRange(minYear, maxYear);

        return (
          <div key={subjectId}>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              {subjectLabel(subjectId)}
            </h3>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pr-4 pb-1 text-[var(--color-text-muted)] font-medium min-w-[160px]">
                      Family
                    </th>
                    {years.map((y) => (
                      <th key={y} className="px-1 pb-1 text-[var(--color-text-muted)] font-medium w-10 text-center">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {families.map((fam) => (
                    <tr key={fam.id}>
                      <td className="pr-4 py-0.5 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {fam.name}
                      </td>
                      {years.map((y) => {
                        const inRange = y >= fam.yearStart && y <= fam.yearEnd;
                        if (!inRange) {
                          return <td key={y} className="px-1 py-0.5" />;
                        }
                        const paperPath = fam.pathFn(y);
                        const entry = coverageData?.get(paperPath);
                        const color = entry ? gradeColor(entry.grade) : null;
                        const tooltip = entry?.completedAt
                          ? format(parseISO(entry.completedAt), 'd MMM yyyy')
                          : null;

                        return (
                          <td key={y} className="px-1 py-0.5 text-center">
                            <div
                              title={tooltip ?? undefined}
                              className={
                                'w-8 h-6 rounded flex items-center justify-center font-semibold cursor-default ' +
                                (color
                                  ? color
                                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)]')
                              }
                            >
                              {entry ? (entry.grade ?? '✓') : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">No families match your filters.</p>
      )}
    </div>
  );
}
