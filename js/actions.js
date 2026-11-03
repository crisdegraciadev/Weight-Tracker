/*
 * App use cases. Components call these; they talk to the services,
 * update the store and notify the user. No DOM access here.
 */
import { today } from './core/dates.js';
import { notify } from './core/notify.js';
import * as auth from './services/google-auth.js';
import { SessionExpiredError } from './services/sheets-api.js';
import * as repository from './services/tracker-repository.js';
import * as smokeRepository from './services/smoke-repository.js';
import * as investRepository from './services/invest-repository.js';
import { currentAttempt } from './domain/smoke.js';
import { buildWeeks } from './domain/stats.js';
import { portfolio } from './domain/invest.js';
import { store } from './state.js';

/**
 * Runs a Sheets call. An expired session is renewed and the call retried once;
 * if renewal fails (e.g. popup blocked outside a click), back to the sign-in screen.
 */
async function withSession(task) {
  try {
    return await task();
  } catch (err) {
    if (!(err instanceof SessionExpiredError)) throw err;
    try {
      await auth.signIn();
    } catch {
      store.set({ signedIn: false });
      throw err;
    }
    return task();
  }
}

/** Writes to the sheet, reloads to reflect the sheet's own formulas, then confirms. */
async function saveAndReload(task, successMessage) {
  notify('Guardando…');
  await withSession(task);
  await reload();
  notify(successMessage);
}

// ---------- Session ----------

export async function signIn() {
  await auth.signIn();
  store.set({ signedIn: true });
}

export function signOut() {
  auth.signOut();
  store.set({ signedIn: false });
}

// ---------- Sheet selection ----------

export const findSpreadsheet = urlOrId => withSession(() => repository.findSpreadsheet(urlOrId));

export function selectSheet(sheet) {
  if (sheet) localStorage.setItem('cfg', JSON.stringify(sheet));
  else localStorage.removeItem('cfg');
  store.set({
    sheet,
    days: [],
    weeks: [],
    weightGoal: null,
    stepGoal: null,
    attempts: [],
    smokeFreeSince: null,
    smokeCosts: null,
    cravings: [],
    investTab: false,
    funds: [],
    contributions: [],
    monthlyContribution: null,
    snapshots: [],
  });
}

// ---------- Data ----------

export async function reload() {
  const { sheet } = store.get();
  const [{ days, weightGoal, stepGoal }, { attempts, costs, cravings }, invest] = await withSession(() =>
    Promise.all([repository.loadTracker(sheet), smokeRepository.loadSmoke(sheet), investRepository.loadInvest(sheet)]),
  );
  store.set({
    days,
    weightGoal,
    stepGoal,
    weeks: buildWeeks(days),
    attempts,
    smokeFreeSince: currentAttempt(attempts)?.start ?? null,
    smokeCosts: costs,
    cravings,
    investTab: invest.hasTab,
    funds: invest.funds,
    contributions: invest.contributions,
    monthlyContribution: invest.monthly,
    snapshots: invest.snapshots,
  });
}

export function saveDay(entry) {
  const { sheet, days } = store.get();
  const existing = days.find(day => day.date === entry.date);
  return saveAndReload(() => repository.saveDay(sheet, existing, entry), 'Guardado ✓');
}

export const saveNote = (row, text) =>
  saveAndReload(() => repository.saveNote(store.get().sheet, row, text), 'Notas guardadas ✓');

export const saveWeightGoal = goal =>
  saveAndReload(() => repository.saveWeightGoal(store.get().sheet, goal), 'Objetivo guardado ✓');

export const saveStepGoal = goal =>
  saveAndReload(() => repository.saveStepGoal(store.get().sheet, goal), 'Meta de pasos guardada ✓');

/** Starts an attempt, or moves the start of the one in progress. */
export function saveSmokeFreeSince(date) {
  const { sheet, attempts } = store.get();
  const current = currentAttempt(attempts);
  return saveAndReload(
    () => (current ? smokeRepository.editStart(sheet, current.row, date) : smokeRepository.startAttempt(sheet, date)),
    'Fecha guardada ✓',
  );
}

/** Ends the attempt in progress (with what happened) and starts a new one the same day. */
export function relapse(date, reason) {
  const { sheet, attempts } = store.get();
  return saveAndReload(
    () => smokeRepository.relapse(sheet, currentAttempt(attempts).row, date, reason),
    'Contador reiniciado',
  );
}

export const saveSmokeCosts = costs =>
  saveAndReload(() => smokeRepository.saveCosts(store.get().sheet, costs), 'Ahorro guardado ✓');

export const addCraving = craving =>
  saveAndReload(() => smokeRepository.addCraving(store.get().sheet, craving), 'Antojo apuntado ✓');

export const createInvestTab = () =>
  saveAndReload(() => investRepository.ensureTab(store.get().sheet), 'Pestaña «Inversiones» creada ✓');

/** Today's portfolio value and money invested, for the evolution chart. */
function saveSnapshot(funds, contributions) {
  const { sheet, snapshots } = store.get();
  const { total, invested } = portfolio(funds, contributions);
  return investRepository.saveSnapshot(sheet, snapshots, { date: today(), value: total, invested });
}

/** `values`: [{ row, value, invested }] — value from the broker, money invested before the app. */
export function saveFundValues(values) {
  const { sheet, funds, contributions } = store.get();
  const updated = funds.map(fund => ({ ...fund, ...values.find(v => v.row === fund.row) }));
  return saveAndReload(async () => {
    await investRepository.ensureTab(sheet);
    await investRepository.saveFunds(sheet, values);
    await saveSnapshot(updated, contributions);
  }, 'Valores guardados ✓');
}

/** `items`: [{ fund, amount }]; `monthly` is remembered as next month's amount. */
export function addContributions(date, items, monthly) {
  const { sheet, funds, contributions } = store.get();
  const updated = funds.map(fund => ({ ...fund, value: fund.value + (items.find(i => i.fund === fund)?.amount ?? 0) }));
  return saveAndReload(async () => {
    await investRepository.addContributions(sheet, date, items, monthly);
    await saveSnapshot(updated, contributions.concat(items.map(({ fund, amount }) => ({ fund: fund.name, amount }))));
  }, 'Aportación registrada ✓');
}

export function setInvestRate(rate) {
  try {
    localStorage.setItem('investRate', rate);
  } catch {}
  store.set({ investRate: rate });
}

export const showSection = section => store.set({ section });

export function setChartRange(range) {
  try {
    localStorage.setItem('chartRange', range);
  } catch {}
  store.set({ chartRange: range });
}

/** Clearing first makes picking the same day again still notify the entry form. */
export function selectDate(date) {
  store.set({ selectedDate: null });
  store.set({ selectedDate: date });
}
