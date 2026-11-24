/* The 12 months ending at the selected one: total per month, stacked by category, with the spending target as a dashed line. */
import { $ } from '../core/dom.js';
import { formatDate } from '../core/dates.js';
import { formatEuros } from '../core/format.js';
import { themeColor } from '../core/theme.js';
import { lastMonths, monthlyByCategory } from '../domain/expenses.js';
import { store } from '../state.js';
import { applyChartDefaults, chartOptions } from './chart-options.js';

const COLORS = ['--color-blue', '--color-aqua', '--color-violet', '--color-orange', '--color-yellow', '--color-bad'];
const MONTHS = 12;

export function mountExpenseChart() {
  let chart;

  store.watch(['expenses', 'expenseMonth', 'spendTarget', 'theme'], ({ expenses, expenseMonth, spendTarget }) => {
    chart?.destroy();
    const months = lastMonths(expenseMonth, MONTHS);
    const series = monthlyByCategory(expenses, months);
    $('expenseChartEmpty').hidden = series.length > 0;
    if (!series.length) return;

    applyChartDefaults();
    // Past the palette, colors repeat with less opacity
    const color = (i, alpha = 1) => themeColor(COLORS[i % COLORS.length], alpha * (i < COLORS.length ? 1 : 0.5));
    const options = chartOptions(c => (c.parsed.y ? ` ${c.dataset.label}: ${formatEuros(c.parsed.y)}` : null), {
      beginAtZero: true,
      stacked: true,
      ticks: { callback: value => formatEuros(value).replace(',00', '') },
    });
    options.scales.x.stacked = true;
    options.plugins.tooltip.filter = item => item.raw > 0;
    options.plugins.tooltip.callbacks.footer = items => {
      const total = items.filter(i => i.dataset.stack !== 'target').reduce((t, i) => t + i.raw, 0);
      if (spendTarget == null) return `Total: ${formatEuros(total)}`;
      const saved = spendTarget - total;
      return `Total: ${formatEuros(total)} · ${saved >= 0 ? 'ahorro' : 'exceso'} ${formatEuros(Math.abs(saved))}`;
    };
    const muted = themeColor('--color-text-muted');
    const targetLine = {
      type: 'line',
      label: 'Objetivo',
      stack: 'target', // not stacked on top of the bars
      data: months.map(() => spendTarget),
      borderColor: muted,
      backgroundColor: muted,
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      order: -1,
    };

    chart = new Chart($('expenseChart'), {
      type: 'bar',
      data: {
        labels: months.map(month => formatDate(`${month}-01`, { month: 'short', year: '2-digit' })),
        datasets: series.map(({ category, totals }, i) => ({
          label: category,
          data: totals,
          backgroundColor: color(i),
          hoverBackgroundColor: color(i, 0.8),
          borderRadius: 3,
          maxBarThickness: 28,
        })).concat(spendTarget == null ? [] : [targetLine]),
      },
      options,
    });
  });
}
