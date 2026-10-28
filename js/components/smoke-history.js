/* Every smoke-free attempt, newest first: date range, how many days it lasted and what ended it. */
import { $ } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { attemptDays } from '../domain/smoke.js';
import { store } from '../state.js';
import { row } from './records-card.js';

const shortDate = iso => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

export function mountSmokeHistory() {
  store.watch(['attempts'], ({ attempts }) => {
    const now = today();
    $('smokeHistory').replaceChildren(
      ...attempts
        .toReversed()
        .map(attempt =>
          row(
            `${shortDate(attempt.start)} – ${attempt.end ? shortDate(attempt.end) : 'hoy'}`,
            `${formatNumber(attemptDays(attempt, now), 0)} días`,
            attempt.reason,
          ),
        ),
    );
    if (!attempts.length) $('smokeHistory').textContent = 'Aún no hay intentos';
  });
}
