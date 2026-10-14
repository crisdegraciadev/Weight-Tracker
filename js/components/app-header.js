/* Header: current sheet name and session actions (refresh, change sheet, sign out). */
import { $, on } from '../core/dom.js';
import { notify } from '../core/notify.js';
import * as actions from '../actions.js';
import { currentView, store } from '../state.js';
import { confirmDialog } from './confirm-dialog.js';

const DEFAULT_SUBTITLE = 'Peso y pasos, sincronizado con Google Sheets';

const sheetLabel = sheet => `${sheet.title || 'Google Sheet'} · ${sheet.tab}`;

export function mountAppHeader() {
  store.watch(['signedIn', 'sheet'], state => {
    const view = currentView(state);
    $('signOut').hidden = !state.signedIn;
    $('refresh').hidden = $('changeSheet').hidden = view !== 'dashboard';
    $('subtitle').textContent = view === 'dashboard' ? sheetLabel(state.sheet) : DEFAULT_SUBTITLE;
  });

  on('refresh', 'click', async () => {
    await actions.reload();
    notify('Actualizado ✓');
  });

  on('signOut', 'click', actions.signOut);

  on('changeSheet', 'click', async () => {
    const confirmed = await confirmDialog({
      title: '¿Cambiar de hoja?',
      message: `Dejarás de usar ${sheetLabel(store.get().sheet)} en esta app. Tus datos en Google Sheets no se borran; podrás volver a seleccionarla cuando quieras.`,
      acceptLabel: 'Cambiar hoja',
    });
    if (confirmed) actions.selectSheet(null);
  });
}
