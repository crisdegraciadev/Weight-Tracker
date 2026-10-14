/* Daily weight, weekly minimum and 7-day rolling average. */
import { $ } from '../core/dom.js';
import { dayMonth } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { themeColor } from '../core/theme.js';
import { filterByRange, findWeek, rollingAverage } from '../domain/stats.js';
import { store } from '../state.js';
import { applyChartDefaults, chartOptions } from './chart-options.js';

export function mountWeightChart() {
  let chart;

  // Redraws on theme change too: canvas colors are fixed at draw time
  store.watch(['days', 'weeks', 'theme', 'chartRange'], ({ days, weeks, chartRange }) => {
    chart?.destroy();
    // The rolling average is computed over all data first, so the window's first points are still correct
    const allWeighIns = days.filter(day => day.weight != null);
    const weighIns = filterByRange(allWeighIns, chartRange);
    if (!weighIns.length) return;
    const average = rollingAverage(allWeighIns).slice(-weighIns.length);

    applyChartDefaults();
    const [blue, orange, violet] = ['--color-blue', '--color-orange', '--color-violet'].map(t => themeColor(t));
    chart = new Chart($('weightChart'), {
      type: 'line',
      data: {
        labels: weighIns.map(day => dayMonth(day.date)),
        datasets: [
          {
            label: 'Peso',
            data: weighIns.map(day => day.weight),
            borderColor: themeColor('--color-blue', 0.33),
            backgroundColor: blue,
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderColor: themeColor('--color-surface'),
            pointBorderWidth: 2,
          },
          {
            label: 'Mínimo semana',
            data: weighIns.map(day => findWeek(weeks, day.date).min),
            borderColor: orange,
            backgroundColor: orange,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            stepped: true,
          },
          {
            label: 'Media 7 días',
            data: average,
            borderColor: violet,
            backgroundColor: violet,
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.35,
            fill: { target: 'start', above: themeColor('--color-violet', 0.12) },
          },
        ],
      },
      // The rolling average gets two decimals; raw weights keep one
      options: chartOptions(c => ` ${c.dataset.label}: ${formatNumber(c.parsed.y, c.datasetIndex === 2 ? 2 : 1)} kg`),
    });
  });
}
