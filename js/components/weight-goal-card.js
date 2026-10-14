/* Weight goal: progress since the first weigh-in, current pace and estimated arrival date. */
import { $ } from '../core/dom.js';
import { formatDate } from '../core/dates.js';
import { deltaPill, formatNumber } from '../core/format.js';
import { firstWeighIn, forecastGoalDate, goalProgress, lastWeighIn, weightTrend } from '../domain/stats.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { mountGoalEditor } from './goal-editor.js';

export function mountWeightGoalCard() {
  mountGoalEditor({
    stateKey: 'weightGoal',
    prefix: 'weightGoal',
    editId: 'editWeightGoal',
    save: actions.saveWeightGoal,
  });

  store.watch(['days', 'weightGoal'], ({ days, weightGoal: goal }) => {
    const first = firstWeighIn(days);
    if (goal == null || !first) return;

    const last = lastWeighIn(days);
    const { percent, achieved, remaining } = goalProgress(first.weight, last.weight, goal);
    $('weightGoalCurrent').textContent = formatNumber(last.weight);
    $('weightGoalTarget').textContent = formatNumber(goal);
    $('weightGoalPercent').textContent = percent + '%';
    $('weightGoalBar').style.width = percent + '%';
    $('weightGoalBar').parentElement.setAttribute('aria-valuenow', percent);
    $('weightGoalSummary').textContent =
      percent >= 100
        ? '¡Objetivo conseguido! 🎉'
        : `Desde ${formatNumber(first.weight)} kg · ${achieved >= 0 ? 'perdido' : 'ganado'} ` +
          `${formatNumber(Math.abs(achieved))} kg · faltan ${formatNumber(Math.abs(remaining))} kg`;

    renderPace(weightTrend(days), goal, first.weight > goal, percent >= 100);
  });
}

function renderPace(trend, goal, losing, reached) {
  if (!trend) {
    $('weightGoalPace').textContent = 'Faltan datos';
    $('weightGoalForecast').textContent = 'Necesito al menos 10 días de registros';
    return;
  }
  $('weightGoalPace').innerHTML = deltaPill(trend.kgPerWeek, { decimals: 2, unit: ' kg/sem', lowerIsBetter: losing });

  const date = !reached && forecastGoalDate(trend, goal);
  $('weightGoalForecast').textContent = reached
    ? 'Ya has llegado'
    : date
      ? `Hacia el ${formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}`
      : 'Al ritmo actual no te acercas al objetivo';
}
