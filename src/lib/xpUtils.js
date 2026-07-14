export function calculateXp(paperData, stats) {
  const base = 25;
  const gradeBonus = (paperData.grade === 'A' || paperData.grade === 'A*') ? 25 : 0;

  let timeBonus = 0;
  if (
    paperData.timeTaken != null &&
    paperData.expectedTime != null &&
    paperData.timeTaken < paperData.expectedTime &&
    paperData.expectedTime > 0
  ) {
    const pctFaster = (paperData.expectedTime - paperData.timeTaken) / paperData.expectedTime;
    timeBonus = Math.min(50, Math.round(pctFaster * 100));
  }

  const streak = stats.currentStreak ?? 0;
  let streakBonus = 0;
  if (streak === 7)  streakBonus = 50;
  if (streak === 30) streakBonus = 150;

  const total = base + gradeBonus + timeBonus + streakBonus;
  return { base, gradeBonus, timeBonus, streakBonus, total };
}

export function computeNextStreak(today, last, current) {
  if (last === today) return { newStreak: current, alreadyCounted: true };
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const newStreak = last === yStr ? current + 1 : 1;
  return { newStreak, alreadyCounted: false };
}
