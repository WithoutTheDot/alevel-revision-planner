/**
 * Convert a path array to a human-readable display name.
 * e.g. ['ocr', '2023', 'pure'] → 'OCR 2023 - Pure'
 */
export function getDisplayName(path) {
  if (!path || path.length === 0) return '';
  const parts = path.map((p) =>
    p
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
  // Use " - " to separate the last token from the rest if there are ≥2 tokens
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(' ');
  return `${rest} - ${last}`;
}

/**
 * Convert a path array to a kebab-case identifier.
 * e.g. ['ocr', '2023', 'pure'] → 'ocr-2023-pure'
 */
export function getPaperPath(path) {
  return path.join('-').toLowerCase();
}
