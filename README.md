# HearthLedger — Household Budget
[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

A complete household budget site that runs entirely in the browser from
static files — no account, no network, nothing leaves the device. Built
for make.fun's "Make the best household budget site" bounty.

**7 sections, 10 spending categories, 5 accounts, 6 months of seeded
household data, 11 recurring bills, 5 savings goals:**

- **Dashboard** — income/spent/kept KPIs, savings rate, safe-to-spend per
  day, a 6-month cash-flow chart (income vs spending, kept as dots), a
  category donut with amounts and shares, budget-health bars with
  even-pace markers, bills due in 14 days (overdue bills first, labelled),
  top goal rings, latest
  activity, and live alerts for over-budget categories and unusual spends.
- **Transactions** — full ledger with search, month/category/account/type
  filters, add/edit/delete, recurring-payment badges (detected from repeat
  charges across months), running in/out totals, CSV export and
  duplicate-safe CSV import (rows are validated — real calendar dates,
  amounts signed for their category, bank-style "$1,234.56" amounts
  accepted, headerless files keep their first row — and exact
  duplicates of ledger rows are skipped, so re-importing an export
  changes nothing). The
  add/edit form posts each category in its ledger direction (income in,
  spending out; the type choice only picks a transfer's leg) and refuses
  blank descriptions and $0 amounts.
- **Budget planner** — per-category limits you can edit in place (clearing
  a limit or entering a negative one leaves it unchanged), progress
  bars with an even-pace tick for today, "on pace to overspend"
  projections, over-budget and 80%-used alerts, planned surplus vs income.
- **Insights** — savings-rate trend sparkline, month-over-month movers
  with dollar and percent deltas, anomaly detection (tickets 2×+ the
  category median), a subscription & bill audit with yearly costs, top
  merchants, and average spend by weekday.
- **Savings goals** — SVG progress rings, amount left, monthly amount
  needed to hit the target date (days left when the date is near),
  one-tap contributions (each posts a
  savings transfer to the ledger), add-your-own goal (blank names and
  non-positive contributions are refused with a message).
- **Bills & calendar** — a month calendar with every due date (autopay,
  manual, paid, overdue), a bills table with mark-paid toggles, and
  due/paid/overdue totals. Amounts with no posted charge yet (future
  months) are flagged "est." in the calendar and the table.
- **Accounts & net worth** — balances for checking, credit card, cash,
  savings and brokerage computed live from the ledger, a net-worth trend
  chart, and an allocation bar.

Everything is computed from one transaction ledger; demo data persists
in `localStorage` and can be reset from the footer. The dashboard loads
with the first paint and the other six views load on first visit, so the
first load stays small. Hand-rolled SVG charts — no libraries, no build
step. Source is split by job: `app/seed.js` (demo data), `app/store.js`
(state + mutations), `app/stats.js` (shared derived figures), `app/format.js`,
`app/charts.js`, and one file per view under `app/views/` — figures only
one lazy view needs (Insights movers, the net-worth series) live in that
view, so the first load carries only the dashboard's figures.

## Run it

Open `app/index.html` in a browser, or serve the folder:

    node serve.ts --port 8092   # then visit http://localhost:8092

## Hand it in (make.fun)

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`.

MIT licensed. Original code written for this bounty.
Built by @sichyo03's agent — make.fun referral: p3gwn12d
