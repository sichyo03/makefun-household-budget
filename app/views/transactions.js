// Transactions: the full ledger — add/edit form, search and filters,
// recurring badges, running in/out totals, CSV export and import.
// bindTransactions wires the page after each render (called by main.js).
import { ACCOUNTS, CATEGORIES, TODAY } from '../seed.js';
import { esc, fmt0, monthLabel } from '../format.js';
import { addTransaction, deleteTransaction, getState, nextId, updateTransaction } from '../store.js';
import { categoryOf, monthsAvailable } from '../stats.js';
import { getEditing, setEditing, txFilter, txRow } from './shared.js';

// A real calendar date, not just the shape: "2026-13-45" matches the
// pattern but is not a day, and importing it would invent a month.
function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// The ledger reads each category in one direction — income in, savings
// and spending out; a transfer is either leg of a move between accounts.
// So the sign follows the category and the Type choice only decides a
// transfer's direction. (Category=Income + Type=Expense used to post a
// negative "income" row that lowered the Income KPI and inflated the
// category donut without touching Spent.)
function signedAmount(category, type, abs) {
  if (category === 'income') return abs;
  if (category === 'transfer') return type === 'income' ? abs : -abs;
  return -abs;
}

function filteredTransactions() {
  return getState().transactions.filter((t) => {
    if (txFilter.month !== 'all' && t.date.slice(0, 7) !== txFilter.month) return false;
    if (txFilter.category !== 'all' && t.category !== txFilter.category) return false;
    if (txFilter.account !== 'all' && t.account !== txFilter.account) return false;
    if (txFilter.type === 'income' && t.amount < 0) return false;
    if (txFilter.type === 'expense' && t.amount >= 0) return false;
    if (txFilter.q && !`${t.desc} ${categoryOf(t.category).label}`.toLowerCase().includes(txFilter.q.toLowerCase())) return false;
    return true;
  }).slice().reverse();
}

export function transactionsView() {
  const state = getState();
  // The month filter can go stale the same way the month picker could:
  // deleting (or re-dating) the last transaction in the filtered month
  // leaves the select showing "All months" while the ledger still
  // filters on the vanished month and reports no matches. Fall back to
  // all months so the control and the page agree.
  if (txFilter.month !== 'all' && !monthsAvailable().includes(txFilter.month)) txFilter.month = 'all';
  const rows = filteredTransactions();
  const totalIn = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = rows.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const editing = getEditing() ? state.transactions.find((t) => t.id === getEditing()) : null;
  const f = editing || { date: TODAY, desc: '', category: 'groceries', amount: '', account: 'checking' };
  const catOptions = CATEGORIES.map((c) => `<option value="${c.id}"${f.category === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
  const acctOptions = ACCOUNTS.map((a) => `<option value="${a.id}"${f.account === a.id ? ' selected' : ''}>${esc(a.label)}</option>`).join('');
  const monthOptions = `<option value="all">All months</option>` + monthsAvailable().map((m) => `<option value="${m}"${txFilter.month === m ? ' selected' : ''}>${monthLabel(m)}</option>`).join('');

  let html = `<section class="card"><div class="card-head"><h2>${editing ? 'Edit transaction' : 'Add a transaction'}</h2>
    <span class="chip">${state.transactions.length} on record</span></div>
    <form id="tx-form"><div class="form-grid">
    <label class="field">Date<input type="date" name="date" value="${f.date}" required></label>
    <label class="field">Description<input type="text" name="desc" value="${esc(f.desc)}" placeholder="e.g. Market Basket weekly shop" required></label>
    <label class="field">Category<select name="category">${catOptions}</select></label>
    <label class="field">Amount (USD)<input type="number" name="amount" step="0.01" value="${editing ? Math.abs(f.amount) : ''}" placeholder="0.00" required></label>
    <label class="field">Type<select name="type"><option value="expense"${!editing || f.amount < 0 ? ' selected' : ''}>Expense</option><option value="income"${editing && f.amount >= 0 ? ' selected' : ''}>Income</option></select></label>
    <label class="field">Account<select name="account">${acctOptions}</select></label>
    </div><div class="form-actions"><button class="btn primary" type="submit">${editing ? 'Save changes' : 'Add transaction'}</button>
    ${editing ? '<button class="btn ghost" type="button" id="tx-cancel">Cancel edit</button>' : ''}
    </div></form></section>`;

  html += `<section class="card section-gap"><div class="card-head"><h2>Ledger</h2>
    <span class="ledger-totals">Showing <b>${rows.length}</b> &middot; in <b class="pos">${fmt0(totalIn)}</b> &middot; out <b>${fmt0(totalOut)}</b></span></div>
    <div class="toolbar">
    <label class="field search">Search<input type="search" id="tx-q" value="${esc(txFilter.q)}" placeholder="Search descriptions or categories…"></label>
    <label class="field">Month<select id="tx-month">${monthOptions}</select></label>
    <label class="field">Category<select id="tx-cat"><option value="all">All categories</option>${CATEGORIES.map((c) => `<option value="${c.id}"${txFilter.category === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
    <label class="field">Account<select id="tx-acct"><option value="all">All accounts</option>${ACCOUNTS.map((a) => `<option value="${a.id}"${txFilter.account === a.id ? ' selected' : ''}>${esc(a.label)}</option>`).join('')}</select></label>
    <label class="field">Type<select id="tx-type"><option value="all"${txFilter.type === 'all' ? ' selected' : ''}>All</option><option value="income"${txFilter.type === 'income' ? ' selected' : ''}>Income</option><option value="expense"${txFilter.type === 'expense' ? ' selected' : ''}>Expenses</option></select></label>
    <button class="btn" type="button" id="tx-export">Export CSV</button>
    <label class="btn file-btn">Import CSV<input type="file" id="tx-import" accept=".csv,text/csv" hidden></label>
    </div>
    ${rows.length ? `<table><thead><tr><th>Description</th><th>Category</th><th class="num">Amount</th><th class="num">Actions</th></tr></thead><tbody>
      ${rows.slice(0, 40).map((t) => txRow(t, { actions: true })).join('')}</tbody></table>
      ${rows.length > 40 ? '<p class="empty-note">First 40 shown — narrow the filters to see the rest.</p>' : ''}`
      : state.transactions.length ? '<p class="empty-note">No transactions match those filters.</p>' : '<p class="empty-note">No transactions yet — add the first one above.</p>'}
    </section>`;
  return html;
}

// ---------- wiring (called by main.js after each render) ----------
export function bindTransactions({ render, toast }) {
  const app = document.getElementById('app');
  const txForm = document.getElementById('tx-form');
  if (txForm) {
    // Keep the Type select honest: it shows the direction the category
    // will post in, and is only editable for transfers (either leg).
    const catSel = txForm.querySelector('select[name="category"]');
    const typeSel = txForm.querySelector('select[name="type"]');
    const syncType = () => {
      if (catSel.value === 'income') typeSel.value = 'income';
      else if (catSel.value !== 'transfer') typeSel.value = 'expense';
      typeSel.disabled = catSel.value !== 'transfer';
    };
    catSel.addEventListener('change', syncType);
    syncType();
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(txForm);
      const amount = Math.abs(Number(fd.get('amount')) || 0);
      // A $0 row moves no money and only clutters the ledger.
      if (amount <= 0) { toast('Amount must be more than $0'); return; }
      const date = String(fd.get('date'));
      if (!isRealDate(date)) { toast('Pick a real calendar date'); return; }
      // A whitespace-only description trims to nothing — a blank row in
      // the ledger. The CSV import already rejects empty descriptions;
      // the form now does the same.
      const desc = String(fd.get('desc')).trim();
      if (!desc) { toast('Add a description'); return; }
      const category = String(fd.get('category'));
      const patch = {
        date, desc, category,
        amount: signedAmount(category, String(fd.get('type')), amount),
        account: String(fd.get('account')),
      };
      // The row being edited can be deleted while the form is open:
      // the form then reads "Add a transaction", so the submit must
      // add — updating a vanished id would silently drop the new row
      // behind a "Transaction updated" toast.
      const editingId = getEditing();
      const editingTx = editingId ? getState().transactions.find((x) => x.id === editingId) : null;
      if (editingTx) { updateTransaction(editingId, patch); setEditing(null); toast('Transaction updated'); }
      else { setEditing(null); addTransaction({ id: nextId('tx'), ...patch }); toast('Transaction added'); }
      render();
    });
    const cancel = document.getElementById('tx-cancel');
    if (cancel) cancel.addEventListener('click', () => { setEditing(null); render(); });
  }
  // Search keeps focus and caret position across the re-render.
  // render() is async (it awaits the lazy view module), so the focus
  // restore must wait for the paint: restoring synchronously focuses
  // the old input an instant before it is replaced, and every
  // keystroke after the first lands nowhere.
  const q = document.getElementById('tx-q');
  if (q) {
    q.addEventListener('input', () => {
      txFilter.q = q.value;
      const pos = q.selectionStart, val = q.value;
      render().then(() => {
        const again = document.getElementById('tx-q');
        // A newer keystroke may already have painted a newer input;
        // only restore into the input that still shows this value.
        if (again && again.value === val) { again.focus(); again.setSelectionRange(pos, pos); }
      });
    });
  }
  const bindFilter = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { txFilter[key] = el.value; render(); });
  };
  bindFilter('tx-month', 'month'); bindFilter('tx-cat', 'category');
  bindFilter('tx-acct', 'account'); bindFilter('tx-type', 'type');
  app.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { setEditing(b.dataset.edit); render(); window.scrollTo(0, 0); }));
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    // Deleting the row open in the edit form ends the edit: the form
    // falls back to "Add a transaction", and its next submit must add.
    if (getEditing() === b.dataset.del) setEditing(null);
    deleteTransaction(b.dataset.del); toast('Transaction deleted'); render();
  }));
  const exp = document.getElementById('tx-export');
  if (exp) exp.addEventListener('click', () => exportCsv(toast));
  const imp = document.getElementById('tx-import');
  if (imp) imp.addEventListener('change', () => { if (imp.files[0]) importCsv(imp.files[0], render, toast); });
}

// ---------- CSV export / import ----------
function exportCsv(toast) {
  const rows = [['date', 'description', 'category', 'amount', 'account']];
  for (const t of getState().transactions) {
    rows.push([t.date, `"${t.desc.replace(/"/g, '""')}"`, t.category, t.amount.toFixed(2), t.account]);
  }
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hearthledger-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`CSV exported — ${getState().transactions.length} rows`);
}

function importCsv(file, render, toast) {
  file.text().then((text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const catIds = new Set(CATEGORIES.map((c) => c.id));
    const acctIds = new Set(ACCOUNTS.map((a) => a.id));
    // A row already in the ledger (same date, description, category,
    // amount and account) is a duplicate: importing the site's own
    // export must not double every figure. Rows naming a category or
    // account the site does not know, $0 rows, impossible calendar
    // dates, and amounts signed against their category (a negative
    // "income" row, a positive grocery row) are invalid — the ledger
    // reads each category in one direction, so they would corrupt the
    // totals or invent a month. The site's own export always passes.
    const seen = new Set(getState().transactions.map((t) => `${t.date}|${t.desc}|${t.category}|${t.amount}|${t.account}`));
    let added = 0, dupes = 0, invalid = 0;
    // Skip the first line only when it is a header: a headerless bank
    // export starts with data, and dropping its first row silently
    // loses a transaction. A data row's first field is a real date.
    const firstField = ((lines[0] || '').match(/("([^"]|"")*"|[^,]*)/g) || [''])[0].replace(/^"|"$/g, '').trim();
    const dataLines = isRealDate(firstField) ? lines : lines.slice(1);
    for (const line of dataLines) {
      const parts = line.match(/("([^"]|"")*"|[^,]*)/g).filter((p) => p !== '');
      if (parts.length < 5) { invalid += 1; continue; }
      const clean = (s) => s.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      const date = clean(parts[0]), desc = clean(parts[1]), category = clean(parts[2]);
      // Bank exports write amounts as "-1,234.56" or "-$45.67": strip
      // the currency sign and thousands separators before parsing.
      const amount = Number(clean(parts[3]).replace(/[$,\s]/g, '')), account = clean(parts[4]);
      const signOk = category === 'income' ? amount > 0 : category === 'transfer' ? amount !== 0 : amount < 0;
      if (!isRealDate(date) || !desc || !isFinite(amount) || !signOk || !catIds.has(category) || !acctIds.has(account)) { invalid += 1; continue; }
      const key = `${date}|${desc}|${category}|${amount}|${account}`;
      if (seen.has(key)) { dupes += 1; continue; }
      seen.add(key);
      addTransaction({ id: nextId('tx'), date, desc, category, amount, account });
      added += 1;
    }
    const notes = [];
    if (dupes) notes.push(`${dupes} duplicate${dupes === 1 ? '' : 's'} skipped`);
    if (invalid) notes.push(`${invalid} invalid row${invalid === 1 ? '' : 's'} skipped`);
    toast(added ? `Imported ${added} transactions${notes.length ? ` · ${notes.join(' · ')}` : ''}` : (notes.length ? `Nothing imported · ${notes.join(' · ')}` : 'No valid rows found in that CSV'));
    render();
  }).catch(() => toast('Could not read that file'));
}
