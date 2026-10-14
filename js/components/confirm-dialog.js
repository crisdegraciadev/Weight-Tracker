/* Promise-based confirmation on top of the native <dialog>. */
import { $ } from '../core/dom.js';

/** Resolves true when the user accepts; Cancel, Esc or a click outside resolve false. */
export function confirmDialog({ title, message, acceptLabel }) {
  const dialog = $('confirmDialog');
  $('confirmTitle').textContent = title;
  $('confirmMessage').textContent = message;
  $('confirmAccept').textContent = acceptLabel;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}
