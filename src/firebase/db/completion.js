import { updatePaper } from './schedule';
import { recordCompletion, logAdhocPaper } from './papers';
import { addReviewTopics } from './review';

/**
 * Orchestrates the completion of a paper (scheduled or ad-hoc).
 * Centralizes schedule updates, history logging, stats, and review queue syncing.
 *
 * @param {string} uid User ID
 * @param {object} ctx Completion context
 */
export async function completePaper(uid, ctx) {
  const {
    source,
    subject,
    displayName,
    paperPath,
    weekId,
    paperIndex,
    marks,
    grade,
    comment,
    completedAt,
    actualDurationSeconds,
    expectedTime,
    timeTaken,
    reviewTopics,
  } = ctx;

  let completionResult;

  if (source === 'adhoc') {
    completionResult = await logAdhocPaper(uid, {
      paperPath: paperPath || 'adhoc',
      subject,
      displayName,
      marks,
      grade,
      comment,
      completedAt,
      actualDurationSeconds,
      reviewTopics: reviewTopics ?? [],
      durationMins: expectedTime,
      timeTaken: actualDurationSeconds != null ? actualDurationSeconds / 60 : timeTaken,
      expectedTime,
    });
  } else {
    // Scheduled paper: 1. Update the schedule entry
    if (weekId && paperIndex != null) {
      await updatePaper(uid, weekId, paperIndex, {
        marks: marks ?? null,
        grade: grade ?? null,
        comment: comment ?? null,
        reviewTopics: reviewTopics ?? [],
        completed: true,
      });
    }

    // 2. Record in the canonical completion history (this also updates public stats)
    completionResult = await recordCompletion(uid, {
      paperPath,
      subject,
      displayName,
      weekId,
      marks,
      grade,
      comment,
      actualDurationSeconds,
      reviewTopics: reviewTopics ?? [],
      durationMins: expectedTime,
      timeTaken: actualDurationSeconds != null ? actualDurationSeconds / 60 : timeTaken,
      expectedTime,
    });
  }

  // 3. Sync review queue (best-effort)
  if (reviewTopics?.length > 0) {
    await addReviewTopics(uid, reviewTopics, subject).catch((err) => {
      console.error('Failed to sync review topics in completePaper:', err);
    });
  }

  return completionResult;
}
