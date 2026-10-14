/* Current and best streaks (weigh-ins and step goal) plus the share of days logged. */
import { $ } from '../core/dom.js';
import { today } from '../core/dates.js';
import { currentStreak, loggingRate, longestStreak, stepGoalDates, weighInDates } from '../domain/stats.js';
import { store } from '../state.js';

const daysLabel = n => `${n}<small>${n === 1 ? 'día' : 'días'}</small>`;

export function mountStreaksCard() {
  store.watch(['days', 'stepGoal'], ({ days, stepGoal }) => {
    const now = today();
    renderStreak('weighIn', weighInDates(days), now);

    if (stepGoal == null) {
      $('stepStreak').textContent = '—';
      $('stepBest').textContent = 'Define una meta de pasos';
    } else {
      renderStreak('step', stepGoalDates(days, stepGoal), now);
    }

    const rate = loggingRate(days, now);
    $('loggingRate').textContent = rate == null ? '—' : `${Math.round(rate * 100)}%`;
  });
}

function renderStreak(prefix, dates, now) {
  $(`${prefix}Streak`).innerHTML = daysLabel(currentStreak(dates, now));
  $(`${prefix}Best`).textContent = `Mejor racha: ${longestStreak(dates)}`;
}
