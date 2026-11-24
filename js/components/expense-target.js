/*
 * Monthly spending target: the selected month against it (bar, money left or over), and for each of
 * the 12 months ending there whether it saved (spent under the target) or overspent, with the running sum.
 * The month in progress counts with what has been spent so far.
 */
import { $ } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatEuros } from '../core/format.js';
import { lastMonths, savingsByMonth } from '../domain/expenses.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { mountGoalEditor } from './goal-editor.js';
import { row } from './records-card.js';

const MONTHS = 12;
const monthName = (month, options = { month: 'long', year: 'numeric' }) => formatDate(`${month}-01`, options);
const signed = amount => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatEuros(Math.abs(amount))}`;

export function mountExpenseTarget() {
  mountGoalEditor({
    stateKey: 'spendTarget',
    prefix: 'spendTarget',
    editId: 'editSpendTarget',
    save: actions.saveSpendTarget,
    parse: value => (value === '' || Number(value) <= 0 ? null : Number(value)),
  });

  store.watch(['expenses', 'spendTarget', 'expenseMonth'], ({ expenses, spendTarget: target, expenseMonth: month }) => {
    if (target == null) return;
    const now = today().slice(0, 7);
    const { rows, saved } = savingsByMonth(expenses, lastMonths(month, MONTHS), target);
    const selected = rows.at(-1) ?? { month, total: 0, saved: target };
    const inProgress = month === now;
    const used = selected.total / target;

    $('spendTargetMonth').textContent = inProgress ? 'Este mes' : monthName(month);
    $('spendTargetSpent').textContent = formatEuros(selected.total);
    $('spendTargetValue').textContent = formatEuros(target);
    $('spendTargetPercent').textContent = `${Math.round(used * 100)} %`;
    const bar = $('spendTargetBar');
    bar.style.width = `${Math.min(100, used * 100)}%`;
    bar.parentElement.setAttribute('aria-valuenow', Math.round(used * 100));
    $('spendTargetView').dataset.level = used > 1 ? 'over' : used >= 0.8 ? 'warn' : 'ok';
    $('spendTargetSummary').textContent =
      selected.saved >= 0
        ? inProgress
          ? `Te quedan ${formatEuros(selected.saved)} para no pasarte este mes`
          : `Ahorraste ${formatEuros(selected.saved)} respecto al objetivo`
        : `${inProgress ? 'Te estás pasando' : 'Te pasaste'} ${formatEuros(-selected.saved)} del objetivo`;

    $('spendTargetHistory').replaceChildren(
      ...rows.toReversed().map(r => {
        const el = row(
          monthName(r.month, { month: 'short', year: 'numeric' }) + (r.month === now ? ' (en curso)' : ''),
          signed(r.saved),
          `${r.saved >= 0 ? 'Ahorro' : 'Exceso'} · gastado ${formatEuros(r.total)}`,
        );
        el.dataset.saved = r.saved >= 0 ? 'yes' : 'no';
        return el;
      }),
    );
    $('spendTargetTotal').textContent = rows.length
      ? `${saved >= 0 ? 'Ahorrado' : 'Gastado de más'} en ${rows.length} ${rows.length === 1 ? 'mes' : 'meses'}: ${formatEuros(Math.abs(saved))}`
      : '';
  });
}
