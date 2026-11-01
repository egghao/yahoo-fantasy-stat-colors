/* Percentile is the midpoint of the tied ranks in the reference population. */
function percentile(value, population, lowerIsBetter = false) {
  const numbers = population.filter(Number.isFinite);
  if (!Number.isFinite(value) || numbers.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const number of numbers) {
    if (number < value) below++;
    else if (number === value) equal++;
  }
  const rank = (below + equal / 2) / numbers.length;
  return lowerIsBetter ? 1 - rank : rank;
}

if (typeof module !== 'undefined') module.exports = { percentile };
