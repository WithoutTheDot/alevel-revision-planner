import { format, startOfWeek } from 'date-fns';
import { CALENDAR_GRID_START_HOUR, CALENDAR_GRID_END_HOUR } from './constants';

const TOTAL_MINS = (CALENDAR_GRID_END_HOUR - CALENDAR_GRID_START_HOUR) * 60;
const PX_PER_MIN = 0.9;
const SNAP_MINS = 15;

export function getMondayStr(d) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function timeToOffset(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const offset = ((h * 60 + m) - CALENDAR_GRID_START_HOUR * 60) * PX_PER_MIN;
  return Math.max(0, offset);
}

export function offsetToTime(px) {
  const totalMins = Math.round(px / PX_PER_MIN);
  const snapped = Math.round(totalMins / SNAP_MINS) * SNAP_MINS;
  const clamped = Math.max(0, Math.min(snapped, TOTAL_MINS - 1));
  const absMin = CALENDAR_GRID_START_HOUR * 60 + clamped;
  const h = Math.floor(absMin / 60);
  const mn = absMin % 60;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

export { PX_PER_MIN, TOTAL_MINS };

/**
 * Returns papers from a weekly schedule that are scheduled for a given day name.
 * @param {object|null} schedule - weekly schedule object ({ papers: [...] })
 * @param {string} dayName - e.g. 'Monday', 'Tuesday', etc.
 * @returns {Array<{ paper: object, index: number }>}
 */
export function getTodaysPapers(schedule, dayName) {
  if (!schedule?.papers) return [];
  return schedule.papers
    .map((paper, index) => ({ paper, index }))
    .filter(({ paper }) => paper.scheduledDay === dayName);
}

/**
 * Returns today's day name (Monday–Sunday) matching the format used by schedule papers.
 */
export function getTodayDayName() {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return DAYS[new Date().getDay()];
}
