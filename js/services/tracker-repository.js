/*
 * Maps the tracker's data to the spreadsheet layout:
 *   A = date, B = steps, D = weight, G = weekly notes (merged cell per week),
 *   H = workout type (free text, empty = no workout; "Entreno" header in H1)
 *   C, E and F hold the sheet's own formulas and are never written.
 *   I2 = target weight ("Objetivo" header in I1), J2 = daily step goal ("Objetivo pasos" header in J1).
 */
import { fromSheetSerial } from '../core/dates.js';
import * as api from './sheets-api.js';

/** Accepts the full spreadsheet URL or just its ID. */
export async function findSpreadsheet(urlOrId) {
  const id = urlOrId.match(/\/d\/([\w-]+)/)?.[1] ?? urlOrId;
  const spreadsheet = await api.getSpreadsheet(id);
  return {
    id,
    title: spreadsheet.properties.title,
    tabs: spreadsheet.sheets.map(sheet => sheet.properties.title),
  };
}

export async function loadTracker({ id, tab }) {
  const { valueRanges } = await api.batchGet(id, [api.a1(tab, 'A2:H'), api.a1(tab, 'I2:J2')]);
  const [rows, goals] = valueRanges;
  const days = (rows.values ?? [])
    .map((cells, index) => ({
      row: index + 2,
      date: typeof cells[0] === 'number' ? fromSheetSerial(cells[0]) : null,
      steps: toNumber(cells[1]),
      weight: toNumber(cells[3]),
      note: cells[6] ? String(cells[6]) : '',
      workout: cells[7] ? String(cells[7]).trim() : '',
    }))
    .filter(day => day.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const [weightGoal, stepGoal] = goals.values?.[0] ?? [];
  return { days, weightGoal: toNumber(weightGoal), stepGoal: toNumber(stepGoal) };
}

/**
 * Saves steps, weight and workout for a date. `existing` is the day already in the sheet, if any.
 * An empty string clears the cell.
 */
export async function saveDay({ id, tab }, existing, { date, steps, weight, workout }) {
  if (existing) {
    await api.batchUpdateValues(id, [
      { range: api.a1(tab, `B${existing.row}`), values: [[steps]] },
      { range: api.a1(tab, `D${existing.row}`), values: [[weight]] },
      { range: api.a1(tab, `H${existing.row}`), values: [[workout]] },
      WORKOUT_HEADER(tab),
    ]);
    return;
  }
  // No row for this date yet: append one (null leaves the formula and notes columns untouched)
  await api.appendValues(id, api.a1(tab, 'A:H'), [[date, steps, null, weight, null, null, null, workout]]);
  await api.batchUpdateValues(id, [WORKOUT_HEADER(tab)]);
}

// The workout column is new, so its header is (re)written on every save in case the sheet lacks it
const WORKOUT_HEADER = tab => ({ range: api.a1(tab, 'H1'), values: [['Entreno']] });

/** Notes live in the week's first row, the top-left cell of the merged block. */
export const saveNote = ({ id, tab }, row, text) => api.updateValues(id, api.a1(tab, `G${row}`), [[text]]);

export const saveWeightGoal = ({ id, tab }, goal) => api.updateValues(id, api.a1(tab, 'I1:I2'), [['Objetivo'], [goal]]);

export const saveStepGoal = ({ id, tab }, goal) =>
  api.updateValues(id, api.a1(tab, 'J1:J2'), [['Objetivo pasos'], [goal]]);

function toNumber(value) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(',', '.')) || null;
}
