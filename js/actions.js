/*
 * App use cases. Components call these; they talk to the services,
 * update the store and notify the user. No DOM access here.
 */
import { notify } from './core/notify.js';
import * as auth from './services/google-auth.js';
import { SessionExpiredError } from './services/sheets-api.js';
import * as repository from './services/tracker-repository.js';
import * as migraineRepository from './services/migraine-repository.js';
import * as expenseRepository from './services/expense-repository.js';
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
  store.set({
    sheet,
    days: [],
    weeks: [],
    weightGoal: null,
    stepGoal: null,
    migraines: [],
    preventives: [],
    expenses: [],
    categories: [],
    recurring: [],
    spendTarget: null,
  });
}

// ---------- Data ----------

export async function reload() {
  const { sheet } = store.get();
  const [{ days, weightGoal, stepGoal }, migraine, expense] = await withSession(() =>
    Promise.all([
      repository.loadTracker(sheet),
      migraineRepository.loadMigraines(sheet),
      expenseRepository.loadExpenses(sheet),
    ]),
  );
  store.set({
    days,
    weightGoal,
    stepGoal,
    weeks: buildWeeks(days),
    migraines: migraine.attacks,
    preventives: migraine.preventives,
    expenses: expense.expenses,
    categories: expense.categories,
    recurring: expense.recurring,
    spendTarget: expense.target,
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

export const addMigraine = attack =>
  saveAndReload(() => migraineRepository.addMigraine(store.get().sheet, attack), 'Migraña apuntada ✓');

export const updateMigraine = (row, attack) =>
  saveAndReload(() => migraineRepository.updateMigraine(store.get().sheet, row, attack), 'Migraña actualizada ✓');

export const deleteMigraine = row =>
  saveAndReload(() => migraineRepository.deleteMigraine(store.get().sheet, row), 'Migraña borrada');

export const savePreventive = (row, period) =>
  saveAndReload(
    () =>
      row
        ? migraineRepository.updatePreventive(store.get().sheet, row, period)
        : migraineRepository.addPreventive(store.get().sheet, period),
    'Preventivo guardado ✓',
  );

export const deletePreventive = row =>
  saveAndReload(() => migraineRepository.deletePreventive(store.get().sheet, row), 'Preventivo borrado');

export const saveExpense = (row, expense) =>
  saveAndReload(
    () =>
      row
        ? expenseRepository.updateExpense(store.get().sheet, row, expense)
        : expenseRepository.addExpenses(store.get().sheet, [expense]),
    'Gasto guardado ✓',
  );

/** Logs several expenses at once, e.g. this month's pending recurring ones. */
export const addExpenses = expenses =>
  saveAndReload(
    () => expenseRepository.addExpenses(store.get().sheet, expenses),
    expenses.length === 1 ? 'Gasto apuntado ✓' : `${expenses.length} gastos apuntados ✓`,
  );

export const deleteExpense = row =>
  saveAndReload(() => expenseRepository.deleteExpense(store.get().sheet, row), 'Gasto borrado');

/** `category`: { name, budget } */
export const addCategory = category =>
  saveAndReload(() => expenseRepository.addCategory(store.get().sheet, category), 'Categoría añadida ✓');

/** New name and/or budget; a new name moves its expenses and recurring expenses along. */
export function updateCategory(category, changes) {
  const { sheet, expenses, recurring } = store.get();
  return saveAndReload(
    () => expenseRepository.updateCategory(sheet, category, changes, expenses, recurring),
    'Categoría guardada ✓',
  );
}

/** Moves everything in `source` to `target` and deletes `source`. */
export function mergeCategory(source, target) {
  const { sheet, expenses, recurring } = store.get();
  return saveAndReload(
    () => expenseRepository.mergeCategory(sheet, source, target, expenses, recurring),
    `«${source.name}» fusionada en «${target.name}» ✓`,
  );
}

export const deleteCategory = row =>
  saveAndReload(() => expenseRepository.deleteCategory(store.get().sheet, row), 'Categoría borrada');

export const saveRecurring = (row, item) =>
  saveAndReload(
    () =>
      row
        ? expenseRepository.updateRecurring(store.get().sheet, row, item)
        : expenseRepository.addRecurring(store.get().sheet, item),
    'Gasto fijo guardado ✓',
  );

export const deleteRecurring = row =>
  saveAndReload(() => expenseRepository.deleteRecurring(store.get().sheet, row), 'Gasto fijo borrado');

export const saveSpendTarget = target =>
  saveAndReload(
    () => expenseRepository.saveTarget(store.get().sheet, target),
    target == null ? 'Gasto objetivo quitado' : 'Gasto objetivo guardado ✓',
  );

export const showExpenseMonth = month => store.set({ expenseMonth: month });

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
