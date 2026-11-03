/* Investment charts: value vs invested over time, and split by asset type. */
import { $ } from '../core/dom.js';
import { dayMonth, formatDate } from '../core/dates.js';
import { formatEuros, formatNumber } from '../core/format.js';
import { themeColor } from '../core/theme.js';
import { byType, portfolio } from '../domain/invest.js';
import { store } from '../state.js';
import { applyChartDefaults, chartOptions } from './chart-options.js';

// Categorical palette in fixed order, shared with the list swatches; types past the fourth share the muted color.
// ponytail: 4 hues, fold extra types into "Otros" if more ever get a target.
const TYPE_COLORS = ['--color-blue', '--color-aqua', '--color-violet', '--color-orange'];
const typeToken = i => TYPE_COLORS[i] ?? '--color-text-muted';
export const typeColor = i => `var(${typeToken(i)})`;

export function mountInvestChart() {
  let chart;

  // Redraws on theme change too: canvas colors are fixed at draw time
  store.watch(['snapshots', 'theme'], ({ snapshots }) => {
    chart?.destroy();
    const enough = snapshots.length >= 2;
    $('investChartEmpty').hidden = enough;
    // One snapshot per day, so a line needs values saved on two different days
    $('investChartEmpty').textContent = snapshots.length
      ? `Primera foto guardada el ${formatDate(snapshots[0].date, { day: 'numeric', month: 'long' })} ` +
        `(${formatEuros(snapshots[0].value)}). La gráfica aparece cuando guardes valores otro día.`
      : 'Aún no hay datos: se guarda una foto de la cartera (una por día) al actualizar los valores o registrar una aportación.';
    $('investChart').parentElement.hidden = !enough;
    if (!enough) return;

    applyChartDefaults();
    const [blue, aqua] = ['--color-blue', '--color-aqua'].map(t => themeColor(t));
    chart = new Chart($('investChart'), {
      type: 'line',
      data: {
        labels: snapshots.map(s => `${dayMonth(s.date)}/${s.date.slice(2, 4)}`),
        datasets: [
          {
            label: 'Valor',
            data: snapshots.map(s => s.value),
            borderColor: blue,
            backgroundColor: blue,
            borderWidth: 2.5,
            pointRadius: 3,
            tension: 0.25,
            fill: { target: 1, above: themeColor('--color-good', 0.12), below: themeColor('--color-bad', 0.12) },
          },
          {
            label: 'Invertido',
            data: snapshots.map(s => s.invested || null),
            borderColor: aqua,
            backgroundColor: aqua,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            stepped: true,
          },
        ],
      },
      options: chartOptions(c => ` ${c.dataset.label}: ${formatEuros(c.parsed.y)}`, {
        ticks: { callback: value => formatEuros(value).replace(/,00/, '') },
      }),
    });
  });
}

/** Asset type split: outer ring current, inner ring target, same colors as the list below it. */
export function mountInvestTypesChart() {
  let chart;

  store.watch(['funds', 'theme'], ({ funds }) => {
    chart?.destroy();
    const canvas = $('investTypesChart');
    const types = funds.some(fund => fund.type) ? byType(portfolio(funds)) : [];
    canvas.parentElement.hidden = !types.length;
    if (!types.length) return;

    applyChartDefaults();
    const colors = types.map((t, i) => themeColor(typeToken(i)));
    const ring = (label, data) => ({
      label,
      data,
      backgroundColor: colors,
      borderColor: themeColor('--color-surface'),
      borderWidth: 2,
    });
    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: types.map(t => t.type),
        datasets: [
          ring(
            'Actual',
            types.map(t => t.share),
          ),
          ring(
            'Objetivo',
            types.map(t => t.target),
          ),
        ],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '45%',
        plugins: {
          legend: { display: false }, // the list below carries a swatch per type
          tooltip: {
            backgroundColor: themeColor('--color-surface'),
            titleColor: themeColor('--color-text'),
            bodyColor: themeColor('--color-text-secondary'),
            borderColor: themeColor('--color-border'),
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: ([item]) => item.label,
              label: c => ` ${c.dataset.label}: ${formatNumber(c.parsed * 100)} %`,
            },
          },
        },
      },
    });
  });
}
