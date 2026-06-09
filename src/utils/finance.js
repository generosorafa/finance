import { MONTHS } from '../data/defaults.js';

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function monthKey(date = new Date()) {
  const value = typeof date === 'string' ? new Date(`${date}T12:00:00`) : date;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyFromParts(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function monthLabel(year, monthIndex) {
  return `${MONTHS[monthIndex]} ${year}`;
}

export function monthLabelFromKey(key) {
  const [year, month] = key.split('-').map(Number);
  return monthLabel(year, month - 1);
}

export function isSameMonth(date, monthIndex, year) {
  if (!date) return false;
  const value = new Date(`${date}T12:00:00`);
  return value.getMonth() === monthIndex && value.getFullYear() === year;
}

export function summarizeMonth(data, monthIndex, year) {
  const monthTransactions = data.transactions.filter((item) => isSameMonth(item.date, monthIndex, year));
  const installments = installmentsForMonth(data.installments, monthIndex, year);
  const receitas = monthTransactions
    .filter((item) => item.type === 'receita')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const despesas = monthTransactions
    .filter((item) => item.type === 'despesa')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const parcelas = installments.reduce((sum, item) => sum + Number(item.parcelValue || 0), 0);

  return {
    receitas,
    despesas,
    parcelas,
    saldo: receitas - despesas - parcelas,
    transactionCount: monthTransactions.length,
    monthTransactions,
    installments,
  };
}

export function installmentsForMonth(installments, monthIndex, year) {
  const target = year * 12 + monthIndex;
  return installments
    .map((item) => {
      if (!item.firstMonth) return null;
      const [firstYear, firstMonth] = item.firstMonth.split('-').map(Number);
      const start = firstYear * 12 + (firstMonth - 1);
      const paidCount = target - start + 1;
      if (paidCount < 1 || paidCount > Number(item.parcels || 0)) return null;
      return { ...item, paidCount };
    })
    .filter(Boolean);
}

export function walletBalance(data) {
  const initial = Number(data.settings.initialBalance || 0);
  return data.wallet.reduce((sum, item) => {
    if (item.type === 'entrada') return sum + Number(item.amount || 0);
    if (item.type === 'saida') return sum - Number(item.amount || 0);
    return sum;
  }, initial);
}

export function getCategory(categories, id) {
  return categories.find((item) => item.id === id) || {
    id: 'unknown',
    name: 'Sem categoria',
    color: '#8a92a6',
  };
}

export function getCardIdFromPayment(payment) {
  return typeof payment === 'string' && payment.startsWith('CC::')
    ? payment.slice(4)
    : '';
}

export function transactionCardId(transaction) {
  return transaction.linkedCardId || getCardIdFromPayment(transaction.payment);
}

export function getCardInvoiceMonth(card, date) {
  if (!card || !date) return monthKey(date || new Date());
  const value = new Date(`${date}T12:00:00`);
  const closeDay = Number(card.closeDay || 1);

  if (value.getDate() > closeDay) {
    value.setMonth(value.getMonth() + 1);
  }

  return monthKey(value);
}

export function getInvoiceKey(cardId, invoiceMonth) {
  return `${cardId}::${invoiceMonth}`;
}

export function getInvoiceDueDate(card, invoiceMonth) {
  const [year, month] = invoiceMonth.split('-').map(Number);
  const closeDay = Number(card.closeDay || 1);
  const dueDay = Number(card.dueDay || 1);
  const due = new Date(year, month - 1, dueDay, 12);

  if (dueDay <= closeDay) {
    due.setMonth(due.getMonth() + 1);
  }

  return due.toISOString().slice(0, 10);
}

export function transactionsForCardInvoice(transactions, card, invoiceMonth) {
  return transactions.filter((item) => (
    item.type === 'despesa'
    && transactionCardId(item) === card.id
    && (item.invoiceMonth || getCardInvoiceMonth(card, item.date)) === invoiceMonth
  ));
}

export function walletEntryForTransaction(transaction) {
  const cardId = transactionCardId(transaction);
  if (transaction.type === 'despesa' && cardId) return null;
  if (!['receita', 'despesa'].includes(transaction.type)) return null;

  return {
    id: transaction.walletEntryId || `wallet_tx_${transaction.id}`,
    type: transaction.type === 'receita' ? 'entrada' : 'saida',
    desc: `[Transacao] ${transaction.desc}`,
    amount: Number(transaction.amount || 0),
    date: transaction.date,
    source: 'transaction',
    transactionId: transaction.id,
    createdAt: transaction.createdAt || Date.now(),
  };
}

export function invoicePaymentEntry(card, invoiceMonth, amount) {
  return {
    id: `wallet_invoice_${card.id}_${invoiceMonth}`,
    type: 'saida',
    desc: `[Fatura] ${card.name} - ${monthLabelFromKey(invoiceMonth)}`,
    amount: Number(amount || 0),
    date: getInvoiceDueDate(card, invoiceMonth),
    source: 'invoice',
    invoiceKey: getInvoiceKey(card.id, invoiceMonth),
    cardId: card.id,
    createdAt: Date.now(),
  };
}

export function exportTransactionsCsv(transactions, categories) {
  const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Pagamento', 'Necessidade', 'Natureza', 'Valor', 'Observacao'];
  const rows = [headers];

  transactions.forEach((item) => {
    const category = getCategory(categories, item.category);
    rows.push([
      item.date || '',
      item.desc || '',
      item.type === 'receita' ? 'Receita' : 'Despesa',
      category.name,
      item.payment || '-',
      item.necessity || '-',
      item.nature || '-',
      Number(item.amount || 0).toFixed(2).replace('.', ','),
      item.note || '',
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
}

export function exportFinanceCsv(data, monthIndex, year) {
  const summary = summarizeMonth(data, monthIndex, year);
  const rows = [];

  rows.push(['RESUMO']);
  rows.push(['Receitas', formatCsvCurrency(summary.receitas)]);
  rows.push(['Despesas', formatCsvCurrency(summary.despesas + summary.parcelas)]);
  rows.push(['Saldo', formatCsvCurrency(summary.saldo)]);
  rows.push([]);
  rows.push(['TRANSACOES']);
  rows.push(['Data', 'Descricao', 'Tipo', 'Categoria', 'Pagamento', 'Valor']);

  summary.monthTransactions.forEach((item) => {
    const category = getCategory(data.categories, item.category);
    rows.push([
      item.date || '',
      item.desc || '',
      item.type === 'receita' ? 'Receita' : 'Despesa',
      category.name,
      item.payment || '-',
      formatCsvCurrency(item.amount),
    ]);
  });

  rows.push([]);
  rows.push(['PARCELAMENTOS']);
  rows.push(['Descricao', 'Cartao', 'Parcela', 'Valor']);
  summary.installments.forEach((item) => {
    const card = data.cards.find((entry) => entry.id === item.cardId);
    rows.push([
      item.desc || '',
      card?.name || '-',
      `${item.paidCount}/${item.parcels}`,
      formatCsvCurrency(item.parcelValue),
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatCsvCurrency(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}
