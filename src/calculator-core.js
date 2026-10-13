/**
 * Core financial calculations for Debt Consolidation Blended Rate Calculator
 * Handles blended APR, amortizing payments, interest expenses, and payoff acceleration.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DebtCalcCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseNumber(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (value === null || value === undefined) {
      return 0;
    }
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((parseNumber(value) + Number.EPSILON) * factor) / factor;
  }

  function formatCurrency(value, precise = false) {
    const num = parseNumber(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: precise ? 2 : 0,
      maximumFractionDigits: precise ? 2 : 0
    }).format(num);
  }

  function formatPercent(value, digits = 2) {
    const num = parseNumber(value);
    return `${num.toFixed(digits)}%`;
  }

  function formatMonths(months) {
    if (!Number.isFinite(months) || months <= 0) {
      return '—';
    }
    const total = Math.round(months);
    const years = Math.floor(total / 12);
    const remMonths = total % 12;

    if (years === 0) {
      return `${remMonths} mo`;
    }
    if (remMonths === 0) {
      return `${years} yr${years > 1 ? 's' : ''}`;
    }
    return `${years} yr${years > 1 ? 's' : ''} ${remMonths} mo`;
  }

  function monthlyRateFromApr(apr) {
    return Math.max(0, parseNumber(apr)) / 100 / 12;
  }

  function amortizingPayment(balance, annualRate, months) {
    const safeBalance = Math.max(0, parseNumber(balance));
    const safeMonths = Math.max(0, Math.round(parseNumber(months)));

    if (!safeBalance || !safeMonths) {
      return 0;
    }

    const rate = monthlyRateFromApr(annualRate);
    if (rate === 0) {
      return safeBalance / safeMonths;
    }

    return safeBalance * rate / (1 - Math.pow(1 + rate, -safeMonths));
  }

  function impliedMonthlyInterest(balance, annualRate, override) {
    const safeBalance = Math.max(0, parseNumber(balance));
    const safeOverride = parseNumber(override);

    if (safeBalance > 0 && safeOverride > 0) {
      return safeOverride;
    }
    return safeBalance * monthlyRateFromApr(annualRate);
  }

  function weightedAverageRate(items) {
    let totalBalance = 0;
    let weightedSum = 0;

    for (const item of items) {
      const b = Math.max(0, parseNumber(item.balance));
      const r = Math.max(0, parseNumber(item.rate));
      if (b > 0) {
        totalBalance += b;
        weightedSum += b * r;
      }
    }

    return totalBalance > 0 ? weightedSum / totalBalance : 0;
  }

  function simulatePayoff({
    balance,
    payment,
    annualRate,
    maxMonths = 1200,
    variableRate = false,
    annualRateChange = 0,
    interestOnly = false
  }) {
    let remaining = Math.max(0, parseNumber(balance));
    const scheduledPayment = Math.max(0, parseNumber(payment));
    const annualStep = parseNumber(annualRateChange);
    let totalInterest = 0;
    let months = 0;
    let firstMonthlyInterest = 0;

    if (remaining <= 0.005) {
      return {
        months: 0,
        totalInterest: 0,
        monthlyInterestAtStart: 0,
        nonAmortizing: false,
        hitLimit: false,
        balanceRemaining: 0
      };
    }

    const initialRate = Math.max(0, parseNumber(annualRate)) / 100 / 12;
    firstMonthlyInterest = remaining * initialRate;

    if (interestOnly) {
      return {
        months: Infinity,
        totalInterest: Infinity,
        monthlyInterestAtStart: firstMonthlyInterest,
        nonAmortizing: true,
        hitLimit: false,
        balanceRemaining: remaining,
        isInterestOnly: true
      };
    }

    while (remaining > 0.005 && months < maxMonths) {
      const currentAnnualRate = Math.max(
        0,
        parseNumber(annualRate) + (variableRate ? Math.floor(months / 12) * annualStep : 0)
      );
      const currentMonthlyRate = currentAnnualRate / 100 / 12;
      const interest = remaining * currentMonthlyRate;

      if (months === 0) {
        firstMonthlyInterest = interest;
      }

      if (scheduledPayment <= interest + 0.000001) {
        return {
          months,
          totalInterest,
          monthlyInterestAtStart: firstMonthlyInterest || interest,
          nonAmortizing: true,
          hitLimit: false,
          balanceRemaining: remaining
        };
      }

      const actualPayment = Math.min(scheduledPayment, remaining + interest);
      const principal = Math.max(0, actualPayment - interest);
      totalInterest += interest;
      remaining = Math.max(0, remaining - principal);
      months += 1;
    }

    return {
      months,
      totalInterest,
      monthlyInterestAtStart: firstMonthlyInterest,
      nonAmortizing: remaining > 0.005,
      hitLimit: remaining > 0.005,
      balanceRemaining: remaining
    };
  }

  function computeCurrentScenario(debts, mortgage) {
    const mortgageBalance = Math.max(0, parseNumber(mortgage.balance));
    const mortgageRate = Math.max(0, parseNumber(mortgage.rate));
    const mortgagePayment = Math.max(0, parseNumber(mortgage.payment));
    const mortgageMonthlyInterest = mortgageBalance * monthlyRateFromApr(mortgageRate);

    const debtDetails = debts.map(function (debt, idx) {
      const b = Math.max(0, parseNumber(debt.balance));
      const r = Math.max(0, parseNumber(debt.rate));
      const p = Math.max(0, parseNumber(debt.payment));
      const interest = impliedMonthlyInterest(b, r, debt.interestOverride);
      const principal = Math.max(0, p - interest);
      const payoff = simulatePayoff({
        balance: b,
        payment: p,
        annualRate: r
      });

      return {
        id: debt.id != null ? debt.id : idx + 1,
        name: debt.name || `Debt ${idx + 1}`,
        balance: b,
        rate: r,
        payment: p,
        monthlyInterest: interest,
        principalReduction: principal,
        payoff: payoff,
        includeInRefi: debt.includeInRefi !== false,
        includeInHeloc: debt.includeInHeloc !== false,
        interestOverride: debt.interestOverride || ''
      };
    });

    const consumerBalance = debtDetails.reduce((sum, d) => sum + d.balance, 0);
    const consumerPayment = debtDetails.reduce((sum, d) => sum + d.payment, 0);
    const consumerInterest = debtDetails.reduce((sum, d) => sum + d.monthlyInterest, 0);
    const consumerPrincipal = debtDetails.reduce((sum, d) => sum + d.principalReduction, 0);
    const consumerBlendedRate = weightedAverageRate(debtDetails);
    const consumerCannotAmortize = debtDetails.some(d => d.payoff.nonAmortizing);
    const consumerPayoffMonths = consumerCannotAmortize
      ? NaN
      : (debtDetails.length > 0 ? Math.max(...debtDetails.map(d => d.payoff.months), 0) : 0);
    const consumerTotalInterest = consumerCannotAmortize
      ? NaN
      : debtDetails.reduce((sum, d) => sum + d.payoff.totalInterest, 0);

    // Total Portfolio including Mortgage
    const totalBalance = mortgageBalance + consumerBalance;
    const totalPayment = mortgagePayment + consumerPayment;
    const totalMonthlyInterest = mortgageMonthlyInterest + consumerInterest;
    const allItems = [{ balance: mortgageBalance, rate: mortgageRate }, ...debtDetails];
    const overallBlendedRate = weightedAverageRate(allItems);

    return {
      mortgage: {
        balance: mortgageBalance,
        rate: mortgageRate,
        payment: mortgagePayment,
        monthlyInterest: mortgageMonthlyInterest
      },
      debtDetails: debtDetails,
      consumer: {
        balance: consumerBalance,
        payment: consumerPayment,
        monthlyInterest: consumerInterest,
        principalReduction: consumerPrincipal,
        blendedRate: consumerBlendedRate,
        cannotAmortize: consumerCannotAmortize,
        payoffMonths: consumerPayoffMonths,
        totalInterest: consumerTotalInterest
      },
      totalBalance: totalBalance,
      totalPayment: totalPayment,
      totalMonthlyInterest: totalMonthlyInterest,
      overallBlendedRate: overallBlendedRate
    };
  }

  function computeRefiScenario(currentScenario, refiConfig) {
    const config = refiConfig || {};
    const refiRate = Math.max(0, parseNumber(config.rate));
    const termYears = Math.max(1, Math.round(parseNumber(config.termYears || 30)));
    const termMonths = termYears * 12;
    const closingCosts = Math.max(0, parseNumber(config.closingCosts));
    const includeClosingCosts = config.includeClosingCosts !== false;

    // Filter debts selected for refinance
    const selectedDebts = currentScenario.debtDetails.filter(d => d.includeInRefi);
    const unselectedDebts = currentScenario.debtDetails.filter(d => !d.includeInRefi);

    const consolidatedDebtBalance = selectedDebts.reduce((sum, d) => sum + d.balance, 0);
    const consolidatedDebtPayment = selectedDebts.reduce((sum, d) => sum + d.payment, 0);
    const consolidatedDebtInterest = selectedDebts.reduce((sum, d) => sum + d.monthlyInterest, 0);

    const unselectedBalance = unselectedDebts.reduce((sum, d) => sum + d.balance, 0);
    const unselectedPayment = unselectedDebts.reduce((sum, d) => sum + d.payment, 0);
    const unselectedInterest = unselectedDebts.reduce((sum, d) => sum + d.monthlyInterest, 0);

    // New mortgage balance = current mortgage + consolidated debts + (closing costs if included)
    const rolledCosts = includeClosingCosts ? closingCosts : 0;
    const newMortgageBalance = currentScenario.mortgage.balance + consolidatedDebtBalance + rolledCosts;

    // Scheduled monthly mortgage payment (P&I)
    const newMortgagePayment = amortizingPayment(newMortgageBalance, refiRate, termMonths);
    const newMortgageMonthlyInterest = newMortgageBalance * monthlyRateFromApr(refiRate);

    // Standard payoff of new mortgage
    const standardPayoff = simulatePayoff({
      balance: newMortgageBalance,
      payment: newMortgagePayment,
      annualRate: refiRate
    });

    // Accelerated Payoff:
    // If the borrower keeps making the same total monthly payment as before on the consolidated debt portion:
    // Prior payment budget for (mortgage + selected consumer debts) was:
    // currentScenario.mortgage.payment + consolidatedDebtPayment
    // Any unselected debts still need their payment unselectedPayment.
    // If that prior total exceeds the new scheduled mortgage payment, the extra cash flow goes directly to principal.
    // If the new mortgage payment is higher than the old total, the borrower must pay at least the new mortgage payment.
    const priorCombinedPayment = currentScenario.mortgage.payment + consolidatedDebtPayment;
    const acceleratedPayment = Math.max(newMortgagePayment, priorCombinedPayment);
    const acceleratedPayoff = simulatePayoff({
      balance: newMortgageBalance,
      payment: acceleratedPayment,
      annualRate: refiRate
    });

    // Optional comparison: applying the full freed-up consumer debt payment ON TOP of the new mortgage payment
    const fullDebtAsExtraPayment = newMortgagePayment + consolidatedDebtPayment;
    const fullDebtAsExtraPayoff = simulatePayoff({
      balance: newMortgageBalance,
      payment: fullDebtAsExtraPayment,
      annualRate: refiRate
    });

    // Total monthly payment for Scenario 2 (new mortgage payment + remaining unselected debts)
    const totalPayment = newMortgagePayment + unselectedPayment;
    const totalMonthlyInterest = newMortgageMonthlyInterest + unselectedInterest;

    // Overall blended rate across the new mortgage balance and any unselected debts
    const blendedItems = [
      { balance: newMortgageBalance, rate: refiRate },
      ...unselectedDebts
    ];
    const overallBlendedRate = weightedAverageRate(blendedItems);

    // Monthly savings compared to current scenario
    const monthlyPaymentSavings = currentScenario.totalPayment - totalPayment;
    const monthlyInterestSavings = currentScenario.totalMonthlyInterest - totalMonthlyInterest;

    return {
      rate: refiRate,
      termYears: termYears,
      termMonths: termMonths,
      closingCosts: closingCosts,
      includeClosingCosts: includeClosingCosts,
      selectedDebtsCount: selectedDebts.length,
      unselectedDebtsCount: unselectedDebts.length,
      consolidatedDebtBalance: consolidatedDebtBalance,
      consolidatedDebtPayment: consolidatedDebtPayment,
      consolidatedDebtInterest: consolidatedDebtInterest,
      newMortgageBalance: newMortgageBalance,
      newMortgagePayment: newMortgagePayment,
      newMortgageMonthlyInterest: newMortgageMonthlyInterest,
      unselectedBalance: unselectedBalance,
      unselectedPayment: unselectedPayment,
      unselectedInterest: unselectedInterest,
      totalPayment: totalPayment,
      totalMonthlyInterest: totalMonthlyInterest,
      overallBlendedRate: overallBlendedRate,
      monthlyPaymentSavings: monthlyPaymentSavings,
      monthlyInterestSavings: monthlyInterestSavings,
      standardPayoff: standardPayoff,
      priorCombinedPayment: priorCombinedPayment,
      acceleratedPayment: acceleratedPayment,
      acceleratedPayoff: acceleratedPayoff,
      fullDebtAsExtraPayment: fullDebtAsExtraPayment,
      fullDebtAsExtraPayoff: fullDebtAsExtraPayoff,
      interestSavedAccelerated: (standardPayoff && Number.isFinite(standardPayoff.totalInterest) && acceleratedPayoff && Number.isFinite(acceleratedPayoff.totalInterest))
        ? Math.max(0, standardPayoff.totalInterest - acceleratedPayoff.totalInterest)
        : 0
    };
  }

  function computeHelocScenario(currentScenario, helocConfig) {
    const config = helocConfig || {};
    const helocRate = Math.max(0, parseNumber(config.rate));
    const termYears = Math.max(1, Math.round(parseNumber(config.termYears || 15)));
    const termMonths = termYears * 12;
    const fees = Math.max(0, parseNumber(config.fees));
    const includeFees = config.includeFees !== false;
    const paymentMode = config.paymentMode || 'amortizing'; // 'amortizing' or 'interestOnly'
    const isInterestOnly = paymentMode === 'interestOnly';
    const variableRate = Boolean(config.variableRate);
    const annualRateChange = parseNumber(config.annualRateChange);

    // Filter debts selected for HELOC
    const selectedDebts = currentScenario.debtDetails.filter(d => d.includeInHeloc);
    const unselectedDebts = currentScenario.debtDetails.filter(d => !d.includeInHeloc);

    const consolidatedDebtBalance = selectedDebts.reduce((sum, d) => sum + d.balance, 0);
    const consolidatedDebtPayment = selectedDebts.reduce((sum, d) => sum + d.payment, 0);
    const consolidatedDebtInterest = selectedDebts.reduce((sum, d) => sum + d.monthlyInterest, 0);

    const unselectedBalance = unselectedDebts.reduce((sum, d) => sum + d.balance, 0);
    const unselectedPayment = unselectedDebts.reduce((sum, d) => sum + d.payment, 0);
    const unselectedInterest = unselectedDebts.reduce((sum, d) => sum + d.monthlyInterest, 0);

    // HELOC balance = selected debts + (fees if included)
    const rolledFees = includeFees ? fees : 0;
    const helocBalance = consolidatedDebtBalance + rolledFees;

    // HELOC scheduled payment
    const helocMonthlyInterest = helocBalance * monthlyRateFromApr(helocRate);
    const helocPayment = isInterestOnly
      ? helocMonthlyInterest
      : amortizingPayment(helocBalance, helocRate, termMonths);

    // Standard payoff of HELOC
    const standardPayoff = simulatePayoff({
      balance: helocBalance,
      payment: helocPayment,
      annualRate: helocRate,
      variableRate: variableRate,
      annualRateChange: annualRateChange,
      interestOnly: isInterestOnly
    });

    // Accelerated Payoff:
    // If borrower keeps making the same payment as they were on the consumer debt:
    // They were paying consolidatedDebtPayment on the consolidated debts.
    // That full amount is now paid directly to the HELOC!
    const acceleratedPayment = consolidatedDebtPayment;
    const acceleratedPayoff = simulatePayoff({
      balance: helocBalance,
      payment: acceleratedPayment,
      annualRate: helocRate,
      variableRate: variableRate,
      annualRateChange: annualRateChange,
      interestOnly: false
    });

    // Total monthly payment for Scenario 3 (Untouched 1st Mortgage + HELOC + unselected debts)
    const totalPayment = currentScenario.mortgage.payment + helocPayment + unselectedPayment;
    const totalMonthlyInterest = currentScenario.mortgage.monthlyInterest + helocMonthlyInterest + unselectedInterest;

    // Overall blended rate combining Untouched 1st Mortgage + HELOC + remaining debts
    const blendedItems = [
      { balance: currentScenario.mortgage.balance, rate: currentScenario.mortgage.rate },
      { balance: helocBalance, rate: helocRate },
      ...unselectedDebts
    ];
    const overallBlendedRate = weightedAverageRate(blendedItems);

    // Monthly savings compared to current scenario
    const monthlyPaymentSavings = currentScenario.totalPayment - totalPayment;
    const monthlyInterestSavings = currentScenario.totalMonthlyInterest - totalMonthlyInterest;

    return {
      rate: helocRate,
      termYears: termYears,
      termMonths: termMonths,
      fees: fees,
      includeFees: includeFees,
      paymentMode: paymentMode,
      isInterestOnly: isInterestOnly,
      variableRate: variableRate,
      annualRateChange: annualRateChange,
      selectedDebtsCount: selectedDebts.length,
      unselectedDebtsCount: unselectedDebts.length,
      consolidatedDebtBalance: consolidatedDebtBalance,
      consolidatedDebtPayment: consolidatedDebtPayment,
      consolidatedDebtInterest: consolidatedDebtInterest,
      helocBalance: helocBalance,
      helocPayment: helocPayment,
      helocMonthlyInterest: helocMonthlyInterest,
      unselectedBalance: unselectedBalance,
      unselectedPayment: unselectedPayment,
      unselectedInterest: unselectedInterest,
      totalPayment: totalPayment,
      totalMonthlyInterest: totalMonthlyInterest,
      overallBlendedRate: overallBlendedRate,
      monthlyPaymentSavings: monthlyPaymentSavings,
      monthlyInterestSavings: monthlyInterestSavings,
      standardPayoff: standardPayoff,
      acceleratedPayment: acceleratedPayment,
      acceleratedPayoff: acceleratedPayoff,
      interestSavedAccelerated: (standardPayoff && Number.isFinite(standardPayoff.totalInterest) && acceleratedPayoff && Number.isFinite(acceleratedPayoff.totalInterest))
        ? Math.max(0, standardPayoff.totalInterest - acceleratedPayoff.totalInterest)
        : 0
    };
  }

  function serializeState(state) {
    try {
      const json = JSON.stringify(state);
      if (typeof btoa !== 'undefined') {
        return btoa(encodeURIComponent(json));
      }
      return Buffer.from(encodeURIComponent(json)).toString('base64');
    } catch (e) {
      return '';
    }
  }

  function deserializeState(encodedStr) {
    if (!encodedStr || typeof encodedStr !== 'string') return null;
    try {
      let json = '';
      if (typeof atob !== 'undefined') {
        json = decodeURIComponent(atob(encodedStr.trim()));
      } else {
        json = decodeURIComponent(Buffer.from(encodedStr.trim(), 'base64').toString('utf8'));
      }
      const data = JSON.parse(json);
      if (data && typeof data === 'object') {
        return data;
      }
    } catch (e) {
      try {
        const raw = JSON.parse(decodeURIComponent(encodedStr));
        if (raw && typeof raw === 'object') return raw;
      } catch (err) {}
    }
    return null;
  }

  function generateTextSummary(results) {
    const { current, refi, heloc } = results;
    const lines = [
      '=== DEBT CONSOLIDATION & BLENDED RATE ANALYSIS ===',
      '',
      '--- OPTION 1: CURRENT DEBTS & FIRST MORTGAGE ---',
      `• Total Balance: ${formatCurrency(current.totalBalance)} (Mortgage: ${formatCurrency(current.mortgage.balance)}, Consumer: ${formatCurrency(current.consumer.balance)})`,
      `• Total Monthly Payment: ${formatCurrency(current.totalPayment, true)}/mo`,
      `• Monthly Interest Expense: ${formatCurrency(current.totalMonthlyInterest, true)}/mo`,
      `• Overall Weighted Blended APR: ${formatPercent(current.overallBlendedRate)}`,
      `• Consumer Debt Only APR: ${formatPercent(current.consumer.blendedRate)}`,
      `• Consumer Payoff Time: ${current.consumer.cannotAmortize ? 'Does not amortize' : formatMonths(current.consumer.payoffMonths)}`,
      '',
      '--- OPTION 2: CASH-OUT REFINANCE ON FIRST MORTGAGE ---',
      `• New Consolidated Mortgage: ${formatCurrency(refi.newMortgageBalance)} (${refi.selectedDebtsCount} debts consolidated)`,
      `• New Mortgage Rate & Term: ${formatPercent(refi.rate)} fixed for ${refi.termYears} years`,
      `• Total Monthly Payment: ${formatCurrency(refi.totalPayment, true)}/mo (${refi.monthlyPaymentSavings >= 0 ? 'Saves ' + formatCurrency(refi.monthlyPaymentSavings, true) + '/mo' : 'Cost +' + formatCurrency(Math.abs(refi.monthlyPaymentSavings), true) + '/mo'})`,
      `• Monthly Interest Expense: ${formatCurrency(refi.totalMonthlyInterest, true)}/mo (${refi.monthlyInterestSavings >= 0 ? 'Saves ' + formatCurrency(refi.monthlyInterestSavings, true) + '/mo interest' : 'Cost +' + formatCurrency(Math.abs(refi.monthlyInterestSavings), true) + '/mo'})`,
      `• Overall Blended APR: ${formatPercent(refi.overallBlendedRate)}`,
      `• Standard Payoff: ${formatMonths(refi.standardPayoff.months)} (${refi.termYears} yrs)`,
      `• ACCELERATED PAYOFF (keeping prior payment of ${formatCurrency(refi.acceleratedPayment, true)}/mo):`,
      `  -> Pays off entire mortgage in ${formatMonths(refi.acceleratedPayoff.months)}!`,
      `  -> Saves ${formatCurrency(refi.interestSavedAccelerated)} in total interest!`,
      '',
      '--- OPTION 3: HELOC CONSOLIDATION (UNTOUCHED 1ST MORTGAGE) ---',
      `• Untouched 1st Mortgage: ${formatCurrency(current.mortgage.balance)} at ${formatPercent(current.mortgage.rate)} (${formatCurrency(current.mortgage.payment, true)}/mo)`,
      `• HELOC Balance: ${formatCurrency(heloc.helocBalance)} at ${formatPercent(heloc.rate)} (${heloc.selectedDebtsCount} debts consolidated)`,
      `• HELOC Payment Mode: ${heloc.isInterestOnly ? 'Interest-Only' : 'Amortizing (' + heloc.termYears + ' yrs)'}`,
      `• Total Monthly Payment: ${formatCurrency(heloc.totalPayment, true)}/mo (${heloc.monthlyPaymentSavings >= 0 ? 'Saves ' + formatCurrency(heloc.monthlyPaymentSavings, true) + '/mo' : 'Cost +' + formatCurrency(Math.abs(heloc.monthlyPaymentSavings), true) + '/mo'})`,
      `• Monthly Interest Expense: ${formatCurrency(heloc.totalMonthlyInterest, true)}/mo (${heloc.monthlyInterestSavings >= 0 ? 'Saves ' + formatCurrency(heloc.monthlyInterestSavings, true) + '/mo interest' : 'Cost +' + formatCurrency(Math.abs(heloc.monthlyInterestSavings), true) + '/mo'})`,
      `• Combined Blended APR: ${formatPercent(heloc.overallBlendedRate)}`,
      `• Standard HELOC Payoff: ${heloc.isInterestOnly ? 'Interest-Only' : formatMonths(heloc.standardPayoff.months)}`,
      `• ACCELERATED PAYOFF (keeping consumer debt payment of ${formatCurrency(heloc.acceleratedPayment, true)}/mo):`,
      `  -> Pays off HELOC completely in ${formatMonths(heloc.acceleratedPayoff.months)}!`,
      `  -> Saves ${formatCurrency(heloc.interestSavedAccelerated)} in total HELOC interest!`,
      '',
      'Generated by Debt Consolidation & Blended Rate Calculator'
    ];
    return lines.join('\n');
  }

  return {
    parseNumber: parseNumber,
    round: round,
    formatCurrency: formatCurrency,
    formatPercent: formatPercent,
    formatMonths: formatMonths,
    monthlyRateFromApr: monthlyRateFromApr,
    amortizingPayment: amortizingPayment,
    impliedMonthlyInterest: impliedMonthlyInterest,
    weightedAverageRate: weightedAverageRate,
    simulatePayoff: simulatePayoff,
    computeCurrentScenario: computeCurrentScenario,
    computeRefiScenario: computeRefiScenario,
    computeHelocScenario: computeHelocScenario,
    serializeState: serializeState,
    deserializeState: deserializeState,
    generateTextSummary: generateTextSummary
  };
});
