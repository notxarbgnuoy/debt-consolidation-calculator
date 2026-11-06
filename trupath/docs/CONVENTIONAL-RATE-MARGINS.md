# Conventional cash-out example-rate margins

Approved scope: owner-occupied, one-unit, conforming fixed-rate loans. Zero-discount-point target; transaction fees remain separate. This is an illustration calibrated to borrower-supplied quotes, not lender pricing or qualification.

## Rate margin above MND

Margins below are rate percentage points, before rounding the final example rate.

| Credit score | LTV ≤30% | >30–60% | >60–70% | >70–75% | >75–80% |
|---|---:|---:|---:|---:|---:|
| 780+ | +0% | +0% | +0.0625% | +0.125% | +0.25% |
| 760–779 | +0% | +0% | +0.125% | +0.21875% | +0.375% |
| 740–759 | +0% | +0% | +0.15625% | +0.3125% | +0.5% |
| 720–739 | +0% | +0.03125% | +0.25% | +0.40625% | +0.59375% |
| 700–719 | +0% | +0.03125% | +0.3125% | +0.5625% | +0.71875% |
| 680–699 | +0% | +0.0625% | +0.40625% | +0.625% | +0.84375% |
| 660–679 | +0% | +0.125% | +0.59375% | +0.90625% | +1.09375% |
| 640–659 | +0% | +0.25% | +0.6875% | +1.0625% | +1.1875% |
| 620–639 | +0% | +0.25% | +0.75% | +1.125% | +1.1875% |

## Formula and calibration

Example rate = round UP to the next 0.125% of [MND benchmark + (scenario LLPA − 0.375) × 0.25 + configurable base offset]. Initial base offset is 0.

The 0.375 pricing-point subtraction sets the 780+ / ≤60% quote as the calibration anchor; it is not a claim about MND’s agency delivery price. This avoids stacking the full LLPA table on top of an already priced benchmark. The 0.25 conversion is TruPath’s requested illustrative assumption: 0.50 pricing points maps to 0.125 rate percentage points. It is not a universal market conversion. Round once at the end, not the margin and benchmark independently.

At MND 7.30%: 60% LTV / 780+ → 7.375%; 80% LTV / 740–759 → 7.875%. The second supplied quote had a slight cost; the formula does not verify that 7.875% is actually available with zero discount points. A current lender price would be needed to tighten that calibration. No additional discount points are automatically added to closing costs.

Use the MND 15-year series for terms up to 15 years and the 30-year series for 15–30 years, including a 20-year term as a documented approximation. Longer/custom unsupported terms, credit below 620, a retained second mortgage require manual rate entry. Not sure credit uses a 740 estimate. These are pricing-coverage limits, not qualification decisions; borrowers can keep inputs and override the rate.

Rates adjust using the new first-mortgage principal including financed costs, minus cash contributed at closing. Saved manual rates remain separate from derived automatic rates.

MND’s first-party daily table is the source: https://www.mortgagenewsdaily.com/mortgage-rates . Source date is taken from the MND section; Freddie Mac and MBA rows are excluded. MND describes its index as top-tier conventional pricing adjusted for points, suited to tracking changes: https://www.mortgagenewsdaily.com/mortgage-rates/about .

The supplied screenshot is the source for the LLPA grid, including the ≤639 row mapped to the UI’s 620–639 range. FHA and VA now use separate program-specific MND benchmarks and FICO-only adjustments; fees and insurance remain unmodeled. See ASSUMPTIONS.md.

For actual LTV above 80%, use the 80% pricing column while retaining the actual ratio and all excess-limit warnings. This supersedes earlier above-limit manual-entry behavior.
