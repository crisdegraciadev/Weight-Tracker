/* Single app store and derived selectors. */
import { createStore } from './core/store.js';
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
  investTab: false, // whether the "Inversiones" tab exists
  funds: [], // { row, name, isin, weight, value, invested, type }
  contributions: [], // { date, fund, amount, note }
  monthlyContribution: null,
  snapshots: [], // { row, date, value, invested }
  investRate: Number(readStorage('investRate') ?? 5), // projection's yearly return, %
  selectedDate: null, // day picked from a week card, shown in the entry form
  section: 'peso', // 'peso' | 'migranas' | 'inversiones', from the URL hash
  theme: 'light', // resolved theme, set by the theme toggle
  chartRange: readStorage('chartRange') ?? 'quarter', // 'month' | 'quarter' | 'all'
});

/** Which screen is visible: 'signIn' | 'sheetPicker' | 'dashboard'. */
export function currentView({ signedIn, sheet }) {
  if (!signedIn) return 'signIn';
  if (!sheet) return 'sheetPicker';
  return 'dashboard';
}
