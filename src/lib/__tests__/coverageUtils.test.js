import { describe, it, expect } from 'vitest';
import { parseBoard, gradeColor } from '../coverageUtils';

describe('parseBoard', () => {
  it('extracts ocr from maths family id', () => {
    expect(parseBoard('maths-ocr-pure')).toBe('ocr');
  });
  it('extracts aqa from fm family id', () => {
    expect(parseBoard('fm-aqa-core-pure-1')).toBe('aqa');
  });
  it('extracts edexcel from family id', () => {
    expect(parseBoard('maths-edexcel-pure-1')).toBe('edexcel');
  });
  it('returns null for family with no known board', () => {
    expect(parseBoard('maths-madas-mp2')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(parseBoard(null)).toBeNull();
  });
  it('returns null for undefined input', () => {
    expect(parseBoard(undefined)).toBeNull();
  });
});

describe('gradeColor', () => {
  it('returns green classes for A*', () => {
    expect(gradeColor('A*')).toBe('bg-green-500 text-white');
  });
  it('returns green classes for A', () => {
    expect(gradeColor('A')).toBe('bg-green-500 text-white');
  });
  it('returns amber classes for B', () => {
    expect(gradeColor('B')).toBe('bg-amber-400 text-white');
  });
  it('returns amber classes for C', () => {
    expect(gradeColor('C')).toBe('bg-amber-400 text-white');
  });
  it('returns red classes for D', () => {
    expect(gradeColor('D')).toBe('bg-red-500 text-white');
  });
  it('returns red classes for U', () => {
    expect(gradeColor('U')).toBe('bg-red-500 text-white');
  });
  it('returns red classes for unrecognised grade like E', () => {
    expect(gradeColor('E')).toBe('bg-red-500 text-white');
  });
  it('returns null for falsy grade', () => {
    expect(gradeColor(null)).toBeNull();
    expect(gradeColor('')).toBeNull();
  });
});
