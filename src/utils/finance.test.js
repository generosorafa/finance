import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fixedItemDueDate,
  fixedItemToTransaction,
  fixedItemsForMonth,
  getCardInvoiceMonth,
  installmentsForMonth,
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
