const ACRONYMS = new Set(['aqa', 'ocr', 'ocra', 'ms', 'qp']);

function formatWord(w) {
  return ACRONYMS.has(w.toLowerCase())
    ? w.toUpperCase()
    : w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Convert a path array to a human-readable display name.
 * e.g. ['ocr', '2023', 'pure'] → 'OCR 2023 - Pure'
 */
export function getDisplayName(path) {
  if (!path || path.length === 0) return '';
  const filtered = path.filter((p) => p !== 'foreign');
  if (filtered.length === 0) return '';
  const parts = filtered.map((p) => p.split('-').map(formatWord).join(' '));
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(' ');
  return `${rest} - ${last}`;
}

/**
 * Sanitise a stored display name: removes legacy "Foreign " prefix and fixes
 * board-name capitalisation ("Aqa" → "AQA", "Ocr" → "OCR").
 * Safe to call on already-clean names.
 */
export function cleanDisplayName(name) {
  if (!name) return name;
  return name
    .replace(/\bForeign\s+/gi, '')
    .replace(/\bAqa\b/g, 'AQA')
    .replace(/\bOcr\b/g, 'OCR')
    .replace(/\bOcra\b/g, 'OCR A');
}

/**
 * Convert a path array to a kebab-case identifier.
 * e.g. ['ocr', '2023', 'pure'] → 'ocr-2023-pure'
 */
export function getPaperPath(path) {
  return path.join('-').toLowerCase();
}
