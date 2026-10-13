# Blended Rate Debt Consolidation Calculator

A high-performance, SEO-optimized web application for calculating blended interest rates and comparing debt consolidation strategies. The calculator evaluates three distinct financial paths side-by-side:

1. **Option 1: Current Portfolio** — Existing first mortgage combined with current consumer debts (credit cards, auto loans, personal loans, student debt).
2. **Option 2: Cash-Out Refinance** — Refinancing the first mortgage to a new loan amount that absorbs selected debts and closing costs into a single long-term loan.
3. **Option 3: HELOC (Second Lien)** — Keeping the original low-rate first mortgage 100% untouched while consolidating debts into a Home Equity Line of Credit (supporting both amortizing and interest-only draw structures).

Additionally, it models **Payoff Acceleration**: if the homeowner keeps making their original monthly payment budget, how many years sooner can they eliminate the mortgage or HELOC, and how much total interest is saved?

---

## Key Features

- **Zero Framework Overhead (Pure HTML5 / Modern CSS / Vanilla JavaScript):**
  - No React, Vue, Angular, or external UI bundles.
  - Lightning-fast Time to Interactive (TTI) and First Contentful Paint (FCP).
  - Built specifically for high-converting, SEO-optimized landing pages with structured schema metadata (`FinancialProduct` JSON-LD, Open Graph, meta description).
- **Intuitive Debt Management:**
  - Add, edit, and delete multiple debt items dynamically.
  - Granular control with per-scenario inclusion checkboxes (choose which debts are included in the Cash-Out Refinance vs. HELOC).
  - Quick presets: Credit Card, Auto Loan, Personal Loan, Student Loan, Medical Debt.
- **Side-by-Side 3-Scenario Comparison:**
  - **Blended APR:** Balance-weighted average interest rate across all debts.
  - **Monthly Payment & Cash Flow Savings:** Immediate monthly budget relief.
  - **Monthly Interest Expense:** Real dollar cost of interest per month before and after consolidation.
  - **Payoff Timeframe:** Standard payoff horizon vs. accelerated payoff schedule.
- **Payoff Acceleration Engine:**
  - Automatically calculates the "payment difference" freed up by consolidation.
  - Simulates applying the prior total payment budget toward principal.
  - Computes exact payoff time in years/months and total cumulative interest saved.
- **Share, Save & Email:**
  - Encodes calculation scenarios into shareable URL hashes for bookmarking and client distribution.
  - Generates comprehensive text reports ready to copy or send via `mailto:` email link.
  - Clean `@media print` styling for generating clean 1-page PDF client proposals.
- **Fully Accessible & Responsive:**
  - WCAG-compliant form controls, high-contrast typography, and full keyboard navigation.
  - Fluid mobile, tablet, and desktop layouts.

---

## Financial Formulas

### 1. Weighted Average Blended APR
$$\text{Blended Rate} = \frac{\sum_{i=1}^{k} (\text{Balance}_i \times \text{Rate}_i)}{\sum_{i=1}^{k} \text{Balance}_i}$$

### 2. Monthly Amortizing Payment (P&I)
$$M = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$
*Where $P$ is principal, $r$ is monthly interest rate ($\text{annual rate} / 12$), and $n$ is total loan term in months.*

### 3. Monthly Interest Expense
$$\text{Monthly Interest} = \text{Balance} \times \frac{\text{Annual Rate}}{12}$$

### 4. Payoff Acceleration Simulation
For each month $m = 1, 2, \dots$:
$$\text{Interest}_m = \text{Balance}_{m-1} \times r$$
$$\text{Principal Paid}_m = \min(\text{Balance}_{m-1}, \text{Total Payment Budget} - \text{Interest}_m)$$
$$\text{Balance}_m = \text{Balance}_{m-1} - \text{Principal Paid}_m$$

---

## Project Structure

```
debt-consolidation-calculator/
├── index.html               # Main single-page application (UI, CSS, DOM bindings)
├── src/
│   └── calculator-core.js   # Pure financial calculation engine (UMD module)
├── test/
│   └── calculator.test.js   # Unit test suite using Node.js built-in test runner
├── package.json             # NPM metadata and test script
└── README.md                # Project documentation
```

---

## Running Tests

The test suite uses Node.js's built-in `node:test` test runner without requiring any external dependencies:

```bash
# Run unit tests
npm test
```

---

## Deployment & Hosting

Because this project is entirely static and zero-dependency, it can be deployed to any static host with zero build step:

- **GitHub Pages:** Enable GitHub Pages in repository settings pointing to root (`/`).
- **Cloudflare Pages / Netlify / Vercel:** Deploy root directory with no build command.
- **WordPress / Webflow / CMS Embed:** The HTML, CSS, and JS can be dropped directly into an embed block or page template.

