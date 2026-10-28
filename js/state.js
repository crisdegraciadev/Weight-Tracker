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
  attempts: [], // smoke-free attempts: { row, start, end }
  smokeFreeSince: null, // start of the attempt in progress
  smokeCosts: null, // { perDay, packPrice }
  cravings: [], // { at, intensity, trigger }
  selectedDate: null, // day picked from a week card, shown in the entry form
  section: 'peso', // 'peso' | 'sin-fumar', from the URL hash
  theme: 'light', // resolved theme, set by the theme toggle
  chartRange: readStorage('chartRange') ?? 'quarter', // 'month' | 'quarter' | 'all'
});

/** Which screen is visible: 'signIn' | 'sheetPicker' | 'dashboard'. */
export function currentView({ signedIn, sheet }) {
  if (!signedIn) return 'signIn';
  if (!sheet) return 'sheetPicker';
  return 'dashboard';
}
