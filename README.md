# HearthLedger — Household Budget
[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

A complete household budget site that runs entirely in the browser from
static files — no account, no network, nothing leaves the device. Built
for make.fun's "Make the best household budget site" bounty.

**7 sections, 12 categories, 5 accounts, 6 months of seeded household
data, 11 recurring bills, 5 savings goals:**

- **Dashboard** — income/spent/kept KPIs, savings rate, safe-to-spend per
  day, a 6-month cash-flow chart (income vs spending, kept as dots), a
  category donut with amounts and shares, budget-health bars with
  even-pace markers, bills due in 14 days, top goal rings, latest
  activity, and live alerts for over-budget categories and unusual spends.
- **Transactions** — full ledger with search, month/category/account/type
  filters, add/edit/delete, recurring-payment badges (detected from repeat
  charges across months), running in/out totals, CSV export and CSV
  import.
- **Budget planner** — per-category limits you can edit in place, progress
  bars with an even-pace tick for today, "on pace to overspend"
  projections, over-budget and 80%-used alerts, planned surplus vs income.
- **Insights** — savings-rate trend sparkline, month-over-month movers
  with dollar and percent deltas, anomaly detection (tickets 2×+ the
  category median), a subscription & bill audit with yearly costs, top
  merchants, and average spend by weekday.
- **Savings goals** — SVG progress rings, amount left, monthly amount
  needed to hit the target date, one-tap contributions, add-your-own goal.
- **Bills & calendar** — a month calendar with every due date (autopay,
  manual, paid, overdue), a bills table with mark-paid toggles, and
  due/paid/overdue totals.
- **Accounts & net worth** — balances for checking, credit card, cash,
  savings and brokerage computed live from the ledger, a net-worth trend
  chart, and an allocation bar.

Everything is computed from one transaction ledger in `app/state.js`;
demo data persists in `localStorage` and can be reset from the footer.
Hand-rolled SVG charts (`app/charts.js`) — no libraries, no build step.

## Run it

Open `app/index.html` in a browser, or serve the folder:

    node serve.ts --port 8092   # then visit http://localhost:8092

## Hand it in (make.fun)

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`.

MIT licensed. Original code written for this bounty.
