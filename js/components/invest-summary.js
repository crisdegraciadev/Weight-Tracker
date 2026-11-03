/* Portfolio headline figures, return per fund, split by asset type and contribution history. */
import { $ } from '../core/dom.js';
import { formatDate, today } from '../core/dates.js';
import { formatEuros, formatNumber } from '../core/format.js';
import { byType, portfolio } from '../domain/invest.js';
import { store } from '../state.js';
import { row } from './records-card.js';
import { typeColor } from './invest-chart.js';

const longDate = iso => formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' });
const total = list => list.reduce((sum, item) => sum + item.amount, 0);
const signed = (text, value) => (value > 0 ? '+' : '') + text;
const percent = share => `${formatNumber(share * 100)} %`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** Invested (up to the current value, for a loss) plus the gain or the lost part, as % of `scale`. */
function fundBar(fund, scale) {
  const bar = document.createElement('span');
  bar.className = 'fund-bar';
  bar.ariaHidden = 'true'; // the figures above say the same
  const part = (className, amount) => {
    const segment = document.createElement('i');
    segment.className = className;
    segment.style.width = `${(amount / scale) * 100}%`;
    return segment;
  };
  bar.append(
    part('invested', Math.min(fund.invested, fund.value)),
    part(fund.gain >= 0 ? 'gain' : 'loss', Math.abs(fund.gain)),
  );
  return bar;
}

const MISSING_INVESTED = 'Indica lo invertido previo con el lápiz de «Aportación del mes»';

export function mountInvestSummary() {
  store.watch(['funds', 'contributions', 'monthlyContribution'], ({ funds, contributions, monthlyContribution }) => {
    const current = portfolio(funds, contributions);
    const { rows } = current;
    $('kpiPortfolio').textContent = funds.length ? formatEuros(current.total) : '—';
    $('kpiPortfolioMeta').textContent = funds.length ? plural(funds.length, 'fondo', 'fondos') : '';

    $('kpiGain').textContent = current.gainKnown ? signed(formatEuros(current.gain), current.gain) : '—';
    $('kpiGainMeta').textContent = current.gainKnown
      ? `${signed(percent(current.gain / current.invested), current.gain)} sobre ${formatEuros(current.invested)} invertidos`
      : funds.length
        ? MISSING_INVESTED
        : '';

    const month = today().slice(0, 7);
    $('kpiMonthContributed').textContent = formatEuros(total(contributions.filter(c => c.date.startsWith(month))));
    $('kpiMonthMeta').textContent = monthlyContribution ? `Plan: ${formatEuros(monthlyContribution)}/mes` : '';

    const worst = rows.toSorted((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))[0];
    $('kpiDeviation').textContent = worst ? `${formatNumber(Math.abs(worst.deviation) * 100)} pp` : '—';
    $('kpiDeviationMeta').textContent = worst
      ? `${worst.name} ${worst.deviation > 0 ? 'por encima' : 'por debajo'}`
      : '';

    // Best return first; funds without their invested-before amount can't have one.
    // Each known fund gets a bar under it, all on the same scale (the biggest invested or value)
    const scale = Math.max(...rows.filter(r => r.known).map(r => Math.max(r.invested, r.value)), 0);
    $('investGains').replaceChildren(
      ...rows
        .toSorted((a, b) => (b.gainPct ?? -Infinity) - (a.gainPct ?? -Infinity))
        .map(fund => {
          if (!fund.known) return row(fund.name, '—', 'Falta lo invertido previo');
          const item = row(
            fund.name,
            `${signed(formatEuros(fund.gain), fund.gain)} (${signed(percent(fund.gainPct), fund.gain)})`,
            `${formatEuros(fund.invested)} invertidos`,
          );
          item.append(fundBar(fund, scale));
          return item;
        }),
    );
    if (!rows.length) $('investGains').textContent = 'Aún no hay fondos';

    const types = byType(current);
    $('investTypes').replaceChildren(
      ...types.map((t, i) => {
        const item = row(t.type, percent(t.share), `objetivo ${percent(t.target)}`);
        const swatch = document.createElement('i');
        swatch.className = 'swatch';
        swatch.style.setProperty('--accent', typeColor(i));
        item.querySelector('dt').prepend(swatch);
        return item;
      }),
    );
    if (types.length === 1 && types[0].type === 'Sin tipo')
      $('investTypes').textContent = 'Indica el tipo de cada fondo en la columna F de la hoja (Monetario, Renta fija…)';
    if (!rows.length) $('investTypes').textContent = 'Aún no hay fondos';

    const byDate = [...Map.groupBy(contributions, c => c.date)].reverse();
    $('investHistory').replaceChildren(
      ...byDate.map(([date, items]) =>
        row(longDate(date), formatEuros(total(items)), plural(items.length, 'fondo', 'fondos')),
      ),
    );
    if (!byDate.length) $('investHistory').textContent = 'Aún no hay aportaciones';
  });
}
