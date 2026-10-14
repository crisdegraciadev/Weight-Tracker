/* Shared Chart.js styling, built from the current theme tokens. */
import { themeColor } from '../core/theme.js';

export function applyChartDefaults() {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = themeColor('--color-text-muted');
}

/** Line/bar options with hover crosshair tooltip. `formatLabel` renders each tooltip row. */
export function chartOptions(formatLabel, yAxis = {}) {
  const border = themeColor('--color-border');
  return {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 },
      },
      tooltip: {
        backgroundColor: themeColor('--color-surface'),
        titleColor: themeColor('--color-text'),
        bodyColor: themeColor('--color-text-secondary'),
        borderColor: border,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        filter: item => item.raw != null, // skip empty slots of split datasets
        callbacks: { label: formatLabel },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false }, border: { color: border } },
      y: { grid: { color: border }, border: { display: false }, ...yAxis },
    },
  };
}
