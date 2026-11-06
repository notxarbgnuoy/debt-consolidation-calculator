# TruPath implementation decisions

## Phase 1 boundary
This is an interactive UX prototype. Loan scenario numbers, rankings, payoff timelines, and SVG curves are fixed illustrative fixtures, not financial calculations. Only consumer debt totals, payments, weighted nominal rate, and initial monthly interest are computed from the entries. Editing financing inputs does not change scenario fixtures. The 10-year interest fixture ranking is explicitly labeled even when a different chart horizon is selected.

Reference workbook `Refi Quote.xlsx` is absent. Review its Quotes and Amortization sheets before implementing Phase 2. No local tax/insurance data or market rates have been retrieved. Interface inspiration was reviewed from the four specified public websites.

## Proposed engine defaults, subject to review
- USD, monthly end-of-period payments, nominal annual rate / 12, full floating-point internal precision, rounded display only. Not daily servicing payoff quotes.
- Existing mortgage default is fixed-rate total-payment method. Separate housing costs: annual taxes $3,600 and insurance $1,800; MI, HOA, other costs $0. These are editable placeholders, not local estimates.
- Actual statement principal, date-specific payoff adjustment, and original-loan scheduled balance must remain distinct source fields.
- Consumer debts use fixed entered payments; no new borrowing, penalties, or promotional rate transitions unless specified. Underpayment produces warnings and residual balances, never an invented payoff date.
- HELOC example rate 8.5%, 10-year interest-only draw plus 20-year amortizing repayment, no further draws; constant rate unless a rate path is explicitly modeled. CLTV warning threshold 85%, not an approval rule.
- Refinance example 6.5% / 30 years, with 15/20-year choices. Rates are not market offers. Closing cost defaults: HELOC $1,500; refinance $6,500. Future engine defaults to financing eligible transaction costs, with cash-paid allocation explicitly editable; escrow/prepaids remain separate.
- No appreciation, cost inflation, tax deductions, DTI, or eligibility predictions.
- Required-payment view does not recycle freed payments. Same-budget view keeps original debt-service budget, excluding recurring housing costs; meets required payments first, then uses highest-rate-first extra payments. First mortgage stays at its required payment in HELOC view until eligible higher-rate debts are eliminated. Insufficient budgets are flagged.
- Comparison horizon defaults to 120 months. All-interest and remaining-balance comparisons use the same horizon. Fastest-payoff ranking always uses equal budget even if the repayment-view toggle remains on required payments.
- Payment recovery is a cash-flow measure. Economic break-even compares cumulative cash contributions plus remaining liability and net transaction costs, avoiding double counting financed costs. Escrows/refunds/additional borrower cash must be reconciled separately.
- Maximum 50 consumer debts, bounded numeric inputs, future engine capped at 600 monthly periods with unresolved residuals reported.

## Privacy and delivery architecture
Only versioned calculator fields/debts/preferences are stored under `trupath:calculator:v1` in localStorage. No identity/contact fields exist. No analytics, remote fonts, cookies, fetches, or financial data transmission are implemented by the calculator. Storage can fail without breaking the page. Clear & reset removes stored data and clears primary inputs.

Future modules: `engine/loans.js`, `engine/schedules.js`, `engine/scenarios.js`, `engine/comparison.js`, pure numeric functions with independent test fixtures; `ui/` bindings; `pdf/` professional report renderer; `delivery/` configured API client. Current `fixtures.js` must be removed from production finance execution.

The backend is not implemented in Phase 1. Proposed contract:
- POST /api/scenarios requires explicit result-delivery request, validated bounded schema, first name and one selected destination, independent delivery/marketing consent records, idempotency key, rate limits and bot protection. Never autosubmit browser inputs.
- Generate 256-bit random bearer token, store only token hash, encrypt scenario records and contact information at rest. Default link expiry 30 days; support revocation and automatic deletion. No financial URL parameters. Avoid third-party scripts; use no-referrer and restrictive CSP. Exchange fragment token via POST for short-lived HttpOnly Secure SameSite session; remove fragment from address history. Returning edits require explicit save.
- GHL API credentials and webhook locations exist only in backend secret storage. Queue deduplicated contact upserts, debt-calculator source tags, summary/custom return-link fields, and delivery workflows with bounded retries and audit records that omit borrower payloads and tokens. Honor SMS/email delivery consent separately from marketing opt-in. Retention, sender setup, and applicable jurisdictional consent language require configuration before activation.
- PDF download remains free and local where possible; implement after engine validation. Create a typeset branded report from data, never a screenshot; include dates, assumptions, horizon, costs, tradeoffs and disclosures.

## Phase gates
1. Review working UX prototype.
2. Inspect workbook; implement validated finance engine with independently calculated zero-rate, amortization, IO-transition, varying-rate, insufficient-budget and residual tests.
3. Implement comparisons, equal-budget redistribution, consistent horizons, qualified rankings and reconciled break-even.
4. Final chart data, accessibility/mobile QA, report generation, WordPress guide. Configure secure delivery separately.

## Mortgage-first UX revision
Home / mortgage is section 1; consumer debts are section 2. Global Load example and Clear/reset actions share the top toolbar, which can later hold Download and Save actions. Clear/reset clears borrower amounts and second-lien data and restores financing-option assumptions to defaults.

Currency inputs use comma formatting on blur, accept pasted US-formatted amounts and up to two decimal places, and retain numeric state. Rates and terms remain numeric inputs. Existing version-1 saved records restore with the optional second mortgage disabled if second-lien fields are absent.

The optional existing second mortgage currently stores balance, nominal annual rate and monthly P&I separately from consumer debts and shared housing costs. Its entry/removal does not change mock comparisons. Removing it preserves its inputs for re-adding during the session; reset clears them. The engine phase should default to an amortizing fixed-payment second lien, retain it in the current/HELOC scenarios, and pay it off with the cash-out refinance, accounting for both existing liens in combined leverage. Existing HELOC interest-only terms or decisions to retain/subordinate a second lien require explicit future controls; do not infer those structures from the current three basic fields.

For consumer debts, planned remaining term is estimated from balance, nominal monthly interest and fixed entered payment using monthly amortization until zero; no contractual maturity is claimed. Zero-rate loans use balance/payment, the final payment is capped to the amount due, and payments not covering interest produce an unresolved balance warning. No payoff estimator has been enabled in this UX phase.

## Escrow-focused advanced options
The basic input remains Total Mortgage Payment. Advanced options estimates monthly escrow from annual taxes and insurance, with separate switches for whether each is included in that payment. The default switches are on, explicitly editable, and the annual amounts are clearly labeled example assumptions. Estimated P&I equals total payment minus escrowed tax/insurance and entered monthly mortgage insurance. Mortgage insurance is assumed included in the entered payment, but is shown separately from escrow. HOA and other separately paid expenses never reduce estimated P&I. A negative P&I estimate is replaced with a correction warning, not a misleading negative payment. These local payment-breakdown estimates do not activate the still-mocked scenario comparisons.

Existing second-mortgage entries use the same neutral account-card surface as consumer debts, with an accessible × remove control and concise labels. Its payment remains P&I-only in this prototype; shared escrow is entered once under the first mortgage.

## Two-part advanced mortgage details
Advanced options now explains its purpose while collapsed. Exact Payment Details comes first, followed by Mortgage Details.

New examples estimate annual property tax at 0.55% of estimated home value. The rate is editable. Annual and monthly amounts are displayed together; entering a known amount uses a separate manual source and converts the companion view. Insurance defaults are $100/month below $250k, $120 at $250k–$399,999.99, $140 at $400k–$549,999.99, $160 at $550k–$749,999.99, and $180 at $750k+. The basis is optional purchase price, otherwise current home value. The bands are product assumptions, not verified insurance quotes. Both tax and insurance can be switched to actual amounts. Older stored annual amounts remain manual to avoid overwriting user inputs.

Users may instead enter total monthly escrow and check whether they pay PMI. A separate checkbox records whether that escrow total already includes PMI; PMI is counted once. Known PMI values are preserved if the checkbox is switched off. HOA remains outside the mortgage payment.

Mortgage Details offers current-statement balance or original-loan estimation. The isolated mortgage module now computes fixed-rate scheduled balance from original principal, rate, term, first payment date, balance date, and constant extra monthly principal. Payments due on the balance date are assumed made, with month-end due dates clamped to the last valid day. Future first-payment dates and invalid dates/terms return errors. The top balance/rate fields display calculated values read-only in original mode; source current balance/rate remain separate and restore when switching back. Results are scheduled balances, not date-specific lender payoffs. Irregular extra payments, forbearance, missed payments, modifications, adjustable rates and servicing fees are not modeled by this estimator.

This isolated estimator is an exception to the earlier UX-only boundary; the overall HELOC/refinance/current scenario cards, rankings and chart remain fixtures. The Quotes and Amortization workbook review is still required before the complete comparison engine. Tests: `node --test tests/mortgage.test.mjs` covers independent payment/balance values, zero rates, extra payments, calendar boundaries, insurance tiers, escrow/PMI reconciliation and saved-data migration.

## Information-first mortgage flow
Advanced options now starts with “I have my mortgage statement” or “I know my original loan details.” The statement route accepts monthly escrow, actual P&I, or the existing itemized estimates. The original route first takes original borrowed amount, fixed annual rate and term, then calculates scheduled P&I independently of payment dates. Optional current-balance estimation reveals dates and historical constant extra payments only when requested.

Original-loan escrow inference: total current payment minus original scheduled P&I minus extra principal included in the current payment minus known monthly PMI. When no PMI amount is provided, label the remainder “Estimated escrow + any PMI.” The residual can include fees or escrow adjustments and cannot identify the tax/insurance split. It is not represented as a precise servicing escrow balance. Invalid/negative residuals show a correction message. An unchanged fixed-rate P&I is assumed; modified, recast, adjustable-rate, or other changed-payment loans should use actual statement P&I instead. Historical extra principal used in balance estimation and current extra principal included in the entered payment are separate inputs.

Changing routes preserves all entered balance, rate, escrow, itemized and original-loan fields. Returning to the statement path restores statement balance/rate instead of replacing them with estimates. Prior saved original-loan selections migrate to the matching new route. Additional tests cover residual escrow against independent P&I, no-date inference, zero rates and extra principal/PMI separation.

## Closing-date approximation; extra-principal fields removed
Balance estimation now asks for Closing date. The first scheduled payment is derived as the first of the calendar month two months after closing: any January closing uses March 1, November uses January 1 of the next year, and December uses February 1. This is an explicit product approximation, not a guarantee of contractual due dates. Payments due on the balance date are assumed made. Between closing and the first scheduled payment, the scheduled principal balance remains the original amount. A balance date before closing is rejected.

Historical and current-payment extra-principal fields have been removed, including their effects on calculations and saved-input restoration. The estimator now assumes scheduled payments only. Users who have paid extra should enter their actual statement balance instead of using the scheduled estimate, and enter the regular monthly mortgage payment excluding voluntary extra principal. This revision supersedes earlier extra-payment controls described above.

Existing saved first-payment dates cannot identify the actual closing date. When an older record has no closing date, require entry rather than inventing one; preserve all other supported borrower inputs. The example uses a closing date of November 15, 2018. Tests cover January boundaries, leap dates, year rollover, the pre-first-payment interval, invalid chronology and discarded legacy extra amounts.

## Collapsible input sections and live selection feedback
The three numbered input sections are native details/summary controls, open by default. Each can close independently without removing fields or clearing borrower data. The “Costs paid outside my mortgage” interface and its DOM bindings have been removed.

Debt inclusion switches still do not drive scenario payments, interest, payoff dates or charts, which remain prototype fixtures. A new explicitly labeled live selected-consumer-debt summary updates independent HELOC/refinance balance and account counts on edits, inclusion changes, additions, removal and reset. It excludes mortgage balances and closing costs. A note at debt entry and beside the totals distinguishes these live sums from the mock loan comparisons; do not represent this feedback as completion of the comparison engine.

QA checked that all three sections initially open, close independently, and preserve values/selections when reopened; independent checkboxes update the corresponding live selected balance while leaving the other selection intact. Existing mortgage calculation tests remain unchanged and pass.

## Shared equity bar, credit range and clearer financing controls
Section 3 now starts with a single home-value utilization bar: existing mortgage principal is the filled portion, with markers at 80% for cash-out refinance and 90% combined for a HELOC. These are user-approved product assumptions based on typical programs, not verified eligibility rules. The former configurable 85% HELOC setting is retired so it cannot silently contradict the 90% illustration.

The live equity model uses current entered first-mortgage principal, or the separate valid scheduled balance if original-loan estimation is selected, plus any enabled existing second mortgage. For each scenario, room before debt consolidation is (home value × assumed limit) − existing mortgages. Cash after selected consumer debts and financed closing costs subtracts those scenario-specific amounts. Cash brought to reduce refinance principal is shown as a borrower contribution and added to that option's available funds. A shared additional-cash checkbox and amount applies to both scenarios; the amount is retained when the checkbox is off but excluded from the calculation. Shortfalls are reported, never presented as approval. Both existing liens remain when evaluating the HELOC combined limit; both are treated as paid off in the refinance capacity estimate. Escrow funding, prepaid costs and servicing payoff adjustments are excluded and labeled as such.

Credit-score input uses 20-point ranges across 300–839, a final 840–850 range, and “Not sure.” It is stored only in local versioned inputs. It has no pricing, capacity or approval effect in this release; no credit check, backend lookup or automatic rate estimation is performed. A future pricing module can consume this band alongside other explicitly added pricing inputs. This user-approved addition supersedes the original exclusion of credit-score input, without introducing qualification rules.

Home insurance now exposes only editable annual and monthly fields plus the existing included-in-payment checkbox. The former Help me estimate selector, purchase-price field and estimate table are removed from the UI. Untouched defaults still use the internal $100–$180 monthly table based on estimated home value; editing either amount locks in a manual annual source and updates the companion unit. Purchase price no longer affects insurance; old saved premiums remain intact. The refinance mortgage term is a numeric years input, default 30, rather than a preset selector.

HELOC and refinance settings use separate bordered accordion cards, tinted open headers, an “Editing … assumptions” label, and scenario-specific field labels. Rate-example guidance appears only inside the expanded settings. The overall payment/interest/payoff cards and chart remain mock fixtures, while the equity preview and selection sums are live. Independent tests cover cap reconciliation, both liens, different debt selections, costs, cash requests and contributions, insufficient equity, unknown balance, score-band coverage, and saved-data migration.

## Simplified equity layout and requested credit bands
Available equity is now its own area, above the credit/cash controls. A 27px chart has explicit labels for Existing mortgage, Cash-out refi and HELOC; the separate existing-mortgage dollar balance and arithmetic breakdown are removed. Two stacked rows display the live available cash for cash-out refinance and HELOC. The calculation is unchanged: remaining capacity after selected debts, estimated financed closing costs, borrower refinance contribution and any enabled additional cash request. A short note states what was deducted; over-limit warnings remain visible so a displayed $0 cannot hide a shortfall.

Credit score and Additional cash are separate adjacent boxes. Checking the cash option reveals one dollar input shared by both scenarios. The score options are 780+, 760–779, 740–759, 720–739, 700–719, 680–699, 660–679, 640–659, 620–639, 619 or below, and Not sure. Previously saved higher/lower 20-point buckets map to the new inclusive end buckets; interior buckets remain intact. Credit score still has no effect on rates or eligibility. The new upper/lower bucket list supersedes the earlier full-range list. UI selection is synchronized to saved state after page restoration to avoid index-based browser form restoration showing a different score range after options change.

## Accessible equity: used / total, with advisory red warnings
The equity rows now read Used / total under “Accessible equity.” Total is gross accessible equity under the illustrated cap: max(0, home value × 80% or 90% − existing first/second mortgage balances). It is independent of selected consumer debts, additional cash, closing costs, and borrower cash contribution.

Used is selected consumer balances plus eligible assumed financed closing costs plus enabled additional cash, less refinance cash brought to reduce principal, floored at zero for display. A short tooltip defines what is included. Cash brought does not inflate total accessible equity. The underlying unrounded residual remains available to determine actual cap excess, including cases where existing mortgages already exceed the cap.

The previous after-selected-debts paragraph has been removed. The visible disclaimer now reads: “For educational and illustrative purposes only, based on standard programs. Reach out to a licensed loan officer for details about your situation.”

Requests over the illustrated 80% refinance or 90% HELOC combined limits display a red advisory with the excess amount and explain that users can continue because other programs may have different limits. No field is disabled, no amount is reduced to fit the cap, and no approval or eligibility decision is made. This supersedes earlier net-remaining-cash wording. Tests verify totals stay fixed as debt/cash/cost selections change, requested amounts remain intact over the cap, cash contributions reduce usage, and underwater shortfalls remain visible.

### Live HELOC pricing update
- Fed H.15 Bank prime loan row is the selected public benchmark. Latest valid numeric column, not the release date, determines observation date.
- New comparisons assume 740–759 credit. Explicit saved selections are retained; Not sure uses a visible 740 assumption.
- Approved table margins are percentage points added to nominal Prime, without rounding to mortgage coupon increments, loan-size adjustments, promotional offers, floors, or caps. These are illustrations, not program-specific pricing. Extrapolated cells remain labeled.
- Combined LTV includes the first mortgage, proposed HELOC, and any second mortgage left in place. Consolidated second principal is included only in the proposed HELOC.
- Hosted reader refreshes on visits with an hourly cache, not a scheduled unattended job. GitHub daily snapshot workflow is supplied for eventual GitHub deployment and must be enabled there.
- Manual HELOC rate overrides are stored independently from derived rates. Automatic pricing never overwrites the manual source value.

### Percentage plus fixed closing costs
- Each scenario has separate percentage and fixed-dollar inputs. Existing dollar estimates migrate unchanged to the fixed-dollar component; percentages default to 0%.
- Both components remain financed. Percentage is applied to the final new HELOC or refinance loan amount (including financed fees), not the home value or existing first-mortgage balance.
- With pre-cost principal B, fixed costs F, and decimal percentage p, final loan L = max(0, (B + F)/(1 - p)); total closing costs = F + pL. This solves the financed-cost circularity directly.
- HELOC pre-cost principal includes selected consumer debts, selected second-mortgage payoff, and requested extra cash. Refinance additionally replaces the first mortgage and subtracts cash brought to reduce principal.
- Closing-cost percentages accept 0–25%; invalid percentages are rejected rather than producing a singular or negative denominator.
- The simplified field order is rate/term, closing-cost formula, then product-specific settings. Routine rate arithmetic and the new HELOC amount summary are hidden; pricing errors and stale-feed notices remain visible when needed.

### Cash contributions and conventional cash-out pricing
- Closing costs are the last input group in each financing box. Each option has its own Cash to close input, default $0. Here this means the borrower contribution reducing financing, not a computed complete settlement statement; escrow deposits/prepaids are not included.
- Existing saved refinance cashIn values remain intact; HELOC uses a separate helocCashIn source field.
- Conventional rate margins and the calibration formula are documented in CONVENTIONAL-RATE-MARGINS.md. Applies to owner-occupied one-unit conforming fixed-rate illustrations, targeting zero discount points. The quoted slight cost at 740/80 remains a calibration uncertainty.
- MND rates are fetched through a fixed server-side source and cached on visits like Prime. Last-good snapshots and browser cache provide dated fallback data. No borrower inputs are transmitted to MND.
- FHA and VA program selection, UFMIP, monthly MIP, and funding fee exemptions are deferred by user choice.

### Program dropdown and pricing ceilings (supersedes earlier pricing coverage limits)
- Cash-out refinancing now has Conventional, FHA, and VA rate illustrations. Conventional remains the default. Switching program preserves financial inputs and any explicit manual override.
- For both HELOC and conventional refinance pricing, use min(actual ratio, 80%) to select a table bracket. This is a pricing illustration override requested by TruPath, not a change to actual LTV, loan size, equity, or eligibility. Prior HELOC 80–90% margin columns remain in configuration but are no longer reached by automatic pricing under this ceiling.
- Projected refinance LTV and HELOC CLTV display under used equity amounts. If a second mortgage remains behind the refinanced first, show both first-lien LTV and combined LTV. Cash and financing costs remain included in actual ratios; amounts and excess-limit warnings are never clamped.
- FHA uses MND 30-year FHA; VA uses MND 30-year VA. They do not use the conventional rate or Fannie LLPA grid. The same program benchmark is used for all entered terms in this simplified model; no government short-term pricing is modeled.
- FHA/VA base = nearest 0.125% to (program benchmark minus 0.25 percentage points), ties upward. Then add: 720+ = 0; 660–719 = 0.125; 640–659 = 0.25; 620–639 = 0.375; 619 or below = 1.00 percentage point. Not sure assumes 740. LTV and retained-second status do not affect these government example rates.
- Per the requested limited scope, no VA funding fee/exemption or eligibility modeling is added, and no FHA upfront/monthly mortgage insurance is included yet. Program-specific notices state these omissions. The current 80% accessible-equity illustration remains unchanged for all refinance program selections; it is not a program-specific maximum.
- These are rate illustrations only. Main comparison payment/interest/payoff cards and chart are still mock examples.

### FHA insurance and VA funding fees (supersedes prior fee omissions)
- Loan type occupies a full-width row above refinance interest rate and mortgage term.
- Conventional fee percentage, FHA upfront MIP percentage, and VA funding-fee percentage are separate saved source inputs. Defaults are 0%, 1.75%, and 3.3%, respectively. Switching programs preserves edits, including VA 0%.
- Regular FHA UFMIP and VA funding-fee percentages are applied once to the base loan before the program fee. Base includes assumed eligible financed fixed costs, less the borrower's cash contribution. New loan = base × (1 + program fee rate). This avoids charging the program fee on itself. Conventional/HELOC generic percentage-cost logic remains unchanged.
- Fixed closing costs remain a separate shared refinance input; eligibility of individual financed costs, payoff adjustments, prepaids and escrow deposits are not determined here.
- FHA annual MIP uses HUD ML 2023-05 Appendix 1.0 regular forward-loan bands, based on actual base-loan amount, base LTV and original term. It is not determined by the 80% rate-pricing ceiling. The $726,200 MIP band threshold is separate from program loan limits.
- FHA monthly box estimates the first amortization-year premium using the scheduled average outstanding balance, excludes financed UFMIP using the upfront factor, and follows HUD's annual/monthly rounding method. Calculation uses the active manual or derived example rate. Later annual premium changes, eligibility, case number exceptions, streamline refunds, and lender servicing adjustments are not modeled. Insurance metadata includes the applicable annual rate and duration for future schedules.
- VA notice describes the 3.3% subsequent-use default and states that eligible service-connected disability exemptions pay 0%; a licensed loan officer must confirm the actual percentage. No exemption adjudication is performed. User can edit the funding-fee percentage to 0%.
- Program fees affect loan balances, equity usage and displayed LTV/CLTV immediately. Monthly FHA MIP is shown separately. Main comparison cards and chart remain labeled mock fixtures; these updates do not turn them into amortized comparison results.

Sources checked November 3, 2026:
- HUD upfront/annual MIP tables: https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf
- HUD periodic monthly MIP computation: https://www.hud.gov/hud-partners/housing-premium-calculation
- VA fee rates and exemptions: https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/

### Live comparison engine (replaces all earlier mock-fixture results)
- Comparison construction is pure in comparison.js; monthly schedules are in projections.js. The former fixtures file is removed. Both required-payment and current-budget results, the graph, horizon table, first-month metrics and highlights now use calculated values.
- Cards stay ordered Current, Cash-out, HELOC. Purple identifies the lowest initial total payment, lowest cumulative interest over the chosen common horizon/repayment view, or earliest all-debt payoff at the original household budget. Ties are labeled. Missing scenario inputs prevent an overall highlight. This is a metric-specific result, not an overall financial recommendation.
- New comparisons default to statement source and known P&I. Total minus P&I and known PMI is retained as estimated shared escrow. Unknown PMI can remain in that residual; the tool cannot identify it without a stated amount. Itemized taxes/insurance not escrowed and known other housing amounts are included consistently.
- Current first-mortgage principal/rate/PI come from the active statement or original-loan source. Refinance replaces that loan; HELOC retains it. Consumer and second-mortgage selections are independent, and each retained or consolidated balance/payment is counted once. Actual balance is not represented as a dated lender payoff.
- Initial loan payments are capped at the balance plus that month's interest (last payment). First-month interest = sum(balance × annual nominal percent / 1200). Weighted nominal rate = sum(balance × annual nominal percent) / sum(balance). Escrow, mortgage insurance and transaction costs are not classified as interest, although financed costs increase principal.
- Consumer and existing second payments stay fixed in required mode. Under-interest payments accrue unpaid interest and cannot receive a false payoff. Exact-interest second payments remain interest-only indefinitely unless extra principal is applied; future contractual resets are unknown and not inferred.
- HELOC: entered fully amortizing option uses the repayment term immediately. Interest-only option pays monthly interest for the entered draw period, then sets a fixed amortizing payment based on the remaining principal and entered repayment term. No extra draws or future rate changes are assumed.
- Constant-budget mode uses the current initial household payment. Shared housing and insurance must be paid first, followed by all required debt payments. Remaining budget goes highest-rate-first to principal; freed payments and expired modeled MI are redirected. If a required payment increase exceeds the budget, the projection is flagged infeasible rather than increasing contributions. A valid earlier comparison horizon is retained when a later budget shortfall occurs.
- Current PMI is held constant until the related first mortgage is paid. Refinance FHA MIP follows the original scheduled annual average balances and applicable duration, stops at actual loan payoff, and is included in household payments/cash without inflating interest or nominal rate. Conventional PMI above 80% is not configured and carries an explicit warning.
- Fixed-rate monthly amortization uses financial precision internally except HUD periodic MI rounding. Projections stop after payoff or 1,200 months; no payoff is invented when balances remain. Housing costs continue over the common cash-comparison horizon after debts are repaid. Cash paid includes debt payments, modeled housing/MI and cash contributed at closing. Financed fees are not counted again as an upfront payment. Cash-out proceeds are shown through loan balances; cash paid is not net economic cost.
- No extra principal is sourced from taxes, home insurance, HOA, other recurring housing expenses or current mortgage insurance. No tax deductions, skipped-payment savings, refundable-escrow gains, automatic future refinancing or program approval are assumed.
- Formal economic/payment break-even and secure saving/export remain future modules. The interface labels that scope rather than displaying fabricated break-even values.

### Results layout and maintained-budget interest comparison (supersedes prior goal policy)
- Results heading is now Results, comparison heading is always Compare Scenarios, and cards are Current, Cash-Out, HELOC without repeated comparison badges. Purple remains a metric-specific highlight.
- Each card exposes first mortgage, second mortgage/HELOC, and outstanding consumer-debt balance, required payment and nominal weighted rate. First-mortgage payment is explicitly P&I; escrows and mortgage insurance are separate so the household payment reconciles. Combined second/HELOC groups use a balance-weighted rate when more than one lien remains.
- Total amount consolidated means consumer debt and any second mortgage paid off through new financing. It excludes the original first mortgage being refinanced, additional cash, and fees. The first mortgage and financed fees remain in the new first-lien balance and total starting debt.
- Current remains the actual existing portfolio with $0 additional cash and $0 consolidated. Requested cash is added only to HELOC/refinance financing. A visible cash-proceeds difference note explains that this is not a same-proceeds economic comparison. No assumed borrowing is invented for Current, and no cash proceeds are misclassified as interest savings.
- For ordinary funded cases, each new scenario's total principal reconciles to Current principal + additional cash + financed costs - borrower cash contribution. Selected and retained second liens are each counted once. Regression checks cover conventional, FHA and VA.
- Lowest Interest now compares cumulative interest THROUGH PAYOFF at the original household monthly payment budget for every scenario, including Current. Freed debt payments are redirected highest-rate-first in all three options. It no longer ranks the default horizon under declining required payments. No feasible modeled payoff means no lifetime-interest ranking for that scenario.
- Interest and debt-free goals force the current-budget projection view. Household payment cards display actual first-month budget contributions, with the required household payment and extra principal separately shown. Lowest Payment continues to show required initial payments. The selectable chart/table remain common-horizon views, clearly distinguished from lifetime-interest totals.
- A lower lifetime-interest total is not an overall winner when additional cash differs, balances differ, availability is conditional, or borrower cash contributions differ. The tool shows these facts rather than manufacturing an equal-cash baseline.
- Removed only the percent-to-dollar explanation beneath closing-cost inputs. The percent + fixed dollar = total calculation and program fee disclosures remain.

Reference workbook inspected read-only: /Users/Braxton/Desktop/Refi Quote.xlsx, Quotes and Amortization sheets. Useful structures include rate/balance/payment and household-payment comparisons, consolidated debt, additional cash, and schedules with additional principal. The website uses independently tested monthly math; workbook formulas, deferred-payment savings and escrow refund treatment are not copied as authoritative financial logic.

### Minimum payments versus goal projections
Scenario cards always display required total household payments, including housing costs and mortgage insurance. Lowest Interest and Debt-Free Sooner rank projections using the original Current household payment budget, with extra and freed payments directed to the highest-rate remaining debt. This budget does not replace the minimum payment displayed on the cards.

### Household payment presentation
First-mortgage payments shown in results include recurring housing costs and applicable mortgage insurance. Separate escrow/PMI rows are omitted; loan principal, interest and weighted rates still exclude these expenses. Conventional refinance assumes zero PMI even when the entered scenario exceeds typical LTV limits; existing PMI remains with Current and HELOC until the first mortgage is paid off. FHA MIP is retained and included in its first-mortgage payment.

### Additional cash and highlights
When additional cash is selected (including a selected box with a zero amount), highlights rank only Cash-Out and HELOC. Current remains visible with its actual balances and payments as a comparison baseline. Blended-rate changes are expressed in percentage points, not relative percent changes. Red denotes an increase versus Current and green denotes a decrease.

### Goal-driven interest and payoff
The goal selector is the only repayment selection. Lowest Payment uses required/entered fixed payments with no extra principal or freed-payment rollovers. Lowest Interest and Debt-Free Sooner use the original Current household budget in all three scenarios, including Current. After required payments, housing costs and mortgage insurance, remaining funds pay the highest-rate remaining debt; paid-off debt payments roll forward to the same strategy. Rankings, interest milestones, Debt Free, chart and horizon table use the same goal-driven projection. Displayed household payments remain required amounts. The saved strategy field controls only The Bigger Picture chart view.

Cumulative interest is shown after 1, 12, 60 and 120 months, and through payoff. After an early payoff, later interest milestones remain at total interest; incomplete projections show unavailable rather than extrapolating. True transaction fees remain separate from interest. Their financed portion increases principal and interest, but financing alone does not capture all fees as an economic cost. Escrow balances are not permanent transaction expenses.

### Compact mortgage payment detail
The first mortgage shows its total recurring payment with a compact monthly P&I, escrow and applicable PMI/MIP breakdown. HOA, other housing costs, and explicitly non-escrowed tax/insurance are shown separately as Other housing rather than mislabeled escrow. Escrow inferred from total payment remains an estimate. HELOC result subtitles reflect the configured interest-only draw period; fully amortizing or zero-draw structures omit that text while preserving aligned card spacing.

### Category changes, chart control, and HELOC phases
Category payment changes compare against Current. First mortgage includes recurring housing and mortgage insurance; second/HELOC and consumer groups compare their required payments. Rate changes are percentage points between balance-weighted rates, shown only when both groups have balances. Increases use amber and decreases use green.

The goal still controls card interest, Debt Free and ranking. The Bigger Picture has a separate saved chart repayment view (`strategy`) that controls only its balance chart and horizon table; goal changes preserve this chart preference. Both chart views use all three scenarios consistently.

HELOC draw years and amortizing repayment years are additive, e.g. 120 interest-only months followed by 240 repayment months, paid off at month 360 at required payments. Month 121 starts principal amortization. Results show that required HELOC payment and the household required payment at transition, before extra principal. Actual accelerated payments can lower the transition balance or pay the line off sooner. No new draws or rate changes are assumed.

### Custom extra chart payment and compact comparisons
The chart custom mode adds the entered extra amount to each scenario’s changing minimum required payment and applies that extra highest-rate-first. Freed minimums are not rolled forward in this mode. Housing and mortgage insurance stay out of principal payments. Zero extra matches minimum required payments. This affects only the chart and horizon table; cards and ranking remain tied to the optimization goal. The custom amount and chart mode save locally.
Category labels and changes stay on one line, with full category names available by hover when narrow layouts truncate a name. The HELOC repayment note reserves the same space in every scenario. The highest-rate-first rollover is described without labeling it the smallest-balance-first snowball method.

### Minimum-plus-extra chart and individual payoff dates
Custom chart mode now pays each scenario's changing required payments plus the entered extra amount every month, directed highest-rate-first. It does not hold the original Current household budget constant or roll freed minimum payments forward. Zero extra exactly matches required payments. Contributions can differ across scenarios and increase when a HELOC begins amortization. The separate Current Household Payment chart mode still holds a common budget and rolls freed payments forward.

Individual loan payoff months are tracked independently from the whole portfolio. For example, a 285,000 first mortgage at 6.75% with 1,650 P&I requires 635 months. A retained first mortgage can therefore make household Debt Free later than a 10-year-draw plus 20-year-repayment HELOC's own 360-month payoff. The results show HELOC payoff separately and keep Debt Free as all modeled mortgages and debts; they do not force household payoff to equal the new line term.

### Mobile comparison and scenario visibility
Card rows synchronize their natural heights after wrapping, window changes, font loading, input updates, visibility changes and accordion toggles. Savings, rates and full category names wrap rather than being truncated. All balance/payment/rate labels within a corresponding group share a label height, so values align too.

The Show Scenarios checkboxes control card visibility only. At least one card stays visible, hidden options can always be restored, and hidden IDs save locally. Hiding never changes modeled debts, input selections, calculations or goal eligibility. A status note identifies a hidden strongest scenario. Chart and table still include all three scenarios. No options are hidden by default.

On phone widths, three visible cards use stacked metric pairs, two use label/value rows, and one uses the full three-column breakdown. Financial engine logic is unchanged. The separate HELOC payoff line is removed at the user's request; Debt Free still means all modeled mortgages and debts.

### Basic mortgage estimates and information choices
Fresh basic inputs estimate escrow using the configurable 0.55% annual property-tax assumption and home-value insurance tiers, then subtract escrow and known PMI from total mortgage payment to estimate P&I. Rate and current balance determine interest and remaining payoff in projections; they do not imply a locally verified escrow amount.

Advanced defaults to the statement information view, with estimate calculations retained until statement P&I or escrow is actually entered. Estimate tax/insurance is a separate third source choice, after statement and original-loan details. Statement mode offers only known P&I or known escrow. Statement-entered flags keep manual values independent of derived estimates, preserve valid zero escrow, and migrate previously saved statement values. Explicit original-loan settings and manual tax/insurance amounts remain available. Opening advanced does not silently replace calculated P&I with a stale source input.

The scenario picker no longer adds hidden-option status text. The Bigger Picture table has scenario columns (Current, Cash-Out, HELOC) and metric rows (Interest, Balance left, Cash paid).

### Your Debt Over Time: total budgets, inspection, and scale
The Extra Payment tab has two approaches: an explicit total household budget, or extra above each scenario's minimum. Total budget uses the same entered contribution in all scenarios, paying housing costs, mortgage insurance and required payments before directing remaining funds highest-rate-first. Freed payments roll forward within that budget. A budget below current or future required payments produces a shortfall instead of an invented payoff. Extra-above-minimum preserves differing scenario contributions and does not include the payment difference versus Current. Both settings save locally and remain independent of goal-driven card calculations.

Hover, tap or keyboard inspection reports the nearest modeled month, with balance, cumulative loan interest and cumulative out-of-pocket cash to cents. Out of pocket includes escrow/other housing, insurance, and cash contributed at closing; it is not netted against additional cash proceeds. Unsupported months after a budget failure show Unavailable.

The balance chart fits the observed range for the selected horizon with padding and rounded ticks. Its lower bound can be above zero and is explicitly labeled. PMI/MIP treatment is unchanged: known existing PMI lasts until the first mortgage is paid off; FHA MIP uses the existing annual premium profile and duration. Escrow and mortgage insurance reduce principal-payment capacity but are not loan interest.

### Floating chart details and interest view
The chart supports Total Debt and cumulative Interest Paid views using the same monthly schedules. The vertical axis names the plotted measure, while its tick labels and accessible description identify its range. The former text below the chart is removed.

Monthly details float over the chart instead of adding page height. Hovering shows the popover; leaving the chart dismisses an unpinned hover. Clicking/tapping pins the selected month, and an outside click/tap, close button or Escape dismisses it. Keyboard inspection remains available. Details show the minimum household payment due during the selected month before extra principal, including recurring housing and applicable mortgage insurance. As debts finish, the following month's minimum reflects their removal. This minimum is distinct from a fixed total budget or an actual payment including extra principal.

### Selected-scenario timeline and compact inspection
Chart lines, scale, legend emphasis and budget warnings now follow Show Scenarios. Excluded scenario columns stay in the comparison table as dimmed headers and dashes, rather than showing excluded amounts. A yellow notice appears only while an option is excluded. Original input data and financial rankings remain intact.

The floating overlay is replaced by a small measure/date readout and the existing comparison table. Hover, tap and keyboard selection update that same table to the selected month; Reset returns to the selected horizon. No additional table or overlay covers the plot. The measure title is above the chart rather than in its left margin.

## November 4 review

Fresh chart defaults: current household payment, cumulative interest, five years. Existing saved choices are preserved. Assumptions are permanently visible; the unfinished costs/equity/break-even panel was removed. Household budget includes housing and mortgage insurance; those expenses are deducted before extra principal. See CALCULATION-AUDIT.md for the bounded ten-scenario independent math review. No engine fixes were applied.
