import { useState, useEffect, useRef, useCallback } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const START_HOUR = 7;   // 07:00
const END_HOUR   = 22;  // 22:00 (exclusive — last slot ends at 22:00)
const TOTAL_ROWS = (END_HOUR - START_HOUR) * 2; // 30 rows

function rowToTime(row) {
  const totalMins = START_HOUR * 60 + row * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToRow(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m - START_HOUR * 60) / 30;
}

/** Convert selected cell set → TimeBlock[] */
function cellsToBlocks(selected) {
  const blocks = [];
  for (const day of DAYS) {
    const rows = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (selected.has(`${day}-${r}`)) rows.push(r);
    }
    if (rows.length === 0) continue;
    // Group contiguous rows into runs
    let runStart = rows[0];
    let prev = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] === prev + 1) {
        prev = rows[i];
      } else {
        blocks.push({ day, startTime: rowToTime(runStart), endTime: rowToTime(prev + 1) });
        runStart = rows[i];
        prev = rows[i];
      }
    }
    blocks.push({ day, startTime: rowToTime(runStart), endTime: rowToTime(prev + 1) });
  }
  return blocks;
}

/** Convert TimeBlock[] → selected cell Set */
function blocksToSelected(blocks) {
  const s = new Set();
  for (const b of blocks) {
    const startRow = Math.max(0, Math.round(timeToRow(b.startTime)));
    const endRow   = Math.min(TOTAL_ROWS, Math.round(timeToRow(b.endTime)));
    for (let r = startRow; r < endRow; r++) {
      const day = b.day;
      if (DAYS.includes(day)) s.add(`${day}-${r}`);
    }
  }
  return s;
}

export default function WeekGridEditor({ value, onChange }) {
  const [selected, setSelected] = useState(() => blocksToSelected(value || []));
  const dragging = useRef(false);
  const dragMode = useRef(true); // true = select, false = deselect

  // Sync from parent when value changes externally (e.g. opening a new template)
  useEffect(() => {
    setSelected(blocksToSelected(value || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const commitChange = useCallback((next) => {
    onChange(cellsToBlocks(next));
  }, [onChange]);

  function handleMouseDown(cellId, e) {
    e.preventDefault();
    dragging.current = true;
    dragMode.current = !selected.has(cellId);
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current) next.add(cellId); else next.delete(cellId);
      return next;
    });
  }

  function handleMouseEnter(cellId) {
    if (!dragging.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current) next.add(cellId); else next.delete(cellId);
      return next;
    });
  }

  function handleMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setSelected((prev) => { commitChange(prev); return prev; });
  }

  // Hour labels (every 2 rows = 1 hour)
  const hourLabels = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hourLabels.push(h);
  }

  return (
    <div
      className="overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[360px]">
        {/* Header row */}
        <div className="flex">
          <div className="w-12 flex-shrink-0" />
          {DAYS.map((d) => (
            <div key={d} className="flex-1 text-center text-xs font-medium text-gray-500 py-1 border-b">
              {d.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: TOTAL_ROWS }, (_, row) => {
          const isHourStart = row % 2 === 0;
          const hour = START_HOUR + Math.floor(row / 2);
          return (
            <div key={row} className="flex" style={{ height: 18 }}>
              {/* Time label */}
              <div className="w-12 flex-shrink-0 flex items-start justify-end pr-1">
                {isHourStart && (
                  <span className="text-[10px] text-gray-400 leading-none -mt-0.5">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )}
              </div>
              {/* Day cells */}
              {DAYS.map((day) => {
                const cellId = `${day}-${row}`;
                const on = selected.has(cellId);
                return (
                  <div
                    key={day}
                    className={
                      'flex-1 border-r last:border-r-0 cursor-pointer transition-colors ' +
                      (isHourStart ? 'border-t border-gray-200 ' : 'border-t border-gray-100 ') +
                      (on ? 'bg-indigo-400 hover:bg-indigo-500 ' : 'bg-white hover:bg-indigo-50 ')
                    }
                    onMouseDown={(e) => handleMouseDown(cellId, e)}
                    onMouseEnter={() => handleMouseEnter(cellId)}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Bottom border */}
        <div className="flex">
          <div className="w-12 flex-shrink-0" />
          {DAYS.map((d) => (
            <div key={d} className="flex-1 border-t border-gray-200" />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">Click or drag to toggle study time. Blue = study slot.</p>
    </div>
  );
}
