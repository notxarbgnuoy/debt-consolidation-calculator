# Calculator audit — November 4, 2026

Result: no numerical discrepancies found in this bounded audit. No calculation-engine corrections were made. The only product changes were chart defaults and presentation/assumptions text.

## Method and scope

Ten input scenarios, each comparing Current, Cash-Out and HELOC under four payment approaches: minimum required, current household budget, a $4,500 total household budget, and $250 extra above each scenario's changing minimum. This gives 120 portfolio/payment-view comparisons, not 120 separate borrower situations.

A separate reference implementation builds the expected loans directly from the fixture inputs. It independently computes fixed-rate payments, monthly interest/balances, highest-rate-first extra principal, payment rollovers, HELOC transitions, insurance, closing financing and cash payments. Checkpoints include months 1, 12, 60, 120, 121 and 360 when available, plus modeled payoff dates, total interest and budget shortfalls. Dollar tolerance was $0.03; largest observed numerical difference was less than $0.000001. Portfolio initial payments and balance-weighted rates were checked separately.

Original-loan payment and 120-payment balance were also checked against a closed-form calculation ($300,000 at 6%, 30 years; payment $1,798.651575). January and December closing-date boundaries were checked. The fresh chart defaults were verified.

This validates the implemented monthly model. It does not independently certify lender pricing, daily payoff quotes, loan eligibility, future adjustable rates, or all FHA/VA rules. The FHA fixture checks the implemented 0.50% annual MIP / 11-year case and premium rounding, not every program band.

## Reproduce

Run from the project folder:

```sh
node tests/scenario-audit.mjs
```

For manual checks, start with this common fixture. Set rates manually so benchmark updates do not change the comparison:

- Home value $600,000; first mortgage balance $250,000; rate 3%; total mortgage payment $1,500. Advanced options: mortgage statement, known P&I $1,100. No PMI, HOA or other housing expenses. Thus escrow is $400/month.
- Card: $10,000 at 18%, payment $300; selected for both HELOC and refinance.
- Auto: $12,000 at 6%, payment $350; selected for refinance only.
- No second mortgage or additional cash; cash to close $0 for both options.
- Conventional refinance: 6%, 30 years, closing costs 0% + $2,000.
- HELOC: 8%, 10-year interest-only draw + 20-year repayment, closing costs 0% + $1,000.
- Chart horizon: 5 years. Current household budget: $2,150/month. Extra-payment cases use $4,500 total or $250 above minimums as specified above.

Apply each row's changes independently to the common fixture:

| Case | Changes | Result |
| --- | --- | --- |
| Mixed debts | None | Pass |
| Second mortgage | $30,000 at 7%, $350 payment; HELOC selected, refinance excluded | Pass |
| Zero interest | All debt and financing rates 0%; first P&I $1,000, total payment $1,400 | Pass |
| Extra cash and fees | $25,000 extra cash; refinance cash to close $3,000 and 1% fee; HELOC cash to close $2,000 and 0.5% fee; fixed costs retained | Pass |
| Existing PMI | PMI $75/month; total mortgage payment remains $1,500 | Pass; retained for HELOC, removed for conventional refinance |
| FHA | FHA refinance at 5.5%, financed UFMIP 1.75%; fixed costs retained | Pass; annual scheduled MIP and modeled end date reconciled |
| VA | VA refinance at 5.5%, funding fee 3.3%; fixed costs retained | Pass; fee financing reconciled |
| Amortizing HELOC | Fully amortizing, 15-year repayment | Pass |
| Below-interest debt payment | Card rate 24%, payment $50 | Pass; balance growth and absence of fictitious payoff verified |
| HELOC transition/shortfall | First balance/P&I $0, mortgage payment $400; only debt $12,000 at 12%, payment $125, both selections; HELOC draw 1 year + repayment 1 year | Pass; minimum payment rises in month 13; inadequate fixed budgets stop rather than invent extra funding |

## Modeling limits to keep visible

- Existing PMI cancellation is not modeled before the first mortgage is paid off. FHA uses scheduled annual premiums rather than recalculating premiums for every extra-payment path.
- An existing second mortgage uses its entered rate and payment. Its future contractual interest-only expiry or balloon cannot be determined from those three inputs.
- Escrow/other housing expenses stay constant and continue after debt payoff; they are included in cash paid, not loan interest.
- Current provides no extra cash. A financed option with extra cash is not an equal-proceeds comparison.
- The projection cap is 1,200 months. No modeled payoff within that range is not a promise that contractual payments can continue indefinitely.
- Previously saved chart choices remain saved. The new chart defaults apply to a fresh browser or Load example/Clear reset; borrower inputs are not erased on update.

If a discrepancy appears during manual review, record the inputs, goal, chart payment mode, selected month and actual/expected amount before changing the engine.
