/* Smoke-free counter: days of the attempt in progress, progress to the next milestone and the relapse dialog. */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { attemptDays, currentAttempt, nextMilestone } from '../domain/smoke.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { mountGoalEditor } from './goal-editor.js';

export function mountSmokeHero() {
  mountGoalEditor({
    stateKey: 'smokeFreeSince',
    prefix: 'smokeFree',
    editId: 'editSmokeFree',
    save: actions.saveSmokeFreeSince,
    parse: String,
  });

  store.watch(['attempts'], ({ attempts }) => {
    const current = currentAttempt(attempts);
    if (!current) return;
    const days = attemptDays(current, today());
    $('smokeFreeDays').textContent = formatNumber(days, 0);
    $('smokeFreeUnit').textContent = days === 1 ? 'día' : 'días';
    $('smokeFreeSince').textContent =
      `Desde el ${formatDate(current.start, { day: 'numeric', month: 'long', year: 'numeric' })}`;

    const next = nextMilestone(days) ?? { title: 'todos conseguidos', left: 0, percent: 100, text: '' };
    $('nextMilestoneTitle').textContent = next.title;
    $('nextMilestoneLeft').textContent = next.left ? `faltan ${next.left} ${next.left === 1 ? 'día' : 'días'}` : '';
    $('nextMilestoneText').textContent = next.text;
    $('nextMilestoneBar').style.width = next.percent + '%';
    $('nextMilestoneBar').parentElement.setAttribute('aria-valuenow', next.percent);
  });

  // "He fumado" asks what happened in its own dialog, then restarts the counter
  const dialog = $('relapseDialog');
  on('smokeFreeReset', 'click', () => {
    $('relapseReason').value = '';
    dialog.returnValue = '';
    dialog.showModal();
  });
  on('relapseCancel', 'click', () => dialog.close());
  on(dialog, 'close', () => dialog.returnValue === 'ok' && actions.relapse(today(), $('relapseReason').value.trim()));
}
