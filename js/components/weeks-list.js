/* Grid of week cards. Shows the latest weeks only, with a toggle to see them all. */
import { $, on } from '../core/dom.js';
import { reportError } from '../core/notify.js';
import { today } from '../core/dates.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { createWeekCard } from './week-card.js';

const VISIBLE_WEEKS = 6;

export function mountWeeksList() {
  const toggle = $('toggleWeeks');
  let showAll = false;

  const render = () => {
    const { weeks } = store.get();
    const shown = showAll ? weeks : weeks.slice(0, VISIBLE_WEEKS);
    const context = {
      today: today(),
      onDayClick: day => actions.selectDate(day.date),
      onNoteChange: (row, text) => actions.saveNote(row, text).catch(reportError),
    };

    $('weeksGrid').replaceChildren(
      ...shown.map((week, index) => {
        const previousWeek = weeks.slice(index + 1).find(w => w.weight != null);
        return createWeekCard(week, previousWeek, context);
      }),
    );
    toggle.hidden = weeks.length <= VISIBLE_WEEKS;
    toggle.textContent = showAll ? 'Ver solo las últimas' : `Ver todas las semanas (${weeks.length})`;
  };

  store.watch(['weeks'], render);
  on(toggle, 'click', () => {
    showAll = !showAll;
    render();
  });
}
