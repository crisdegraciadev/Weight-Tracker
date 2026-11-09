/*
 * Migraines live in their own tab ("Migrañas") of the tracker's spreadsheet, created on the first save.
 * Row 1 holds the headers; two blocks side by side, with an empty column between them:
 *   A:F = attacks, one per row: date, intensity (1-10), duration (h), medication ("Ibuprofeno, Naproxeno"),
 *         notes, aura ("Sí" or empty)
 *   H:J = preventive treatment periods, one per row: drug, from, to (empty = still taking it)
 * Deleting only shifts up its own block, so the other block's rows stay where they are.
 */
import { fromSheetSerial } from '../core/dates.js';
import * as api from './sheets-api.js';

const TAB = 'Migrañas';
const HEADERS = [
  ['Fecha', 'Intensidad (1-10)', 'Duración (h)', 'Medicación', 'Notas', 'Aura', '', 'Preventivo', 'Desde', 'Hasta'],
];
const ATTACKS = { first: 'A', last: 'F', startColumn: 0 };
const PREVENTIVES = { first: 'H', last: 'J', startColumn: 7 };

const findTab = async id => (await api.getSpreadsheet(id)).sheets.find(sheet => sheet.properties.title === TAB);
const toDate = value => (typeof value === 'number' ? fromSheetSerial(value) : value ? String(value) : null);
const text = value => (value ? String(value).trim() : '');
const numberOrNull = value => (value === '' || value == null ? null : Number(value) || null);
const byDate = key => (a, b) => a[key].localeCompare(b[key]); // stable: same-day rows keep the sheet order

export async function loadMigraines({ id }) {
  if (!(await findTab(id))) return { attacks: [], preventives: [] };
  const { valueRanges } = await api.batchGet(id, [api.a1(TAB, 'A2:F'), api.a1(TAB, 'H2:J')]);
  const [attackRows, preventiveRows] = valueRanges.map(range => range.values ?? []);
  return {
    attacks: attackRows
      .map((cells, index) => ({
        row: index + 2,
        date: toDate(cells[0]),
        intensity: numberOrNull(cells[1]),
        hours: numberOrNull(cells[2]),
        medication: text(cells[3]),
        notes: text(cells[4]),
        aura: /^s/i.test(text(cells[5])), // "Sí", "si", "S"
      }))
      .filter(attack => attack.date)
      .sort(byDate('date')),
    preventives: preventiveRows
      .map((cells, index) => ({ row: index + 2, drug: text(cells[0]), from: toDate(cells[1]), to: toDate(cells[2]) }))
      .filter(period => period.drug && period.from)
      .sort(byDate('from')),
  };
}

async function ensureTab(id) {
  if (!(await findTab(id))) await api.batchUpdate(id, [{ addSheet: { properties: { title: TAB } } }]);
  // Always rewritten, so tabs created before a new column was added get its header too
  await api.updateValues(id, api.a1(TAB, 'A1:J1'), HEADERS);
}

// USER_ENTERED so Sheets stores real dates
async function append(id, block, values) {
  await ensureTab(id);
  await api.appendValues(id, api.a1(TAB, `${block.first}:${block.last}`), [values]);
}

const update = (id, block, row, values) =>
  api.updateValues(id, api.a1(TAB, `${block.first}${row}:${block.last}${row}`), [values], 'USER_ENTERED');

/** Removes the row from its block only, shifting the rows below it up. */
async function remove(id, block, row) {
  const { sheetId } = (await findTab(id)).properties;
  const width = block.last.charCodeAt(0) - block.first.charCodeAt(0) + 1;
  await api.batchUpdate(id, [
    {
      deleteRange: {
        range: {
          sheetId,
          startRowIndex: row - 1,
          endRowIndex: row,
          startColumnIndex: block.startColumn,
          endColumnIndex: block.startColumn + width,
        },
        shiftDimension: 'ROWS',
      },
    },
  ]);
}

const attackRow = ({ date, intensity, hours, aura, medication, notes }) => [
  date,
  intensity,
  hours ?? '',
  medication,
  notes,
  aura ? 'Sí' : '',
];
const preventiveRow = ({ drug, from, to }) => [drug, from, to ?? ''];

export const addMigraine = ({ id }, attack) => append(id, ATTACKS, attackRow(attack));
export const updateMigraine = ({ id }, row, attack) => update(id, ATTACKS, row, attackRow(attack));
export const deleteMigraine = ({ id }, row) => remove(id, ATTACKS, row);

export const addPreventive = ({ id }, period) => append(id, PREVENTIVES, preventiveRow(period));
export const updatePreventive = ({ id }, row, period) => update(id, PREVENTIVES, row, preventiveRow(period));
export const deletePreventive = ({ id }, row) => remove(id, PREVENTIVES, row);
