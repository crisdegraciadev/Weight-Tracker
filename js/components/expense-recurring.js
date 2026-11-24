/*
 * Recurring expenses (rent, subscriptions): add, edit and delete them, and log the ones still pending
 * this month with one click. One counts as logged when this month has an expense with its concept and category.
 */
import { $, on } from '../core/dom.js';
import { today } from '../core/dates.js';
import { formatEuros } from '../core/format.js';
import { dayOfMonth, pendingRecurring } from '../domain/expenses.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';
import { editableRow, fillCategorySelect } from './expenses.js';

const toExpense = (item, month) => ({
  date: dayOfMonth(month, item.day),
  category: item.category,
  amount: item.amount,
  concept: item.concept,
});

export function mountExpenseRecurring() {
  const form = $('recurringForm');
  const fields = {
    concept: $('recurringConcept'),
    category: $('recurringCategory'),
    amount: $('recurringAmount'),
    day: $('recurringDay'),
  };
  let editingRow = null;

  const setEditing = item => {
    editingRow = item?.row ?? null;
    form.reset();
    if (item) for (const key of Object.keys(fields)) fields[key].value = item[key];
    $('recurringSubmit').textContent = item ? 'Guardar' : 'Añadir';
    $('recurringCancel').hidden = !item;
  };

  store.watch(['categories'], ({ categories }) => fillCategorySelect(fields.category, categories, 'Elige una'));

  store.watch(['recurring', 'expenses'], ({ recurring, expenses }) => {
    const pending = pendingRecurring(recurring, expenses, today().slice(0, 7));
    $('recurringPending').hidden = !pending.length;
    $('recurringPendingText').textContent =
      `${pending.length === 1 ? 'Falta 1 gasto fijo' : `Faltan ${pending.length} gastos fijos`} por apuntar este mes: ` +
      `${pending.map(item => item.concept).join(', ')} (${formatEuros(pending.reduce((t, i) => t + i.amount, 0))}).`;

    $('recurringEmpty').hidden = recurring.length > 0;
    $('recurringList').replaceChildren(
      ...recurring.map(item => {
        const el = editableRow(
          item.concept,
          formatEuros(item.amount),
          `Día ${item.day} · ${item.category}${pending.includes(item) ? ' · pendiente este mes' : ''}`,
          item.row,
        );
        if (pending.includes(item)) el.dataset.pending = '';
        return el;
      }),
    );
  });

  on('recurringLogAll', 'click', () => {
    const { recurring, expenses } = store.get();
    const month = today().slice(0, 7);
    return actions.addExpenses(pendingRecurring(recurring, expenses, month).map(item => toExpense(item, month)));
  });

  on('recurringList', 'click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const item = store.get().recurring.find(r => r.row === Number(button.dataset.row));
    if (button.dataset.action === 'edit') {
      setEditing(item);
      return fields.concept.focus();
    }
    const accepted = await confirmDialog({
      title: '¿Borrar este gasto fijo?',
      message: `Se borrará «${item.concept}» de los gastos fijos. Los gastos ya apuntados se quedan.`,
      acceptLabel: 'Borrar',
    });
    if (!accepted) return;
    setEditing(null);
    await actions.deleteRecurring(item.row);
  });

  on('recurringCancel', 'click', () => setEditing(null));

  on(form, 'submit', async e => {
    e.preventDefault();
    await actions.saveRecurring(editingRow, {
      concept: fields.concept.value.trim(),
      category: fields.category.value,
      amount: Number(fields.amount.value),
      day: Number(fields.day.value),
    });
    setEditing(null);
  });
}
