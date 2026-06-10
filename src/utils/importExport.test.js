import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFinanceBackup,
  parseCsv,
  prepareTransactionImport,
  suggestTransactionColumnMap,
} from './importExport.js';

test('buildFinanceBackup stores settings and array collections', () => {
  const backup = buildFinanceBackup({
    settings: { paymentMethods: ['PIX'] },
    transactions: [{ id: 'tx_1' }],
    loading: false,
  }, '2026-06-10T10:00:00.000Z');

  assert.equal(backup.app, 'finance');
  assert.equal(backup.version, 1);
  assert.deepEqual(backup.settings, { paymentMethods: ['PIX'] });
  assert.deepEqual(backup.collections, { transactions: [{ id: 'tx_1' }] });
});

test('parseCsv handles semicolon, quotes and commas inside cells', () => {
  const rows = parseCsv('Data;Descricao;Valor\n2026-06-10;"Mercado, feira";"1.234,56"');

  assert.deepEqual(rows, [
    ['Data', 'Descricao', 'Valor'],
    ['2026-06-10', 'Mercado, feira', '1.234,56'],
  ]);
});

test('prepareTransactionImport creates transactions and skips duplicates', () => {
  const csv = [
    'Data;Descricao;Tipo;Categoria;Pagamento;Valor;Observacao',
    '10/06/2026;Salario mensal;Receita;Salario / Receita;PIX;3000,00;Empresa',
    '2026-06-11;Mercado;Despesa;Alimentacao;Debito;R$ 123,45;',
    '2026-06-11;Mercado;Despesa;Alimentacao;Debito;R$ 123,45;',
  ].join('\n');

  const result = prepareTransactionImport(csv, {
    categories: [
      { id: 'cat_alim', name: 'Alimentacao' },
      { id: 'cat_salario', name: 'Salario / Receita' },
    ],
    paymentMethods: ['PIX', 'Debito'],
    cards: [],
    existingTransactions: [],
    now: 100,
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.items[0].date, '2026-06-10');
  assert.equal(result.items[0].type, 'receita');
  assert.equal(result.items[0].category, 'cat_salario');
  assert.equal(result.items[1].amount, 123.45);
});

test('prepareTransactionImport applies automation rules and card invoice month', () => {
  const csv = 'Data,Descricao,Valor\n2026-06-11,Netflix,39.9';
  const result = prepareTransactionImport(csv, {
    categories: [{ id: 'cat_serv', name: 'Servicos' }],
    paymentMethods: ['PIX'],
    cards: [{ id: 'card_1', name: 'Visa', closeDay: 10, dueDay: 20 }],
    automationRules: [{
      id: 'rule_1',
      matchText: 'netflix',
      type: 'despesa',
      category: 'cat_serv',
      payment: 'CC::card_1',
      necessity: 'necessario',
      active: true,
    }],
    existingTransactions: [],
    now: 100,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].payment, 'CC::card_1');
  assert.equal(result.items[0].linkedCardId, 'card_1');
  assert.equal(result.items[0].invoiceMonth, '2026-07');
});

test('prepareTransactionImport reports missing required headers', () => {
  const result = prepareTransactionImport('Descricao;Valor\nMercado;10', {
    categories: [],
    paymentMethods: [],
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reason, /data/);
});

test('prepareTransactionImport respects explicit column mapping', () => {
  const csv = 'Quando;Memo;Dinheiro\n11/06/2026;Padaria;18,50';
  const result = prepareTransactionImport(csv, {
    categories: [{ id: 'cat_alim', name: 'Alimentacao' }],
    paymentMethods: ['PIX'],
    columnMap: {
      data: '0',
      descricao: '1',
      valor: '2',
      categoria: '',
      pagamento: '',
    },
    now: 100,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].date, '2026-06-11');
  assert.equal(result.items[0].desc, 'Padaria');
  assert.equal(result.items[0].amount, 18.5);
  assert.equal(result.items[0].category, 'cat_alim');
});

test('suggestTransactionColumnMap identifies known transaction headers', () => {
  assert.deepEqual(suggestTransactionColumnMap(['Data', 'Descricao', 'Valor', 'Categoria']), {
    data: '0',
    descricao: '1',
    valor: '2',
    categoria: '3',
  });
});
