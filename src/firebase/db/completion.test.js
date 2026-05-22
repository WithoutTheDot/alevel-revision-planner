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

  it('treats viewer source as scheduled and ticks off schedule when ctx complete', async () => {
    const ctx = {
      ...commonCtx,
      source: 'viewer',
      weekId: '2024-04-01',
      paperIndex: 2,
    };
    recordCompletion.mockResolvedValue({ xpEarned: 10, newBadges: [] });

    await completePaper(uid, ctx);

    expect(updatePaper).toHaveBeenCalledWith(uid, '2024-04-01', 2, expect.objectContaining({
      completed: true,
    }));
    expect(recordCompletion).toHaveBeenCalled();
  });

  it('skips schedule update when weekId missing (regression: viewer flow without ctx)', async () => {
    const ctx = {
      ...commonCtx,
      source: 'viewer',
      weekId: null,
      paperIndex: 0,
    };
    recordCompletion.mockResolvedValue({ xpEarned: 10, newBadges: [] });

    await completePaper(uid, ctx);

    expect(updatePaper).not.toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalled();
  });

  it('skips schedule update when paperIndex is null', async () => {
    const ctx = {
      ...commonCtx,
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: null,
    };
    recordCompletion.mockResolvedValue({ xpEarned: 10, newBadges: [] });

    await completePaper(uid, ctx);

    expect(updatePaper).not.toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalled();
  });

  it('ticks off schedule when paperIndex is 0 (falsy guard regression)', async () => {
    const ctx = {
      ...commonCtx,
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: 0,
    };
    recordCompletion.mockResolvedValue({ xpEarned: 10, newBadges: [] });

    await completePaper(uid, ctx);

    expect(updatePaper).toHaveBeenCalledWith(uid, '2024-04-01', 0, expect.any(Object));
  });

  it('skips addReviewTopics when no topics tagged', async () => {
    const ctx = {
      ...commonCtx,
      reviewTopics: [],
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: 1,
    };
    recordCompletion.mockResolvedValue({ xpEarned: 5, newBadges: [] });

    await completePaper(uid, ctx);

    expect(addReviewTopics).not.toHaveBeenCalled();
  });

  it('swallows addReviewTopics failure (best-effort)', async () => {
    addReviewTopics.mockRejectedValueOnce(new Error('network'));
    recordCompletion.mockResolvedValue({ xpEarned: 5, newBadges: [] });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(completePaper(uid, {
      ...commonCtx,
      source: 'scheduled',
      weekId: 'w', paperIndex: 0,
    })).resolves.toBeDefined();

    spy.mockRestore();
  });

  it('uses actualDurationSeconds to derive timeTaken', async () => {
    const ctx = {
      ...commonCtx,
      source: 'scheduled',
      weekId: '2024-04-01',
      paperIndex: 0,
      actualDurationSeconds: 1800,
      expectedTime: 60,
    };

    await completePaper(uid, ctx);

    expect(recordCompletion).toHaveBeenCalledWith(uid, expect.objectContaining({
      timeTaken: 30,
    }));
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
