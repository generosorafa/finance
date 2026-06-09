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

export function monthPartsFromKey(key) {
  const [year, month] = key.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

export function isSameMonth(date, monthIndex, year) {
  if (!date) return false;
  const value = new Date(`${date}T12:00:00`);
  return value.getMonth() === monthIndex && value.getFullYear() === year;
}

export function summarizeMonth(data, monthIndex, year) {
  const monthTransactions = (data.transactions || []).filter((item) => isSameMonth(item.date, monthIndex, year));
  const installments = installmentsForMonth(data.installments || [], monthIndex, year);
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

export function monthlyLedgerEntries(data, monthIndex, year) {
  const summary = summarizeMonth(data, monthIndex, year);
  const transactionEntries = summary.monthTransactions.map((item) => ({
    ...item,
    sortDate: item.date || '',
  }));
  const installmentEntries = summary.installments.map((item) => installmentLedgerEntry(item, data.cards || [], monthIndex, year));

  return [...transactionEntries, ...installmentEntries];
}

export function installmentLedgerEntry(item, cards, monthIndex, year) {
  const card = cards.find((entry) => entry.id === item.cardId);
  return {
    id: `ledger_installment_${item.id}_${monthKeyFromParts(year, monthIndex)}`,
    type: 'despesa',
    desc: item.desc,
    amount: Number(item.parcelValue || 0),
    date: item.purchaseDate || '',
    category: item.categoryId,
    payment: item.cardId ? `CC::${item.cardId}` : '',
    nature: 'parcelamento',
    source: 'installment',
    installmentId: item.id,
    installmentLabel: `Parcela ${item.paidCount}/${item.parcels}`,
    cardName: card?.name || '',
    sortDate: `${monthKeyFromParts(year, monthIndex)}-01`,
  };
}

export function categorySpendingForMonth(data, monthIndex, year) {
  const entries = monthlyLedgerEntries(data, monthIndex, year);
  return (data.categories || []).map((category) => {
    const total = entries
      .filter((item) => item.type === 'despesa' && item.category === category.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { category, total };
  });
}

export function categoryBudgetId(categoryId, budgetMonth) {
  return `cat_budget_${categoryId}_${budgetMonth}`;
}

export function categoryBudgetForMonth(categoryBudgets, categoryId, budgetMonth) {
  return [...categoryBudgets]
    .filter((item) => item.categoryId === categoryId && item.month <= budgetMonth)
    .sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0] || null;
}

export function categoryBudgetStatuses(data, monthIndex, year) {
  const budgetMonth = monthKeyFromParts(year, monthIndex);
  return categorySpendingForMonth(data, monthIndex, year)
    .map((item) => {
      const budget = categoryBudgetForMonth(data.categoryBudgets || [], item.category.id, budgetMonth);
      const target = Number(budget?.amount || 0);
      const percent = target > 0 ? (item.total / target) * 100 : 0;
      let status = 'none';
      if (target > 0 && percent >= 100) status = 'over';
      else if (target > 0 && percent >= 80) status = 'warning';
      else if (target > 0) status = 'ok';

      return {
        ...item,
        target,
        percent,
        status,
      };
    })
    .filter((item) => item.total > 0 || item.target > 0);
}

export function specialCategoryForType(categories, type) {
  return categories.find((item) => item.special === type) || null;
}

export function allocationSourceTransactions(data, type) {
  const category = specialCategoryForType(data.categories || [], type);
  if (!category) return [];
  return (data.transactions || []).filter((item) => item.type === 'despesa' && item.category === category.id);
}

export function allocationsForType(data, type) {
  return (data.allocations || []).filter((item) => item.type === type);
}

export function allocationCashSummary(data, type) {
  const sourceTotal = allocationSourceTransactions(data, type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const allocatedTotal = allocationsForType(data, type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    sourceTotal,
    allocatedTotal,
    available: Math.max(0, sourceTotal - allocatedTotal),
  };
}

export function allocatedToTarget(data, type, targetId) {
  return allocationsForType(data, type)
    .filter((item) => item.targetId === targetId)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function targetAllocations(data, type, targetId) {
  return allocationsForType(data, type)
    .filter((item) => item.targetId === targetId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || Number(b.createdAt || 0) - Number(a.createdAt || 0));
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

export function fixedItemsForMonth(fixedItems, monthIndex, year) {
  const target = monthKeyFromParts(year, monthIndex);
  return fixedItems
    .filter((item) => item.active !== false)
    .filter((item) => !item.startMonth || item.startMonth <= target)
    .filter((item) => !item.endMonth || item.endMonth >= target)
    .map((item) => ({
      ...item,
      fixedMonth: target,
      dueDate: fixedItemDueDate(item, monthIndex, year),
    }));
}

export function fixedItemDueDate(item, monthIndex, year) {
  const day = Math.min(Math.max(Number(item.dueDay || 1), 1), daysInMonth(year, monthIndex));
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function transactionForFixedItemMonth(transactions, itemId, fixedMonth) {
  return transactions.find((item) => item.fixedItemId === itemId && item.fixedMonth === fixedMonth) || null;
}

export function fixedItemToTransaction(item, cards, fixedMonth) {
  const { year, monthIndex } = monthPartsFromKey(fixedMonth);
  const linkedCardId = getCardIdFromPayment(item.payment);
  const card = cards.find((entry) => entry.id === linkedCardId);
  const date = fixedItemDueDate(item, monthIndex, year);
  const transaction = {
    id: `tx_fixed_${item.id}_${fixedMonth}`,
    type: 'despesa',
    desc: item.name,
    amount: Number(item.amount || 0),
    date,
    category: item.category,
    payment: item.payment,
    necessity: 'necessario',
    nature: item.kind === 'assinatura' ? 'assinatura' : 'fixo',
    linkedCardId,
    invoiceMonth: linkedCardId ? getCardInvoiceMonth(card, date) : '',
    note: item.note || '',
    source: 'fixed-item',
    fixedItemId: item.id,
    fixedMonth,
    createdAt: Date.now(),
  };

  return transaction;
}

export function walletBalance(data) {
  const initial = Number(data.settings?.initialBalance || 0);
  return (data.wallet || []).reduce((sum, item) => {
    if (item.type === 'entrada') return sum + Number(item.amount || 0);
    if (item.type === 'saida') return sum - Number(item.amount || 0);
    return sum;
  }, initial);
}

export function cardInvoiceSummaries(data, monthIndex, year) {
  const invoiceMonth = monthKeyFromParts(year, monthIndex);
  const summary = summarizeMonth(data, monthIndex, year);

  return (data.cards || []).map((card) => {
    const direct = transactionsForCardInvoice(data.transactions || [], card, invoiceMonth)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const installments = summary.installments
      .filter((item) => item.cardId === card.id)
      .reduce((sum, item) => sum + Number(item.parcelValue || 0), 0);
    const total = direct + installments;
    const invoiceKey = getInvoiceKey(card.id, invoiceMonth);
    const paidEntry = (data.wallet || []).find((item) => item.source === 'invoice' && item.invoiceKey === invoiceKey);
    const paymentMatchesInvoice = paidEntry && Math.abs(Number(paidEntry.amount || 0) - total) < 0.01;
    let status = 'empty';
    if (total > 0 && paidEntry && paymentMatchesInvoice) status = 'paid';
    else if (total > 0 && paidEntry) status = 'divergent';
    else if (total > 0) status = 'open';

    return {
      card,
      direct,
      installments,
      total,
      dueDate: getInvoiceDueDate(card, invoiceMonth),
      invoiceKey,
      paidEntry,
      paymentMatchesInvoice,
      status,
    };
  });
}

export function monthlyClosingId(closingMonth) {
  return `monthly_closing_${closingMonth}`;
}

export function monthlyClosingInsights(data, monthIndex, year) {
  const closingMonth = monthKeyFromParts(year, monthIndex);
  const summary = summarizeMonth(data, monthIndex, year);
  const fixedRows = fixedItemsForMonth(data.fixedItems || [], monthIndex, year)
    .map((item) => ({
      ...item,
      launchedTransaction: transactionForFixedItemMonth(data.transactions || [], item.id, closingMonth),
    }));
  const pendingFixed = fixedRows
    .filter((item) => !item.launchedTransaction)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const cardInvoices = cardInvoiceSummaries(data, monthIndex, year);
  const openInvoices = cardInvoices
    .filter((item) => item.total > 0 && item.status !== 'paid')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const categoryStatuses = categoryBudgetStatuses(data, monthIndex, year)
    .sort((a, b) => b.total - a.total);
  const overBudget = categoryStatuses.filter((item) => item.status === 'over');
  const warningBudget = categoryStatuses.filter((item) => item.status === 'warning');
  const goalsCash = allocationCashSummary(data, 'goals');
  const debtsCash = allocationCashSummary(data, 'debts');
  const goalsAllocated = allocationTotalForMonth(data, 'goals', monthIndex, year);
  const debtsAllocated = allocationTotalForMonth(data, 'debts', monthIndex, year);
  const reservedAvailable = goalsCash.available + debtsCash.available;

  const checklist = [
    {
      id: 'fixed',
      label: 'Fixos e assinaturas lancados',
      done: pendingFixed.length === 0,
      detail: pendingFixed.length ? `${pendingFixed.length} pendente(s)` : 'Tudo lancado',
    },
    {
      id: 'cards',
      label: 'Faturas conferidas',
      done: openInvoices.length === 0,
      detail: openInvoices.length ? `${openInvoices.length} aberta(s) ou divergente(s)` : 'Faturas em dia',
    },
    {
      id: 'budgets',
      label: 'Alvos por categoria revisados',
      done: overBudget.length === 0,
      detail: overBudget.length ? `${overBudget.length} acima do alvo` : 'Nenhum alvo estourado',
    },
    {
      id: 'reserved',
      label: 'Caixa de metas e dividas distribuido',
      done: reservedAvailable === 0,
      detail: reservedAvailable > 0 ? `${formatCurrency(reservedAvailable)} aguardando destino` : 'Sem caixa pendente',
    },
    {
      id: 'balance',
      label: 'Saldo do mes saudavel',
      done: summary.saldo >= 0,
      detail: summary.saldo >= 0 ? 'Saldo positivo' : 'Mes fechando negativo',
    },
  ];

  return {
    month: closingMonth,
    label: monthLabel(year, monthIndex),
    summary,
    wallet: walletBalance(data),
    fixedRows,
    pendingFixed,
    cardInvoices,
    openInvoices,
    categoryStatuses,
    overBudget,
    warningBudget,
    goalsCash,
    debtsCash,
    goalsAllocated,
    debtsAllocated,
    checklist,
    readyToClose: checklist.every((item) => item.done),
  };
}

export function buildMonthlyClosingSnapshot(data, monthIndex, year, note = '', now = Date.now()) {
  const insights = monthlyClosingInsights(data, monthIndex, year);
  const totalExpenses = insights.summary.despesas + insights.summary.parcelas;

  return {
    id: monthlyClosingId(insights.month),
    month: insights.month,
    receitas: insights.summary.receitas,
    despesas: totalExpenses,
    parcelas: insights.summary.parcelas,
    saldo: insights.summary.saldo,
    carteira: insights.wallet,
    fixedPending: insights.pendingFixed.length,
    openInvoices: insights.openInvoices.length,
    overBudget: insights.overBudget.length,
    warningBudget: insights.warningBudget.length,
    goalsCashAvailable: insights.goalsCash.available,
    debtsCashAvailable: insights.debtsCash.available,
    goalsAllocated: insights.goalsAllocated,
    debtsAllocated: insights.debtsAllocated,
    checklist: insights.checklist,
    categoryAlerts: [...insights.overBudget, ...insights.warningBudget].map((item) => ({
      categoryId: item.category.id,
      name: item.category.name,
      total: item.total,
      target: item.target,
      percent: item.percent,
      status: item.status,
    })),
    cardInvoices: insights.cardInvoices
      .filter((item) => item.total > 0)
      .map((item) => ({
        cardId: item.card.id,
        name: item.card.name,
        total: item.total,
        dueDate: item.dueDate,
        status: item.status,
      })),
    note: note.trim(),
    status: insights.readyToClose ? 'ok' : 'attention',
    closedAt: now,
    updatedAt: now,
  };
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
  const fixedMonth = monthKeyFromParts(year, monthIndex);
  const fixedRows = fixedItemsForMonth(data.fixedItems || [], monthIndex, year);
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

  rows.push([]);
  rows.push(['FIXOS E ASSINATURAS']);
  rows.push(['Vencimento', 'Nome', 'Tipo', 'Categoria', 'Pagamento', 'Status', 'Valor']);
  fixedRows.forEach((item) => {
    const category = getCategory(data.categories, item.category);
    const launched = transactionForFixedItemMonth(data.transactions, item.id, fixedMonth);
    rows.push([
      item.dueDate || '',
      item.name || '',
      item.kind === 'assinatura' ? 'Assinatura' : 'Fixo',
      category.name,
      item.payment || '-',
      launched ? 'Lancado' : 'Pendente',
      formatCsvCurrency(item.amount),
    ]);
  });

  rows.push([]);
  rows.push(['ALVOS POR CATEGORIA']);
  rows.push(['Categoria', 'Gasto', 'Alvo', 'Percentual']);
  categorySpendingForMonth(data, monthIndex, year)
    .filter((item) => item.total > 0 || categoryBudgetForMonth(data.categoryBudgets || [], item.category.id, fixedMonth))
    .forEach((item) => {
      const budget = categoryBudgetForMonth(data.categoryBudgets || [], item.category.id, fixedMonth);
      const amount = Number(budget?.amount || 0);
      const percent = amount > 0 ? (item.total / amount) * 100 : 0;
      rows.push([
        item.category.name,
        formatCsvCurrency(item.total),
        amount ? formatCsvCurrency(amount) : '',
        amount ? `${percent.toFixed(0)}%` : '',
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

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function allocationTotalForMonth(data, type, monthIndex, year) {
  return allocationsForType(data, type)
    .filter((item) => isSameMonth(item.date, monthIndex, year))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}
