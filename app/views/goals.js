// Savings goals: progress rings, the monthly amount needed to hit each
// target date, one-tap contributions, and an add-your-own-goal form.
// A contribution posts a savings transfer pair to the ledger (checking
// out, savings in) dated today, so the sweep card, the sidebar and the
// account balances all move with the ring — money is never created.
import { TODAY } from '../seed.js';
import { esc, fmt, fmt0, pct } from '../format.js';
import { addGoal, addTransaction, contributeToGoal, getState, nextId } from '../store.js';
import { monthTransactions } from '../stats.js';
import { goalRing } from '../charts.js';
import { kpiCard } from './shared.js';

export function goalsView() {
  const state = getState();
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  // The sweep card reads the selected month's actual savings transfers
  // from the ledger (November sweeps $400 to the emergency fund, the
  // other months $300), so it always matches the sidebar's "To savings".
  const sweepTxs = monthTransactions(state.month).filter((t) => t.category === 'savings' && t.amount < 0);
  // Each transfer is counted once: a goal named e.g. "Emergency index
  // reserve" matches both words, and summing the two regexes separately
  // would make the parts exceed the sweep total on the same card.
  let sweepEmergency = 0, sweepIndex = 0, sweepRest = 0;
  for (const t of sweepTxs) {
    if (/emergency/i.test(t.desc)) sweepEmergency += -t.amount;
    else if (/index/i.test(t.desc)) sweepIndex += -t.amount;
    else sweepRest += -t.amount;
  }
  const sweepTotal = sweepEmergency + sweepIndex + sweepRest;
  const sweepParts = [];
  if (sweepEmergency) sweepParts.push(`Emergency fund ${fmt0(sweepEmergency)}`);
  if (sweepIndex) sweepParts.push(`index funds ${fmt0(sweepIndex)}`);
  if (sweepRest > 0) sweepParts.push(`other savings ${fmt0(sweepRest)}`);
  let html = `<div class="grid kpis">
    ${kpiCard('Saved toward goals', fmt0(totalSaved), `of ${fmt0(totalTarget)} total targets`)}
    ${kpiCard('Overall progress', pct(totalTarget ? totalSaved / totalTarget : 0), `${state.goals.length} active goal${state.goals.length === 1 ? '' : 's'}`)}
    ${kpiCard('Monthly sweep', fmt0(sweepTotal), sweepParts.length ? sweepParts.join(' + ') : 'No sweep this month')}
  </div><div class="grid cols-3 section-gap">`;
  if (!state.goals.length) html += '<p class="empty-note">No goals yet — start your first one below.</p>';
  for (const g of state.goals) {
    const daysLeft = Math.round((new Date(`${g.by}T12:00:00`) - new Date(`${TODAY}T12:00:00`)) / 864e5);
    const monthsLeft = Math.max(1, Math.round(daysLeft / 30.44));
    const needed = Math.max(0, g.target - g.saved);
    // A monthly need only exists while the target date is months
    // ahead: a passed date says so instead of demanding the whole
    // remainder every month, a funded goal needs nothing more, and a
    // date days away is stated in days — "~$1,800/mo" for a goal due
    // in 18 days (or today) invents a monthly plan there is no month
    // left to run, and rounding 45 days to one month overstates the
    // true monthly rate by half.
    const needLine = needed === 0 ? 'fully funded'
      : daysLeft < 0 ? 'target date passed'
      : daysLeft === 0 ? 'due today'
      : daysLeft === 1 ? 'due tomorrow'
      : daysLeft < 61 ? `due in ${daysLeft} days`
      : `~${fmt0(needed / monthsLeft)}/mo needed`;
    html += `<section class="card goal-card"><div class="goal-head"><h3>${esc(g.name)}</h3><span class="chip">${fmt0(g.target)}</span></div>
      <div class="ring-wrap">${goalRing(g.saved, g.target, 92)}
      <div><div class="ring-num">${fmt0(g.saved)}</div><div class="goal-line">saved &middot; ${fmt0(needed)} to go</div>
      <div class="goal-line">Target ${g.by} &middot; ${needLine}</div></div></div>
      <p class="card-sub">${esc(g.note)}</p>
      <form class="goal-form" data-goal="${g.id}"><input type="number" name="amount" min="1" step="1" placeholder="Add $" required><button class="btn primary" type="submit">Contribute</button></form></section>`;
  }
  html += `</div><section class="card section-gap"><div class="card-head"><h2>Start a new goal</h2></div>
    <form id="goal-new"><div class="form-grid">
    <label class="field">Name<input type="text" name="name" placeholder="e.g. Car replacement" required></label>
    <label class="field">Target (USD)<input type="number" name="target" min="1" step="1" placeholder="5000" required></label>
    <label class="field">Already saved<input type="number" name="saved" min="0" step="1" value="0"></label>
    <label class="field">Target date<input type="date" name="by" value="2027-12-31" required></label>
    <label class="field">Note<input type="text" name="note" placeholder="What is it for?"></label>
    </div><div class="form-actions"><button class="btn primary" type="submit">Add goal</button></div></form></section>`;
  return html;
}

export function bindGoals({ render, toast }) {
  document.querySelectorAll('.goal-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Number(new FormData(form).get('amount')) || 0;
      const g = getState().goals.find((x) => x.id === form.dataset.goal);
      if (!g || amount <= 0) { toast('Enter an amount above $0'); return; }
      // Only the part that fits under the target is applied and moved,
      // so an over-large contribution cannot push saved past target or
      // move more cash than the ring gains.
      const applied = Math.min(amount, Math.max(0, g.target - g.saved));
      if (applied <= 0) { toast('That goal is already fully funded'); return; }
      contributeToGoal(g.id, applied);
      addTransaction({ id: nextId('tx'), date: TODAY, desc: `Transfer to ${g.name}`, category: 'savings', amount: -applied, account: 'checking' });
      addTransaction({ id: nextId('tx'), date: TODAY, desc: `${g.name} deposit`, category: 'transfer', amount: applied, account: 'savings' });
      toast(applied < amount ? `Added ${fmt(applied)} — goal fully funded` : `Added ${fmt(applied)} to the goal`);
      render();
    });
  });
  const goalNew = document.getElementById('goal-new');
  if (goalNew) {
    goalNew.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(goalNew);
      // A whitespace-only name trims to nothing — a goal card with a
      // blank heading. Refuse it, like the ledger form refuses a blank
      // description.
      const name = String(fd.get('name')).trim();
      if (!name) { toast('Give the goal a name'); return; }
      addGoal({
        id: nextId('g'), name,
        target: Math.max(1, Number(fd.get('target')) || 1),
        saved: Math.max(0, Number(fd.get('saved')) || 0),
        by: String(fd.get('by')), note: String(fd.get('note') || ''),
      });
      toast('Goal added'); render();
    });
  }
}
