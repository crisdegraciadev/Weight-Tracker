/* Pure calculations for expenses. Months are "2026-11"; dates are ISO "2026-11-24". */

const sum = list => list.reduce((total, expense) => total + expense.amount, 0);
export const NO_CATEGORY = 'Sin categoría';

/**
 * Total of a month and its split by category, biggest first, with each one's share. With `categories`,
 * each row gets its monthly budget and how much of it is spent (`used`: 1 = exactly on budget).
 */
export function monthSummary(expenses, month, categories = []) {
  const inMonth = expenses.filter(expense => expense.date.startsWith(month));
  const total = sum(inMonth);
  const budgets = new Map(categories.map(c => [c.name, c.budget]));
  const byCategory = [...Map.groupBy(inMonth, expense => expense.category || NO_CATEGORY)]
    .map(([category, list]) => {
      const amount = sum(list);
      const budget = budgets.get(category) ?? null;
      return { category, amount, share: total ? amount / total : 0, count: list.length, budget, used: budget ? amount / budget : null };
    })
    .sort((a, b) => b.amount - a.amount);
  // Budgeted categories with nothing spent yet still show their (empty) budget
  for (const { name, budget } of categories)
    if (budget && !byCategory.some(row => row.category === name))
      byCategory.push({ category: name, amount: 0, share: 0, count: 0, budget, used: 0 });
  return { total, count: inMonth.length, byCategory };
}

/** "ok" under 80 % of the budget, "warn" from 80 %, "over" past 100 %; null without a budget. */
export const budgetLevel = used => (used == null ? null : used > 1 ? 'over' : used >= 0.8 ? 'warn' : 'ok');

/** "2026-11", +1 → "2026-12" */
export function addMonths(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** The `count` months ending at `month`, oldest first. */
export const lastMonths = (month, count) => Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));

/** Per month, the total of each category: { months, series: [{ category, totals: [..per month] }] }, biggest first. */
export function monthlyByCategory(expenses, months) {
  const totals = new Map(); // category → amounts per month
  for (const expense of expenses) {
    const index = months.indexOf(expense.date.slice(0, 7));
    if (index < 0) continue;
    const category = expense.category || NO_CATEGORY;
    if (!totals.has(category)) totals.set(category, months.map(() => 0));
    totals.get(category)[index] += expense.amount;
  }
  const series = [...totals].map(([category, amounts]) => ({ category, totals: amounts }));
  return series.sort((a, b) => b.totals.reduce((x, y) => x + y) - a.totals.reduce((x, y) => x + y));
}

/** That day of the month, or its last day when the month is shorter (31 → 30 Apr, 28/29 Feb). */
export function dayOfMonth(month, day) {
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

/** Recurring expenses not logged yet in `month`: no expense that month with the same concept and category. */
export const pendingRecurring = (recurring, expenses, month) =>
  recurring.filter(
    item =>
      !expenses.some(
        expense =>
          expense.date.startsWith(month) &&
          expense.category === item.category &&
          expense.concept.toLowerCase() === item.concept.toLowerCase(),
      ),
  );

/** Expenses of a category (empty = all) whose concept or category contains `search`, ignoring case and accents. */
export function filterExpenses(expenses, { category = '', search = '' } = {}) {
  const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = fold(search.trim());
  return expenses.filter(
    expense =>
      (!category || expense.category === category) &&
      (!needle || fold(`${expense.concept} ${expense.category}`).includes(needle)),
  );
}

/** Distinct concepts, most used first, for autocompletion. */
export function knownConcepts(expenses) {
  const counts = new Map();
  for (const { concept } of expenses) if (concept) counts.set(concept, (counts.get(concept) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([concept]) => concept);
}

/**
 * Each month against the target: { month, total, saved } where saved > 0 is money under the target
 * and < 0 money over it. Months before the first expense are left out. `saved` adds them all up.
 */
export function savingsByMonth(expenses, months, target) {
  const first = expenses[0]?.date.slice(0, 7);
  const rows = months
    .filter(month => first && month >= first)
    .map(month => {
      const total = sum(expenses.filter(expense => expense.date.startsWith(month)));
      return { month, total, saved: target - total };
    });
  return { rows, saved: rows.reduce((t, row) => t + row.saved, 0) };
}
