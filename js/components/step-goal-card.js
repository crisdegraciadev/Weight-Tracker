/* Daily step goal: how many days this week reached it, plus the 4-week success rate. */
import { $ } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { stepGoalRate, stepGoalWeek } from '../domain/stats.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { mountGoalEditor } from './goal-editor.js';

const STATUS_LABELS = { met: 'meta cumplida', missed: 'por debajo de la meta', empty: 'sin registro', future: '' };

export function mountStepGoalCard() {
  mountGoalEditor({
    stateKey: 'stepGoal',
    prefix: 'stepGoal',
    editId: 'editStepGoal',
    save: actions.saveStepGoal,
  });

  store.watch(['days', 'stepGoal'], ({ days, stepGoal: goal }) => {
    if (goal == null) return;
    const now = today();
    const week = stepGoalWeek(days, goal, now);
    const met = week.filter(day => day.status === 'met').length;
    const elapsed = week.filter(day => day.status !== 'future').length;

    $('stepGoalValue').textContent = formatNumber(goal, 0);
    $('stepGoalWeekCount').textContent = `${met}/${elapsed} días`;
    $('stepGoalDays').replaceChildren(...week.map(createDayDot));

    const rate = stepGoalRate(days, goal, now);
    $('stepGoalRate').textContent = rate == null ? 'Sin registros' : `${Math.round(rate * 100)}% de los días`;
  });
}

function createDayDot(day) {
  const dot = document.createElement('li');
  dot.className = day.status;
  dot.textContent = formatDate(day.date, { weekday: 'narrow' });
  const steps = day.steps == null ? '' : `: ${formatNumber(day.steps, 0)} pasos`;
  dot.title = `${formatDate(day.date, { weekday: 'long', day: 'numeric' })}${steps}`;
  if (STATUS_LABELS[day.status]) dot.title += ` (${STATUS_LABELS[day.status]})`;
  return dot;
}
