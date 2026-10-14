/* Screen to choose the spreadsheet and tab that hold the records. */
import { $, on } from '../core/dom.js';
import { notify } from '../core/notify.js';
import * as actions from '../actions.js';
import { currentView, store } from '../state.js';

export function mountSheetPicker() {
  const tabSelect = $('tabSelect');
  let found = null; // spreadsheet found by the last search
  let lastSheetId = store.get().sheet?.id;

  store.watch(['signedIn', 'sheet'], state => {
    $('sheetPicker').hidden = currentView(state) !== 'sheetPicker';
    // After "change sheet", prefill the previous one so it can be picked again quickly
    if (state.sheet) lastSheetId = state.sheet.id;
    else if (lastSheetId) $('sheetUrl').value = `https://docs.google.com/spreadsheets/d/${lastSheetId}`;
  });

  on('findTabs', 'click', async () => {
    found = await actions.findSpreadsheet($('sheetUrl').value.trim());
    tabSelect.replaceChildren(...found.tabs.map(tab => new Option(tab)));
    notify(`Hoja encontrada: ${found.title} ✓`);
  });

  on('useSheet', 'click', () => {
    if (!found) return notify('Primero busca las pestañas');
    actions.selectSheet({ id: found.id, title: found.title, tab: tabSelect.value });
  });
}
