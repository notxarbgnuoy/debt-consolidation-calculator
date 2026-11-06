# Proposed HELOC margins — approved illustrative table; feed pending

All cells are percentage points added to Prime, not final interest rates. This is an editorial illustration built from two supplied sheets, not a lender offer or verified market average. Accepted by TruPath for illustrative use. Connected to Fed Prime in the calculator.

| Credit score | CLTV ≤60% | >60–70% | >70–80% | >80–85% | >85–90% |
|---|---:|---:|---:|---:|---:|
| 780+ | +0.250% | +0.375% | +0.500% | +0.875% | +1.625% |
| 760–779 | +0.375% | +0.500% | +0.500% | +1.000% | +1.750% |
| 740–759 | +0.375% | +0.500% | +0.500% | +1.000% | +1.750% |
| 720–739 | +0.500% | +0.625% | +0.875% | +1.125% | +1.750% |
| 700–719 | +0.625% | +0.750% | +1.000% | +1.250% | +2.000% |
| 680–699 | +1.000% | +1.250% | +1.500% | +3.500% | +5.000%* |
| 660–679 | +2.500% | +3.750% | +5.500% | +7.500% | +9.000%* |
| 640–659 | +3.250% | +4.750% | +8.000% | +9.000%* | +10.500%* |
| 620–639 | +4.000% | +5.250% | +8.500%* | +10.000%* | +11.500%* |
| 619 or below / unknown | Manual | Manual | Manual | Manual | Manual |

*Extrapolated: no populated cell in either supplied sheet supports this combination. Numbers are review placeholders, not evidence of product availability. No automatic table rate above 90% CLTV; manual entry remains available.

## Basis and simplification

- First Tech wholesale PDF dated July 1, 2026: base margins generally +0.25% to +1.75%; 780+ adjustment -0.125%; published minimum 670. The sheet has additional amount, draw, property, state, and eligibility conditions. Those are intentionally outside this two-variable illustration.
- Supplied screenshot: much steeper lower-credit/high-CLTV margins, including +4.84% at 85–90%/780+ and +7.64% at 80–85%/660–679. Lender and effective date are not identified.
- Prime values printed on those sheets (6.75% and 7.00%) are historical inputs, not a current index feed.
- Uses TruPath's requested +0.50% anchor for 740+ at 80% CLTV. High-credit rows lean toward First Tech, lower-credit rows toward the screenshot. Broad CLTV columns use an approximation near their upper endpoint, rather than a literal average across products.
- CLTV = (first-mortgage balance + new replacement HELOC) / home value. When selected, the new HELOC includes second-mortgage payoff, selected consumer debts, financed costs, and requested cash. The old second mortgage is not added again when paid off. If unselected, it stays separate and remains included in CLTV. Refinance selection independently determines whether it rolls into the new first mortgage.
- Accessible-equity denominator remains the net room above both existing mortgages. Used equity excludes replacement principal; the new HELOC amount separately includes it.
- Existing second payment behavior: payment about equal to monthly interest implies an interest-only estimate; payment above interest implies principal reduction; below interest signals negative amortization. This does not identify contractual periods or future payment changes.
- Future lookup must preserve user rate overrides, show index date, and retain the last successful index when refresh fails. Hosted feed checks on visits with an hourly cache; GitHub weekday snapshot refresh workflow is included for future GitHub hosting.

Current pricing policy: automatic lookup is capped at 80% CLTV for any higher actual CLTV, per TruPath request. Actual balances/ratios and 90% illustrative borrowing-limit warnings remain unchanged. Higher CLTV margin columns above remain available as configuration for later policy changes.
