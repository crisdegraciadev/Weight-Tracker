/* Health milestones of the attempt in progress: what improves at each mark and whether it is reached. */
import { $ } from '../core/dom.js';
import { today } from '../core/dates.js';
import { attemptDays, currentAttempt, milestoneProgress } from '../domain/smoke.js';
import { store } from '../state.js';

export function mountMilestonesCard() {
  store.watch(['attempts'], ({ attempts }) => {
    const current = currentAttempt(attempts);
    const days = current ? attemptDays(current, today()) : 0;
    const milestones = milestoneProgress(days);
    const reached = milestones.filter(milestone => milestone.status === 'reached').length;
    $('milestonesSummary').textContent = `${reached} de ${milestones.length} conseguidos`;
    $('milestonesList').replaceChildren(...milestones.map(milestone => createItem(milestone, days)));
  });
}

function createItem({ days: target, title, text, status }, days) {
  const item = document.createElement('li');
  item.className = status;

  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  if (status === 'reached') mark.textContent = '✓';

  const name = document.createElement('b');
  name.textContent = title;

  const state = document.createElement('small');
  const left = target - days;
  state.textContent = status === 'reached' ? 'Conseguido' : `Faltan ${left} ${left === 1 ? 'día' : 'días'}`;

  const description = document.createElement('p');
  description.textContent = text;

  item.append(mark, name, state, description);
  return item;
}
