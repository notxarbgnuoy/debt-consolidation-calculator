# TruPath debt comparison calculator

Vanilla HTML/CSS/JavaScript calculator with a small, dependency-free server reader for public rate benchmarks. Financial inputs and calculations stay in the browser. No borrower information is sent to the benchmark sources.

## Current functionality

- Mortgage statement or original-loan inputs; estimated escrow; independent second-mortgage consolidation choices.
- Inline consumer debts with separate HELOC/refinance selections, browser-local saving and reset.
- HELOC pricing from Federal Reserve H.15 Prime plus the approved credit/CLTV margin grid.
- Conventional pricing from dated Mortgage News Daily benchmarks plus the screenshot-derived, calibrated LLPA rate adjustments. FHA/VA use their respective MND benchmarks and the configured FICO adjustments.
- Percentage plus fixed-dollar costs, separate borrower cash contributions, FHA upfront/annual MIP, and editable VA funding fees.
- Live comparison cards in fixed Current → Cash-out → HELOC order: household payment, payment difference, first-month interest, weighted nominal rate, balances, included accounts and payment breakdowns.
- Monthly projections, common-horizon interest/balance/cash comparisons and SVG chart. Required-payment and constant-current-budget views. Goal-based highlights; no winner while a scenario lacks required inputs.
- No lead capture, tracking, PDF export, secure return links or formal economic break-even calculation yet.

## Source structure

- `public/index.html`, `public/assets/styles.css`: namespaced responsive UI.
- `public/assets/app.js`: DOM rendering, input events, local progress and benchmark loading.
- `public/assets/comparison.js`: scenario construction, current mortgage/housing separation, initial metrics and objective ranking.
- `public/assets/projections.js`: monthly schedules, HELOC transition, highest-rate-first extra principal and budget validation.
- `public/assets/mortgage.js`, `housing.js`, `equity.js`, `costs.js`, `program-fees.js`: reusable financial functions.
- `public/assets/rates.js`, `refi-rates.js`: editable example pricing tables and pure rate functions.
- `server/prime.js`, `server/mnd.js`, `server/worker.js`: fixed-source readers and hosting routes. Never accept borrower data or arbitrary proxy destinations.
- `scripts/build.mjs`: embeds public assets and server functions into `dist/server/index.js` for Sites/Workers hosting; `dist/` is generated.
- `tests/`: independent numerical checks, accounting invariants, benchmark fixtures, migration and edge cases.
- `docs/ASSUMPTIONS.md`: calculation choices and known limits; later sections supersede historical prototype notes.

## Local commands

Use Node.js 22 or newer; no install step or dependencies are required.

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/preview.mjs
```

Preview serves `http://localhost:8084`. Run it in a persistent terminal. Rebuild and restart it after source edits.

Refresh dated benchmark snapshots manually:

```sh
node scripts/refresh-prime.mjs
node scripts/refresh-mnd.mjs
```

The hosted `/api/prime` and `/api/mnd` readers refresh on visits, with up to one hour of per-instance caching. Shared cache is optional where permitted. They do not run while the site is idle. On source failure, last-good data or a bundled snapshot is returned with a fallback flag; the browser also retains a dated local benchmark cache. Old data is disclosed. No API keys are required.

## GitHub / WordPress portability

For a static GitHub Pages version, publish the contents of `public/`. The calculator falls back to same-origin `data/*.json` files when server reader routes are unavailable. The included `.github/workflows/refresh-prime.yml` updates both snapshots on weekdays at 22:35 UTC and via manual dispatch. Enable GitHub Actions and repository write permissions, then configure Pages deployment to publish updated `public/` after commits. No GitHub destination is created automatically by this project. For server hosting, use the generated Worker or adapt the small fixed-source routes to the host. WordPress can link to that independent calculator or embed it as an iframe later.

## Financial interpretation and limits

First-month interest is nominal rate/12 times outstanding principal. Blended rate is balance-weighted nominal interest, excluding escrows and mortgage insurance; it is not APR. Payments include scenario loan obligations plus shared housing costs and applicable mortgage insurance. Closing fees are distinct from interest; financed fees increase principal. Additional cash and borrower contributions change the comparison and are shown in balances/cash paid.

Required-payment projections keep each entered consumer/second-mortgage payment fixed, stop payments at payoff, and model the HELOC draw-to-amortization transition. Current-budget projections redirect freed payments to the highest-rate remaining balance only after scheduled payments, taxes/insurance, other housing and mortgage insurance. Budgets that cannot cover required obligations are flagged; contributions are never silently increased. Projection cap is 100 years. Negative amortization and unknown second-mortgage future resets are disclosed.

Rates, housing expenses and current PMI are held constant (PMI stops when that mortgage is paid). FHA annual MIP follows the original scheduled balance and modeled duration, stops at actual payoff, and is not interest. Eligibility, future variable-rate changes, servicing payoff adjustments, escrow refunds, tax deductions, lender underwriting and program-specific maximum loans are outside this illustration. Conventional PMI above 80% LTV is not configured and is flagged. Accessible-equity caps remain illustrative, not approval limits. Program percentages, calibration rules and fee assumptions are detailed in `docs/`.

### Current Results interpretation
Cards now show visible loan/debt balance, required payment and rate groups, consolidated debt and cash proceeds. Lowest Interest compares lifetime interest through payoff at the same original household budget, with freed payments redirected in every scenario. It does not rank the selected horizon's declining-minimum-payment totals. The horizon table remains available separately. Current keeps actual debts and $0 new cash; a visible note explains different cash proceeds when requested. The first-mortgage breakdown is P&I, with escrows and mortgage insurance separate. See the latest ASSUMPTIONS.md section for reconciliation definitions and the read-only spreadsheet reference.

## Install directly in WordPress

A self-contained plugin ZIP is available at `releases/trupath_current_rates.zip`.
Install it through **Plugins → Add New → Upload Plugin**, activate, and place
`[trupath_current_rates]` in a Shortcode block. The plugin bundles the calculator
and PHP rate readers, so no Cloudflare or Supabase account is required for rate feeds.
Rates refresh in the background; visitor requests read cached results only.
See `docs/WORDPRESS.md` for installation, caching, testing and update instructions.
Rebuild the ZIP with `node scripts/build-wordpress.mjs` after source edits.
