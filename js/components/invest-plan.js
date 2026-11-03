/*
 * Monthly contribution: per fund, target vs current weight, the suggested amount (editable) and the
 * weight it would end up with, registered in one go. Warns when a fund needs a transfer, not just
 * contributions. Values and money invested before the app are edited in a dialog.
 */
import { $, on } from '../core/dom.js';
import { today } from '../core/dates.js';
import { formatEuros, formatNumber } from '../core/format.js';
import { notify } from '../core/notify.js';
import { overweight, portfolio, suggestContribution } from '../domain/invest.js';
import * as actions from '../actions.js';
import { store } from '../state.js';

const percent = share => `${formatNumber(share * 100)} %`;
const points = deviation => `${deviation > 0 ? '+' : ''}${formatNumber(deviation * 100)} pp`;

function cell(tag, text, detail) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    el.append(small);
  }
  return el;
}

function moneyInput(label, value) {
  const input = document.createElement('input');
  Object.assign(input, { type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: value ?? '' });
  input.ariaLabel = label;
  return input;
}

const withInput = input => {
  const td = document.createElement('td');
  td.append(input);
  return td;
};

export function mountInvestPlan() {
  const amount = $('investAmount');
  let funds = [];
  let rendered = '';

  const amountInputs = () => [...$('investRows').querySelectorAll('input')];
  const amounts = () => amountInputs().map(input => Number(input.value) || 0);

  // Total typed so far and each fund's weight after buying
  const updateAfter = () => {
    const buys = amounts();
    const total = buys.reduce((a, b) => a + b, 0);
    $('investTotal').textContent = `Total: ${formatEuros(total)}`;
    const after = portfolio(funds.map((fund, i) => ({ ...fund, value: fund.value + buys[i] })));
    $('investRows')
      .querySelectorAll('.after')
      .forEach((td, i) => (td.textContent = percent(after.rows[i].share)));
  };
  const fillSuggestion = () => {
    const split = suggestContribution(funds, Number(amount.value));
    amountInputs().forEach((input, i) => (input.value = split[i] || ''));
    updateAfter();
  };

  store.watch(
    ['investTab', 'funds', 'contributions', 'monthlyContribution'],
    ({ investTab, funds: list, contributions, monthlyContribution }) => {
      $('investEmpty').hidden = list.length > 0;
      $('createInvestTab').hidden = investTab;
      $('investForm').hidden = $('editInvestValues').hidden = !list.length;

      const current = portfolio(list, contributions);
      renderRebalance(overweight(current));

      // Reloads (e.g. coming back from the broker's tab) must not wipe amounts being edited
      const key = JSON.stringify(list);
      if (key === rendered) return;
      rendered = key;
      funds = list;
      if (!amount.value && monthlyContribution) amount.value = monthlyContribution;
      $('investDate').value ||= today();

      $('investRows').replaceChildren(
        ...current.rows.map(fund => {
          const name = cell('th', fund.name, fund.isin);
          name.scope = 'row';
          const after = cell('td', '');
          after.className = 'after';
          const tr = document.createElement('tr');
          tr.append(
            name,
            cell('td', percent(fund.target)),
            cell('td', percent(fund.share), formatEuros(fund.value)),
            cell('td', points(fund.deviation)),
            withInput(moneyInput(`Aportar a ${fund.name} (€)`)),
            after,
          );
          return tr;
        }),
      );
      fillSuggestion();
    },
  );

  on(amount, 'input', fillSuggestion);
  on('investRows', 'input', updateAfter);
  on('createInvestTab', 'click', actions.createInvestTab);

  on('investForm', 'submit', e => {
    e.preventDefault();
    const items = amounts()
      .map((value, i) => ({ fund: funds[i], amount: value }))
      .filter(item => item.amount > 0);
    if (!items.length) return notify('Indica cuánto aportas a algún fondo');
    return actions.addContributions($('investDate').value, items, Number(amount.value) || null);
  });

  // Current values (from the broker) and money invested before the app, edited in a dialog
  const dialog = $('investValuesDialog');
  on('editInvestValues', 'click', () => {
    $('investValueFields').replaceChildren(
      ...funds.map(fund => {
        const name = cell('th', fund.name);
        name.scope = 'row';
        const value = moneyInput(`Valor actual de ${fund.name} (€)`, fund.value);
        value.required = true;
        const tr = document.createElement('tr');
        tr.dataset.row = fund.row;
        tr.append(name, withInput(value), withInput(moneyInput(`Invertido previo en ${fund.name} (€)`, fund.invested)));
        return tr;
      }),
    );
    dialog.returnValue = '';
    dialog.showModal();
  });
  on('investValuesCancel', 'click', () => dialog.close());
  on(
    dialog,
    'close',
    () =>
      dialog.returnValue === 'ok' &&
      actions.saveFundValues(
        [...$('investValueFields').rows].map(tr => {
          const [value, invested] = tr.querySelectorAll('input');
          return {
            row: Number(tr.dataset.row),
            value: Number(value.value),
            invested: invested.value === '' ? null : Number(invested.value),
          };
        }),
      ),
  );
}

function renderRebalance(funds) {
  const notice = $('investRebalance');
  notice.hidden = !funds.length;
  if (!funds.length) return;
  const list = document.createElement('ul');
  list.append(
    ...funds.map(fund => {
      const li = document.createElement('li');
      li.textContent = `${fund.name}: ${points(fund.deviation)}, unos ${formatEuros(Math.round(fund.excess))} por encima de su objetivo`;
      return li;
    }),
  );
  const title = document.createElement('b');
  title.textContent = 'Conviene rebalancear';
  const hint = document.createElement('p');
  hint.textContent =
    'Solo con aportaciones tardarías mucho en corregirlo. Puedes traspasar ese importe a los fondos que están por debajo: los traspasos entre fondos no tributan.';
  notice.replaceChildren(title, list, hint);
}
