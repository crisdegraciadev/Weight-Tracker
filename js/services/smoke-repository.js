/*
 * Everything about quitting smoking lives in its own tab ("Sin fumar") of the tracker's spreadsheet.
 * Row 1 holds the headers; three blocks side by side, with an empty column between them:
 *   A:C = attempts, one per row: start date, end date (the relapse; empty while in progress), reason
 *   E2:F2 = cigarettes per day and pack price, for the savings
 *   H:J = cravings, one per row: date and time, intensity (1-5), situation
 * The tab is created on the first save.
 */
import { fromSheetDateTime, fromSheetSerial } from '../core/dates.js';
import * as api from './sheets-api.js';

const TAB = 'Sin fumar';
const HEADERS = [
  { range: api.a1(TAB, 'A1:C1'), values: [['Inicio', 'Fin', 'Motivo']] },
  { range: api.a1(TAB, 'E1:F1'), values: [['Cigarrillos/día', 'Precio paquete']] },
  { range: api.a1(TAB, 'H1:J1'), values: [['Antojo', 'Intensidad', 'Situación']] },
];

const hasTab = async id => (await api.getSpreadsheet(id)).sheets.some(sheet => sheet.properties.title === TAB);

// Rewriting the headers on every save also fills them in on tabs created by earlier versions
async function ensureTab(id) {
  if (!(await hasTab(id))) await api.batchUpdate(id, [{ addSheet: { properties: { title: TAB } } }]);
  await api.batchUpdateValues(id, HEADERS);
}

// Dates typed in the sheet come as serials; the ones the app writes as text are kept as they are
const toDate = value => (typeof value === 'number' ? fromSheetSerial(value) : value ? String(value) : null);
const toDateTime = value => (typeof value === 'number' ? fromSheetDateTime(value) : value ? String(value) : null);
const text = value => (value ? String(value).trim() : '');

export async function loadSmoke({ id }) {
  if (!(await hasTab(id))) return { attempts: [], costs: null, cravings: [] };
  const { valueRanges } = await api.batchGet(id, [api.a1(TAB, 'A2:C'), api.a1(TAB, 'E2:F2'), api.a1(TAB, 'H2:J')]);
  const [attemptRows, [costs = []], cravingRows] = valueRanges.map(range => range.values ?? []);
  const [perDay, packPrice] = costs.map(Number);
  return {
    attempts: attemptRows
      .map((cells, index) => ({
        row: index + 2,
        start: toDate(cells[0]),
        end: toDate(cells[1]),
        reason: text(cells[2]),
      }))
      .filter(attempt => attempt.start)
      .sort((a, b) => (a.start < b.start ? -1 : 1)),
    costs: perDay > 0 && packPrice > 0 ? { perDay, packPrice } : null,
    cravings: cravingRows
      .map(cells => ({ at: toDateTime(cells[0]), intensity: Number(cells[1]) || null, trigger: text(cells[2]) }))
      .filter(craving => craving.at)
      .sort((a, b) => (a.at < b.at ? -1 : 1)),
  };
}

const appendAttempt = (id, date) => api.appendValues(id, api.a1(TAB, 'A:C'), [[date, '', '']]);

export async function startAttempt({ id }, date) {
  await ensureTab(id);
  await appendAttempt(id, date);
}

export const editStart = ({ id }, row, date) => api.updateValues(id, api.a1(TAB, `A${row}`), [[date]], 'USER_ENTERED');

/** Ends the attempt in `row` on `date` with its reason, and starts a new one that same day. */
export async function relapse({ id }, row, date, reason) {
  await ensureTab(id);
  await api.updateValues(id, api.a1(TAB, `B${row}`), [[date]], 'USER_ENTERED');
  // RAW so free text is never parsed as a formula
  await api.updateValues(id, api.a1(TAB, `C${row}`), [[reason]]);
  await appendAttempt(id, date);
}

export async function saveCosts({ id }, { perDay, packPrice }) {
  await ensureTab(id);
  await api.updateValues(id, api.a1(TAB, 'E2:F2'), [[perDay, packPrice]]);
}

export async function addCraving({ id }, { at, intensity, trigger }) {
  await ensureTab(id);
  await api.appendValues(id, api.a1(TAB, 'H:J'), [[at, intensity, trigger]], 'RAW');
}
