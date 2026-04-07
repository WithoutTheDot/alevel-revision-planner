import { describe, it, expect } from 'vitest';
import { secsToInput, inputToSecs, formatTime } from './timeUtils';

describe('timeUtils', () => {
  describe('secsToInput', () => {
    it('converts seconds to m:ss format', () => {
      expect(secsToInput(0)).toBe('0:00');
      expect(secsToInput(60)).toBe('1:00');
      expect(secsToInput(65)).toBe('1:05');
      expect(secsToInput(3600)).toBe('60:00');
    });

    it('returns empty string for null/undefined', () => {
      expect(secsToInput(null)).toBe('');
      expect(secsToInput(undefined)).toBe('');
    });
  });

  describe('inputToSecs', () => {
    it('parses m:ss format', () => {
      expect(inputToSecs('1:05')).toBe(65);
      expect(inputToSecs('60:00')).toBe(3600);
      expect(inputToSecs('0:30')).toBe(30);
    });

    it('parses numeric minutes', () => {
      expect(inputToSecs('1.5')).toBe(90);
      expect(inputToSecs('60')).toBe(3600);
    });

    it('returns null for invalid input', () => {
      expect(inputToSecs('')).toBe(null);
      expect(inputToSecs('abc')).toBe(null);
      expect(inputToSecs('-1')).toBe(null);
    });
  });

  describe('formatTime', () => {
    it('formats seconds to hh:mm:ss when > 1h', () => {
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(3600)).toBe('1:00:00');
    });

    it('formats seconds to mm:ss when < 1h', () => {
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(0)).toBe('00:00');
    });
  });
});
