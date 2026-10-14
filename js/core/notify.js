/*
 * App-wide notifications, decoupled from the UI through window events.
 * Any module can notify; the toast component is the only listener.
 */
export const NOTIFY_EVENT = 'app:notify';

/** Messages ending in ✓ are treated as success and auto-hide. */
export const notify = text => window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail: text }));

export const reportError = err => {
  console.error(err);
  notify('⚠️ ' + err.message);
};
