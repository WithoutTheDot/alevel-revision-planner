import { describe, it, expect } from 'vitest';
import { calculateXp, computeNextStreak } from '../xpUtils';

describe('calculateXp', () => {
  it('returns base 25 with no bonuses when no grade/time/streak', () => {
    const result = calculateXp({}, {});
    expect(result).toEqual({ base: 25, gradeBonus: 0, timeBonus: 0, streakBonus: 0, total: 25 });
  });

  it('adds 25 grade bonus for A', () => {
    const { gradeBonus, total } = calculateXp({ grade: 'A' }, {});
    expect(gradeBonus).toBe(25);
    expect(total).toBe(50);
  });

  it('adds 25 grade bonus for A*', () => {
    const { gradeBonus } = calculateXp({ grade: 'A*' }, {});
    expect(gradeBonus).toBe(25);
  });

  it('no grade bonus for B', () => {
    const { gradeBonus } = calculateXp({ grade: 'B' }, {});
    expect(gradeBonus).toBe(0);
  });

  it('no time bonus when timeTaken >= expectedTime', () => {
    const { timeBonus } = calculateXp({ timeTaken: 90, expectedTime: 90 }, {});
    expect(timeBonus).toBe(0);
  });

  it('no time bonus when timeTaken > expectedTime', () => {
    const { timeBonus } = calculateXp({ timeTaken: 100, expectedTime: 90 }, {});
    expect(timeBonus).toBe(0);
  });

  it('computes time bonus proportionally when faster', () => {
    // 50% faster → 50% of 100 = 50, capped at 50
    const { timeBonus } = calculateXp({ timeTaken: 45, expectedTime: 90 }, {});
    expect(timeBonus).toBe(50);
  });

  it('time bonus capped at 50', () => {
    const { timeBonus } = calculateXp({ timeTaken: 1, expectedTime: 90 }, {});
    expect(timeBonus).toBe(50);
  });

  it('adds 50 streak bonus at exactly 7', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 7 });
    expect(streakBonus).toBe(50);
  });

  it('adds 150 streak bonus at exactly 30', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 30 });
    expect(streakBonus).toBe(150);
  });

  it('no streak bonus at streak 6', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 6 });
    expect(streakBonus).toBe(0);
  });

  it('no streak bonus at streak 8', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 8 });
    expect(streakBonus).toBe(0);
  });
});

describe('computeNextStreak', () => {
  it('returns alreadyCounted=true when today === last', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-17', 5);
    expect(result).toEqual({ newStreak: 5, alreadyCounted: true });
  });

  it('increments streak when last was yesterday', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-16', 4);
    expect(result).toEqual({ newStreak: 5, alreadyCounted: false });
  });

  it('resets streak to 1 when last was 2 days ago', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-15', 10);
    expect(result).toEqual({ newStreak: 1, alreadyCounted: false });
  });

  it('starts streak at 1 when no prior study date', () => {
    const result = computeNextStreak('2026-04-17', '', 0);
    expect(result).toEqual({ newStreak: 1, alreadyCounted: false });
  });
});
