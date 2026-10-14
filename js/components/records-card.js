/* All-time bests: lowest weight, biggest weekly drop, most steps in a day and best steps week. */
import { $ } from '../core/dom.js';
import { addDays, dayMonth, formatDate } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { personalRecords } from '../domain/stats.js';
import { store } from '../state.js';

const longDate = iso => formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' });
const weekRange = start => `semana ${dayMonth(start)} – ${dayMonth(addDays(start, 6))}`;

export function mountRecordsCard() {
  store.watch(['days', 'weeks'], ({ days, weeks }) => {
    const { lowestWeight, biggestDrop, mostSteps, bestStepsWeek } = personalRecords(days, weeks);
    $('recordsList').replaceChildren(
      row(
        'Peso más bajo',
        lowestWeight && `${formatNumber(lowestWeight.weight)} kg`,
        lowestWeight && longDate(lowestWeight.date),
      ),
      row(
        'Mayor bajada semanal',
        biggestDrop && `${formatNumber(biggestDrop.change, 2)} kg`,
        biggestDrop && weekRange(biggestDrop.week.start),
      ),
      row('Día con más pasos', mostSteps && formatNumber(mostSteps.steps, 0), mostSteps && longDate(mostSteps.date)),
      row(
        'Mejor semana de pasos',
        bestStepsWeek && `${formatNumber(bestStepsWeek.steps, 0)}/día`,
        bestStepsWeek && weekRange(bestStepsWeek.start),
      ),
    );
  });
}

function row(label, value, detail) {
  const el = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value ?? '—';
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    dd.append(small);
  }
  el.append(dt, dd);
  return el;
}
