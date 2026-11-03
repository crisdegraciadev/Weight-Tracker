/*
 * The fund portfolio lives in its own tab ("Inversiones") of the tracker's spreadsheet.
 * Row 1 holds the headers; four blocks side by side, with an empty column between them:
 *   A:F = funds, one per row: name, ISIN, target weight (20 or 0.2, normalized), current value (€),
 *         money invested before using the app (€), asset type
 *   H:K = contributions, one per row: date, fund name, amount (€), note
 *   M2  = planned monthly contribution (€)
 *   O:Q = snapshots, one per day the values change: date, portfolio value (€), money invested (€)
 * Funds, weights and types are edited in the sheet; the app updates values and appends the rest.
 */
import { fromSheetSerial } from '../core/dates.js';
import * as api from './sheets-api.js';

const TAB = 'Inversiones';
const HEADERS = [
  {
    range: api.a1(TAB, 'A1:Q1'),
    values: [
      [
        'Fondo',
        'ISIN',
        'Peso objetivo',
        'Valor actual (€)',
        'Invertido previo (€)',
        'Tipo',
        '',
        'Fecha',
        'Fondo',
        'Importe (€)',
        'Nota',
        '',
        'Aportación mensual (€)',
        '',
        'Fecha',
        'Valor (€)',
        'Invertido (€)',
      ],
    ],
  },
];

const hasTab = async id => (await api.getSpreadsheet(id)).sheets.some(sheet => sheet.properties.title === TAB);

export async function ensureTab({ id }) {
  if (!(await hasTab(id))) await api.batchUpdate(id, [{ addSheet: { properties: { title: TAB } } }]);
  await api.batchUpdateValues(id, HEADERS);
}

const toDate = value => (typeof value === 'number' ? fromSheetSerial(value) : value ? String(value) : null);
const text = value => (value ? String(value).trim() : '');
const byDate = (a, b) => (a.date < b.date ? -1 : 1);

export async function loadInvest({ id }) {
  if (!(await hasTab(id))) return { hasTab: false, funds: [], contributions: [], monthly: null, snapshots: [] };
  const { valueRanges } = await api.batchGet(id, [
    api.a1(TAB, 'A2:F'),
    api.a1(TAB, 'H2:K'),
    api.a1(TAB, 'M2'),
    api.a1(TAB, 'O2:Q'),
  ]);
  const [fundRows, contributionRows, [[monthly] = []], snapshotRows] = valueRanges.map(range => range.values ?? []);
  return {
    hasTab: true,
    funds: fundRows
      .map((cells, index) => ({
        row: index + 2,
        name: text(cells[0]),
        isin: text(cells[1]),
        weight: Number(cells[2]) || 0,
        value: Number(cells[3]) || 0,
        invested: cells[4] === '' || cells[4] == null ? null : Number(cells[4]) || 0,
        type: text(cells[5]),
      }))
      .filter(fund => fund.name),
    contributions: contributionRows
      .map(cells => ({
        date: toDate(cells[0]),
        fund: text(cells[1]),
        amount: Number(cells[2]) || 0,
        note: text(cells[3]),
      }))
      .filter(contribution => contribution.date && contribution.amount)
      .sort(byDate),
    monthly: Number(monthly) || null,
    snapshots: snapshotRows
      .map((cells, index) => ({
        row: index + 2,
        date: toDate(cells[0]),
        value: Number(cells[1]) || 0,
        invested: Number(cells[2]) || 0,
      }))
      .filter(snapshot => snapshot.date)
      .sort(byDate),
  };
}

const cents = value => Math.round(value * 100) / 100;

/** `funds`: [{ row, value, invested }] — current value and money invested before the app. */
export const saveFunds = ({ id }, funds) =>
  api.batchUpdateValues(
    id,
    funds.map(fund => ({
      range: api.a1(TAB, `D${fund.row}:E${fund.row}`),
      values: [[fund.value, fund.invested ?? '']],
    })),
  );

/**
 * Appends one contribution row per fund and adds each amount to that fund's value,
 * so the next suggestion already counts it even before the values are refreshed from the broker.
 * `items`: [{ fund, amount }] where `fund` is { row, name, value }.
 */
export async function addContributions(sheet, date, items, monthly) {
  await ensureTab(sheet);
  // USER_ENTERED so Sheets stores a real date (fund names come from the sheet itself)
  await api.appendValues(
    sheet.id,
    api.a1(TAB, 'H:K'),
    items.map(({ fund, amount }) => [date, fund.name, amount, '']),
  );
  await api.batchUpdateValues(sheet.id, [
    ...items.map(({ fund, amount }) => ({
      range: api.a1(TAB, `D${fund.row}`),
      values: [[cents(fund.value + amount)]],
    })),
    { range: api.a1(TAB, 'M2'), values: [[monthly]] },
  ]);
}

/** One snapshot per day: overwrites that day's row if there is one. */
export function saveSnapshot({ id }, snapshots, { date, value, invested }) {
  const values = [[date, cents(value), cents(invested)]];
  const existing = snapshots.find(snapshot => snapshot.date === date);
  return existing
    ? api.updateValues(id, api.a1(TAB, `O${existing.row}:Q${existing.row}`), values, 'USER_ENTERED')
    : api.appendValues(id, api.a1(TAB, 'O:Q'), values);
}
