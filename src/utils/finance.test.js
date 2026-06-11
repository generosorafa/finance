import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocatedToTarget,
  allocationCashSummary,
  buildMonthlyClosingSnapshot,
  categoryBudgetForMonth,
  categoryBudgetStatuses,
  cardInvoiceSummaries,
  categorySpendingForMonth,
  dataHealthInsights,
  financeAlerts,
  applyAutomationRule,
  findAutomationRule,
  fixedItemDueDate,
  fixedItemToTransaction,
  fixedItemsForMonth,
  getCardInvoiceMonth,
  installmentsForMonth,
  monthlyLedgerEntries,
  monthlyClosingInsights,
  monthlyProjection,
  smartCashSummary,
  targetAllocations,
  transactionForFixedItemMonth,
  transactionsForCardInvoice,
  walletEntryForTransaction,
} from './finance.js';

test('getCardInvoiceMonth moves purchases after close day to next invoice', () => {
  const card = { id: 'card_1', closeDay: 10, dueDay: 20 };

  assert.equal(getCardInvoiceMonth(card, '2026-06-10'), '2026-06');
  assert.equal(getCardInvoiceMonth(card, '2026-06-11'), '2026-07');
});

test('installmentsForMonth returns correct paid count', () => {
  const installments = [{ id: 'i1', firstMonth: '2026-05', parcels: 3, parcelValue: 100 }];

  assert.equal(installmentsForMonth(installments, 4, 2026)[0].paidCount, 1);
  assert.equal(installmentsForMonth(installments, 5, 2026)[0].paidCount, 2);
  assert.equal(installmentsForMonth(installments, 7, 2026).length, 0);
});

test('walletEntryForTransaction ignores credit card expenses', () => {
  const cashExpense = {
    id: 'tx_1',
    type: 'despesa',
    desc: 'Mercado',
    amount: 50,
    date: '2026-06-08',
    payment: 'PIX',
  };
  const cardExpense = { ...cashExpense, id: 'tx_2', payment: 'CC::card_1', linkedCardId: 'card_1' };

  assert.equal(walletEntryForTransaction(cashExpense).type, 'saida');
  assert.equal(walletEntryForTransaction(cardExpense), null);
});

test('transactionsForCardInvoice respects invoice month', () => {
  const card = { id: 'card_1', closeDay: 10, dueDay: 20 };
  const transactions = [
    { id: 'a', type: 'despesa', amount: 10, payment: 'CC::card_1', date: '2026-06-10' },
    { id: 'b', type: 'despesa', amount: 20, payment: 'CC::card_1', date: '2026-06-11' },
  ];

  assert.deepEqual(transactionsForCardInvoice(transactions, card, '2026-06').map((item) => item.id), ['a']);
  assert.deepEqual(transactionsForCardInvoice(transactions, card, '2026-07').map((item) => item.id), ['b']);
});

test('fixedItemsForMonth respects active period', () => {
  const items = [
    { id: 'rent', active: true, startMonth: '2026-01', amount: 1000, dueDay: 5 },
    { id: 'old', active: true, startMonth: '2026-01', endMonth: '2026-05', amount: 90, dueDay: 10 },
    { id: 'off', active: false, startMonth: '2026-01', amount: 50, dueDay: 10 },
  ];

  assert.deepEqual(fixedItemsForMonth(items, 5, 2026).map((item) => item.id), ['rent']);
});

test('fixedItemDueDate clamps invalid month days', () => {
  assert.equal(fixedItemDueDate({ dueDay: 31 }, 1, 2026), '2026-02-28');
});

test('fixedItemToTransaction creates deterministic monthly transaction', () => {
  const item = {
    id: 'netflix',
    kind: 'assinatura',
    name: 'Netflix',
    amount: 39.9,
    dueDay: 15,
    category: 'cat_serv',
    payment: 'PIX',
  };
  const transaction = fixedItemToTransaction(item, [], '2026-06');

  assert.equal(transaction.id, 'tx_fixed_netflix_2026-06');
  assert.equal(transaction.nature, 'assinatura');
  assert.equal(transaction.fixedItemId, 'netflix');
  assert.equal(transaction.fixedMonth, '2026-06');
  assert.equal(transaction.date, '2026-06-15');
});

test('transactionForFixedItemMonth finds launched fixed item', () => {
  const transactions = [
    { id: 'a', fixedItemId: 'rent', fixedMonth: '2026-06' },
    { id: 'b', fixedItemId: 'rent', fixedMonth: '2026-07' },
  ];

  assert.equal(transactionForFixedItemMonth(transactions, 'rent', '2026-06').id, 'a');
  assert.equal(transactionForFixedItemMonth(transactions, 'rent', '2026-05'), null);
});

test('monthlyLedgerEntries includes installment rows for current month', () => {
  const data = {
    transactions: [],
    installments: [{ id: 'i1', desc: 'Notebook', firstMonth: '2026-06', parcels: 2, parcelValue: 500, categoryId: 'cat_edu', cardId: 'card_1', purchaseDate: '2026-05-20' }],
    cards: [{ id: 'card_1', name: 'Visa' }],
  };
  const entries = monthlyLedgerEntries(data, 5, 2026);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, 'installment');
  assert.equal(entries[0].installmentLabel, 'Parcela 1/2');
  assert.equal(entries[0].category, 'cat_edu');
});

test('categorySpendingForMonth sums transactions and installments', () => {
  const data = {
    categories: [{ id: 'cat_edu', name: 'Educacao' }],
    transactions: [{ id: 'tx1', type: 'despesa', amount: 100, category: 'cat_edu', date: '2026-06-03' }],
    installments: [{ id: 'i1', firstMonth: '2026-06', parcels: 2, parcelValue: 500, categoryId: 'cat_edu' }],
    cards: [],
  };

  assert.equal(categorySpendingForMonth(data, 5, 2026)[0].total, 600);
});

test('categoryBudgetForMonth returns latest budget at or before month', () => {
  const budgets = [
    { id: 'a', categoryId: 'cat_alim', month: '2026-01', amount: 800 },
    { id: 'b', categoryId: 'cat_alim', month: '2026-05', amount: 950 },
    { id: 'c', categoryId: 'cat_alim', month: '2026-08', amount: 1000 },
  ];

  assert.equal(categoryBudgetForMonth(budgets, 'cat_alim', '2026-06').amount, 950);
  assert.equal(categoryBudgetForMonth(budgets, 'cat_alim', '2025-12'), null);
});

test('categoryBudgetStatuses marks warning and over budget categories', () => {
  const data = {
    categories: [
      { id: 'cat_food', name: 'Alimentacao' },
      { id: 'cat_fun', name: 'Lazer' },
    ],
    categoryBudgets: [
      { id: 'b1', categoryId: 'cat_food', month: '2026-06', amount: 100 },
      { id: 'b2', categoryId: 'cat_fun', month: '2026-06', amount: 200 },
    ],
    transactions: [
      { id: 'tx1', type: 'despesa', category: 'cat_food', amount: 120, date: '2026-06-01' },
      { id: 'tx2', type: 'despesa', category: 'cat_fun', amount: 170, date: '2026-06-02' },
    ],
    installments: [],
    cards: [],
  };
  const statuses = categoryBudgetStatuses(data, 5, 2026);

  assert.equal(statuses.find((item) => item.category.id === 'cat_food').status, 'over');
  assert.equal(statuses.find((item) => item.category.id === 'cat_fun').status, 'warning');
});

test('cardInvoiceSummaries combines card purchases and installments', () => {
  const data = {
    transactions: [{ id: 'tx1', type: 'despesa', amount: 80, payment: 'CC::card_1', date: '2026-06-05' }],
    installments: [{ id: 'i1', firstMonth: '2026-06', parcels: 2, parcelValue: 50, cardId: 'card_1' }],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    wallet: [],
  };
  const [invoice] = cardInvoiceSummaries(data, 5, 2026);

  assert.equal(invoice.direct, 80);
  assert.equal(invoice.installments, 50);
  assert.equal(invoice.total, 130);
  assert.equal(invoice.status, 'open');
});

test('monthlyClosingInsights surfaces pending work before closing', () => {
  const data = {
    settings: {},
    wallet: [],
    categories: [{ id: 'cat_food', name: 'Alimentacao' }],
    categoryBudgets: [{ id: 'b1', categoryId: 'cat_food', month: '2026-06', amount: 100 }],
    transactions: [
      { id: 'tx1', type: 'despesa', category: 'cat_food', amount: 120, payment: 'PIX', date: '2026-06-01' },
    ],
    installments: [],
    fixedItems: [{ id: 'rent', name: 'Aluguel', amount: 1000, dueDay: 5, active: true, startMonth: '2026-01' }],
    cards: [],
    allocations: [],
  };
  const insights = monthlyClosingInsights(data, 5, 2026);

  assert.equal(insights.pendingFixed.length, 1);
  assert.equal(insights.overBudget.length, 1);
  assert.equal(insights.readyToClose, false);
});

test('buildMonthlyClosingSnapshot stores compact monthly totals', () => {
  const data = {
    settings: { initialBalance: 100 },
    wallet: [{ id: 'w1', type: 'entrada', amount: 50 }],
    categories: [],
    categoryBudgets: [],
    transactions: [{ id: 'tx1', type: 'receita', category: 'cat_salary', amount: 1000, date: '2026-06-01' }],
    installments: [],
    fixedItems: [],
    cards: [],
    allocations: [],
  };
  const snapshot = buildMonthlyClosingSnapshot(data, 5, 2026, 'ok', 123);

  assert.equal(snapshot.id, 'monthly_closing_2026-06');
  assert.equal(snapshot.receitas, 1000);
  assert.equal(snapshot.carteira, 150);
  assert.equal(snapshot.note, 'ok');
  assert.equal(snapshot.closedAt, 123);
});

test('smartCashSummary estimates free cash after open invoices and pending fixed items', () => {
  const data = {
    settings: { initialBalance: 1000 },
    wallet: [
      { id: 'w1', type: 'entrada', amount: 500 },
      { id: 'w2', type: 'saida', amount: 100 },
      { id: 'w3', type: 'saida', amount: 300, source: 'transaction', transactionId: 'tx_goal' },
    ],
    categories: [{ id: 'cat_metas', name: 'Metas', special: 'goals' }],
    transactions: [
      { id: 'tx_card', type: 'despesa', amount: 200, payment: 'CC::card_1', date: '2026-06-03' },
      { id: 'tx_goal', type: 'despesa', amount: 300, category: 'cat_metas', payment: 'PIX', date: '2026-06-04' },
    ],
    installments: [],
    fixedItems: [
      { id: 'rent', name: 'Aluguel', amount: 400, dueDay: 10, active: true, startMonth: '2026-01', payment: 'PIX' },
      { id: 'stream', name: 'Streaming', amount: 50, dueDay: 12, active: true, startMonth: '2026-01', payment: 'CC::card_1' },
    ],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    allocations: [{ id: 'a1', type: 'goals', targetId: 'goal_1', amount: 100 }],
  };
  const cash = smartCashSummary(data, 5, 2026);

  assert.equal(cash.wallet, 1100);
  assert.equal(cash.openInvoiceTotal, 200);
  assert.equal(cash.pendingFixedTotal, 450);
  assert.equal(cash.committedTotal, 650);
  assert.equal(cash.freeEstimated, 450);
  assert.equal(cash.reservedTotal, 300);
  assert.equal(cash.reservedAllocated, 100);
  assert.equal(cash.reservedAvailable, 200);
});

test('monthlyProjection estimates end of month result from variable spending pace', () => {
  const data = {
    settings: {},
    wallet: [
      { id: 'w_income', type: 'entrada', amount: 3000 },
      { id: 'w_rent', type: 'saida', amount: 1000 },
      { id: 'w_market', type: 'saida', amount: 300 },
    ],
    categories: [
      { id: 'cat_food', name: 'Alimentacao' },
      { id: 'cat_home', name: 'Casa' },
      { id: 'cat_goals', name: 'Metas', special: 'goals' },
    ],
    transactions: [
      { id: 'income', type: 'receita', category: 'cat_income', amount: 3000, date: '2026-06-01' },
      { id: 'rent', type: 'despesa', category: 'cat_home', amount: 1000, date: '2026-06-05', source: 'fixed-item', fixedItemId: 'rent', fixedMonth: '2026-06' },
      { id: 'market', type: 'despesa', category: 'cat_food', amount: 300, payment: 'PIX', date: '2026-06-05' },
      { id: 'card', type: 'despesa', category: 'cat_food', amount: 200, payment: 'CC::card_1', date: '2026-06-08' },
      { id: 'goal_cash', type: 'despesa', category: 'cat_goals', amount: 150, payment: 'PIX', date: '2026-06-09' },
    ],
    installments: [{ id: 'inst', firstMonth: '2026-06', parcels: 2, parcelValue: 100, categoryId: 'cat_food', cardId: 'card_1' }],
    fixedItems: [
      { id: 'rent', name: 'Aluguel', amount: 1000, dueDay: 5, active: true, startMonth: '2026-01', payment: 'PIX' },
      { id: 'internet', name: 'Internet', amount: 200, dueDay: 20, active: true, startMonth: '2026-01', payment: 'PIX' },
    ],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    allocations: [],
  };
  const projection = monthlyProjection(data, 5, 2026, '2026-06-10');

  assert.equal(projection.elapsedDays, 10);
  assert.equal(projection.remainingDays, 20);
  assert.equal(projection.variableSpent, 500);
  assert.equal(projection.averageDailyVariable, 50);
  assert.equal(projection.projectedVariableRemaining, 1000);
  assert.equal(projection.pendingFixedTotal, 200);
  assert.equal(projection.projectedExpenses, 2950);
  assert.equal(projection.projectedResult, 50);
  assert.equal(projection.projectedCashEnd, 200);
});

test('financeAlerts prioritizes overdue fixed items, open invoices and category budgets', () => {
  const data = {
    settings: {},
    wallet: [],
    categories: [{ id: 'cat_food', name: 'Alimentacao' }],
    categoryBudgets: [{ id: 'b1', categoryId: 'cat_food', month: '2026-06', amount: 100 }],
    transactions: [
      { id: 'food', type: 'despesa', category: 'cat_food', amount: 140, payment: 'PIX', date: '2026-06-02' },
      { id: 'card', type: 'despesa', category: 'cat_food', amount: 200, payment: 'CC::card_1', date: '2026-06-08' },
    ],
    installments: [],
    fixedItems: [{ id: 'rent', name: 'Aluguel', amount: 1000, dueDay: 5, active: true, startMonth: '2026-01', payment: 'PIX' }],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    allocations: [],
  };
  const alerts = financeAlerts(data, 5, 2026, '2026-06-10');

  assert.equal(alerts[0].type, 'fixed');
  assert.equal(alerts[0].severity, 'high');
  assert.ok(alerts.some((item) => item.type === 'invoice'));
  assert.ok(alerts.some((item) => item.type === 'budget' && item.severity === 'high'));
});

test('dataHealthInsights summarizes data issues for review', () => {
  const data = {
    settings: {},
    categories: [
      { id: 'cat_food', name: 'Alimentacao' },
      { id: 'cat_goals', name: 'Metas', special: 'goals' },
    ],
    categoryBudgets: [{ id: 'budget_food', categoryId: 'cat_food', month: '2026-06', amount: 100 }],
    transactions: [
      { id: 'dup_a', type: 'despesa', desc: 'Mercado', amount: 80, date: '2026-06-03', category: 'cat_food', payment: 'PIX', walletEntryId: 'wallet_tx_dup_a' },
      { id: 'dup_b', type: 'despesa', desc: 'Mercado', amount: 80, date: '2026-06-03', category: 'cat_food', payment: 'PIX', walletEntryId: 'wallet_tx_dup_b' },
      { id: 'bad_category', type: 'despesa', desc: 'Algo', amount: 20, date: '2026-06-04', category: 'missing', payment: 'PIX', walletEntryId: 'wallet_tx_bad_category' },
      { id: 'card', type: 'despesa', desc: 'Online', amount: 150, date: '2026-06-05', category: 'cat_food', payment: 'CC::card_1', linkedCardId: 'card_1' },
      { id: 'goal_cash', type: 'despesa', desc: 'Meta', amount: 200, date: '2026-06-06', category: 'cat_goals', payment: 'PIX', walletEntryId: 'wallet_tx_goal_cash' },
      { id: 'may', type: 'receita', desc: 'Salario', amount: 1000, date: '2026-05-01', category: 'cat_food', payment: 'PIX', walletEntryId: 'wallet_tx_may' },
    ],
    wallet: [
      { id: 'wallet_tx_dup_a', source: 'transaction', transactionId: 'dup_a', type: 'saida', amount: 80 },
      { id: 'wallet_tx_bad_category', source: 'transaction', transactionId: 'bad_category', type: 'saida', amount: 20 },
      { id: 'wallet_tx_goal_cash', source: 'transaction', transactionId: 'goal_cash', type: 'saida', amount: 200 },
      { id: 'wallet_tx_may', source: 'transaction', transactionId: 'may', type: 'entrada', amount: 1000 },
      { id: 'wallet_invoice_card_1_2026-06', source: 'invoice', invoiceKey: 'card_1::2026-06', type: 'saida', amount: 90 },
    ],
    fixedItems: [{ id: 'rent', name: 'Aluguel', amount: 1000, dueDay: 5, active: true, startMonth: '2026-01', payment: 'PIX' }],
    installments: [],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    allocations: [{ id: 'alloc_1', type: 'goals', targetId: 'goal_1', amount: 50 }],
    monthlyClosings: [],
  };
  const health = dataHealthInsights(data, 5, 2026, '2026-06-10');

  assert.equal(health.status, 'risk');
  assert.equal(health.checks.find((item) => item.id === 'duplicates').count, 1);
  assert.equal(health.checks.find((item) => item.id === 'invalid-categories').count, 1);
  assert.equal(health.checks.find((item) => item.id === 'pending-fixed').count, 1);
  assert.equal(health.checks.find((item) => item.id === 'divergent-invoices').count, 1);
  assert.equal(health.checks.find((item) => item.id === 'wallet-links').count, 1);
  assert.ok(health.checks.find((item) => item.id === 'missing-closings').count >= 1);
});

test('automation rules match descriptions without accents and apply transaction fields', () => {
  const rules = [
    { id: 'r1', matchText: 'salario', type: 'receita', category: 'cat_salario', payment: 'PIX', necessity: 'necessario', active: true, createdAt: 2 },
    { id: 'r2', matchText: 'mercado', type: 'despesa', category: 'cat_alim', payment: 'Debito', necessity: 'necessario', active: false, createdAt: 1 },
    { id: 'r3', matchText: 'salario mensal', type: 'receita', category: 'cat_extra', payment: 'Transferencia', necessity: 'eventual', active: true, createdAt: 3 },
  ];
  const rule = findAutomationRule(rules, 'SALÁRIO mensal');
  const transaction = applyAutomationRule({ type: 'despesa', category: 'cat_outros', payment: 'PIX', necessity: 'eventual' }, rule);

  assert.equal(rule.id, 'r3');
  assert.deepEqual(transaction, {
    type: 'receita',
    category: 'cat_extra',
    payment: 'Transferencia',
    necessity: 'eventual',
  });
});

test('allocationCashSummary uses special category transactions as cash source', () => {
  const data = {
    categories: [{ id: 'cat_metas', name: 'Metas', special: 'goals' }],
    transactions: [
      { id: 'tx1', type: 'despesa', category: 'cat_metas', amount: 500 },
      { id: 'tx2', type: 'receita', category: 'cat_metas', amount: 300 },
      { id: 'tx3', type: 'despesa', category: 'cat_outros', amount: 200 },
    ],
    allocations: [{ id: 'a1', type: 'goals', targetId: 'goal_1', amount: 150 }],
  };

  assert.deepEqual(allocationCashSummary(data, 'goals'), {
    sourceTotal: 500,
    allocatedTotal: 150,
    available: 350,
  });
});

test('target allocation helpers summarize and sort history', () => {
  const data = {
    allocations: [
      { id: 'old', type: 'debts', targetId: 'debt_1', amount: 100, date: '2026-05-01' },
      { id: 'new', type: 'debts', targetId: 'debt_1', amount: 200, date: '2026-06-01' },
      { id: 'other', type: 'debts', targetId: 'debt_2', amount: 300, date: '2026-06-02' },
    ],
  };

  assert.equal(allocatedToTarget(data, 'debts', 'debt_1'), 300);
  assert.deepEqual(targetAllocations(data, 'debts', 'debt_1').map((item) => item.id), ['new', 'old']);
});
