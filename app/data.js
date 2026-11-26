// Seed household data for HearthLedger: one family of four, three months of
// transactions, monthly budgets, savings goals and recurring bills.
// Amounts are in US dollars; expenses are negative, income positive.

export const CATEGORIES = [
  { id: 'housing', label: 'Housing', color: '#14665a' },
  { id: 'groceries', label: 'Groceries', color: '#e09f3e' },
  { id: 'transport', label: 'Transport', color: '#3e7cb1' },
  { id: 'utilities', label: 'Utilities', color: '#7a5c9e' },
  { id: 'dining', label: 'Dining out', color: '#c94f6d' },
  { id: 'health', label: 'Health', color: '#4d908e' },
  { id: 'kids', label: 'Kids & school', color: '#f28482' },
  { id: 'fun', label: 'Entertainment', color: '#577590' },
  { id: 'shopping', label: 'Shopping', color: '#90a955' },
  { id: 'income', label: 'Income', color: '#2a9d8f' },
  { id: 'savings', label: 'Savings transfer', color: '#6c757d' },
];

export const ACCOUNTS = ['Joint checking', 'Credit card', 'Cash envelope', 'Savings'];

let seq = 0;
const tx = (date, desc, category, amount, account) => ({
  id: 't' + (++seq), date, desc, category, amount, account: account || 'Joint checking',
});

export function seedState() {
  seq = 0;
  const transactions = [
    // September 2026
    tx('2026-09-01', 'Salary — Maya (clinic)', 'income', 2850),
    tx('2026-09-01', 'Salary — Daniel (logistics)', 'income', 2100),
    tx('2026-09-02', 'Rent — Maple Street apartment', 'housing', -1450),
    tx('2026-09-04', 'Market Basket weekly shop', 'groceries', -168.40, 'Credit card'),
    tx('2026-09-06', 'Electric bill — City Power', 'utilities', -96.20),
    tx('2026-09-08', 'Fuel — two cars', 'transport', -84.00, 'Credit card'),
    tx('2026-09-10', 'School supplies — Leo & June', 'kids', -132.75, 'Credit card'),
    tx('2026-09-12', 'Farmers market', 'groceries', -54.30, 'Cash envelope'),
    tx('2026-09-14', 'Water & trash', 'utilities', -48.60),
    tx('2026-09-16', 'Pizza night — family', 'dining', -46.90, 'Credit card'),
    tx('2026-09-18', 'Pharmacy — inhaler refill', 'health', -28.50),
    tx('2026-09-20', 'Groceries — Aldi run', 'groceries', -121.15, 'Credit card'),
    tx('2026-09-22', 'Internet — fiber 300', 'utilities', -59.99),
    tx('2026-09-24', 'Transfer to emergency fund', 'savings', -300),
    tx('2026-09-26', 'Movie tickets x4', 'fun', -52.00, 'Credit card'),
    tx('2026-09-28', 'Winter boots — June', 'shopping', -64.99, 'Credit card'),
    tx('2026-09-30', 'Bus passes — October', 'transport', -70.00),
    // October 2026
    tx('2026-10-01', 'Salary — Maya (clinic)', 'income', 2850),
    tx('2026-10-01', 'Salary — Daniel (logistics)', 'income', 2100),
    tx('2026-10-02', 'Rent — Maple Street apartment', 'housing', -1450),
    tx('2026-10-03', 'Market Basket weekly shop', 'groceries', -174.25, 'Credit card'),
    tx('2026-10-05', 'Electric bill — City Power', 'utilities', -88.40),
    tx('2026-10-07', 'Car insurance — quarterly', 'transport', -312.00),
    tx('2026-10-09', 'Dentist — Leo checkup', 'health', -75.00),
    tx('2026-10-11', 'Groceries — bulk pantry stock', 'groceries', -196.80, 'Credit card'),
    tx('2026-10-13', 'Water & trash', 'utilities', -51.20),
    tx('2026-10-15', 'Freelance payout — Daniel', 'income', 240),
    tx('2026-10-17', 'Birthday dinner — Grandma Rose', 'dining', -118.40, 'Credit card'),
    tx('2026-10-19', 'School trip fee — June', 'kids', -45.00),
    tx('2026-10-21', 'Internet — fiber 300', 'utilities', -59.99),
    tx('2026-10-23', 'Transfer to emergency fund', 'savings', -350),
    tx('2026-10-25', 'Groceries — Aldi run', 'groceries', -118.60, 'Credit card'),
    tx('2026-10-27', 'Fuel — two cars', 'transport', -79.50, 'Credit card'),
    tx('2026-10-29', 'Halloween costumes', 'fun', -58.75, 'Credit card'),
    tx('2026-10-31', 'Home repairs — faucet kit', 'shopping', -42.30),
    // November 2026 (current month)
    tx('2026-11-01', 'Salary — Maya (clinic)', 'income', 2850),
    tx('2026-11-01', 'Salary — Daniel (logistics)', 'income', 2100),
    tx('2026-11-02', 'Rent — Maple Street apartment', 'housing', -1450),
    tx('2026-11-03', 'Market Basket weekly shop', 'groceries', -182.35, 'Credit card'),
    tx('2026-11-04', 'Electric bill — City Power', 'utilities', -101.75),
    tx('2026-11-05', 'Fuel — two cars', 'transport', -88.20, 'Credit card'),
    tx('2026-11-06', 'Groceries — farmers market', 'groceries', -61.40, 'Cash envelope'),
    tx('2026-11-07', 'Piano lessons — June (Nov)', 'kids', -120.00),
    tx('2026-11-08', 'Water & trash', 'utilities', -49.85),
    tx('2026-11-09', 'Takeaway — noodle house', 'dining', -38.60, 'Credit card'),
    tx('2026-11-10', 'Groceries — Aldi run', 'groceries', -126.90, 'Credit card'),
    tx('2026-11-11', 'Flu shots — family of four', 'health', -40.00),
    tx('2026-11-12', 'Internet — fiber 300', 'utilities', -59.99),
    tx('2026-11-13', 'Car service — brake pads', 'transport', -210.00),
    tx('2026-11-14', 'Transfer to emergency fund', 'savings', -300),
    tx('2026-11-15', 'Freelance payout — Daniel', 'income', 180),
    tx('2026-11-16', 'Groceries — weekly shop', 'groceries', -154.20, 'Credit card'),
    tx('2026-11-17', 'Books — Leo reading list', 'kids', -36.50),
    tx('2026-11-18', 'Streaming — family plan', 'fun', -15.99, 'Credit card'),
    tx('2026-11-19', 'Groceries — Thanksgiving prep', 'groceries', -142.75, 'Credit card'),
    tx('2026-11-20', 'Haircuts — kids', 'shopping', -44.00, 'Cash envelope'),
    tx('2026-11-21', 'Coffee with neighbors', 'dining', -18.50, 'Cash envelope'),
    tx('2026-11-22', 'Pharmacy — vitamins', 'health', -24.90),
    tx('2026-11-23', 'Groceries — top-up shop', 'groceries', -73.15, 'Credit card'),
    tx('2026-11-24', 'Museum day — family pass', 'fun', -48.00),
    tx('2026-11-25', 'Transfer to holiday fund', 'savings', -200),
  ];

  const budgets = {
    housing: 1500, groceries: 800, transport: 450, utilities: 320,
    dining: 180, health: 150, kids: 220, fun: 120, shopping: 200, savings: 500,
  };

  const goals = [
    { id: 'g1', name: 'Emergency fund — 3 months', target: 9000, saved: 5750, note: 'Covers rent + essentials if work stops.' },
    { id: 'g2', name: 'Summer holiday — lake cabin', target: 2400, saved: 1320, note: 'One week in July, booked early for the discount.' },
    { id: 'g3', name: 'New washing machine', target: 850, saved: 510, note: 'Old one rattles; replacing before it floods.' },
    { id: 'g4', name: 'Kids college starter', target: 5000, saved: 1875, note: 'Monthly top-ups, grows with birthday money.' },
  ];

  const bills = [
    { id: 'b1', name: 'Rent — Maple Street', amount: 1450, due: '2026-12-02', account: 'Joint checking', paid: false, recurring: 'Monthly' },
    { id: 'b2', name: 'Electric — City Power', amount: 98, due: '2026-12-04', account: 'Joint checking', paid: false, recurring: 'Monthly' },
    { id: 'b3', name: 'Internet — fiber 300', amount: 59.99, due: '2026-11-27', account: 'Credit card', paid: false, recurring: 'Monthly' },
    { id: 'b4', name: 'Mobile phones — family plan', amount: 86, due: '2026-11-29', account: 'Joint checking', paid: false, recurring: 'Monthly' },
    { id: 'b5', name: 'Car insurance — quarterly', amount: 312, due: '2026-01-07', account: 'Joint checking', paid: false, recurring: 'Quarterly' },
    { id: 'b6', name: 'Piano lessons — June', amount: 120, due: '2026-12-07', account: 'Joint checking', paid: false, recurring: 'Monthly' },
    { id: 'b7', name: 'Water & trash', amount: 49.85, due: '2026-11-08', account: 'Joint checking', paid: true, recurring: 'Monthly' },
  ];

  return { transactions, budgets, goals, bills, month: '2026-11' };
}

export const MONTHS = [
  { id: '2026-09', label: 'September 2026' },
  { id: '2026-10', label: 'October 2026' },
  { id: '2026-11', label: 'November 2026' },
];

export function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#888888' };
}

export function money(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyShort(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
}

// A transaction whose amount is exactly zero carries no information and
// would only confuse totals, so the form rejects it before it gets here.
export function isUsableAmount(n) {
  return Number.isFinite(n) && n !== 0;
}
