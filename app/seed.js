// HearthLedger seed data — the Rivera household, June to November 2026.
// A seeded PRNG (mulberry32) generates the day-to-day spending so the demo
// is identical on every load: same figures, same screenshots, no surprises.
// Amounts are USD; expenses are negative, income positive.

export const TODAY = '2026-11-27';

export const CATEGORIES = [
  { id: 'housing', label: 'Housing', color: '#0e6b5c' },
  { id: 'groceries', label: 'Groceries', color: '#e8a13d' },
  { id: 'transport', label: 'Transport', color: '#3e6fa3' },
  { id: 'utilities', label: 'Utilities & bills', color: '#7a5c9e' },
  { id: 'dining', label: 'Dining out', color: '#c0453e' },
  { id: 'health', label: 'Health', color: '#2e8b7a' },
  { id: 'kids', label: 'Kids & school', color: '#e07a5f' },
  { id: 'fun', label: 'Entertainment', color: '#577590' },
  { id: 'shopping', label: 'Shopping', color: '#90a955' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#b56576' },
  { id: 'income', label: 'Income', color: '#2e7d4f' },
  { id: 'savings', label: 'Savings transfer', color: '#8a8f98' },
  { id: 'transfer', label: 'Transfers & payments', color: '#b8b0a0' },
];

export const ACCOUNTS = [
  { id: 'checking', label: 'Joint checking', opening: 3120.44, kind: 'bank' },
  { id: 'card', label: 'Credit card', opening: -486.20, kind: 'credit' },
  { id: 'cash', label: 'Cash envelope', opening: 140.00, kind: 'cash' },
  { id: 'savings', label: 'Savings account', opening: 6850.00, kind: 'bank' },
  { id: 'invest', label: 'Brokerage (index funds)', opening: 9240.00, kind: 'invest' },
];

// mulberry32: tiny deterministic PRNG; the same seed always deals the
// same sequence, which is what makes the demo reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

// Merchant pools the generator draws day-to-day spending from.
const POOLS = {
  groceries: ['Market Basket weekly shop', 'Aldi run', 'Farmers market', 'Costco pantry stock-up', 'Corner deli & bread', 'Asian market — rice & spices'],
  dining: ['Noodle house takeaway', 'Pizza night — family', 'Burger joint with the kids', 'Sushi lunch — Maya & Daniel', 'Coffee & pastries', 'Taco truck Friday'],
  kids: ['School lunch account top-up', 'Piano lessons — June', 'Soccer club fees — Leo', 'Art supplies', 'School trip fee', 'New shoes — Leo'],
  fun: ['Streaming movie rental', 'Board game — family night', 'Zoo tickets x4', 'Concert tickets — Maya & Daniel', 'Video game — Leo', 'Museum family pass'],
  shopping: ['Household supplies', 'Winter jackets — kids', 'Kitchen gadget', 'Books & stationery', 'Garden tools', 'Phone case & cables'],
  health: ['Pharmacy — prescriptions', 'Dentist checkup', 'Flu shots — family', 'Physio session — Daniel', 'Eye test — June', 'Vitamins & first aid'],
  transport: ['Fuel — two cars', 'Bus passes', 'Car wash', 'Parking — downtown', 'Bike repair — Leo', 'Toll top-up'],
};

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const money = (rng, lo, hi) => Math.round((lo + rng() * (hi - lo)) * 100) / 100;
const onDay = (month, d) => `${month}-${String(d).padStart(2, '0')}`;

let seq = 0;
const tx = (date, desc, category, amount, account = 'checking', extra) =>
  Object.assign({ id: `tx${++seq}`, date, desc, category, amount, account }, extra);

// Six months of ledger: a fixed monthly rhythm (salaries, rent, utilities,
// subscriptions, savings sweeps) plus seeded everyday spending. The order
// of rng() calls is part of the fixture — it pins every amount.
function buildTransactions() {
  seq = 0;
  const rng = mulberry32(20261127);
  const out = [];
  // The card's opening balance is May's statement; each month's auto-pay
  // settles the previous month's charges, so the card balance always
  // equals the current month's unpaid spending.
  let prevCardSpend = 486.20;
  for (const m of MONTHS) {
    const lastDay = m === '2026-11' ? 27 : 28;
    // Income
    out.push(tx(onDay(m, 1), 'Salary — Maya (clinic)', 'income', 2850, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 1), 'Salary — Daniel (logistics)', 'income', 2100, 'checking', { recurring: true }));
    if (m === '2026-08') out.push(tx(onDay(m, 15), 'Freelance payout — Daniel', 'income', 380, 'checking'));
    if (m === '2026-10') out.push(tx(onDay(m, 15), 'Freelance payout — Daniel', 'income', 240, 'checking'));
    if (m === '2026-09') out.push(tx(onDay(m, 18), 'Tax refund — state', 'income', 612.40, 'checking'));
    // Fixed housing + utilities (electric and water vary a little)
    out.push(tx(onDay(m, 2), 'Rent — Maple Street apartment', 'housing', -1450, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 5), 'Electric bill — City Power', 'utilities', -money(rng, 82, 118), 'checking', { recurring: true }));
    out.push(tx(onDay(m, 9), 'Water & trash — city', 'utilities', -money(rng, 44, 56), 'checking', { recurring: true }));
    out.push(tx(onDay(m, 12), 'Internet — fiber 300', 'utilities', -59.99, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 14), 'Mobile phones — family plan', 'utilities', -86.00, 'checking', { recurring: true }));
    // Subscriptions, all on the card
    out.push(tx(onDay(m, 6), 'Music streaming — family', 'subscriptions', -16.99, 'card', { recurring: true }));
    out.push(tx(onDay(m, 8), 'Video streaming bundle', 'subscriptions', -22.49, 'card', { recurring: true }));
    out.push(tx(onDay(m, 10), 'Cloud storage 2TB', 'subscriptions', -9.99, 'card', { recurring: true }));
    out.push(tx(onDay(m, 16), 'Gym — Maya & Daniel', 'subscriptions', -58.00, 'card', { recurring: true }));
    out.push(tx(onDay(m, 20), 'Kids learning app', 'subscriptions', -12.99, 'card', { recurring: true }));
    // The 24th-of-month sweep: emergency fund + index funds, as transfer pairs
    const sweep = m === '2026-11' ? 400 : 300;
    out.push(tx(onDay(m, 24), 'Transfer to emergency fund', 'savings', -sweep, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 24), 'Emergency fund deposit', 'transfer', sweep, 'savings', { recurring: true }));
    out.push(tx(onDay(m, 24), 'Index fund contribution', 'savings', -200, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 24), 'Index fund purchase', 'transfer', 200, 'invest', { recurring: true }));
    out.push(tx(onDay(m, 3), 'Cash envelope top-up', 'transfer', -150, 'checking'));
    out.push(tx(onDay(m, 3), 'Cash envelope top-up', 'transfer', 150, 'cash'));
    // Groceries, roughly weekly
    for (const d of [3, 10, 17, 24]) {
      if (d > lastDay) continue;
      out.push(tx(onDay(m, d), pick(rng, POOLS.groceries), 'groceries', -money(rng, 96, 196), rng() > 0.35 ? 'card' : 'checking'));
    }
    out.push(tx(onDay(m, 13), 'Farmers market', 'groceries', -money(rng, 38, 72), 'cash'));
    // Transport, twice a month plus the odd bigger bill
    out.push(tx(onDay(m, 7), pick(rng, POOLS.transport), 'transport', -money(rng, 55, 96), 'card'));
    out.push(tx(onDay(m, 21), pick(rng, POOLS.transport), 'transport', -money(rng, 40, 88), 'card'));
    if (m === '2026-07' || m === '2026-10') out.push(tx(onDay(m, 11), 'Car insurance — quarterly', 'transport', -312.00, 'checking'));
    if (m === '2026-11') out.push(tx(onDay(m, 13), 'Car service — brake pads & oil', 'transport', -264.50, 'checking'));
    if (m === '2026-08') out.push(tx(onDay(m, 19), 'Car repair — alternator', 'transport', -486.00, 'checking'));
    // Everyday categories
    out.push(tx(onDay(m, 15), pick(rng, POOLS.dining), 'dining', -money(rng, 34, 96), 'card'));
    out.push(tx(onDay(m, 26), pick(rng, POOLS.dining), 'dining', -money(rng, 28, 84), 'card'));
    out.push(tx(onDay(m, 4), pick(rng, POOLS.kids), 'kids', -money(rng, 35, 140), 'card'));
    out.push(tx(onDay(m, 18), pick(rng, POOLS.kids), 'kids', -money(rng, 25, 120), 'checking'));
    out.push(tx(onDay(m, 22), pick(rng, POOLS.fun), 'fun', -money(rng, 18, 92), 'card'));
    out.push(tx(onDay(m, 27), pick(rng, POOLS.shopping), 'shopping', -money(rng, 24, 130), 'card'));
    out.push(tx(onDay(m, 17), pick(rng, POOLS.health), 'health', -money(rng, 22, 95), 'checking'));
    // One-offs
    if (m === '2026-09') out.push(tx(onDay(m, 8), 'School supplies — Leo & June', 'kids', -132.75, 'card'));
    if (m === '2026-10') out.push(tx(onDay(m, 29), 'Halloween costumes', 'fun', -58.75, 'card'));
    if (m === '2026-11') {
      out.push(tx(onDay(m, 25), 'Thanksgiving groceries — turkey & sides', 'groceries', -214.60, 'card'));
      out.push(tx(onDay(m, 26), 'Black Friday — winter coats (sale)', 'shopping', -189.99, 'card'));
    }
    // Card auto-pay on the 27th settles last month's statement. The
    // spending was counted when charged, so the payment is a transfer.
    const cardSpend = out
      .filter((t) => t.date.startsWith(m) && t.account === 'card' && t.amount < 0)
      .reduce((s, t) => s - t.amount, 0);
    const payment = Math.round(prevCardSpend * 100) / 100;
    prevCardSpend = cardSpend;
    out.push(tx(onDay(m, 27), 'Credit card payment — auto-pay', 'transfer', -payment, 'checking', { recurring: true }));
    out.push(tx(onDay(m, 27), 'Credit card payment received', 'transfer', payment, 'card', { recurring: true }));
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Monthly spending limits per category (USD). Income and savings
// transfers are tracked, not budgeted.
export const BUDGET_LIMITS = {
  housing: 1500,
  groceries: 720,
  transport: 320,
  utilities: 330,
  dining: 220,
  health: 160,
  kids: 260,
  fun: 180,
  shopping: 240,
  subscriptions: 130,
};

export const GOALS = [
  { id: 'g1', name: 'Emergency fund', target: 12000, saved: 7850, by: '2027-06-30', note: 'Six months of essentials, kept in the savings account.' },
  { id: 'g2', name: 'Family trip — coast house', target: 2400, saved: 1680, by: '2027-07-15', note: 'One week in July, house + train for four.' },
  { id: 'g3', name: 'New laptop — Maya', target: 1400, saved: 1125, by: '2027-02-01', note: 'Clinic work laptop, bought outright.' },
  { id: 'g4', name: 'Kids education fund', target: 20000, saved: 4300, by: '2032-09-01', note: 'Long-term fund for Leo and June.' },
  { id: 'g5', name: 'Kitchen refresh', target: 1800, saved: 640, by: '2027-04-30', note: 'Paint, handles, second-hand table.' },
];

// Recurring bills for the calendar: due day of month, typical amount.
export const BILLS = [
  { id: 'b1', name: 'Rent — Maple Street', dueDay: 2, amount: 1450, account: 'checking', autopay: false, category: 'housing' },
  { id: 'b2', name: 'Electric — City Power', dueDay: 5, amount: 104, account: 'checking', autopay: true, category: 'utilities' },
  { id: 'b3', name: 'Music streaming — family', dueDay: 6, amount: 16.99, account: 'card', autopay: true, category: 'subscriptions' },
  { id: 'b4', name: 'Video streaming bundle', dueDay: 8, amount: 22.49, account: 'card', autopay: true, category: 'subscriptions' },
  { id: 'b5', name: 'Water & trash — city', dueDay: 9, amount: 51, account: 'checking', autopay: true, category: 'utilities' },
  { id: 'b6', name: 'Cloud storage 2TB', dueDay: 10, amount: 9.99, account: 'card', autopay: true, category: 'subscriptions' },
  { id: 'b7', name: 'Internet — fiber 300', dueDay: 12, amount: 59.99, account: 'checking', autopay: true, category: 'utilities' },
  { id: 'b8', name: 'Mobile phones — family plan', dueDay: 14, amount: 86, account: 'checking', autopay: true, category: 'utilities' },
  { id: 'b9', name: 'Gym — Maya & Daniel', dueDay: 16, amount: 58, account: 'card', autopay: true, category: 'subscriptions' },
  { id: 'b10', name: 'Kids learning app', dueDay: 20, amount: 12.99, account: 'card', autopay: true, category: 'subscriptions' },
  { id: 'b11', name: 'Car insurance (quarterly)', dueDay: 11, amount: 312, account: 'checking', autopay: false, category: 'transport', quarterly: true },
];

export function seedState() {
  return {
    version: 3,
    month: '2026-11',
    transactions: buildTransactions(),
    budgets: { ...BUDGET_LIMITS },
    goals: GOALS.map((g) => ({ ...g })),
    bills: BILLS.map((b) => ({ ...b })),
    // Closed months are settled: every bill due Jun–Oct was paid (the
    // ledger carries the charges), including the quarterly car
    // insurance in Jul and Oct. November's ten are paid too.
    paidBills: {
      '2026-06': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'],
      '2026-07': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11'],
      '2026-08': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'],
      '2026-09': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'],
      '2026-10': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11'],
      '2026-11': ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'],
    },
  };
}
