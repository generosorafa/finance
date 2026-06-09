import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocatedToTarget,
  allocationCashSummary,
  categoryBudgetForMonth,
  categorySpendingForMonth,
  fixedItemDueDate,
  fixedItemToTransaction,
  fixedItemsForMonth,
  getCardInvoiceMonth,
  installmentsForMonth,
  monthlyLedgerEntries,
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
