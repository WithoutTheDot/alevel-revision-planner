import { describe, it, expect } from 'vitest';
import { getTodaysPapers } from '../dateUtils';

const makePaper = (scheduledDay, overrides = {}) => ({
  scheduledDay,
  paperPath: 'ocr-2023-pure',
  subject: 'maths',
  displayName: 'OCR 2023 - Pure',
  completed: false,
  ...overrides,
});

describe('getTodaysPapers', () => {
  it('returns empty array for null schedule', () => {
    expect(getTodaysPapers(null, 'Monday')).toEqual([]);
  });

  it('returns empty array for schedule with no papers', () => {
    expect(getTodaysPapers({ papers: [] }, 'Monday')).toEqual([]);
  });

  it('returns only papers matching the given day', () => {
    const schedule = {
      papers: [
        makePaper('Monday'),
        makePaper('Tuesday'),
        makePaper('Monday'),
        makePaper('Wednesday'),
      ],
    };
    const result = getTodaysPapers(schedule, 'Monday');
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(2);
  });

  it('returns correct original index for each paper', () => {
    const schedule = {
      papers: [
        makePaper('Wednesday'),
        makePaper('Monday'),
        makePaper('Monday'),
      ],
    };
    const result = getTodaysPapers(schedule, 'Monday');
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });

  it('returns empty array when no papers match the day', () => {
    const schedule = {
      papers: [makePaper('Tuesday'), makePaper('Wednesday')],
    };
    expect(getTodaysPapers(schedule, 'Monday')).toEqual([]);
  });
});
