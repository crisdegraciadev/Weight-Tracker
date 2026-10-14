/*
 * Light/dark switch. Follows the system until the user picks a theme, which is then remembered.
 * The resolved theme goes to the store so canvas charts can redraw with the new colors.
 */
import { $, on } from '../core/dom.js';
import { store } from '../state.js';

const STORAGE_KEY = 'theme';
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

const resolvedTheme = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');

export function mountThemeToggle() {
  const button = $('themeToggle');

  const sync = () => {
    const theme = resolvedTheme();
    button.dataset.mode = theme;
    store.set({ theme });
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) root.dataset.theme = saved;
  } catch {}

  on(button, 'click', () => {
    root.dataset.theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, root.dataset.theme);
    } catch {}
    sync();
  });
  systemDark.addEventListener('change', sync);
  sync();
}
