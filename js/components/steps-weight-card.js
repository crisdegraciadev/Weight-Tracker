/*
 * Compares the average weekly weight change of weeks above vs below a step threshold:
 * the step goal when set, otherwise the median of weekly step averages.
 */
import { $ } from '../core/dom.js';
import { deltaPill, formatNumber } from '../core/format.js';
import { compareStepsAndWeight, median } from '../domain/stats.js';
import { store } from '../state.js';

const MIN_DIFFERENCE_KG = 0.05;
const FEW_WEEKS = 6;

export function mountStepsWeightCard() {
  store.watch(['weeks', 'stepGoal'], ({ weeks, stepGoal }) => {
    const threshold = stepGoal ?? median(weeks.map(week => week.steps).filter(steps => steps != null));
    if (threshold == null) {
      $('stepsWeightRows').replaceChildren();
      $('stepsWeightSummary').textContent = 'Aún no hay semanas con pasos registrados';
      return;
    }

    const { above, below } = compareStepsAndWeight(weeks, threshold);
    const label = formatNumber(threshold, 0) + (stepGoal == null ? ' (tu mediana)' : '');
    $('stepsWeightRows').replaceChildren(
      createRow(`≥ ${label} pasos/día`, above),
      createRow(`< ${label} pasos/día`, below),
    );
    $('stepsWeightSummary').textContent = summarize(above, below);
  });
}

function createRow(label, group) {
  const row = document.createElement('div');
  row.className = 'row';
  const weeks = `${group.count} ${group.count === 1 ? 'semana' : 'semanas'}`;
  row.innerHTML = `
    <span>${label}<small>${weeks}</small></span>
    ${group.count ? deltaPill(group.change, { decimals: 2, unit: ' kg/sem' }) : '<span class="empty">—</span>'}`;
  return row;
}

function summarize(above, below) {
  if (!above.count || !below.count) return 'Necesito semanas por encima y por debajo para comparar';
  const difference = below.change - above.change;
  const caution = above.count + below.count < FEW_WEEKS ? ' (aún hay pocas semanas, tómalo con cautela)' : '';
  if (difference > MIN_DIFFERENCE_KG)
    return `Las semanas con más pasos bajas ${formatNumber(difference, 2)} kg más de media${caution}`;
  if (difference < -MIN_DIFFERENCE_KG) return `De momento caminar más no se refleja en tu peso${caution}`;
  return `Sin diferencia clara por ahora${caution}`;
}
