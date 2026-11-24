/*
 * Month summary: ‹ › to move between months, the month's total against the previous one,
 * and the split by category with a budget bar (amber from 80 %, red past 100 %) where there is one.
 */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatEuros } from '../core/format.js';
import { addMonths, budgetLevel, monthSummary } from '../domain/expenses.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { gastos } from './expenses.js';

const monthName = month => formatDate(`${month}-01`, { month: 'long', year: 'numeric' });

function categoryRow({ category, amount, share, count, budget, used }) {
  const el = document.createElement('div');
  el.className = 'budget-row';
  const level = budgetLevel(used);
  if (level) el.dataset.level = level;
  const dt = document.createElement('dt');
  dt.textContent = category;
  const dd = document.createElement('dd');
  dd.textContent = budget ? `${formatEuros(amount)} / ${formatEuros(budget)}` : formatEuros(amount);
  const small = document.createElement('small');
  small.textContent = budget
    ? used > 1
      ? `${formatEuros(amount - budget)} por encima del presupuesto`
      : `Quedan ${formatEuros(budget - amount)} · ${gastos(count)}`
    : `${Math.round(share * 100)} % · ${gastos(count)}`;
  dd.append(small);
  el.append(dt, dd);
  if (budget) {
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.role = 'progressbar';
    bar.ariaLabel = `Presupuesto de ${category}`;
    bar.ariaValueNow = Math.round(used * 100);
    bar.ariaValueMin = 0;
    bar.ariaValueMax = 100;
    bar.innerHTML = `<i style="width: ${Math.min(100, used * 100)}%"></i>`;
    el.append(bar);
  }
  return el;
}

export function mountExpenseMonth() {
  store.watch(['expenses', 'categories', 'expenseMonth'], ({ expenses, categories, expenseMonth: month }) => {
    const current = monthSummary(expenses, month, categories);
    const previous = monthSummary(expenses, addMonths(month, -1));
    const isCurrent = month === today().slice(0, 7);
    $('expenseMonthName').textContent = isCurrent ? 'Este mes' : monthName(month);
    $('expenseMonthNext').disabled = isCurrent;
    $('expenseMonthTotal').textContent = formatEuros(current.total);
    const diff = current.total - previous.total;
    $('expenseMonthMeta').textContent =
      `${gastos(current.count)} · ${previous.total ? `${diff > 0 ? '+' : ''}${formatEuros(diff)} respecto a ` : ''}` +
      `${monthName(addMonths(month, -1))} (${formatEuros(previous.total)})`;
    $('expenseByCategoryEmpty').hidden = current.byCategory.length > 0;
    $('expenseByCategory').replaceChildren(...current.byCategory.map(categoryRow));
  });

  const move = delta => actions.showExpenseMonth(addMonths(store.get().expenseMonth, delta));
  on('expenseMonthPrev', 'click', () => move(-1));
  on('expenseMonthNext', 'click', () => move(1));
}
