import { CategoryBars, EmptyState, StatCard } from '../components/ui.jsx';
import { TransactionForm } from '../components/transactions/TransactionForm.jsx';
import { TransactionList } from '../components/transactions/TransactionList.jsx';
import {
  fixedItemsForMonth,
  formatCurrency,
  summarizeMonth,
  transactionForFixedItemMonth,
  walletBalance,
} from '../utils/finance.js';

export function DashboardPage({ data, actions, paymentMethods, currentMonth, currentYear, setPage }) {
  const summary = summarizeMonth(data, currentMonth, currentYear);
  const balance = walletBalance(data);
  const recent = [...summary.monthTransactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  const fixedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const fixedRows = fixedItemsForMonth(data.fixedItems, currentMonth, currentYear)
    .map((item) => ({
      ...item,
      launchedTransaction: transactionForFixedItemMonth(data.transactions, item.id, fixedMonth),
    }));
  const pendingFixed = fixedRows
    .filter((item) => !item.launchedTransaction)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const categoryTotals = data.categories.map((category) => ({
    category,
    total: summary.monthTransactions
      .filter((item) => item.type === 'despesa' && item.category === category.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="content-grid">
      <section className="stat-grid">
        <StatCard label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(summary.despesas + summary.parcelas)} tone="negative" />
        <StatCard label="Saldo do mes" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Carteira" value={formatCurrency(balance)} tone="info" />
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Lancar transacao</h2>
            <p>Receitas, despesas variaveis e compras no cartao. Fixos e assinaturas ficam na fila propria.</p>
          </div>
        </div>
        <TransactionForm actions={actions} categories={data.categories} cards={data.cards} paymentMethods={paymentMethods} compact />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recentes</h2>
            <p>{summary.transactionCount} lancamentos no mes.</p>
          </div>
          <button className="text-button" onClick={() => setPage('transactions')} type="button">Ver tudo</button>
        </div>
        <TransactionList data={data} items={recent} actions={actions} compact />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Fixos e assinaturas</h2>
            <p>{pendingFixed.length} pendentes no mes.</p>
          </div>
          <button className="text-button" onClick={() => setPage('fixed')} type="button">Ver fila</button>
        </div>
        <div className="list">
          {pendingFixed.slice(0, 5).map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.dueDate} · {item.kind === 'assinatura' ? 'Assinatura' : 'Fixo'}</span>
              </div>
              <strong className="money-negative">{formatCurrency(item.amount)}</strong>
            </div>
          ))}
          {!pendingFixed.length && <EmptyState title="Nada pendente em fixos e assinaturas." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Gastos por categoria</h2>
            <p>Top categorias do mes atual.</p>
          </div>
        </div>
        <CategoryBars items={categoryTotals} total={summary.despesas || 1} />
      </section>
    </div>
  );
}
