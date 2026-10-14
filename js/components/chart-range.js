/* Period selector for the charts (last month, 3 months or everything). */
import { $, on } from '../core/dom.js';
import * as actions from '../actions.js';
import { store } from '../state.js';

export function mountChartRange() {
  const group = $('chartRange');
  const buttons = [...group.querySelectorAll('button')];

  store.watch(['chartRange'], ({ chartRange }) => {
    buttons.forEach(button => button.setAttribute('aria-pressed', button.dataset.range === chartRange));
  });

  on(group, 'click', e => {
    const range = e.target.closest('button')?.dataset.range;
    if (range) actions.setChartRange(range);
  });
}
