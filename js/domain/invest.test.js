/* Self-check for the portfolio calculations: `node js/domain/invest.test.js` */
import assert from 'node:assert/strict';
import { byType, overweight, portfolio, projection, suggestContribution } from './invest.js';

const total = list => Math.round(list.reduce((a, b) => a + b, 0) * 100) / 100;

// Empty portfolio: split by weight
assert.deepEqual(
  suggestContribution(
    [
      { weight: 60, value: 0 },
      { weight: 40, value: 0 },
    ],
    1000,
  ),
  [600, 400],
);

// Overweight fund gets nothing; the money fills the underweight ones first
const funds = [
  { weight: 0.5, value: 700 },
  { weight: 0.3, value: 200 },
  { weight: 0.2, value: 100 },
];
let split = suggestContribution(funds, 100);
assert.equal(split[0], 0);
assert.equal(total(split), 100);
assert.ok(split[1] > 0 && split[2] > 0);
assert.ok(split.every(Number.isInteger));

// Enough money to reach the targets exactly: weights end up on target
split = suggestContribution(funds, 400);
assert.deepEqual(split, [0, 220, 180]);
portfolio(funds.map((fund, i) => ({ ...fund, value: fund.value + split[i] }))).rows.forEach(row =>
  assert.ok(Math.abs(row.deviation) < 1e-9),
);

// Buys under the minimum are dropped and their money moves to the others
split = suggestContribution(
  [
    { weight: 50, value: 495 },
    { weight: 50, value: 400 },
  ],
  100,
);
assert.deepEqual(split, [0, 100]);
// ...unless it is the only buy
assert.deepEqual(suggestContribution(funds, 5), [0, 0, 5]);

// Cents go to the biggest buy and everything adds up
split = suggestContribution(funds.concat({ weight: 0.1, value: 33.33 }), 333.33);
assert.equal(total(split), 333.33);

// Nothing to invest, or funds without weight
assert.deepEqual(suggestContribution(funds, 0), [0, 0, 0]);
assert.deepEqual(suggestContribution([{ weight: 0, value: 5 }], 50), [0]);

// Returns: invested before the app + contributions by fund name
let p = portfolio(
  [
    { name: 'A', weight: 1, value: 1200, invested: 900 },
    { name: 'B', weight: 1, value: 800, invested: 0 },
  ],
  [
    { fund: 'A', amount: 100 },
    { fund: 'B', amount: 700 },
  ],
);
assert.equal(p.invested, 1700);
assert.equal(p.gain, 300);
assert.equal(p.gainKnown, true);
assert.equal(p.rows[0].gainPct, 0.2);
assert.equal(portfolio([{ name: 'A', weight: 1, value: 10 }]).gainKnown, false);
// Blank "invested before" with later contributions: unknown, not a fake +500 %
p = portfolio([{ name: 'A', weight: 1, value: 1000, invested: null }], [{ fund: 'A', amount: 100 }]);
assert.equal(p.gainKnown, false);
assert.equal(p.rows[0].gainPct, null);

// Rebalancing: 5 points over, or 25 % over its own target
p = portfolio([
  { name: 'big', weight: 50, value: 560, type: 'RV' },
  { name: 'small', weight: 4, value: 52, type: 'RF' },
  { name: 'rest', weight: 46, value: 388, type: 'RV' },
]);
assert.deepEqual(
  overweight(p).map(row => row.name),
  ['big', 'small'],
);
assert.ok(Math.abs(overweight(p)[0].excess - 60) < 1e-9);
assert.deepEqual(
  byType(p).map(t => t.type),
  ['RV', 'RF'],
);

// Projection: no growth is just the sum; growth compounds
assert.deepEqual(projection(1000, 100, 0, 1), { value: 2200, contributed: 1200 });
assert.ok(Math.abs(projection(1000, 0, 0.05, 2).value - 1102.5) < 1e-6);

console.log('invest ok');
