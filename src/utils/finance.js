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

export function monthLabel(year, monthIndex) {
  return `${MONTHS[monthIndex]} ${year}`;
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

export function transactionsForCardMonth(transactions, cardId, monthIndex, year) {
  return transactions.filter((item) => (
    item.type === 'despesa'
    && transactionCardId(item) === cardId
    && isSameMonth(item.date, monthIndex, year)
  ));
}

export function exportTransactionsCsv(transactions, categories) {
  const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Pagamento', 'Necessidade', 'Natureza', 'Recorrente', 'Valor', 'Observacao'];
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
      item.recurrent === 'sim' ? 'Sim' : 'Nao',
      Number(item.amount || 0).toFixed(2).replace('.', ','),
      item.note || '',
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
