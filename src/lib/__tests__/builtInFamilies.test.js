import { describe, it, expect } from 'vitest';
import { BUILT_IN_FAMILIES, BUILT_IN_FAMILIES_MAP } from '../builtInFamilies';

describe('BUILT_IN_FAMILIES', () => {
  it('has no duplicate family IDs', () => {
    const ids = BUILT_IN_FAMILIES.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all families have positive paperPaths', () => {
    BUILT_IN_FAMILIES.forEach((f) => {
      expect(f.paperPaths.length).toBeGreaterThan(0);
    });
  });

  it('all families have a non-empty subject', () => {
    BUILT_IN_FAMILIES.forEach((f) => {
      expect(typeof f.subject).toBe('string');
      expect(f.subject.length).toBeGreaterThan(0);
    });
  });

  it('all families have a non-empty name', () => {
    BUILT_IN_FAMILIES.forEach((f) => {
      expect(typeof f.name).toBe('string');
      expect(f.name.length).toBeGreaterThan(0);
    });
  });

  it('families with year ranges have yearStart <= yearEnd', () => {
    BUILT_IN_FAMILIES.forEach((f) => {
      if (f.yearStart !== null && f.yearEnd !== null) {
        expect(f.yearStart).toBeLessThanOrEqual(f.yearEnd);
      }
    });
  });

  it('BUILT_IN_FAMILIES_MAP matches BUILT_IN_FAMILIES', () => {
    expect(BUILT_IN_FAMILIES_MAP.size).toBe(BUILT_IN_FAMILIES.length);
    BUILT_IN_FAMILIES.forEach((f) => {
      expect(BUILT_IN_FAMILIES_MAP.get(f.id)).toBe(f);
    });
  });

  const EXPECTED_SUBJECTS = [
    'maths', 'furtherMaths', 'physics', 'computerScience',
    'chemistry', 'biology', 'psychology', 'sociology',
    'economics', 'history', 'geography', 'english',
    'business', 'law', 'pe', 'religious',
    'french', 'spanish', 'german', 'statistics',
  ];

  it.each(EXPECTED_SUBJECTS)('has at least one family for subject: %s', (subject) => {
    const families = BUILT_IN_FAMILIES.filter((f) => f.subject === subject);
    expect(families.length).toBeGreaterThan(0);
  });
});
