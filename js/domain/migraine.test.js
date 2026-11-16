/* Self-check for the migraine calculations: `node js/domain/migraine.test.js` */
import assert from 'node:assert/strict';
import {
  medicationCount,
  migraineDays,
  migraineStats,
  monthGrid,
  noteLines,
  periodDays,
  shiftMonth,
  splitMedications,
} from './migraine.js';

const attacks = [
  { date: '2026-09-20', intensity: 8, hours: 10, medication: 'Ibuprofeno' },
  { date: '2026-10-28', intensity: 6, hours: 4, medication: 'Triptán' },
  { date: '2026-11-02', intensity: 4, hours: null, medication: 'Triptán', aura: true },
  { date: '2026-11-02', intensity: 3, hours: 1, medication: 'Triptán' }, // second attack, same day
  { date: '2026-11-05', intensity: 3, hours: 1, medication: '' },
];

const stats = migraineStats(attacks, '2026-11-09');
assert.equal(stats.daysSinceLast, 4);
assert.equal(stats.thisMonth, 3);
assert.equal(stats.medicationDays, 1); // two medicated attacks the same day count once
assert.equal(stats.previousMonth, 1);
assert.equal(stats.recentCount, 4); // September's is older than 30 days
assert.equal(stats.avgIntensity, 4);
assert.equal(stats.avgHours, 2); // missing duration doesn't count

assert.equal(migraineStats([], '2026-11-09').daysSinceLast, null);
assert.deepEqual(splitMedications(' Ibuprofeno ,Naproxeno'), ['Ibuprofeno', 'Naproxeno']);

assert.deepEqual(noteLines('- Náuseas 13:00\n- Cansancio'), ['Náuseas 13:00', 'Cansancio']);
assert.deepEqual(noteLines('- Me levanto 8:00 - Toma 8-10 mg'), ['Me levanto 8:00', 'Toma 8-10 mg']);
assert.deepEqual(noteLines(''), []);

assert.equal(medicationCount('Ibuprofeno, Triptán'), 2);
assert.equal(medicationCount('Ibuprofeno + Triptán +'), 2);
assert.equal(medicationCount(''), 0);

// Two attacks the same day: highest intensity, aura if any had it, medications added up
const day = migraineDays(attacks).get('2026-11-02');
assert.equal(day.attacks.length, 2);
assert.equal(day.intensity, 4);
assert.equal(day.aura, true);
assert.equal(day.meds, 2);

// November 2026 starts on a Sunday: six blanks, then 30 days
const grid = monthGrid('2026-11');
assert.equal(grid.indexOf('2026-11-01'), 6);
assert.equal(grid.length, 36);
assert.equal(shiftMonth('2026-01', -1), '2025-12');
assert.equal(shiftMonth('2026-12', 1), '2027-01');

assert.equal(periodDays({ from: '2026-11-01', to: '2026-11-09' }, '2026-12-01'), 9);
assert.equal(periodDays({ from: '2026-11-01', to: null }, '2026-11-01'), 1); // started today
