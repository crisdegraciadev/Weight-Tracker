/* Floating status message. Success messages (ending in ✓) hide on their own; tapping closes any. */
import { $ } from '../core/dom.js';
import { NOTIFY_EVENT } from '../core/notify.js';

const AUTO_HIDE_MS = 2500;

export function mountToast() {
  const toast = $('toast');
  let hideTimer;

  const show = text => {
    toast.textContent = text;
    clearTimeout(hideTimer);
    if (text.endsWith('✓')) hideTimer = setTimeout(() => show(''), AUTO_HIDE_MS);
  };

  window.addEventListener(NOTIFY_EVENT, e => show(e.detail));
  toast.addEventListener('click', () => show(''));
}
