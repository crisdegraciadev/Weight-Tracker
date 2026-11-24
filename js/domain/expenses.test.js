/* Self-check for the expense calculations: `node js/domain/expenses.test.js` */
import assert from 'node:assert/strict';
import {
  addMonths,
  budgetLevel,
  dayOfMonth,
  filterExpenses,
  knownConcepts,
  lastMonths,
  monthlyByCategory,
  monthSummary,
  pendingRecurring,
  savingsByMonth,
} from './expenses.js';

const expenses = [
  { date: '2026-10-31', category: 'Casa', amount: 500, concept: 'Alquiler' },
  { date: '2026-11-01', category: 'Comida', amount: 30, concept: 'Mercadona' },
  { date: '2026-11-03', category: 'Casa', amount: 90, concept: 'Luz' },
  { date: '2026-11-05', category: 'Comida', amount: 20, concept: 'Mercadona' },
  { date: '2026-11-06', category: '', amount: 10, concept: 'Café' },
];

// Month summary, with budgets
const nov = monthSummary(expenses, '2026-11', [
  { name: 'Casa', budget: 100 },
  { name: 'Comida', budget: null },
  { name: 'Ocio', budget: 50 },
]);
assert.equal(nov.total, 150);
assert.equal(nov.count, 4);
assert.deepEqual(
  nov.byCategory.map(c => [c.category, c.amount, c.count, c.budget, c.used]),
  [
    ['Casa', 90, 1, 100, 0.9],
    ['Comida', 50, 2, null, null],
    ['Sin categoría', 10, 1, null, null],
    ['Ocio', 0, 0, 50, 0], // budgeted, nothing spent yet
  ],
);
assert.equal(nov.byCategory[0].share, 0.6);
assert.deepEqual(monthSummary([], '2026-11'), { total: 0, count: 0, byCategory: [] });

assert.equal(budgetLevel(null), null);
assert.equal(budgetLevel(0.5), 'ok');
assert.equal(budgetLevel(0.8), 'warn');
assert.equal(budgetLevel(1), 'warn');
assert.equal(budgetLevel(1.01), 'over');

// Months
assert.equal(addMonths('2026-11', 1), '2026-12');
assert.equal(addMonths('2026-12', 1), '2027-01');
assert.equal(addMonths('2026-01', -1), '2025-12');
assert.equal(addMonths('2026-03', -14), '2025-01');
assert.deepEqual(lastMonths('2026-02', 3), ['2025-12', '2026-01', '2026-02']);

assert.deepEqual(monthlyByCategory(expenses, ['2026-10', '2026-11']), [
  { category: 'Casa', totals: [500, 90] },
  { category: 'Comida', totals: [0, 50] },
  { category: 'Sin categoría', totals: [0, 10] },
]);

// Recurring
assert.equal(dayOfMonth('2026-04', 31), '2026-04-30');
assert.equal(dayOfMonth('2028-02', 30), '2028-02-29');
assert.equal(dayOfMonth('2026-11', 5), '2026-11-05');
const recurring = [
  { concept: 'Alquiler', category: 'Casa', amount: 500, day: 1 },
  { concept: 'luz', category: 'Casa', amount: 90, day: 3 },
];
assert.deepEqual(
  pendingRecurring(recurring, expenses, '2026-11').map(r => r.concept),
  ['Alquiler'], // "Luz" already logged this month (case-insensitive)
);
assert.deepEqual(pendingRecurring(recurring, expenses, '2026-10').map(r => r.concept), ['luz']);

// Filter and autocompletion
assert.equal(filterExpenses(expenses, { category: 'Comida' }).length, 2);
assert.equal(filterExpenses(expenses, { search: 'cafe' }).length, 1); // accents ignored
assert.equal(filterExpenses(expenses, { category: 'Casa', search: 'luz' }).length, 1);
assert.equal(filterExpenses(expenses).length, 5);
assert.deepEqual(knownConcepts(expenses).slice(0, 1), ['Mercadona']);

// Target: months before the first expense are skipped; empty months save the whole target
const savings = savingsByMonth(expenses, ['2026-09', '2026-10', '2026-11', '2026-12'], 400);
assert.deepEqual(
  savings.rows.map(r => [r.month, r.total, r.saved]),
  [
    ['2026-10', 500, -100],
    ['2026-11', 150, 250],
    ['2026-12', 0, 400],
  ],
);
assert.equal(savings.saved, 550);
assert.deepEqual(savingsByMonth([], ['2026-11'], 400), { rows: [], saved: 0 });

console.log('expenses ok');
