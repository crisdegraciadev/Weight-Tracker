/* Craving log: one tap to note it (time is now), plus the hardest time of day and top situation. */
import { $, on } from '../core/dom.js';
import { nowDateTime, today } from '../core/dates.js';
import { cravingStats, cravingTriggers } from '../domain/smoke.js';
import * as actions from '../actions.js';
import { store } from '../state.js';

const percent = share => `${Math.round(share * 100)}%`;

const DEFAULT_INTENSITY = 3;

export function mountCravingsCard() {
  const intensityButtons = [...$('cravingIntensity').querySelectorAll('button')];
  let intensity;
  const setIntensity = value => {
    intensity = value;
    intensityButtons.forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.value) === value));
  };
  setIntensity(DEFAULT_INTENSITY);
  on('cravingIntensity', 'click', e => {
    const value = e.target.closest('button')?.dataset.value;
    if (value) setIntensity(Number(value));
  });

  store.watch(['cravings'], ({ cravings }) => {
    $('cravingTriggers').replaceChildren(...cravingTriggers(cravings).map(trigger => new Option(trigger)));
    const { hardestSlot, topTrigger } = cravingStats(cravings, today());
    $('cravingsSlot').textContent = hardestSlot ? `${hardestSlot.key} (${percent(hardestSlot.share)})` : '—';
    $('cravingsTrigger').textContent = topTrigger ? `${topTrigger.key} (${percent(topTrigger.share)})` : '—';
  });

  on('cravingForm', 'submit', async e => {
    e.preventDefault();
    await actions.addCraving({
      at: nowDateTime(),
      intensity,
      trigger: $('cravingTrigger').value.trim(),
    });
    $('cravingTrigger').value = '';
    setIntensity(DEFAULT_INTENSITY);
  });
}
