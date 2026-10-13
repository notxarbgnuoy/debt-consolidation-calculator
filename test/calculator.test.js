const test = require('node:test');
const assert = require('node:assert');
const Calc = require('../src/calculator-core.js');

test('parseNumber handles numbers, formatted strings, and null/undefined', () => {
  assert.strictEqual(Calc.parseNumber(123.45), 123.45);
  assert.strictEqual(Calc.parseNumber('$12,345.67'), 12345.67);
  assert.strictEqual(Calc.parseNumber('24.99%'), 24.99);
  assert.strictEqual(Calc.parseNumber(''), 0);
  assert.strictEqual(Calc.parseNumber(null), 0);
  assert.strictEqual(Calc.parseNumber(undefined), 0);
  assert.strictEqual(Calc.parseNumber('invalid'), 0);
});

test('formatMonths formats months into years and months', () => {
  assert.strictEqual(Calc.formatMonths(0), '—');
  assert.strictEqual(Calc.formatMonths(6), '6 mo');
  assert.strictEqual(Calc.formatMonths(12), '1 yr');
  assert.strictEqual(Calc.formatMonths(24), '2 yrs');
  assert.strictEqual(Calc.formatMonths(38), '3 yrs 2 mo');
  assert.strictEqual(Calc.formatMonths(360), '30 yrs');
});

test('amortizingPayment calculates standard monthly P&I correctly', () => {
  // $100,000 at 6% for 30 years (360 months) should be ~$599.55
  const pmt = Calc.amortizingPayment(100000, 6, 360);
  assert.strictEqual(Calc.round(pmt, 2), 599.55);

  // $300,000 at 6.5% for 30 years -> ~$1,896.20
  const pmt2 = Calc.amortizingPayment(300000, 6.5, 360);
  assert.strictEqual(Calc.round(pmt2, 2), 1896.20);

  // Zero interest rate
  const pmtZero = Calc.amortizingPayment(12000, 0, 12);
  assert.strictEqual(pmtZero, 1000);

  // Zero balance or zero months
  assert.strictEqual(Calc.amortizingPayment(0, 5, 360), 0);
  assert.strictEqual(Calc.amortizingPayment(1000, 5, 0), 0);
});

test('weightedAverageRate computes correct balance-weighted APR', () => {
  const items = [
    { balance: 10000, rate: 10 },
    { balance: 10000, rate: 20 }
  ];
  assert.strictEqual(Calc.weightedAverageRate(items), 15);

  const items2 = [
    { balance: 300000, rate: 4.0 }, // 1,200,000
    { balance: 25000, rate: 24.0 }  // 600,000
  ];
  // Total balance = 325,000; total weight = 1,800,000 / 325,000 = ~5.538%
  assert.strictEqual(Calc.round(Calc.weightedAverageRate(items2), 3), 5.538);

  // Empty or zero balance
  assert.strictEqual(Calc.weightedAverageRate([]), 0);
  assert.strictEqual(Calc.weightedAverageRate([{ balance: 0, rate: 15 }]), 0);
});

test('simulatePayoff handles standard amortization, acceleration, and non-amortizing payments', () => {
  // $10,000 at 12% APR (1% monthly). Payment $200.
  const payoff = Calc.simulatePayoff({
    balance: 10000,
    payment: 200,
    annualRate: 12
  });
  assert.strictEqual(payoff.nonAmortizing, false);
  assert.ok(payoff.months > 60 && payoff.months < 75);
  assert.ok(payoff.totalInterest > 3000 && payoff.totalInterest < 4500);

  // Accelerated payment of $400 pays off much faster with far less interest
  const accelPayoff = Calc.simulatePayoff({
    balance: 10000,
    payment: 400,
    annualRate: 12
  });
  assert.ok(accelPayoff.months < payoff.months / 2);
  assert.ok(accelPayoff.totalInterest < payoff.totalInterest / 2);

  // Payment <= monthly interest ($100 on $10,000 at 12% is $100 interest)
  const nonAmort = Calc.simulatePayoff({
    balance: 10000,
    payment: 95,
    annualRate: 12
  });
  assert.strictEqual(nonAmort.nonAmortizing, true);

  // Interest-only mode
  const ioPayoff = Calc.simulatePayoff({
    balance: 10000,
    payment: 100,
    annualRate: 12,
    interestOnly: true
  });
  assert.strictEqual(ioPayoff.isInterestOnly, true);
  assert.strictEqual(ioPayoff.nonAmortizing, true);
});

test('computeCurrentScenario aggregates debts and mortgage correctly', () => {
  const mortgage = { balance: 250000, rate: 4.0, payment: 1193.54 };
  const debts = [
    { id: 1, name: 'Card 1', balance: 10000, rate: 24.0, payment: 300, includeInRefi: true, includeInHeloc: true },
    { id: 2, name: 'Card 2', balance: 5000, rate: 18.0, payment: 150, includeInRefi: true, includeInHeloc: true }
  ];

  const current = Calc.computeCurrentScenario(debts, mortgage);

  assert.strictEqual(current.consumer.balance, 15000);
  assert.strictEqual(current.consumer.payment, 450);
  // Monthly interest: 10000 * 0.02 = 200; 5000 * 0.015 = 75 => 275
  assert.strictEqual(current.consumer.monthlyInterest, 275);
  assert.strictEqual(current.consumer.principalReduction, 175);
  // Consumer blended rate: (10000*24 + 5000*18) / 15000 = 330000 / 15000 = 22%
  assert.strictEqual(current.consumer.blendedRate, 22);

  // Total with mortgage
  assert.strictEqual(current.totalBalance, 265000);
  assert.strictEqual(Calc.round(current.totalPayment, 2), 1643.54);
  // Mortgage monthly interest: 250000 * 0.04 / 12 = 833.333
  // Total monthly interest: 833.333 + 275 = 1108.333
  assert.strictEqual(Calc.round(current.totalMonthlyInterest, 2), 1108.33);

  // Overall blended rate: (250000*4 + 10000*24 + 5000*18) / 265000 = 1330000 / 265000 = ~5.0188%
  assert.strictEqual(Calc.round(current.overallBlendedRate, 3), 5.019);
});

test('computeRefiScenario consolidates selected debts and calculates accelerated payoff', () => {
  const mortgage = { balance: 250000, rate: 4.0, payment: 1500.00 };
  const debts = [
    { id: 1, name: 'Card 1', balance: 10000, rate: 24.0, payment: 500, includeInRefi: true },
    { id: 2, name: 'Card 2', balance: 5000, rate: 18.0, payment: 150, includeInRefi: false } // NOT included
  ];

  const current = Calc.computeCurrentScenario(debts, mortgage);
  const refiConfig = {
    rate: 6.5,
    termYears: 30,
    closingCosts: 3000,
    includeClosingCosts: true
  };

  const refi = Calc.computeRefiScenario(current, refiConfig);

  // Consolidated debt balance = 10000 (only Card 1)
  assert.strictEqual(refi.consolidatedDebtBalance, 10000);
  assert.strictEqual(refi.selectedDebtsCount, 1);
  assert.strictEqual(refi.unselectedDebtsCount, 1);
  assert.strictEqual(refi.unselectedBalance, 5000);
  assert.strictEqual(refi.unselectedPayment, 150);

  // New mortgage balance = 250000 + 10000 + 3000 = 263000
  assert.strictEqual(refi.newMortgageBalance, 263000);

  // Standard payment for 263000 at 6.5% for 30 years
  const expectedPmt = Calc.amortizingPayment(263000, 6.5, 360);
  assert.strictEqual(Calc.round(refi.newMortgagePayment, 2), Calc.round(expectedPmt, 2));

  // Total payment in Scenario 2 = new mortgage payment + unselected Card 2 payment ($150)
  assert.strictEqual(Calc.round(refi.totalPayment, 2), Calc.round(expectedPmt + 150, 2));

  // Accelerated payment = mortgage payment + consolidated debt payment = 1500 + 500 = 2000
  assert.strictEqual(Calc.round(refi.acceleratedPayment, 2), 2000);

  // Standard payoff is 360 months
  assert.strictEqual(refi.standardPayoff.months, 360);

  // Accelerated payoff with $2000/mo ($337.65 extra principal/mo) pays off in ~202 months (< 360)
  assert.ok(refi.acceleratedPayoff.months < 360);
  assert.ok(refi.interestSavedAccelerated > 50000);
});

test('computeHelocScenario preserves first mortgage and supports amortizing and interest-only modes', () => {
  const mortgage = { balance: 250000, rate: 4.0, payment: 1193.54 };
  const debts = [
    { id: 1, name: 'Card 1', balance: 10000, rate: 24.0, payment: 300, includeInHeloc: true },
    { id: 2, name: 'Card 2', balance: 5000, rate: 18.0, payment: 150, includeInHeloc: true }
  ];

  const current = Calc.computeCurrentScenario(debts, mortgage);

  // Test 1: Amortizing HELOC (15 years at 8.5%, fees $500 included)
  const helocAmortConfig = {
    rate: 8.5,
    termYears: 15,
    fees: 500,
    includeFees: true,
    paymentMode: 'amortizing'
  };

  const helocAmort = Calc.computeHelocScenario(current, helocAmortConfig);

  // HELOC balance = 15000 + 500 = 15500
  assert.strictEqual(helocAmort.helocBalance, 15500);

  // HELOC payment amortizing for 15500 at 8.5% over 180 months
  const expectedHelocPmt = Calc.amortizingPayment(15500, 8.5, 180);
  assert.strictEqual(Calc.round(helocAmort.helocPayment, 2), Calc.round(expectedHelocPmt, 2));

  // Total payment = 1st mortgage (1193.54) + HELOC payment
  assert.strictEqual(Calc.round(helocAmort.totalPayment, 2), Calc.round(1193.54 + expectedHelocPmt, 2));

  // Accelerated payment on HELOC = prior consumer debt payment = $450
  assert.strictEqual(helocAmort.acceleratedPayment, 450);

  // Accelerated payoff: $15,500 with $450/mo should pay off in ~40 months (~3.3 yrs)
  assert.ok(helocAmort.acceleratedPayoff.months < 50);
  assert.strictEqual(helocAmort.acceleratedPayoff.nonAmortizing, false);

  // Blended rate combining untouched first mortgage ($250k @ 4%) + HELOC ($15.5k @ 8.5%):
  // (250000*4 + 15500*8.5) / 265500 = (1000000 + 131750) / 265500 = 1131750 / 265500 = 4.2627%
  assert.strictEqual(Calc.round(helocAmort.overallBlendedRate, 3), 4.263);

  // Test 2: Interest-Only HELOC
  const helocIoConfig = {
    rate: 8.5,
    termYears: 15,
    fees: 500,
    includeFees: true,
    paymentMode: 'interestOnly'
  };
  const helocIo = Calc.computeHelocScenario(current, helocIoConfig);
  // Monthly interest on 15500 at 8.5% is 15500 * (0.085/12) = 109.79
  assert.strictEqual(Calc.round(helocIo.helocPayment, 2), 109.79);
  assert.strictEqual(helocIo.standardPayoff.isInterestOnly, true);
  // But accelerated payoff with $450 still works and pays it off!
  assert.ok(helocIo.acceleratedPayoff.months < 50);
});

test('handles edge case where all debts are unselected from refi or heloc', () => {
  const mortgage = { balance: 200000, rate: 4.5, payment: 1013.37 };
  const debts = [
    { id: 1, name: 'Card 1', balance: 5000, rate: 20.0, payment: 150, includeInRefi: false, includeInHeloc: false }
  ];

  const current = Calc.computeCurrentScenario(debts, mortgage);
  const refi = Calc.computeRefiScenario(current, { rate: 6.0, termYears: 30, closingCosts: 0 });
  const heloc = Calc.computeHelocScenario(current, { rate: 8.5, termYears: 15, fees: 0 });

  assert.strictEqual(refi.selectedDebtsCount, 0);
  assert.strictEqual(refi.consolidatedDebtBalance, 0);
  assert.strictEqual(refi.newMortgageBalance, 200000);
  assert.strictEqual(refi.unselectedBalance, 5000);

  assert.strictEqual(heloc.selectedDebtsCount, 0);
  assert.strictEqual(heloc.helocBalance, 0);
  assert.strictEqual(heloc.helocPayment, 0);
});

test('handles debt interest override', () => {
  const mortgage = { balance: 0, rate: 0, payment: 0 };
  const debts = [
    { id: 1, name: 'Card 1', balance: 10000, rate: 20.0, payment: 300, interestOverride: 250 }
  ];

  const current = Calc.computeCurrentScenario(debts, mortgage);
  assert.strictEqual(current.consumer.monthlyInterest, 250);
});

test('serializeState and deserializeState roundtrip safely', () => {
  const sampleState = {
    mortgage: { balance: 320000, rate: 4.125, payment: 1550 },
    debts: [
      { id: 1, name: 'Card', balance: 8000, rate: 22.5, payment: 250, includeInRefi: true, includeInHeloc: true }
    ],
    refi: { rate: 6.25, termYears: 30, closingCosts: 2500, includeClosingCosts: true },
    heloc: { rate: 8.75, termYears: 15, fees: 400, includeFees: true, paymentMode: 'amortizing' }
  };

  const serialized = Calc.serializeState(sampleState);
  assert.ok(typeof serialized === 'string' && serialized.length > 0);

  const restored = Calc.deserializeState(serialized);
  assert.deepStrictEqual(restored, sampleState);
});

test('generateTextSummary produces detailed 3-scenario report', () => {
  const mortgage = { balance: 250000, rate: 4.0, payment: 1500 };
  const debts = [{ id: 1, name: 'Card', balance: 10000, rate: 24, payment: 400, includeInRefi: true, includeInHeloc: true }];
  const current = Calc.computeCurrentScenario(debts, mortgage);
  const refi = Calc.computeRefiScenario(current, { rate: 6.5, termYears: 30, closingCosts: 2000 });
  const heloc = Calc.computeHelocScenario(current, { rate: 9.0, termYears: 15, fees: 500, paymentMode: 'amortizing' });

  const summary = Calc.generateTextSummary({ current, refi, heloc });
  assert.ok(summary.includes('OPTION 1: CURRENT DEBTS'));
  assert.ok(summary.includes('OPTION 2: CASH-OUT REFINANCE'));
  assert.ok(summary.includes('OPTION 3: HELOC CONSOLIDATION'));
  assert.ok(summary.includes('ACCELERATED PAYOFF'));
});


