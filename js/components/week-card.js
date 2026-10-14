/* Card for one week: change vs the previous week, summary stats, daily rows and editable notes. */

const DUMBBELL_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>';
import { addDays, dayMonth, formatDate, startOfWeek } from '../core/dates.js';
import { deltaPill, formatNumber } from '../core/format.js';

/**
 * @param week          week to render (from buildWeeks)
 * @param previousWeek  closest older week with weight data, for the change badge
 * @param onDayClick    (day) => void
 * @param onNoteChange  (row, text) => void, fired when the notes field loses focus after editing
 */
export function createWeekCard(week, previousWeek, { today, onDayClick, onNoteChange }) {
  const isCurrent = week.start === startOfWeek(today);
  const card = document.createElement('article');
  card.className = 'card week-card' + (isCurrent ? ' current' : '');
  card.innerHTML = `
    <div class="head">
      <div>
        <b>${dayMonth(week.start)} – ${dayMonth(addDays(week.start, 6))}</b>
        ${isCurrent ? '<span class="tag">Actual</span>' : ''}
      </div>
      ${week.weight != null && previousWeek ? deltaPill(week.weight - previousWeek.weight, { decimals: 2, unit: ' kg' }) : ''}
    </div>
    <div class="stats">
      <div class="stat" style="--accent: var(--color-violet)"><span>Media</span><b>${formatNumber(week.weight, 2)}</b></div>
      <div class="stat" style="--accent: var(--color-orange)"><span>Mínimo</span><b>${formatNumber(week.min)}</b></div>
      <div class="stat" style="--accent: var(--color-aqua)"><span>Pasos</span><b>${formatNumber(week.steps, 0)}</b></div>
      <div class="stat" style="--accent: var(--color-blue)"><span>Entrenos</span><b>${week.workouts}</b></div>
    </div>
    <table>
      <thead><tr><th>Día</th><th>Pasos</th><th>Peso</th><th aria-label="Entreno">${DUMBBELL_ICON}</th></tr></thead>
      <tbody></tbody>
    </table>
    <textarea rows="2" placeholder="Notas de la semana… (se guardan al salir del campo)" aria-label="Notas de la semana"></textarea>`;

  card.querySelector('tbody').replaceChildren(...week.days.map(day => createDayRow(day, today, onDayClick)));

  // Set as a property, not in the template, so note text is never parsed as HTML
  const notes = card.querySelector('textarea');
  notes.value = week.note;
  notes.addEventListener('change', () => onNoteChange(week.noteRow, notes.value));
  return card;
}

function createDayRow(day, today, onClick) {
  const row = document.createElement('tr');
  row.className = 'day' + (day.date === today ? ' today' : '');
  row.title = 'Editar este día';
  const cell = (value, decimals) => `<td${value == null ? ' class="empty"' : ''}>${formatNumber(value, decimals)}</td>`;
  row.innerHTML =
    `<td>${formatDate(day.date, { weekday: 'short', day: '2-digit' })}</td>` + cell(day.steps, 0) + cell(day.weight, 1);
  row.append(createWorkoutCell(day.workout));
  row.addEventListener('click', () => onClick(day));
  return row;
}

/** Dumbbell icon when there was a workout; the type shows as a tooltip (set as a property, never parsed as HTML). */
function createWorkoutCell(workout) {
  const cell = document.createElement('td');
  cell.className = 'workout';
  if (workout) {
    cell.innerHTML = DUMBBELL_ICON;
    cell.title = workout;
    cell.setAttribute('aria-label', 'Entreno: ' + workout);
  }
  return cell;
}
