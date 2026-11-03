/* Pure calculations for the fund portfolio: weights, returns, contribution split, rebalancing and projection. */

/** Suggested buys under this amount (€) are dropped and their money goes to the other funds. */
export const MIN_PURCHASE = 10;

const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

/**
 * Per fund: normalized target weight (the sheet can hold 20 or 0.2), current share, deviation,
 * money invested (before the app + contributions logged) and gain.
 * `fund.invested` (money invested before the app) is null when unknown: then that fund's gain is
 * unknown too (`gainPct` null), and so is the portfolio's (`gainKnown` false), instead of being wrong.
 * Write 0 for a fund that started with the app.
 */
export function portfolio(funds, contributions = []) {
  const totalWeight = sum(funds, fund => fund.weight);
  const total = sum(funds, fund => fund.value);
  const contributed = Map.groupBy(contributions, c => c.fund);
  const rows = funds.map(fund => {
    const target = totalWeight ? fund.weight / totalWeight : 0;
    const share = total ? fund.value / total : 0;
    const invested = (fund.invested ?? 0) + sum(contributed.get(fund.name) ?? [], c => c.amount);
    const gain = fund.value - invested;
    const known = fund.invested != null && invested > 0;
    return {
      ...fund,
      target,
      share,
      deviation: share - target,
      invested,
      gain,
      known,
      gainPct: known ? gain / invested : null,
    };
  });
  const invested = sum(rows, row => row.invested);
  return {
    total,
    invested,
    gain: total - invested,
    gainKnown: rows.length > 0 && rows.every(row => row.known || row.value === 0),
    rows,
  };
}

/**
 * Splits `amount` among the funds (never selling) so the most underweight ones are topped up first:
 * funds are filled up to a common level L (value = weight × L) until the money runs out.
 * This gets closer to the target weights than splitting proportionally to each fund's gap.
 */
function fill(funds, amount) {
  const result = funds.map(() => 0);
  const candidates = funds
    .map((fund, index) => ({ index, weight: fund.weight, value: fund.value, ratio: fund.value / fund.weight }))
    .filter(fund => fund.weight > 0)
    .sort((a, b) => a.ratio - b.ratio);
  let weights = 0;
  let values = 0;
  let level = 0;
  for (const [k, fund] of candidates.entries()) {
    weights += fund.weight;
    values += fund.value;
    level = (amount + values) / weights;
    if (level <= (candidates[k + 1]?.ratio ?? Infinity)) break;
  }
  for (const fund of candidates) result[fund.index] = Math.max(0, fund.weight * level - fund.value);
  return result;
}

/**
 * Suggested amount per fund: whole euros (cents, if any, go to the biggest buy), no buy under
 * MIN_PURCHASE unless it is the only one, and adding up exactly to `amount`.
 */
export function suggestContribution(funds, amount, minimum = MIN_PURCHASE) {
  if (!(amount > 0) || !funds.some(fund => fund.weight > 0)) return funds.map(() => 0);

  // Drop the smallest too-small buy and split again, until every buy is big enough
  let active = funds;
  let split = fill(active, amount);
  for (;;) {
    const buying = split.filter(value => value > 0);
    const tooSmall = split.map((value, i) => [value, i]).filter(([value]) => value > 0 && value < minimum);
    if (!tooSmall.length || buying.length < 2) break;
    const [, smallest] = tooSmall.reduce((a, b) => (b[0] < a[0] ? b : a));
    active = active.map((fund, i) => (i === smallest ? { ...fund, weight: 0 } : fund));
    split = fill(active, amount);
  }

  // Whole euros by largest remainder, then the cents to the biggest buy
  const euros = Math.floor(amount);
  const result = split.map(Math.floor);
  const byRemainder = split
    .map((value, i) => [value - Math.floor(value), i])
    .filter(([, i]) => split[i] > 0)
    .sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < euros - sum(result, v => v); k++) result[byRemainder[k % byRemainder.length][1]]++;
  const biggest = result.indexOf(Math.max(...result));
  result[biggest] = Math.round((result[biggest] + amount - euros) * 100) / 100;
  return result;
}

/**
 * Funds too far above their target for contributions alone to fix it soon (the "5/25" rule:
 * more than 5 points, or more than 25 % of their own target). `excess` is the money above target.
 */
export const overweight = ({ rows, total }) =>
  rows
    .filter(row => row.deviation > Math.min(0.05, row.target * 0.25))
    .map(row => ({ ...row, excess: row.deviation * total }));

/** Target and current share per asset type ("Tipo" column), biggest target first. */
export const byType = ({ rows }) =>
  [...Map.groupBy(rows, row => row.type || 'Sin tipo')]
    .map(([type, list]) => ({ type, target: sum(list, r => r.target), share: sum(list, r => r.share) }))
    .sort((a, b) => b.target - a.target);

/** Future value of `start` plus `monthly` contributions for `years` at `annualRate` (0.05 = 5 %). */
export function projection(start, monthly, annualRate, years) {
  const months = years * 12;
  const rate = (1 + annualRate) ** (1 / 12) - 1;
  const growth = (1 + rate) ** months;
  return {
    value: start * growth + (rate ? (monthly * (growth - 1)) / rate : monthly * months),
    contributed: monthly * months,
  };
}
