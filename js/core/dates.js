/*
 * Dates are handled as ISO strings (yyyy-mm-dd) and computed in UTC,
 * so timezone offsets never shift a day.
 */
const toDate = iso => new Date(iso + 'T00:00:00Z');

export const today = () => new Date().toLocaleDateString('sv');

/** "2026-10-28 14:30", local time */
export const nowDateTime = () => new Date().toLocaleString('sv').slice(0, 16);

export function addDays(iso, days) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / 864e5;

/** 0 = Monday … 6 = Sunday */
export const weekdayIndex = iso => (toDate(iso).getUTCDay() + 6) % 7;

/** Monday of the week that contains `iso`. */
export const startOfWeek = iso => addDays(iso, -weekdayIndex(iso));

/** "28/09" */
export const dayMonth = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const formatDate = (iso, options) => toDate(iso).toLocaleDateString('es-ES', { ...options, timeZone: 'UTC' });

/** Google Sheets stores dates as days since 1899-12-30. */
export const fromSheetSerial = serial =>
  new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 864e5).toISOString().slice(0, 10);

/** Same, keeping the time of day (the fraction): "2026-10-28 14:30". */
export const fromSheetDateTime = serial =>
  new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 1440) * 6e4).toISOString().slice(0, 16).replace('T', ' ');
