import { reportError } from './notify.js';

export const $ = id => document.getElementById(id);

/** addEventListener that reports errors thrown by (async) handlers instead of losing them. */
export function on(target, event, handler) {
  const el = typeof target === 'string' ? $(target) : target;
  el.addEventListener(event, e => Promise.resolve(handler(e)).catch(reportError));
}
