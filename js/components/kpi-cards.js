/* Headline figures: last weight, weekly average and minimum, average steps. */
import { $ } from '../core/dom.js';
import { formatDate } from '../core/dates.js';
import { deltaPill, formatNumber } from '../core/format.js';
import { lastWeighIn, latestTwo } from '../domain/stats.js';
import { store } from '../state.js';

const kg = text => `${text}<small>kg</small>`;
const versusPrevious = pill => (pill ? `${pill} vs semana anterior` : '');

export function mountKpiCards() {
  store.watch(['days', 'weeks'], ({ days, weeks }) => {
    const last = lastWeighIn(days);
    $('kpiLastWeight').innerHTML = last ? kg(formatNumber(last.weight)) : '—';
    $('kpiLastDate').textContent = last
      ? formatDate(last.date, { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    const weight = latestTwo(weeks, 'weight');
    const hasWeightDelta = weight.current && weight.previous;
    $('kpiWeekAvg').innerHTML = weight.current ? kg(formatNumber(weight.current.weight, 2)) : '—';
    $('kpiWeekAvgDelta').innerHTML = versusPrevious(
      hasWeightDelta && deltaPill(weight.current.weight - weight.previous.weight, { decimals: 2, unit: ' kg' }),
    );
    $('kpiWeekMin').innerHTML = weight.current ? kg(formatNumber(weight.current.min)) : '—';
    $('kpiWeekMinDelta').innerHTML = versusPrevious(
      hasWeightDelta && deltaPill(weight.current.min - weight.previous.min, { unit: ' kg' }),
    );

    const steps = latestTwo(weeks, 'steps');
    $('kpiSteps').textContent = steps.current ? formatNumber(steps.current.steps, 0) : '—';
    $('kpiStepsDelta').innerHTML = versusPrevious(
      steps.current &&
        steps.previous &&
        deltaPill(steps.current.steps - steps.previous.steps, { decimals: 0, lowerIsBetter: false }),
    );
  });
}
