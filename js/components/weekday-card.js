/*
 * Weekday pattern: weight relative to each week's average and average steps, per weekday,
 * as small CSS bars plus a one-line takeaway.
 */
import { $ } from '../core/dom.js';
import { addDays, formatDate } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { weekdayPattern } from '../domain/stats.js';
import { store } from '../state.js';

// Any Monday works: used only to get localized weekday names
const A_MONDAY = '2024-01-01';
const weekdayName = (index, weekday) => formatDate(addDays(A_MONDAY, index), { weekday });

/** "los lunes", "los sábados" */
const onWeekday = index => {
  const name = weekdayName(index, 'long');
  return `los ${name.endsWith('s') ? name : name + 's'}`;
};

const signed = (value, decimals) => (value > 0 ? '+' : '') + formatNumber(value, decimals);

export function mountWeekdayCard() {
  store.watch(['weeks'], ({ weeks }) => {
    const pattern = weekdayPattern(weeks);
    const hasWeight = pattern.some(p => p.weightDelta != null);
    const hasSteps = pattern.some(p => p.steps != null);

    if (!hasWeight && !hasSteps) {
      $('weekdayChart').replaceChildren();
      $('weekdaySummary').textContent = 'Faltan datos: necesito al menos una semana con 3 pesajes';
      return;
    }

    const maxDelta = Math.max(...pattern.map(p => Math.abs(p.weightDelta ?? 0))) || 1;
    const maxSteps = Math.max(...pattern.map(p => p.steps ?? 0)) || 1;
    const cells = [
      cell('', ''),
      ...pattern.map(p => cell('day', weekdayName(p.weekday, 'narrow'))),
      cell('row-label', 'Peso'),
      ...pattern.map(p => weightBar(p, maxDelta)),
      cell('', ''),
      ...pattern.map(p => cell('value', p.weightDelta == null ? '—' : signed(p.weightDelta, 1))),
      cell('row-label', 'Pasos'),
      ...pattern.map(p => stepsBar(p, maxSteps)),
      cell('', ''),
      ...pattern.map(p => cell('value', p.steps == null ? '—' : formatNumber(p.steps / 1000, 1) + 'k')),
    ];
    $('weekdayChart').replaceChildren(...cells);
    $('weekdaySummary').textContent = summarize(pattern);
  });
}

function cell(className, text) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function weightBar({ weekday, weightDelta }, max) {
  const el = cell('diverging', '');
  if (weightDelta == null) return el;
  const bar = document.createElement('i');
  bar.className = weightDelta > 0 ? 'up' : 'down';
  bar.style.setProperty('--size', Math.abs(weightDelta) / max);
  el.append(bar);
  el.title = `${weekdayName(weekday, 'long')}: ${signed(weightDelta, 2)} kg sobre la media de la semana`;
  return el;
}

function stepsBar({ weekday, steps }, max) {
  const el = cell('bars', '');
  if (steps == null) return el;
  const bar = document.createElement('i');
  bar.style.setProperty('--size', steps / max);
  el.append(bar);
  el.title = `${weekdayName(weekday, 'long')}: ${formatNumber(steps, 0)} pasos de media`;
  return el;
}

function summarize(pattern) {
  const extreme = (key, pick) =>
    pattern.filter(p => p[key] != null).reduce((a, b) => (pick(b[key], a[key]) ? b : a), { [key]: null, weekday: -1 });
  const heaviest = extreme('weightDelta', (a, b) => b == null || a > b);
  const laziest = extreme('steps', (a, b) => b == null || a < b);

  const parts = [];
  if (heaviest.weekday >= 0)
    parts.push(`pesas más ${onWeekday(heaviest.weekday)} (${signed(heaviest.weightDelta, 2)} kg)`);
  if (laziest.weekday >= 0) parts.push(`caminas menos ${onWeekday(laziest.weekday)}`);
  const text = parts.join(' y ');
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}
