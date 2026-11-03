/* What the portfolio could be worth in a few years with the monthly contribution and a yearly return. */
import { $, on } from '../core/dom.js';
import { formatEuros } from '../core/format.js';
import { portfolio, projection } from '../domain/invest.js';
import * as actions from '../actions.js';
import { store } from '../state.js';
import { row } from './records-card.js';

const YEARS = [5, 10, 20, 30];
const round = value => formatEuros(Math.round(value)).replace(/,00/, '');

export function mountInvestProjection() {
  const monthly = $('projectionMonthly');
  const rate = $('projectionRate');

  const render = () => {
    const start = portfolio(store.get().funds).total;
    const perMonth = Number(monthly.value) || 0;
    $('projectionList').replaceChildren(
      ...YEARS.map(years => {
        const { value, contributed } = projection(start, perMonth, (Number(rate.value) || 0) / 100, years);
        return row(`En ${years} años`, round(value), `${round(contributed)} de aportaciones nuevas`);
      }),
    );
  };

  store.watch(['funds', 'monthlyContribution', 'investRate'], ({ monthlyContribution, investRate }) => {
    if (document.activeElement !== monthly) monthly.value = monthlyContribution ?? '';
    if (document.activeElement !== rate) rate.value = investRate;
    render();
  });

  on(monthly, 'input', render);
  on(rate, 'input', () => actions.setInvestRate(Number(rate.value) || 0));
}
