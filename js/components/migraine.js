/* Migraine section: headline figures, the form to log an attack, a month calendar and the latest attacks. */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { deltaPill, formatNumber } from '../core/format.js';
import {
  MEDICATION_DAYS_LIMIT,
  intensityLevel,
  migraineDays,
  migraineStats,
  monthGrid,
  shiftMonth,
} from '../domain/migraine.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';
import { row } from './records-card.js';

const LATEST = 10;
const longDate = iso => formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const EDIT_ICON =
  '<svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>';
export const DELETE_ICON =
  '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>';

/** Small edit/delete button for list rows; the list's click handler reads data-action and data-row. */
export const iconButton = (action, label, icon, attackRow) =>
  `<button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="${action}" data-row="${attackRow}" aria-label="${label}" data-tooltip="${label}">${icon}</button>`;

export function mountMigraine() {
  const form = $('migraineForm');
  const date = $('migraineDate');
  const fields = {
    intensity: $('migraineIntensity'),
    hours: $('migraineHours'),
    aura: $('migraineAura'),
    medication: $('migraineMedication'),
    notes: $('migraineNotes'),
  };
  let editingRow = null; // sheet row of the attack being edited; null = adding a new one

  /** Back to "add" mode with an empty form, or to "edit" mode filled with `attack`. */
  const setEditing = attack => {
    editingRow = attack?.row ?? null;
    form.reset();
    date.value = attack?.date ?? today();
    if (attack) {
      fields.intensity.value = attack.intensity ?? '';
      fields.hours.value = attack.hours ?? '';
      fields.aura.value = attack.aura ? '1' : '';
      fields.notes.value = attack.notes;
      // Something typed in the sheet that isn't an option (e.g. another drug) stays selectable, so editing keeps it
      if (![...fields.medication.options].some(option => option.value === attack.medication)) {
        fields.medication.add(new Option(attack.medication));
      }
      fields.medication.value = attack.medication;
    }
    $('migraineFormTitle').textContent = attack ? 'Editar migraña' : 'Apuntar migraña';
    $('migraineSubmit').textContent = attack ? 'Actualizar' : 'Guardar';
    $('migraineCancel').hidden = !attack;
  };
  const edit = attack => {
    setEditing(attack);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fields.intensity.focus({ preventScroll: true });
  };
  const findAttack = attackRow => store.get().migraines.find(attack => attack.row === Number(attackRow));
  setEditing(null);

  store.watch(['migraines'], ({ migraines }) => {
    const stats = migraineStats(migraines, today());

    $('kpiMigraineSince').textContent = stats.last ? plural(stats.daysSinceLast, 'día', 'días') : '—';
    $('kpiMigraineLast').textContent = stats.last ? `Último: ${longDate(stats.last.date)}` : 'Sin ataques registrados';
    $('kpiMigraineMonth').textContent = stats.thisMonth;
    $('kpiMigraineMonthDelta').innerHTML = stats.last
      ? `${deltaPill(stats.thisMonth - stats.previousMonth, { decimals: 0 })} vs mes anterior`
      : '';
    $('kpiMigraineIntensity').innerHTML =
      stats.avgIntensity == null ? '—' : `${formatNumber(stats.avgIntensity)}<small>/10</small>`;
    $('kpiMigraineIntensityMeta').textContent = [
      `${plural(stats.recentCount, 'ataque', 'ataques')} en 30 días`,
      stats.avgHours != null && `${formatNumber(stats.avgHours)} h de media`,
    ]
      .filter(Boolean)
      .join(' · ');

    $('kpiMigraineMeds').innerHTML = `${stats.medicationDays}<small>/${MEDICATION_DAYS_LIMIT}</small>`;
    $('kpiMigraineMedsMeta').innerHTML = medicationWarning(stats.medicationDays);

    const latest = migraines.slice(-LATEST).reverse();
    $('migraineEmpty').hidden = latest.length > 0;
    $('migraineList').replaceChildren(
      ...latest.map(attack =>
        row(
          longDate(attack.date),
          [
            attack.intensity && `${attack.intensity}/10`,
            attack.hours != null && `${formatNumber(attack.hours)} h`,
            attack.aura && 'con aura',
          ]
            .filter(Boolean)
            .join(' · ') || '—',
          [attack.medication, attack.notes].filter(Boolean).join(' · '),
        ),
      ),
    );
    $('migraineList')
      .querySelectorAll(':scope > div')
      .forEach((el, i) =>
        el.insertAdjacentHTML(
          'beforeend',
          `<span class="actions">${iconButton('edit', 'Editar', EDIT_ICON, latest[i].row)}${iconButton('delete', 'Borrar', DELETE_ICON, latest[i].row)}</span>`,
        ),
      );
  });

  on('migraineList', 'click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const attack = findAttack(button.dataset.row);
    if (button.dataset.action === 'edit') return edit(attack);
    const accepted = await confirmDialog({
      title: '¿Borrar esta migraña?',
      message: `Se borrará la del ${longDate(attack.date)} también de la hoja de cálculo.`,
      acceptLabel: 'Borrar',
    });
    if (!accepted) return;
    setEditing(null); // rows below shift up, so a row being edited would point to the wrong attack
    await actions.deleteMigraine(attack.row);
  });

  on('migraineCancel', 'click', () => setEditing(null));

  on(form, 'submit', async e => {
    e.preventDefault();
    const attack = {
      date: date.value,
      intensity: Number(fields.intensity.value),
      hours: fields.hours.value === '' ? null : Number(fields.hours.value),
      aura: fields.aura.value === '1',
      medication: fields.medication.value,
      notes: fields.notes.value.trim(),
    };
    await (editingRow ? actions.updateMigraine(editingRow, attack) : actions.addMigraine(attack));
    setEditing(null);
  });

  let month = today().slice(0, 7);
  const renderCalendar = () => {
    const days = migraineDays(store.get().migraines);
    $('calendarMonth').textContent = formatDate(month + '-01', { month: 'long', year: 'numeric' });
    $('calendarNext').disabled = month >= today().slice(0, 7);
    $('calendarDays').replaceChildren(...monthGrid(month).map(iso => calendarDay(iso, days.get(iso))));
  };
  store.watch(['migraines'], renderCalendar);
  on('calendarPrev', 'click', () => ((month = shiftMonth(month, -1)), renderCalendar()));
  on('calendarNext', 'click', () => ((month = shiftMonth(month, 1)), renderCalendar()));
  // A day with migraines opens its last one for editing; an empty day starts a new one on that date
  on('calendarDays', 'click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    const attack = store.get().migraines.findLast(attack => attack.date === button.dataset.date);
    if (attack) return edit(attack);
    setEditing(null);
    date.value = button.dataset.date;
    fields.intensity.focus();
  });
}

const PILL_ICON =
  '<svg viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="8" rx="4" transform="rotate(-45 12 12)" /><path d="m8.5 8.5 7 7" /></svg>';

/** One cell: blank before day 1; otherwise a button that picks that date in the form. */
export function calendarDay(iso, day) {
  const li = document.createElement('li');
  if (!iso) return li;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.date = iso;
  button.textContent = Number(iso.slice(8));
  if (iso === today()) button.ariaCurrent = 'date';
  const label = [longDate(iso)];
  if (day) {
    if (day.intensity) button.dataset.level = intensityLevel(day.intensity);
    label.push(
      plural(day.attacks.length, 'migraña', 'migrañas'),
      day.intensity && `intensidad ${day.intensity}/10`,
      day.aura && 'con aura',
      day.meds && plural(day.meds, 'medicamento', 'medicamentos'),
    );
    if (day.aura) button.insertAdjacentHTML('beforeend', '<i class="aura"></i>');
    if (day.meds) button.insertAdjacentHTML('beforeend', `<span class="meds">${PILL_ICON}${day.meds}</span>`);
  }
  button.ariaLabel = label.filter(Boolean).join(', ');
  button.title = button.ariaLabel;
  li.append(button);
  return li;
}

/** Medication-overuse risk: quiet below 8 days, a red pill from there on. */
function medicationWarning(days) {
  if (days >= MEDICATION_DAYS_LIMIT) return '<span class="pill bad">Riesgo de cefalea por abuso de medicación</span>';
  if (days >= MEDICATION_DAYS_LIMIT - 2) return '<span class="pill bad">Cerca del límite mensual</span>';
  return 'este mes · límite orientativo';
}
