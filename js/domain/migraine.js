/* Pure calculations for migraine attacks: { date, intensity, hours, aura, medication, notes }, sorted by date. */
import { addDays, daysBetween, weekdayIndex } from '../core/dates.js';
import { average } from './stats.js';

export function migraineStats(attacks, today) {
  const month = today.slice(0, 7);
  const previousMonth = addDays(month + '-01', -1).slice(0, 7);
  const recent = attacks.filter(attack => daysBetween(attack.date, today) < 30);
  const last = attacks.at(-1);
  return {
    last,
    daysSinceLast: last ? daysBetween(last.date, today) : null,
    thisMonth: attacks.filter(attack => attack.date.startsWith(month)).length,
    medicationDays: new Set(
      attacks.filter(attack => attack.medication && attack.date.startsWith(month)).map(attack => attack.date),
    ).size,
    previousMonth: attacks.filter(attack => attack.date.startsWith(previousMonth)).length,
    recentCount: recent.length,
    avgIntensity: average(recent.map(attack => attack.intensity).filter(Boolean)),
    avgHours: average(recent.map(attack => attack.hours).filter(hours => hours != null)),
  };
}

/** "Ibuprofeno, Naproxeno" or "Ibuprofeno + Naproxeno" → ['Ibuprofeno', 'Naproxeno'] */
export const splitMedications = medication =>
  medication
    .split(/[,+]/)
    .map(name => name.trim())
    .filter(Boolean);

/**
 * Painkillers on 10+ days a month can cause medication-overuse headache
 * (15+ for simple ones like ibuprofen; 10 is the safe side for every kind).
 */
/**
 * Notes written as a list, one point per line or inline ("- Náuseas - Cansancio") → ['Náuseas', 'Cansancio'].
 * Only " - " with spaces around splits, so "8-10" or "anti-inflamatorio" stay whole.
 */
export const noteLines = notes =>
  notes
    .split(/\n|\s-\s/)
    .map(line => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);

export const MEDICATION_DAYS_LIMIT = 10;

export const medicationCount = medication => splitMedications(medication).length;

/** Days on a preventive treatment, both ends included; an open period runs until today. */
export const periodDays = ({ from, to }, today) => daysBetween(from, to ?? today) + 1;

/** Intensity bucket for the calendar: 1 = mild (1-3), 2 = moderate (4-6), 3 = severe (7-10). */
export const intensityLevel = intensity => (intensity >= 7 ? 3 : intensity >= 4 ? 2 : 1);

/** Per-day summary: date → { attacks, intensity (highest), aura (any), meds (total taken) }. */
export function migraineDays(attacks) {
  const days = new Map();
  for (const attack of attacks) {
    const day = days.get(attack.date) ?? { attacks: [], intensity: 0, aura: false, meds: 0 };
    day.attacks.push(attack);
    day.intensity = Math.max(day.intensity, attack.intensity ?? 0);
    day.aura ||= attack.aura;
    day.meds += medicationCount(attack.medication);
    days.set(attack.date, day);
  }
  return days;
}

/** Days of `month` ("2026-11") padded with nulls so the first one falls on its weekday (Monday first). */
export function monthGrid(month) {
  const first = month + '-01';
  const dates = [];
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) dates.push(date);
  return [...Array(weekdayIndex(first)).fill(null), ...dates];
}

/** "2026-11" ± n months */
export const shiftMonth = (month, n) => {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + n, 1));
  return date.toISOString().slice(0, 7);
};
