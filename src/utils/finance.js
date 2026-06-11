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

export function smartCashSummary(data, monthIndex, year) {
  const targetMonth = monthKeyFromParts(year, monthIndex);
  const wallet = walletBalance(data);
  const fixedRows = fixedItemsForMonth(data.fixedItems || [], monthIndex, year)
    .map((item) => ({
      ...item,
      launchedTransaction: transactionForFixedItemMonth(data.transactions || [], item.id, targetMonth),
      cardId: getCardIdFromPayment(item.payment),
    }));
  const pendingFixed = fixedRows.filter((item) => !item.launchedTransaction);
  const pendingFixedTotal = pendingFixed.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCashFixedTotal = pendingFixed
    .filter((item) => !item.cardId)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCardFixedTotal = pendingFixedTotal - pendingCashFixedTotal;
  const invoices = cardInvoiceSummaries(data, monthIndex, year);
  const openInvoices = invoices.filter((item) => item.total > 0 && item.status !== 'paid');
  const openInvoiceTotal = openInvoices.reduce((sum, item) => sum + Math.max(0, Number(item.remaining ?? item.total ?? 0)), 0);
  const goalsCash = allocationCashSummary(data, 'goals');
  const debtsCash = allocationCashSummary(data, 'debts');
  const reservedTotal = goalsCash.sourceTotal + debtsCash.sourceTotal;
  const reservedAllocated = goalsCash.allocatedTotal + debtsCash.allocatedTotal;
  const reservedAvailable = goalsCash.available + debtsCash.available;
  const committedTotal = openInvoiceTotal + pendingFixedTotal;
  const freeEstimated = wallet - committedTotal;

  return {
    month: targetMonth,
    wallet,
    committedTotal,
    freeEstimated,
    openInvoiceTotal,
    pendingFixedTotal,
    pendingCashFixedTotal,
    pendingCardFixedTotal,
    reservedTotal,
    reservedAllocated,
    reservedAvailable,
    goalsCash,
    debtsCash,
    openInvoices,
    pendingFixed,
    fixedRows,
    invoices,
    status: freeEstimated < 0 ? 'negative' : committedTotal > 0 ? 'attention' : 'free',
  };
}

export function monthlyProjection(data, monthIndex, year, referenceDate = new Date()) {
  const summary = summarizeMonth(data, monthIndex, year);
  const cash = smartCashSummary(data, monthIndex, year);
  const variableEntries = variableExpenseEntriesForProjection(data, monthIndex, year);
  const variableSpent = variableEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDays = daysInMonth(year, monthIndex);
  const elapsedDays = elapsedDaysInMonth(year, monthIndex, referenceDate);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const averageDailyVariable = elapsedDays > 0 ? variableSpent / elapsedDays : 0;
  const projectedVariableTotal = elapsedDays > 0
    ? Math.max(variableSpent, averageDailyVariable * totalDays)
    : variableSpent;
  const projectedVariableRemaining = Math.max(0, projectedVariableTotal - variableSpent);
  const actualExpenses = summary.despesas + summary.parcelas;
  const committedRecordedExpenses = Math.max(0, actualExpenses - variableSpent);
  const projectedExpenses = committedRecordedExpenses + projectedVariableTotal + cash.pendingFixedTotal;
  const projectedResult = summary.receitas - projectedExpenses;
  const projectedCashEnd = cash.freeEstimated - projectedVariableRemaining;

  return {
    month: monthKeyFromParts(year, monthIndex),
    totalDays,
    elapsedDays,
    remainingDays,
    actualIncome: summary.receitas,
    actualExpenses,
    variableSpent,
    variableEntryCount: variableEntries.length,
    averageDailyVariable,
    projectedVariableTotal,
    projectedVariableRemaining,
    pendingFixedTotal: cash.pendingFixedTotal,
    openInvoiceTotal: cash.openInvoiceTotal,
    projectedExpenses,
    projectedResult,
    projectedCashEnd,
    confidence: elapsedDays >= 10 ? 'alta' : elapsedDays >= 5 ? 'media' : 'baixa',
    status: projectedCashEnd < 0 ? 'risk' : projectedResult < 0 ? 'attention' : 'ok',
  };
}

export function financeAlerts(data, monthIndex, year, referenceDate = new Date()) {
  const reference = normalizeDate(referenceDate);
  const projection = monthlyProjection(data, monthIndex, year, reference);
  const cash = smartCashSummary(data, monthIndex, year);
  const categoryStatuses = categoryBudgetStatuses(data, monthIndex, year);
  const alerts = [];

  cash.pendingFixed.forEach((item) => {
    const daysUntil = daysBetween(item.dueDate, reference);
    alerts.push({
      id: `fixed_${item.id}`,
      type: 'fixed',
      severity: daysUntil < 0 ? 'high' : daysUntil <= 3 ? 'medium' : 'low',
      title: item.name,
      detail: `${item.kind === 'assinatura' ? 'Assinatura' : 'Fixo'} pendente`,
      amount: Number(item.amount || 0),
      dueDate: item.dueDate,
      daysUntil,
      page: 'fixed',
    });
  });

  cash.openInvoices.forEach((item) => {
    const daysUntil = daysBetween(item.dueDate, reference);
    const needsReview = ['divergent', 'overpaid'].includes(item.status);
    const detail = item.status === 'partial'
      ? 'Fatura com pagamento parcial'
      : needsReview
        ? 'Fatura com pagamento divergente'
        : 'Fatura aberta';
    alerts.push({
      id: `invoice_${item.invoiceKey}`,
      type: 'invoice',
      severity: needsReview || daysUntil < 0 ? 'high' : daysUntil <= 5 ? 'medium' : 'low',
      title: item.card.name,
      detail,
      amount: needsReview ? Math.abs(Number(item.difference || 0)) : Math.max(0, Number(item.remaining ?? item.total ?? 0)),
      dueDate: item.dueDate,
      daysUntil,
      page: 'cards',
    });
  });

  categoryStatuses
    .filter((item) => ['over', 'warning'].includes(item.status))
    .forEach((item) => {
      alerts.push({
        id: `budget_${item.category.id}`,
        type: 'budget',
        severity: item.status === 'over' ? 'high' : 'medium',
        title: item.category.name,
        detail: item.status === 'over' ? 'Categoria acima do alvo' : 'Categoria perto do alvo',
        amount: Number(item.total || 0),
        target: item.target,
        percent: item.percent,
        page: 'categories',
      });
    });

  if (projection.projectedCashEnd < 0) {
    alerts.push({
      id: 'projection_cash',
      type: 'projection',
      severity: 'high',
      title: 'Caixa projetado negativo',
      detail: 'O mes tende a fechar com falta de caixa livre',
      amount: Math.abs(projection.projectedCashEnd),
      page: 'wallet',
    });
  } else if (projection.projectedResult < 0) {
    alerts.push({
      id: 'projection_result',
      type: 'projection',
      severity: 'medium',
      title: 'Resultado projetado negativo',
      detail: 'As despesas projetadas passam as receitas atuais',
      amount: Math.abs(projection.projectedResult),
      page: 'dashboard',
    });
  }

  if (cash.reservedAvailable > 0) {
    alerts.push({
      id: 'reserved_available',
      type: 'reserved',
      severity: 'low',
      title: 'Caixa reservado sem destino',
      detail: 'Metas ou dividas ainda tem valor para distribuir',
      amount: cash.reservedAvailable,
      page: 'goals',
    });
  }

  return alerts.sort((a, b) => (
    severityRank(b.severity) - severityRank(a.severity)
    || Number(a.daysUntil ?? 999) - Number(b.daysUntil ?? 999)
    || String(a.title).localeCompare(String(b.title))
  ));
}

export function dataHealthInsights(data, monthIndex, year, referenceDate = new Date()) {
  const closingMonth = monthKeyFromParts(year, monthIndex);
  const cash = smartCashSummary(data, monthIndex, year);
  const categoryStatuses = categoryBudgetStatuses(data, monthIndex, year);
  const duplicateGroups = possibleDuplicateTransactions(data.transactions || []);
  const invalidCategoryTransactions = transactionsWithInvalidCategory(data.transactions || [], data.categories || []);
  const invalidTransactionRows = invalidTransactions(data.transactions || []);
  const missingWalletRows = transactionsMissingWallet(data.transactions || [], data.wallet || []);
  const orphanWalletRows = orphanWalletEntries(data.transactions || [], data.wallet || []);
  const missingClosingMonths = previousActiveMonthsWithoutClosing(data, closingMonth, referenceDate);
  const openInvoices = cash.openInvoices.filter((item) => ['open', 'partial'].includes(item.status));
  const divergentInvoices = cash.openInvoices.filter((item) => ['divergent', 'overpaid'].includes(item.status));
  const overBudget = categoryStatuses.filter((item) => item.status === 'over');
  const warningBudget = categoryStatuses.filter((item) => item.status === 'warning');
  const checks = [
    buildHealthCheck({
      id: 'duplicates',
      title: 'Possiveis duplicadas',
      description: 'Transacoes com mesma data, descricao, tipo e valor.',
      severity: duplicateGroups.length ? 'medium' : 'ok',
      count: duplicateGroups.reduce((sum, group) => sum + group.items.length - 1, 0),
      amount: duplicateGroups.reduce((sum, group) => sum + group.amount, 0),
      page: 'transactions',
      details: duplicateGroups.slice(0, 3).map((group) => `${group.items[0].date} - ${group.items[0].desc} (${group.items.length}x)`),
    }),
    buildHealthCheck({
      id: 'invalid-categories',
      title: 'Categorias para revisar',
      description: 'Transacoes sem categoria valida no cadastro atual.',
      severity: invalidCategoryTransactions.length ? 'medium' : 'ok',
      count: invalidCategoryTransactions.length,
      amount: invalidCategoryTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      page: 'transactions',
      details: invalidCategoryTransactions.slice(0, 3).map((item) => `${item.date || 'sem data'} - ${item.desc || 'sem descricao'}`),
    }),
    buildHealthCheck({
      id: 'invalid-transactions',
      title: 'Lancamentos incompletos',
      description: 'Transacoes com data, descricao ou valor invalido.',
      severity: invalidTransactionRows.length ? 'high' : 'ok',
      count: invalidTransactionRows.length,
      page: 'transactions',
      details: invalidTransactionRows.slice(0, 3).map((item) => item.desc || item.id),
    }),
    buildHealthCheck({
      id: 'pending-fixed',
      title: 'Fixos e assinaturas pendentes',
      description: 'Compromissos do mes ainda nao lancados.',
      severity: cash.pendingFixed.length ? 'high' : 'ok',
      count: cash.pendingFixed.length,
      amount: cash.pendingFixedTotal,
      page: 'fixed',
      details: cash.pendingFixed.slice(0, 3).map((item) => `${item.dueDate} - ${item.name}`),
    }),
    buildHealthCheck({
      id: 'open-invoices',
      title: 'Faturas abertas ou parciais',
      description: 'Cartoes com fatura do mes ainda sem pagamento completo.',
      severity: openInvoices.length ? 'medium' : 'ok',
      count: openInvoices.length,
      amount: openInvoices.reduce((sum, item) => sum + Math.max(0, Number(item.remaining ?? item.total ?? 0)), 0),
      page: 'cards',
      details: openInvoices.slice(0, 3).map((item) => `${item.card.name} - restante ${formatCurrency(item.remaining ?? item.total)}`),
    }),
    buildHealthCheck({
      id: 'divergent-invoices',
      title: 'Faturas divergentes',
      description: 'Pagamentos de fatura com valor diferente do total calculado.',
      severity: divergentInvoices.length ? 'high' : 'ok',
      count: divergentInvoices.length,
      amount: divergentInvoices.reduce((sum, item) => sum + Math.abs(Number(item.difference || 0)), 0),
      page: 'cards',
      details: divergentInvoices.slice(0, 3).map((item) => `${item.card.name} - diferenca ${formatCurrency(Math.abs(Number(item.difference || 0)))}`),
    }),
    buildHealthCheck({
      id: 'budgets',
      title: 'Alvos de categoria',
      description: 'Categorias perto ou acima do alvo do mes.',
      severity: overBudget.length ? 'high' : warningBudget.length ? 'medium' : 'ok',
      count: overBudget.length + warningBudget.length,
      amount: [...overBudget, ...warningBudget].reduce((sum, item) => sum + Number(item.total || 0), 0),
      page: 'categories',
      details: [...overBudget, ...warningBudget].slice(0, 3).map((item) => `${item.category.name} - ${item.percent.toFixed(0)}%`),
    }),
    buildHealthCheck({
      id: 'reserved-cash',
      title: 'Caixa reservado sem destino',
      description: 'Valores de metas ou dividas ainda nao distribuidos.',
      severity: cash.reservedAvailable > 0 ? 'low' : 'ok',
      count: cash.reservedAvailable > 0 ? 1 : 0,
      amount: cash.reservedAvailable,
      page: 'goals',
      details: cash.reservedAvailable > 0 ? [`${formatCurrency(cash.reservedAvailable)} aguardando distribuicao`] : [],
    }),
    buildHealthCheck({
      id: 'missing-closings',
      title: 'Meses sem fechamento',
      description: 'Meses anteriores com movimento e sem fechamento salvo.',
      severity: missingClosingMonths.length ? 'medium' : 'ok',
      count: missingClosingMonths.length,
      page: 'closing',
      details: missingClosingMonths.slice(0, 4).map((item) => monthLabelFromKey(item)),
    }),
    buildHealthCheck({
      id: 'wallet-links',
      title: 'Carteira sincronizada',
      description: 'Entradas e saidas ligadas a transacoes variaveis.',
      severity: missingWalletRows.length || orphanWalletRows.length ? 'medium' : 'ok',
      count: missingWalletRows.length + orphanWalletRows.length,
      page: 'wallet',
      details: [
        ...missingWalletRows.slice(0, 2).map((item) => `Sem carteira: ${item.desc}`),
        ...orphanWalletRows.slice(0, 2).map((item) => `Sem transacao: ${item.desc}`),
      ],
    }),
  ];

  const problemChecks = checks.filter((item) => item.severity !== 'ok');
  const status = problemChecks.some((item) => item.severity === 'high')
    ? 'risk'
    : problemChecks.length
      ? 'attention'
      : 'ok';

  return {
    status,
    month: closingMonth,
    totalChecks: checks.length,
    issueCount: problemChecks.reduce((sum, item) => sum + item.count, 0),
    highCount: problemChecks.filter((item) => item.severity === 'high').length,
    mediumCount: problemChecks.filter((item) => item.severity === 'medium').length,
    lowCount: problemChecks.filter((item) => item.severity === 'low').length,
    checks,
    problemChecks,
  };
}

export function findAutomationRule(rules, description) {
  const text = normalizeText(description);
  if (!text) return null;

  return [...(rules || [])]
    .filter((rule) => rule.active !== false)
    .filter((rule) => normalizeText(rule.matchText))
    .sort((a, b) => (
      normalizeText(b.matchText).length - normalizeText(a.matchText).length
      || Number(a.createdAt || 0) - Number(b.createdAt || 0)
    ))
    .find((rule) => text.includes(normalizeText(rule.matchText))) || null;
}

function buildHealthCheck({ id, title, description, severity, count = 0, amount = 0, page, details = [] }) {
  return {
    id,
    title,
    description,
    severity,
    count,
    amount,
    page,
    details,
    ok: severity === 'ok',
  };
}

function possibleDuplicateTransactions(transactions) {
  const groups = new Map();

  transactions.forEach((item) => {
    const key = [
      item.date || '',
      normalizeText(item.desc),
      item.type || '',
      Number(item.amount || 0).toFixed(2),
    ].join('|');
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  return [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => ({
      key: items[0].id,
      items,
      amount: Number(items[0].amount || 0) * (items.length - 1),
    }));
}

function transactionsWithInvalidCategory(transactions, categories) {
  const categoryIds = new Set(categories.map((item) => item.id));
  return transactions.filter((item) => !item.category || !categoryIds.has(item.category));
}

function invalidTransactions(transactions) {
  return transactions.filter((item) => (
    !['receita', 'despesa'].includes(item.type)
    || !item.desc
    || !item.date
    || !Number.isFinite(Number(item.amount))
    || Number(item.amount) <= 0
  ));
}

function transactionsMissingWallet(transactions, wallet) {
  const walletIds = new Set(wallet.map((item) => item.id));
  return transactions
    .filter((item) => walletEntryForTransaction(item))
    .filter((item) => !walletIds.has(item.walletEntryId || `wallet_tx_${item.id}`));
}

function orphanWalletEntries(transactions, wallet) {
  const transactionIds = new Set(transactions.map((item) => item.id));
  return wallet.filter((item) => item.source === 'transaction' && item.transactionId && !transactionIds.has(item.transactionId));
}

function previousActiveMonthsWithoutClosing(data, currentMonthKey, referenceDate) {
  const closingMonths = new Set((data.monthlyClosings || []).map((item) => item.month));
  const months = previousMonthKeys(currentMonthKey, 6, referenceDate);

  return months.filter((key) => {
    if (closingMonths.has(key)) return false;
    const { year, monthIndex } = monthPartsFromKey(key);
    const summary = summarizeMonth(data, monthIndex, year);
    const fixedRows = fixedItemsForMonth(data.fixedItems || [], monthIndex, year);
    return summary.transactionCount > 0 || summary.installments.length > 0 || fixedRows.length > 0;
  });
}

function previousMonthKeys(currentMonthKey, count, referenceDate) {
  const { year, monthIndex } = monthPartsFromKey(currentMonthKey || monthKey(referenceDate));
  const date = new Date(year, monthIndex, 1, 12);
  const keys = [];

  for (let index = 1; index <= count; index += 1) {
    date.setMonth(date.getMonth() - 1);
    keys.push(monthKey(date));
  }

  return keys;
}

export function applyAutomationRule(transaction, rule) {
  if (!rule) return transaction;

  return {
    ...transaction,
    type: rule.type || transaction.type,
    category: rule.category || transaction.category,
    payment: rule.payment || transaction.payment,
    necessity: rule.necessity || transaction.necessity,
  };
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
    const paidEntries = invoicePaymentEntries(data.wallet || [], invoiceKey);
    const paidTotal = paidEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const difference = paidTotal - total;
    const remaining = Math.max(0, total - paidTotal);
    const paidEntry = paidEntries[0] || null;
    const paymentMatchesInvoice = total > 0 && Math.abs(difference) < 0.01;
    let status = 'empty';
    if (total <= 0 && paidTotal > 0) status = 'overpaid';
    else if (total > 0 && paymentMatchesInvoice) status = 'paid';
    else if (total > 0 && paidTotal <= 0) status = 'open';
    else if (total > 0 && paidTotal < total) status = 'partial';
    else if (total > 0 && paidTotal > total) status = 'overpaid';

    return {
      card,
      direct,
      installments,
      total,
      paidTotal,
      remaining,
      difference,
      dueDate: getInvoiceDueDate(card, invoiceMonth),
      invoiceKey,
      paidEntry,
      paidEntries,
      paymentMatchesInvoice,
      status,
    };
  });
}

export function invoicePaymentEntries(wallet = [], invoiceKey) {
  return (wallet || [])
    .filter((item) => item.source === 'invoice' && item.invoiceKey === invoiceKey)
    .sort((a, b) => (
      (b.date || '').localeCompare(a.date || '')
      || Number(b.createdAt || 0) - Number(a.createdAt || 0)
      || String(b.id || '').localeCompare(String(a.id || ''))
    ));
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
      detail: openInvoices.length ? `${openInvoices.length} aberta(s), parcial(is) ou divergente(s)` : 'Faturas em dia',
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
        paidTotal: item.paidTotal,
        remaining: item.remaining,
        difference: item.difference,
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

export function invoicePaymentEntry(card, invoiceMonth, amount, id = '') {
  return {
    id: id || `wallet_invoice_${card.id}_${invoiceMonth}`,
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

function elapsedDaysInMonth(year, monthIndex, referenceDate) {
  const reference = normalizeDate(referenceDate);
  const targetMonth = monthKeyFromParts(year, monthIndex);
  const referenceMonth = monthKey(reference);
  const totalDays = daysInMonth(year, monthIndex);

  if (targetMonth < referenceMonth) return totalDays;
  if (targetMonth > referenceMonth) return 0;
  return Math.min(Math.max(reference.getDate(), 1), totalDays);
}

function normalizeDate(date) {
  return typeof date === 'string' ? new Date(`${date}T12:00:00`) : date;
}

function daysBetween(date, referenceDate) {
  if (!date) return 999;
  const target = normalizeDate(date);
  const reference = normalizeDate(referenceDate);
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12);
  const startReference = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12);
  return Math.round((startTarget - startReference) / 86400000);
}

function severityRank(severity) {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

export function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function variableExpenseEntriesForProjection(data, monthIndex, year) {
  return monthlyLedgerEntries(data, monthIndex, year)
    .filter((item) => item.type === 'despesa')
    .filter((item) => !['fixed-item', 'installment'].includes(item.source))
    .filter((item) => !['fixo', 'assinatura', 'parcelamento'].includes(item.nature))
    .filter((item) => !getCategory(data.categories || [], item.category).special);
}

function allocationTotalForMonth(data, type, monthIndex, year) {
  return allocationsForType(data, type)
    .filter((item) => isSameMonth(item.date, monthIndex, year))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}
