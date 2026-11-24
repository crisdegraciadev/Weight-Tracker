/*
 * Expenses live in their own tab ("Gastos") of the tracker's spreadsheet, created on the first save.
 * Row 1 holds the headers; three blocks side by side, with an empty column between them:
 *   A:D = expenses, one per row: date, category name, amount (€), concept
 *   F:G = categories, one per row: name, monthly budget (€, empty = none)
 *   I:L = recurring expenses, one per row: concept, category name, amount (€), day of the month
 *   N2  = monthly spending target (€, empty = none)
 * Expenses and recurring expenses point to their category by name, so renaming or merging a category
 * rewrites them too. Deleting only shifts up its own block, so the other blocks' rows stay where they are.
 */
import { fromSheetSerial } from '../core/dates.js';
import * as api from './sheets-api.js';

const TAB = 'Gastos';
const HEADERS = [
  [
    'Fecha',
    'Categoría',
    'Importe (€)',
    'Concepto',
    '',
    'Categorías',
    'Presupuesto mensual (€)',
    '',
    'Gasto fijo',
    'Categoría',
    'Importe (€)',
    'Día del mes',
    '',
    'Gasto objetivo mensual (€)',
  ],
];
const EXPENSES = { first: 'A', last: 'D', startColumn: 0 };
const CATEGORIES = { first: 'F', last: 'G', startColumn: 5 };
const RECURRING = { first: 'I', last: 'L', startColumn: 8 };

const findTab = async id => (await api.getSpreadsheet(id)).sheets.find(sheet => sheet.properties.title === TAB);
const toDate = value => (typeof value === 'number' ? fromSheetSerial(value) : value ? String(value) : null);
const text = value => (value ? String(value).trim() : '');
const numberOrNull = value => (value === '' || value == null ? null : Number(value) || null);

export async function loadExpenses({ id }) {
  if (!(await findTab(id))) return { expenses: [], categories: [], recurring: [], target: null };
  const { valueRanges } = await api.batchGet(id, [api.a1(TAB, 'A2:D'), api.a1(TAB, 'F2:G'), api.a1(TAB, 'I2:L'), api.a1(TAB, 'N2')]);
  const [expenseRows, categoryRows, recurringRows, [[target] = []]] = valueRanges.map(range => range.values ?? []);
  return {
    expenses: expenseRows
      .map((cells, index) => ({
        row: index + 2,
        date: toDate(cells[0]),
        category: text(cells[1]),
        amount: Number(cells[2]) || 0,
        concept: text(cells[3]),
      }))
      .filter(expense => expense.date && expense.amount)
      .sort((a, b) => a.date.localeCompare(b.date)), // stable: same-day rows keep the sheet order
    categories: categoryRows
      .map((cells, index) => ({ row: index + 2, name: text(cells[0]), budget: numberOrNull(cells[1]) }))
      .filter(category => category.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    recurring: recurringRows
      .map((cells, index) => ({
        row: index + 2,
        concept: text(cells[0]),
        category: text(cells[1]),
        amount: Number(cells[2]) || 0,
        day: Math.min(31, Math.max(1, Number(cells[3]) || 1)),
      }))
      .filter(item => item.concept && item.amount)
      .sort((a, b) => a.day - b.day),
    target: numberOrNull(target),
  };
}

async function ensureTab(id) {
  if (!(await findTab(id))) await api.batchUpdate(id, [{ addSheet: { properties: { title: TAB } } }]);
  // Always rewritten, so tabs created before a new block was added get its headers too
  await api.updateValues(id, api.a1(TAB, 'A1:N1'), HEADERS);
}

// USER_ENTERED so Sheets stores real dates
async function append(id, block, rows) {
  await ensureTab(id);
  await api.appendValues(id, api.a1(TAB, `${block.first}:${block.last}`), rows);
}

const update = (id, block, row, values) =>
  api.updateValues(id, api.a1(TAB, `${block.first}${row}:${block.last}${row}`), [values], 'USER_ENTERED');

/** Removes the row from its block only, shifting the rows below it up. */
async function remove(id, block, row) {
  const { sheetId } = (await findTab(id)).properties;
  const width = block.last.charCodeAt(0) - block.first.charCodeAt(0) + 1;
  await api.batchUpdate(id, [
    {
      deleteRange: {
        range: {
          sheetId,
          startRowIndex: row - 1,
          endRowIndex: row,
          startColumnIndex: block.startColumn,
          endColumnIndex: block.startColumn + width,
        },
        shiftDimension: 'ROWS',
      },
    },
  ]);
}

/** Cell updates that move every expense and recurring expense filed under `from` to the category `to`. */
const refile = (from, to, expenses, recurring) => [
  ...expenses
    .filter(expense => expense.category === from)
    .map(expense => ({ range: api.a1(TAB, `B${expense.row}`), values: [[to]] })),
  ...recurring
    .filter(item => item.category === from)
    .map(item => ({ range: api.a1(TAB, `J${item.row}`), values: [[to]] })),
];

const expenseRow = ({ date, category, amount, concept }) => [date, category, amount, concept];
const recurringRow = ({ concept, category, amount, day }) => [concept, category, amount, day];

export const addExpenses = ({ id }, expenses) => append(id, EXPENSES, expenses.map(expenseRow));
export const updateExpense = ({ id }, row, expense) => update(id, EXPENSES, row, expenseRow(expense));
export const deleteExpense = ({ id }, row) => remove(id, EXPENSES, row);

export const addCategory = ({ id }, { name, budget }) => append(id, CATEGORIES, [[name, budget ?? '']]);
export const deleteCategory = ({ id }, row) => remove(id, CATEGORIES, row);

/** New name and budget; a new name also moves its expenses and recurring expenses. */
export const updateCategory = ({ id }, category, { name, budget }, expenses, recurring) =>
  api.batchUpdateValues(id, [
    { range: api.a1(TAB, `F${category.row}:G${category.row}`), values: [[name, budget ?? '']] },
    ...(name === category.name ? [] : refile(category.name, name, expenses, recurring)),
  ]);

/** Moves everything filed under `source` to `target`, then deletes `source`. */
export async function mergeCategory({ id }, source, target, expenses, recurring) {
  const moves = refile(source.name, target.name, expenses, recurring);
  if (moves.length) await api.batchUpdateValues(id, moves);
  await remove(id, CATEGORIES, source.row);
}

export const addRecurring = ({ id }, item) => append(id, RECURRING, [recurringRow(item)]);
export const updateRecurring = ({ id }, row, item) => update(id, RECURRING, row, recurringRow(item));
export const deleteRecurring = ({ id }, row) => remove(id, RECURRING, row);

/** Monthly spending target; null clears it. */
export async function saveTarget({ id }, target) {
  await ensureTab(id);
  await api.updateValues(id, api.a1(TAB, 'N2'), [[target ?? '']]);
}
