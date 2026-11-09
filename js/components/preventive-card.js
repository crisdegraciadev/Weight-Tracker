/* Preventive treatment periods: form to add or edit one, and the list with how long each lasted. */
import { $, on } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { periodDays } from '../domain/migraine.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';
import { DELETE_ICON, EDIT_ICON, iconButton } from './migraine.js';
import { row } from './records-card.js';

const shortDate = iso => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 días", "3 meses" */
export function duration(days) {
  if (days < 60) return `${days} ${days === 1 ? 'día' : 'días'}`;
  const months = Math.round(days / 30.44);
  return `${months} meses`;
}

export function mountPreventiveCard() {
  const form = $('preventiveForm');
  const drug = $('preventiveDrug');
  const from = $('preventiveFrom');
  const to = $('preventiveTo');
  let editingRow = null; // sheet row of the period being edited; null = adding a new one

  const setEditing = period => {
    editingRow = period?.row ?? null;
    form.reset();
    if (period) {
      drug.value = period.drug;
      from.value = period.from;
      to.value = period.to ?? '';
    }
    $('preventiveSubmit').textContent = period ? 'Actualizar' : 'Añadir';
    $('preventiveCancel').hidden = !period;
  };

  store.watch(['preventives'], ({ preventives }) => {
    const latestFirst = [...preventives].reverse();
    $('preventiveEmpty').hidden = preventives.length > 0;
    $('preventiveList').replaceChildren(
      ...latestFirst.map(period => {
        const el = row(
          period.drug,
          duration(periodDays(period, today())),
          `${shortDate(period.from)} → ${period.to ? shortDate(period.to) : 'en curso'}`,
        );
        el.insertAdjacentHTML(
          'beforeend',
          `<span class="actions">${iconButton('edit', 'Editar', EDIT_ICON, period.row)}${iconButton('delete', 'Borrar', DELETE_ICON, period.row)}</span>`,
        );
        return el;
      }),
    );
  });

  on('preventiveList', 'click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const period = store.get().preventives.find(p => p.row === Number(button.dataset.row));
    if (button.dataset.action === 'edit') {
      setEditing(period);
      return from.focus();
    }
    const accepted = await confirmDialog({
      title: '¿Borrar este tratamiento?',
      message: `Se borrará ${period.drug} desde el ${shortDate(period.from)} también de la hoja de cálculo.`,
      acceptLabel: 'Borrar',
    });
    if (!accepted) return;
    setEditing(null); // rows below shift up, so a row being edited would point to the wrong period
    await actions.deletePreventive(period.row);
  });

  on('preventiveCancel', 'click', () => setEditing(null));

  on(form, 'submit', async e => {
    e.preventDefault();
    if (to.value && to.value < from.value) {
      to.setCustomValidity('Tiene que ser posterior a «Desde»');
      return to.reportValidity();
    }
    await actions.savePreventive(editingRow, { drug: drug.value, from: from.value, to: to.value || null });
    setEditing(null);
  });
  on(to, 'input', () => to.setCustomValidity(''));
}
