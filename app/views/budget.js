// Budget planner: per-category monthly limits with even-pace markers,
// overspend projections and alerts. Limits are editable in place. The
// per-category spend helper lives here — its only consumer — so it
// stays out of the first load.
import { TODAY } from '../seed.js';
import { esc, fmt, fmt0, monthLabel, pct } from '../format.js';
import { getState, setBudget } from '../store.js';
import { categoryOf, monthTotals, monthTransactions } from '../stats.js';
import { budgetBar } from '../charts.js';
import { COLORS, daysInMonth, kpiCard, monthPhase, paceFrac } from './shared.js';

function spentInCategory(month, category) {
  return monthTransactions(month)
    .filter((t) => t.category === category && t.amount < 0)
    .reduce((s, t) => s + (-t.amount), 0);
}

export function budgetView() {
  const state = getState(), month = state.month;
  const t = monthTotals(month);
  const pace = paceFrac(month);
  const budgeted = Object.keys(state.budgets);
  const totalBudget = budgeted.reduce((s, c) => s + state.budgets[c], 0);
  const totalSpent = budgeted.reduce((s, c) => s + spentInCategory(month, c), 0);
  // Income left after the plan and the savings sweep. Negative means
  // the plan itself exceeds income — a shortfall, not "-$X unallocated".
  const unalloc = t.income - totalBudget - t.saved;

  let alerts = '';
  const rows = budgeted.map((category) => {
    const limit = state.budgets[category], used = spentInCategory(month, category);
    // A $0 limit with any spend is over budget, not "on track" (frac 2
    // also sorts it to the top, like the most-over category it is).
    const frac = limit > 0 ? used / limit : (used > 0 ? 2 : 0);
    // Pace projection only makes sense for day-to-day categories. A
    // category whose month is entirely recurring charges (rent,
    // subscriptions, utilities) is already fully posted — projecting it
    // linearly would invent spending that cannot happen.
    const catTxs = monthTransactions(month).filter((t) => t.category === category && t.amount < 0);
    const fixed = catTxs.length > 0 && catTxs.every((t) => t.recurring);
    const projected = pace && !fixed ? used / pace : used;
    let status;
    if (frac > 1) {
      status = `<span class="chip red">over by ${fmt0(used - limit)}</span>`;
      alerts += `<div class="alert bad"><span class="alert-ic">&#9888;</span><div><b>${esc(categoryOf(category).label)}</b> is ${fmt0(used - limit)} over its ${fmt0(limit)} budget.</div></div>`;
    } else if (pace && projected > limit && frac >= 0.5) {
      status = '<span class="chip amber">on pace to overspend</span>';
      alerts += `<div class="alert warn"><span class="alert-ic">&#9673;</span><div><b>${esc(categoryOf(category).label)}</b> at this pace ends near ${fmt0(projected)} vs a ${fmt0(limit)} budget.</div></div>`;
    } else if (!fixed && frac >= 0.8) status = '<span class="chip amber">80%+ used</span>';
    else status = '<span class="chip">on track</span>';
    return { category, limit, used, frac, status };
  }).sort((a, b) => b.frac - a.frac);

  let html = `<div class="grid kpis">
    ${kpiCard('Planned spending', fmt0(totalBudget), `${budgeted.length} budgeted categories`)}
    ${kpiCard('Spent so far', fmt0(totalSpent), totalBudget ? `${pct(totalSpent / totalBudget)} of plan` : totalSpent ? 'over a $0 plan' : 'no plan set')}
    ${kpiCard('Income', fmt0(t.income), t.saved > 0 ? `${fmt0(t.saved)} to savings &middot; ${unalloc >= 0 ? `${fmt0(unalloc)} unallocated` : `${fmt0(-unalloc)} shortfall`}` : t.income - totalBudget >= 0 ? `Planned surplus ${fmt0(t.income - totalBudget)}` : `Planned shortfall ${fmt0(totalBudget - t.income)}`)}
    ${kpiCard('Month progress', pace ? pct(pace) : monthPhase(month) === 'future' ? '0%' : '100%', pace ? `Day ${Number(TODAY.slice(8, 10))} of ${daysInMonth(month)}` : monthPhase(month) === 'future' ? `${monthLabel(month)} not started` : `${monthLabel(month)} closed`)}
  </div>`;
  if (alerts) html += `<div class="section-gap">${alerts}</div>`;
  html += `<section class="card section-gap"><div class="card-head"><h2>Category budgets — ${monthLabel(month)}</h2>
    <span class="card-sub head-note">The tick on each bar is even pace for today. Edit a limit and it saves instantly.</span></div>
    <table><thead><tr><th>Category</th><th class="col-progress">Progress</th><th class="num">Spent</th><th class="num">Limit</th><th class="num">Left</th><th>Status</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><span class="cat-dot" style="background:${COLORS[r.category]}"></span><b>${esc(categoryOf(r.category).label)}</b></td>
      <td>${budgetBar(r.used, r.limit, pace)}</td>
      <td class="num">${fmt(r.used)}</td>
      <td class="num"><input class="budget-input" data-cat="${r.category}" type="number" min="0" step="10" value="${r.limit}" aria-label="Budget limit for ${esc(categoryOf(r.category).label)}"></td>
      <td class="num ${r.limit - r.used < 0 ? 'neg' : ''}">${fmt(r.limit - r.used)}</td>
      <td>${r.status}</td></tr>`).join('')}
    </tbody></table>
    <p class="empty-note">Unspent budget does not roll over automatically — the household sweeps leftovers into the emergency fund on the 24th (see Transactions &rarr; Savings transfer).</p></section>`;
  return html;
}

export function bindBudget({ render, toast }) {
  document.querySelectorAll('.budget-input').forEach((input) => {
    input.addEventListener('change', () => {
      // Clearing the field is not a $0 budget: an empty, unreadable or
      // negative value leaves the limit unchanged (the re-render
      // restores it) instead of silently zeroing the category's plan.
      if (input.value.trim() === '' || !isFinite(Number(input.value)) || Number(input.value) < 0) { toast('Enter a limit — left unchanged'); render(); return; }
      setBudget(input.dataset.cat, Number(input.value));
      toast('Budget updated');
      render();
    });
  });
}
