/*
 * Migraine report for the doctor: summary, one calendar per month, preventive periods and every attack.
 * It is built into #migraineReport and printed with the browser's dialog ("Guardar como PDF").
 * The `printing-migraines` class on <html> makes the print styles show only the report.
 */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { average } from '../domain/stats.js';
import { migraineDays, monthGrid, noteLines, periodDays, shiftMonth } from '../domain/migraine.js';
import { formatNumber } from '../core/format.js';
import { store } from '../state.js';
import { calendarDay, plural } from './migraine.js';
import { duration } from './preventive-card.js';

const shortDate = iso => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Element with optional class and text. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function monthCalendar(month, days) {
  const section = el('section', 'month-card');
  section.append(el('h3', 'month', formatDate(month + '-01', { month: 'long', year: 'numeric' })));
  const weekdays = el('ol', 'weekdays');
  weekdays.append(...WEEKDAYS.map(day => el('li', null, day)));
  const grid = el('ol', 'days');
  grid.append(...monthGrid(month).map(iso => calendarDay(iso, days.get(iso))));
  section.append(weekdays, grid);
  return section;
}

function table(headers, rows) {
  const tableEl = el('table');
  const head = el('tr');
  head.append(...headers.map(text => el('th', null, text)));
  tableEl.append(el('thead'), el('tbody'));
  tableEl.tHead.append(head);
  for (const cells of rows) {
    const tr = el('tr');
    tr.append(...cells.map(text => el('td', null, text)));
    tableEl.tBodies[0].append(tr);
  }
  return tableEl;
}

function buildReport({ migraines, preventives }) {
  const report = $('migraineReport');
  const now = today();
  const first = migraines[0]?.date ?? now;
  const withAura = migraines.filter(attack => attack.aura).length;
  const intensity = average(migraines.map(attack => attack.intensity).filter(Boolean));

  const header = el('header');
  header.append(
    el('h1', null, 'Informe de migrañas'),
    el(
      'p',
      null,
      `Del ${shortDate(first)} al ${shortDate(now)} · ${plural(migraines.length, 'migraña', 'migrañas')}` +
        ` · ${withAura} con aura` +
        (intensity == null ? '' : ` · intensidad media ${formatNumber(intensity)}/10`),
    ),
  );

  // One calendar per month, oldest first, from the first attack to the current month
  const days = migraineDays(migraines);
  const months = [];
  for (let month = first.slice(0, 7); month <= now.slice(0, 7); month = shiftMonth(month, 1)) months.push(month);
  const calendars = el('div', 'months');
  calendars.append(...months.map(month => monthCalendar(month, days)));
  const legend = $('migraineExport').closest('.migraine-calendar').querySelector('.legend').cloneNode(true);

  const sections = [header, el('h2', null, 'Calendario'), legend, calendars];

  if (preventives.length) {
    sections.push(
      el('h2', null, 'Tratamiento preventivo'),
      table(
        ['Preventivo', 'Desde', 'Hasta', 'Duración'],
        preventives.map(period => [
          period.drug,
          shortDate(period.from),
          period.to ? shortDate(period.to) : 'En curso',
          duration(periodDays(period, now)),
        ]),
      ),
    );
  }

  sections.push(
    el('h2', null, 'Registros'),
    table(
      ['Fecha', 'Intensidad', 'Duración', 'Aura', 'Medicación', 'Notas'],
      [...migraines]
        .reverse()
        .map(attack => [
          shortDate(attack.date),
          attack.intensity ? `${attack.intensity}/10` : '—',
          attack.hours == null ? '—' : `${formatNumber(attack.hours)} h`,
          attack.aura ? 'Sí' : 'No',
          attack.medication || '—',
          noteLines(attack.notes)
            .map(line => `• ${line}`)
            .join('\n'), // one point per line, kept by white-space: pre-line
        ]),
    ),
  );

  report.replaceChildren(...sections);
}

export function mountMigraineReport() {
  const appTitle = document.title;
  on('migraineExport', 'click', () => {
    buildReport(store.get());
    document.documentElement.classList.add('printing-migraines');
    document.title = `Informe de migrañas ${today()}`; // default file name when saving as PDF
    window.print();
  });
  // print() blocks in some browsers and returns at once in others; afterprint covers both
  on(window, 'afterprint', () => {
    document.documentElement.classList.remove('printing-migraines');
    document.title = appTitle;
  });
}
