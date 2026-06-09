import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCardInvoiceMonth,
  installmentsForMonth,
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
