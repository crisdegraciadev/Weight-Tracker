/* Single app store and derived selectors. */
import { createStore } from './core/store.js';
import { today } from './core/dates.js';
import { isSignedIn } from './services/google-auth.js';

const readStorage = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

function loadSavedSheet() {
  try {
    return JSON.parse(localStorage.getItem('cfg'));
  } catch {
    return null;
  }
}

export const store = createStore({
  signedIn: isSignedIn(),
  sheet: loadSavedSheet(), // { id, tab, title }
  days: [],
  weeks: [],
  weightGoal: null,
  stepGoal: null,
  migraines: [], // { row, date, intensity, hours, aura, medication, notes }, sorted by date
  preventives: [], // preventive treatment periods: { row, drug, from, to }, sorted by start
  expenses: [], // { row, date, category, amount, concept }, sorted by date
  categories: [], // expense categories: { row, name, budget }, sorted by name
  spendTarget: null, // monthly spending target (€)
  expenseMonth: today().slice(0, 7), // month shown in the expense summary and chart, "2026-11"
  recurring: [], // recurring expenses: { row, concept, category, amount, day }, sorted by day
  selectedDate: null, // day picked from a week card, shown in the entry form
  section: 'peso', // 'peso' | 'migranas' | 'gastos', from the URL hash
  theme: 'light', // resolved theme, set by the theme toggle
  chartRange: readStorage('chartRange') ?? 'quarter', // 'month' | 'quarter' | 'all'
});

/** Which screen is visible: 'signIn' | 'sheetPicker' | 'dashboard'. */
export function currentView({ signedIn, sheet }) {
  if (!signedIn) return 'signIn';
  if (!sheet) return 'sheetPicker';
  return 'dashboard';
}
