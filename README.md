# HearthLedger — Best Household Budget Site

[![make.fun](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/sichyo03/makefun-household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)

A complete household budget site for the Rivera family of four: two salaries,
rent, groceries, school, savings goals and the bills that keep coming. It runs
entirely in the browser from its own files — no account, no network, no build
step — on desktop and on a phone.

## Pages (all reached by links in the nav)

- **Dashboard** — income, spending, savings and what is left to plan for the
  chosen month, a spending donut, budget health and latest activity.
- **Transactions** — every entry with search, category and account filters,
  plus add / edit / delete. Negative amounts are spending, positive income.
- **Budget planner** — a monthly limit per category with progress bars that
  fill as you spend; edit any limit inline.
- **Insights** — category breakdown, a three-month income-vs-outgoings chart
  and three-month averages against budget.
- **Savings goals** — goals with progress rings; add contributions or start a
  new goal.
- **Bills & reminders** — upcoming bills with due dates; mark them paid.

Edits persist in the browser's local storage; "Reset demo data" in the footer
restores the seeded three months.

## Files

- `app/index.html` — page shell, header, nav, footer.
- `app/data.js` — seed household data (transactions, budgets, goals, bills).
- `app/store.js` — state, localStorage persistence, aggregations.
- `app/charts.js` — hand-drawn SVG donut, trend bars, progress bars, rings.
- `app/views.js` — the six page views and their control wiring.
- `app/main.js` — boot and hash router.
- `app/style.css` — warm paper / deep teal theme, responsive phone layout.
- `main.ts` — copies `app/` and `screenshots/` to the output and writes
  `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`.
- `vendor/makefun-frontend.ts` — the kit's dossier builder, unchanged.
- `screenshots/` — four real renders (dashboard cover, budget planner,
  savings goals, phone dashboard).

## Run it

`node serve.ts` serves `app/` locally; or open `app/index.html` through any
static server. Hand in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

Built for the [make.fun best household budget site bounty](https://make.fun/bounty/best-household-budget-site-20261126-1457). If you build something here too, my referral code is `p3gwn12d`.
