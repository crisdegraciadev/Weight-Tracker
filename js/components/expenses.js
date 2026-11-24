/*
 * Expenses: form to add or edit one (remembers the last category, suggests known concepts)
 * and the latest expenses, filterable by category and text.
 */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatEuros } from '../core/format.js';
import { filterExpenses, knownConcepts } from '../domain/expenses.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';
import { DELETE_ICON, EDIT_ICON, iconButton } from './migraine.js';
import { row } from './records-card.js';

const LATEST = 50;
const LAST_CATEGORY = 'expenseCategory';
export const shortDate = iso => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });
export const gastos = n => `${n} ${n === 1 ? 'gasto' : 'gastos'}`;

/** Fills a category <select>, keeping its current choice when it still exists. */
export function fillCategorySelect(select, categories, placeholder) {
  const selected = select.value;
  select.replaceChildren(new Option(placeholder, ''), ...categories.map(c => new Option(c.name, c.name)));
  select.value = categories.some(c => c.name === selected) ? selected : '';
}

/** List row with edit/delete buttons; the list's click handler reads data-action and data-row. */
export function editableRow(label, value, detail, sheetRow, editLabel = 'Editar') {
  const el = row(label, value, detail);
  el.insertAdjacentHTML(
    'beforeend',
    `<span class="actions">${iconButton('edit', editLabel, EDIT_ICON, sheetRow)}${iconButton('delete', 'Borrar', DELETE_ICON, sheetRow)}</span>`,
  );
  return el;
}

const remembered = () => {
  try {
    return localStorage.getItem(LAST_CATEGORY) ?? '';
  } catch {
    return '';
  }
};
const remember = category => {
  try {
    localStorage.setItem(LAST_CATEGORY, category);
  } catch {}
};

export function mountExpenses() {
  const form = $('expenseForm');
  const fields = {
    date: $('expenseDate'),
    amount: $('expenseAmount'),
    category: $('expenseCategory'),
    concept: $('expenseConcept'),
  };
  const filter = { category: $('expenseFilterCategory'), search: $('expenseFilterSearch') };
  let editingRow = null; // sheet row of the expense being edited; null = adding a new one

  const setEditing = expense => {
    editingRow = expense?.row ?? null;
    form.reset();
    fields.date.value = expense?.date ?? today();
    fields.amount.value = expense?.amount ?? '';
    fields.category.value = expense ? expense.category : remembered();
    fields.concept.value = expense?.concept ?? '';
    $('expenseFormTitle').textContent = expense ? 'Editar gasto' : 'Apuntar gasto';
    $('expenseCancel').hidden = !expense;
  };

  store.watch(['categories'], ({ categories }) => {
    fillCategorySelect(fields.category, categories, categories.length ? 'Elige una' : 'Crea una categoría primero');
    fillCategorySelect(filter.category, categories, 'Todas');
    if (!editingRow && !fields.category.value) fields.category.value = remembered();
  });
  setEditing(null);

  const renderList = () => {
    const { expenses } = store.get();
    const filtering = Boolean(filter.category.value || filter.search.value.trim());
    const matches = filterExpenses(expenses, { category: filter.category.value, search: filter.search.value });
    const latest = matches.slice(-LATEST).reverse();
    $('expenseFilterMeta').hidden = !filtering;
    $('expenseFilterMeta').textContent = `${gastos(matches.length)} · ${formatEuros(matches.reduce((t, e) => t + e.amount, 0))}`;
    $('expenseEmpty').hidden = latest.length > 0;
    $('expenseEmpty').textContent = filtering ? 'Ningún gasto coincide con el filtro.' : 'Aún no hay gastos apuntados.';
    $('expenseList').replaceChildren(
      ...latest.map(expense =>
        editableRow(
          expense.concept || expense.category || 'Gasto',
          formatEuros(expense.amount),
          [shortDate(expense.date), expense.concept && expense.category].filter(Boolean).join(' · '),
          expense.row,
        ),
      ),
    );
  };

  store.watch(['expenses'], ({ expenses }) => {
    $('expenseConcepts').replaceChildren(...knownConcepts(expenses).map(concept => new Option(concept)));
    renderList();
  });
  on(filter.category, 'change', renderList);
  on(filter.search, 'input', renderList);

  on('expenseList', 'click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const expense = store.get().expenses.find(x => x.row === Number(button.dataset.row));
    if (button.dataset.action === 'edit') {
      setEditing(expense);
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return fields.amount.focus();
    }
    const accepted = await confirmDialog({
      title: '¿Borrar este gasto?',
      message: `Se borrará el gasto de ${formatEuros(expense.amount)} del ${shortDate(expense.date)} también de la hoja de cálculo.`,
      acceptLabel: 'Borrar',
    });
    if (!accepted) return;
    setEditing(null); // rows below shift up, so a row being edited would point to the wrong expense
    await actions.deleteExpense(expense.row);
  });

  on('expenseCancel', 'click', () => setEditing(null));

  on(form, 'submit', async e => {
    e.preventDefault();
    const category = fields.category.value;
    await actions.saveExpense(editingRow, {
      date: fields.date.value,
      amount: Number(fields.amount.value),
      category,
      concept: fields.concept.value.trim(),
    });
    remember(category);
    setEditing(null);
  });
}
