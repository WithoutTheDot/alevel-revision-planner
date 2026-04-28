const BOARDS = ['ocr', 'aqa', 'edexcel'];

export function parseBoard(familyId) {
  if (!familyId) return null;
  const parts = familyId.split('-');
  // Family IDs are expected to contain at most one board segment, so the first match is always the only match.
  return BOARDS.find((b) => parts.includes(b)) ?? null;
}

export function gradeColor(grade) {
  if (!grade) return null;
  if (grade === 'A*' || grade === 'A') return 'bg-green-500 text-white';
  if (grade === 'B' || grade === 'C') return 'bg-amber-400 text-white';
  return 'bg-red-500 text-white';
}
