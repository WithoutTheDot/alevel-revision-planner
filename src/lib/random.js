/**
 * Weighted random integer in [1..max] biased toward mostCommon.
 * mostCommon gets 50% of the probability mass.
 * All other values share the remaining 50% equally.
 */
export function weightedRandom(mostCommon, max) {
  const SLOTS = 100;
  const mostCommonSlots = Math.floor(SLOTS / 2); // 50 slots
  const otherCount = max - 1;
  const otherSlots = otherCount > 0 ? Math.floor((SLOTS - mostCommonSlots) / otherCount) : 0;

  const values = [];
  for (let i = 1; i <= max; i++) {
    const count = i === mostCommon ? mostCommonSlots : otherSlots;
    for (let j = 0; j < count; j++) values.push(i);
  }

  // Edge case: if max === 1 or slots didn't fill perfectly
  if (values.length === 0) return mostCommon;

  return values[Math.floor(Math.random() * values.length)];
}

/**
 * Pick one option from an array of { weight?, ...rest }.
 * Options without weight default to 1.
 */
export function weightedRandomChoice(options) {
  if (options.length === 0) throw new Error('weightedRandomChoice: empty options');
  const weights = options.map((o) => (o.weight !== undefined ? o.weight : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}
