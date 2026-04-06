export const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U', ''];

export const FRACTION_RE = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/;

/**
 * Normalise a marks string: strip spaces around `/`, returning `"85/100"` form.
 * Returns null if the string is empty, or the normalised string otherwise.
 * Sets invalid=true when the value is non-empty and doesn't match the expected pattern.
 * Also extracts `score` and `outOf` for percentage display.
 */
export function normaliseMarks(value) {
  const trimmed = value.trim();
  if (!trimmed) return { normalised: '', invalid: false, score: null, outOf: null };
  const m = trimmed.match(FRACTION_RE);
  if (m) {
    const normalised = `${m[1]}/${m[2]}`;
    return { normalised, invalid: false, score: Number(m[1]), outOf: Number(m[2]) };
  }
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return { normalised: trimmed, invalid: false, score: num, outOf: null };
  }
  return { normalised: trimmed, invalid: true, score: null, outOf: null };
}
