/* Peso / Sin fumar switch. The URL hash picks the section, so links, back button and reloads just work. */
import { $, on } from '../core/dom.js';
import * as actions from '../actions.js';
import { store } from '../state.js';

export function mountSectionNav() {
  const links = [...$('sectionNav').querySelectorAll('a')];
  const panels = [...document.querySelectorAll('[data-panel]')];

  const syncFromHash = () => {
    const hash = location.hash.slice(1);
    actions.showSection(panels.some(panel => panel.dataset.panel === hash) ? hash : 'peso');
  };
  syncFromHash();
  on(window, 'hashchange', syncFromHash);

  store.watch(['section'], ({ section }) => {
    links.forEach(link => (link.ariaCurrent = link.hash === '#' + section ? 'page' : null));
    panels.forEach(panel => (panel.hidden = panel.dataset.panel !== section));
  });
}
