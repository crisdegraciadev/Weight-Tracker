/*
 * Expense categories: add, edit name and monthly budget (its expenses follow a new name), merge into
 * another one by renaming it to an existing name, and delete when nothing uses it.
 */
import { $, on } from '../core/dom.js';
import { formatEuros } from '../core/format.js';
import { notify } from '../core/notify.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';
import { editableRow, gastos } from './expenses.js';

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function mountExpenseCategories() {
  const form = $('categoryForm');
  const name = $('categoryName');
  const budget = $('categoryBudget');
  let editing = null; // category being edited; null = adding a new one

  const setEditing = category => {
    editing = category ?? null;
    form.reset();
    name.value = category?.name ?? '';
    budget.value = category?.budget ?? '';
    $('categorySubmit').textContent = category ? 'Guardar' : 'Añadir';
    $('categoryCancel').hidden = !category;
  };

  const usage = (name, { expenses, recurring }) => ({
    expenses: expenses.filter(e => e.category === name).length,
    recurring: recurring.filter(r => r.category === name).length,
  });

  store.watch(['categories', 'expenses', 'recurring'], state => {
    $('categoryEmpty').hidden = state.categories.length > 0;
    $('categoryList').replaceChildren(
      ...state.categories.map(category =>
        editableRow(
          category.name,
          category.budget ? `${formatEuros(category.budget)}/mes` : '',
          gastos(usage(category.name, state).expenses),
          category.row,
        ),
      ),
    );
  });

  on('categoryList', 'click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const state = store.get();
    const category = state.categories.find(c => c.row === Number(button.dataset.row));
    if (button.dataset.action === 'edit') {
      setEditing(category);
      return name.focus();
    }
    const used = usage(category.name, state);
    if (used.expenses || used.recurring)
      return notify(
        `«${category.name}» está en uso (${[used.expenses && gastos(used.expenses), used.recurring && `${used.recurring} fijos`].filter(Boolean).join(' y ')}): ` +
          'cámbialos de categoría o fusiónala con otra renombrándola',
      );
    const accepted = await confirmDialog({
      title: '¿Borrar esta categoría?',
      message: `Se borrará «${category.name}» también de la hoja de cálculo.`,
      acceptLabel: 'Borrar',
    });
    if (!accepted) return;
    setEditing(null); // rows below shift up, so a row being edited would point to the wrong category
    await actions.deleteCategory(category.row);
  });

  on('categoryCancel', 'click', () => setEditing(null));

  on(form, 'submit', async e => {
    e.preventDefault();
    const state = store.get();
    const changes = { name: name.value.trim(), budget: budget.value === '' ? null : Number(budget.value) };
    const other = state.categories.find(c => c !== editing && sameName(c.name, changes.name));

    if (other && !editing) {
      name.setCustomValidity('Ya hay una categoría con ese nombre');
      return name.reportValidity();
    }
    if (other) {
      const moved = usage(editing.name, state);
      const accepted = await confirmDialog({
        title: `¿Fusionar «${editing.name}» en «${other.name}»?`,
        message:
          `${gastos(moved.expenses)}${moved.recurring ? ` y ${moved.recurring} fijos` : ''} pasarán a «${other.name}» ` +
          `y «${editing.name}» se borrará. Se mantiene el presupuesto de «${other.name}».`,
        acceptLabel: 'Fusionar',
      });
      if (!accepted) return;
      await actions.mergeCategory(editing, other);
    } else if (editing) {
      if (changes.name !== editing.name || changes.budget !== editing.budget) await actions.updateCategory(editing, changes);
    } else await actions.addCategory(changes);
    setEditing(null);
  });
  on(name, 'input', () => name.setCustomValidity(''));
}
