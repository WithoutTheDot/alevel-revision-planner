import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePaper } from './completion';
import { updatePaper } from './schedule';
import { recordCompletion, logAdhocPaper } from './papers';
import { addReviewTopics } from './review';

vi.mock('./schedule', () => ({
  updatePaper: vi.fn(),
}));
vi.mock('./papers', () => ({
  recordCompletion: vi.fn(),
  logAdhocPaper: vi.fn(),
}));
vi.mock('./review', () => ({
  addReviewTopics: vi.fn(() => Promise.resolve()),
}));

describe('completePaper service', () => {
  const uid = 'test-uid';
  const commonCtx = {
    subject: 'maths',
    displayName: 'Pure 1',
    paperPath: '2023/pure1',
    marks: 70,
    grade: 'A',
    reviewTopics: ['Integration'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orchestrates scheduled paper completion', async () => {
    const ctx = {
      ...commonCtx,
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: 0,
    };

    recordCompletion.mockResolvedValue({ xpEarned: 25, newBadges: [] });

    const result = await completePaper(uid, ctx);

    expect(updatePaper).toHaveBeenCalledWith(uid, '2024-04-01', 0, expect.objectContaining({
      completed: true,
      marks: 70,
    }));
    expect(recordCompletion).toHaveBeenCalledWith(uid, expect.objectContaining({
      subject: 'maths',
      marks: 70,
    }));
    expect(addReviewTopics).toHaveBeenCalledWith(uid, ['Integration'], 'maths');
    expect(result.xpEarned).toBe(25);
  });

  it('orchestrates adhoc paper completion', async () => {
    const ctx = {
      ...commonCtx,
      source: 'adhoc',
    };

    logAdhocPaper.mockResolvedValue({ xpEarned: 25, newBadges: [], capReached: false });

    await completePaper(uid, ctx);

    expect(updatePaper).not.toHaveBeenCalled();
    expect(logAdhocPaper).toHaveBeenCalledWith(uid, expect.objectContaining({
      subject: 'maths',
    }));
    expect(addReviewTopics).toHaveBeenCalledWith(uid, ['Integration'], 'maths');
  });

  it('normalizes missing duration for scheduled paper', async () => {
    const ctx = {
      ...commonCtx,
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: 0,
      actualDurationSeconds: null,
      expectedTime: 90,
    };

    await completePaper(uid, ctx);

    expect(recordCompletion).toHaveBeenCalledWith(uid, expect.objectContaining({
      actualDurationSeconds: null,
      durationMins: 90,
    }));
  });
});
