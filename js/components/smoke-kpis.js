/* Headline figures: money saved, life gained (from cigarettes avoided), best streak and cravings this week. */
import { $, on } from '../core/dom.js';
import { today } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { attemptDays, cravingStats, currentAttempt, lifeGainedMinutes, savings, smokeStats } from '../domain/smoke.js';
import * as actions from '../actions.js';
import { store } from '../state.js';

const euros = value => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const days = n => `${formatNumber(n, 0)} ${n === 1 ? 'día' : 'días'}`;

/** "9<small>d</small> 19<small>h</small>", or hours and minutes under a day. */
function duration(minutes) {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.round(minutes % 60);
  return d ? `${d}<small>d</small> ${h}<small>h</small>` : `${h}<small>h</small> ${m}<small>min</small>`;
}

export function mountSmokeKpis() {
  store.watch(['attempts', 'smokeCosts'], ({ attempts, smokeCosts: costs }) => {
    const now = today();
    const current = currentAttempt(attempts);
    const { best, total, count } = smokeStats(attempts, now);

    $('kpiBest').textContent = count ? days(best) : '—';
    $('kpiBestMeta').textContent = count
      ? `${count} ${count === 1 ? 'intento' : 'intentos'} · ${days(total)} en total`
      : '';

    if (!costs) {
      $('kpiSaved').textContent = $('kpiLife').textContent = '—';
      $('kpiSavedTotal').textContent = $('kpiAvoidedMeta').textContent = 'Indica lo que fumabas con el lápiz';
      return;
    }
    const thisAttempt = savings(current ? attemptDays(current, now) : 0, costs);
    $('kpiSaved').textContent = euros(thisAttempt.money);
    $('kpiSavedTotal').textContent = `${euros(savings(total, costs).money)} en todos los intentos`;
    $('kpiLife').innerHTML = duration(lifeGainedMinutes(thisAttempt.cigarettes));
    $('kpiAvoidedMeta').textContent = `${formatNumber(thisAttempt.cigarettes, 0)} cigarrillos × ~20 min`;
  });

  store.watch(['cravings'], ({ cravings }) => {
    const { lastWeek, intensity } = cravingStats(cravings, today());
    $('kpiCravings').textContent = formatNumber(lastWeek, 0);
    $('kpiCravingsMeta').textContent = intensity == null ? '' : `Intensidad media ${formatNumber(intensity)} / 5`;
  });

  // Cigarettes per day and pack price are edited in a dialog
  const dialog = $('costsDialog');
  on('editSmokeCosts', 'click', () => {
    const costs = store.get().smokeCosts;
    $('smokePerDay').value = costs?.perDay ?? '';
    $('smokePackPrice').value = costs?.packPrice ?? '';
    dialog.returnValue = '';
    dialog.showModal();
  });
  on('costsCancel', 'click', () => dialog.close());
  on(
    dialog,
    'close',
    () =>
      dialog.returnValue === 'ok' &&
      actions.saveSmokeCosts({
        perDay: Number($('smokePerDay').value),
        packPrice: Number($('smokePackPrice').value),
      }),
  );
}
