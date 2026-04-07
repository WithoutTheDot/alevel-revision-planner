import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncReviewQueueForCompletionEdit } from './review';
import { getDocs, query, where, writeBatch } from 'firebase/firestore';

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

describe('syncReviewQueueForCompletionEdit', () => {
  const userId = 'test-uid';
  const subject = 'maths';
  const mockBatch = {
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    writeBatch.mockReturnValue(mockBatch);
  });

  it('skips if no subject', async () => {
    await syncReviewQueueForCompletionEdit(userId, { subject: null, prevTopics: [], nextTopics: ['Topic 1'] });
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('adds new topics as pending', async () => {
    // Mock getDocs to return empty (no duplicates)
    getDocs.mockResolvedValueOnce({ docs: [] });

    await syncReviewQueueForCompletionEdit(userId, {
      subject,
      prevTopics: ['Topic 1'],
      nextTopics: ['Topic 1', 'Topic 2'],
    });

    expect(mockBatch.set).toHaveBeenCalledTimes(1);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('removes pending items for removed topics', async () => {
    // Mock getDocs for removals to return some docs
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ ref: 'ref1' }, { ref: 'ref2' }],
    });

    await syncReviewQueueForCompletionEdit(userId, {
      subject,
      prevTopics: ['Topic 1', 'Topic 2'],
      nextTopics: ['Topic 2'],
    });

    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('handles empty transitions', async () => {
    await syncReviewQueueForCompletionEdit(userId, {
      subject,
      prevTopics: [],
      nextTopics: [],
    });
    expect(mockBatch.set).not.toHaveBeenCalled();
    expect(mockBatch.delete).not.toHaveBeenCalled();
  });
});
