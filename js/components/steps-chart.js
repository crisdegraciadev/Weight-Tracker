/*
 * Daily steps as bars with the weekly average as a stepped line on top.
 * With a step goal set, bars split into "met" / "below" and a dashed goal line is drawn.
 */
import { $ } from '../core/dom.js';
import { dayMonth } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { themeColor } from '../core/theme.js';
import { filterByRange, findWeek } from '../domain/stats.js';
import { store } from '../state.js';
import { applyChartDefaults, chartOptions } from './chart-options.js';

export function mountStepsChart() {
  let chart;

  store.watch(['days', 'weeks', 'stepGoal', 'theme', 'chartRange'], ({ days, weeks, stepGoal, chartRange }) => {
    chart?.destroy();
    const stepDays = filterByRange(
      days.filter(day => day.steps != null),
      chartRange,
    );
    if (!stepDays.length) return;

    applyChartDefaults();
    const violet = themeColor('--color-violet');
    const weeklyAverage = {
      type: 'line',
      label: 'Media semana',
      data: stepDays.map(day => findWeek(weeks, day.date).steps),
      borderColor: violet,
      backgroundColor: violet,
      borderWidth: 2.5,
      pointRadius: 0,
      stepped: 'middle',
      order: 0, // drawn above the bars
    };

    chart = new Chart($('stepsChart'), {
      type: 'bar',
      data: {
        labels: stepDays.map(day => dayMonth(day.date)),
        datasets: [weeklyAverage, ...(stepGoal == null ? [allBars(stepDays)] : goalDatasets(stepDays, stepGoal))],
      },
      options: chartOptions(c => ` ${c.dataset.label}: ${formatNumber(c.parsed.y, 0)}`, { beginAtZero: true }),
    });
  });
}

const bars = (label, data, alpha = 1) => ({
  label,
  data,
  backgroundColor: themeColor('--color-aqua', alpha),
  hoverBackgroundColor: themeColor('--color-aqua', alpha * 0.8),
  borderRadius: 4,
  maxBarThickness: 18,
  grouped: false, // each day shows a single bar, whichever dataset it belongs to
  skipNull: true,
  order: 1,
});

const allBars = stepDays =>
  bars(
    'Pasos',
    stepDays.map(day => day.steps),
  );

function goalDatasets(stepDays, goal) {
  const muted = themeColor('--color-text-muted');
  return [
    bars(
      'Meta cumplida',
      stepDays.map(day => (day.steps >= goal ? day.steps : null)),
    ),
    bars(
      'Por debajo',
      stepDays.map(day => (day.steps < goal ? day.steps : null)),
      0.4,
    ),
    {
      type: 'line',
      label: 'Meta',
      data: stepDays.map(() => goal),
      borderColor: muted,
      backgroundColor: muted,
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      order: 0,
    },
  ];
}
