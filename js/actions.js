/*
 * App use cases. Components call these; they talk to the services,
 * update the store and notify the user. No DOM access here.
 */
import { notify } from './core/notify.js';
import * as auth from './services/google-auth.js';
import { SessionExpiredError } from './services/sheets-api.js';
import * as repository from './services/tracker-repository.js';
import { buildWeeks } from './domain/stats.js';
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
  store.set({ sheet, days: [], weeks: [], weightGoal: null, stepGoal: null });
}

// ---------- Data ----------

export async function reload() {
  const { sheet } = store.get();
  const { days, weightGoal, stepGoal } = await withSession(() => repository.loadTracker(sheet));
  store.set({ days, weightGoal, stepGoal, weeks: buildWeeks(days) });
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
