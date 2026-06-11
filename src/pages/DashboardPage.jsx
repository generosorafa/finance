import { useState } from 'react';
import { AlertTriangle, Info, Plus, X } from 'lucide-react';
import { CategoryBars, EmptyState, StatCard } from '../components/ui.jsx';
import { TransactionForm } from '../components/transactions/TransactionForm.jsx';
import { TransactionList } from '../components/transactions/TransactionList.jsx';
import { MONTHS } from '../data/defaults.js';
import {
  categorySpendingForMonth,
  financeAlerts,
  fixedItemsForMonth,
  formatCurrency,
  monthlyProjection,
  monthlyLedgerEntries,
  summarizeMonth,
  transactionForFixedItemMonth,
  walletBalance,
} from '../utils/finance.js';

export function DashboardPage({ data, actions, paymentMethods, currentMonth, currentYear, setPage }) {
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [selectedChartMonth, setSelectedChartMonth] = useState(currentMonth);
  const summary = summarizeMonth(data, currentMonth, currentYear);
  const balance = walletBalance(data);
  const projection = monthlyProjection(data, currentMonth, currentYear);
  const alerts = financeAlerts(data, currentMonth, currentYear);
  const ledgerEntries = monthlyLedgerEntries(data, currentMonth, currentYear);
  const recent = [...ledgerEntries].sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || '')).slice(0, 6);
  const yearlyTotals = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthSummary = summarizeMonth(data, monthIndex, currentYear);
    return {
      monthIndex,
      receitas: monthSummary.receitas,
      despesas: monthSummary.despesas + monthSummary.parcelas,
      saldo: monthSummary.receitas - monthSummary.despesas - monthSummary.parcelas,
    };
  });
  const fixedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const fixedRows = fixedItemsForMonth(data.fixedItems, currentMonth, currentYear)
    .map((item) => ({
      ...item,
      launchedTransaction: transactionForFixedItemMonth(data.transactions, item.id, fixedMonth),
    }));
  const pendingFixed = fixedRows
    .filter((item) => !item.launchedTransaction)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const categoryTotals = categorySpendingForMonth(data, currentMonth, currentYear)
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  const categoryTotal = summary.despesas + summary.parcelas;

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(summary.despesas + summary.parcelas)} tone="negative" />
        <StatCard label="Saldo do mes" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Carteira" value={formatCurrency(balance)} tone="info" />
      </section>

      <div className="dashboard-actions span-2">
        <button className="primary-button" onClick={() => setQuickEntryOpen(true)} type="button">
          <Plus size={17} /> Lancar transacao
        </button>
      </div>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Receitas x despesas em {currentYear}</h2>
            <p>Comparativo mensal com parcelas consideradas nas despesas.</p>
          </div>
        </div>
        <AnnualBars
          currentMonth={currentMonth}
          items={yearlyTotals}
          onSelect={setSelectedChartMonth}
          selectedMonth={selectedChartMonth}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Gastos por categoria</h2>
            <p>Valores e proporcao do mes atual.</p>
          </div>
        </div>
        <CategoryBars items={categoryTotals} total={categoryTotal || 1} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Distribuicao</h2>
            <p>Rosca por categoria no mes.</p>
          </div>
        </div>
        <CategoryDonut items={categoryTotals} total={categoryTotal} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recentes</h2>
            <p>{ledgerEntries.length} movimentos no mes, incluindo parcelas.</p>
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

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Projecao do mes</h2>
            <p>Estimativa com base no ritmo de gastos variaveis e compromissos ainda pendentes.</p>
          </div>
          <span className={`pill ${projection.status === 'risk' ? 'warning' : projection.status === 'attention' ? 'muted' : 'positive'}`}>
            {projection.status === 'risk' ? 'Risco de faltar caixa' : projection.status === 'attention' ? 'Resultado apertado' : 'Caminho saudavel'}
          </span>
        </div>
        <div className="projection-grid">
          <ProjectionCard label="Resultado projetado" value={projection.projectedResult} tone={projection.projectedResult >= 0 ? 'positive' : 'negative'} />
          <ProjectionCard label="Caixa livre final" value={projection.projectedCashEnd} tone={projection.projectedCashEnd >= 0 ? 'positive' : 'negative'} />
          <ProjectionCard label="Ritmo variavel/dia" value={projection.averageDailyVariable} tone="info" />
          <ProjectionCard label="Variavel restante" value={projection.projectedVariableRemaining} tone="negative" />
        </div>
        <div className="projection-meter">
          <div>
            <span>Dia {projection.elapsedDays || 0} de {projection.totalDays}</span>
            <strong>Confianca {projection.confidence}</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${Math.min(100, (projection.elapsedDays / projection.totalDays) * 100)}%` }} />
          </div>
        </div>
        <div className="projection-details">
          <span>Receitas atuais {formatCurrency(projection.actualIncome)}</span>
          <span>Despesas projetadas {formatCurrency(projection.projectedExpenses)}</span>
          <span>Faturas restantes {formatCurrency(projection.openInvoiceTotal)}</span>
          <span>Fixos pendentes {formatCurrency(projection.pendingFixedTotal)}</span>
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Alertas e pendencias</h2>
            <p>Prioridades do mes para evitar sustos no fechamento.</p>
          </div>
          <span className={`pill ${alerts.some((item) => item.severity === 'high') ? 'warning' : alerts.length ? 'muted' : 'positive'}`}>
            {alerts.length ? `${alerts.length} ponto(s)` : 'Tudo certo'}
          </span>
        </div>
        <div className="alert-list">
          {alerts.slice(0, 6).map((item) => (
            <div className={`alert-row ${item.severity}`} key={item.id}>
              {item.severity === 'high' ? <AlertTriangle size={19} /> : <Info size={19} />}
              <div className="row-main">
                <strong>{item.title}</strong>
                <span>{alertDetail(item)}</span>
              </div>
              {!!item.amount && <strong className={item.severity === 'high' ? 'money-negative' : ''}>{formatCurrency(item.amount)}</strong>}
              {item.page !== 'dashboard' && <button className="text-button" onClick={() => setPage(item.page)} type="button">Abrir</button>}
            </div>
          ))}
          {!alerts.length && <EmptyState title="Nenhuma pendencia importante neste mes." />}
        </div>
      </section>

      {quickEntryOpen && (
        <div className="modal-backdrop" onMouseDown={() => setQuickEntryOpen(false)} role="presentation">
          <section className="modal-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="quick-entry-title">
            <div className="panel-header">
              <div>
                <h2 id="quick-entry-title">Lancar transacao</h2>
                <p>Receitas, despesas variaveis e compras no cartao.</p>
              </div>
              <button className="icon-button" onClick={() => setQuickEntryOpen(false)} title="Fechar" type="button">
                <X size={17} />
              </button>
            </div>
            <TransactionForm
              actions={actions}
              automationRules={data.automationRules}
              categories={data.categories}
              cards={data.cards}
              onSaved={() => setQuickEntryOpen(false)}
              paymentMethods={paymentMethods}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function alertDetail(item) {
  const due = item.dueDate ? ` · ${dueLabel(item.daysUntil)}` : '';
  const target = item.target ? ` · alvo ${formatCurrency(item.target)} · ${item.percent.toFixed(0)}%` : '';
  return `${item.detail}${due}${target}`;
}

function dueLabel(daysUntil) {
  if (daysUntil < 0) return `${Math.abs(daysUntil)} dia(s) atrasado`;
  if (daysUntil === 0) return 'vence hoje';
  return `vence em ${daysUntil} dia(s)`;
}

function ProjectionCard({ label, value, tone }) {
  return (
    <div className={`projection-card ${tone}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

function AnnualBars({ currentMonth, items, selectedMonth, onSelect }) {
  const maxValue = Math.max(...items.flatMap((item) => [item.receitas, item.despesas]), 1);
  const selected = items[selectedMonth] || items[currentMonth];

  return (
    <div className="annual-chart">
      <div className="annual-bars">
        {items.map((item) => (
          <button
            className={`month-column ${item.monthIndex === selectedMonth ? 'active' : ''} ${item.monthIndex === currentMonth ? 'current' : ''}`}
            key={item.monthIndex}
            onClick={() => onSelect(item.monthIndex)}
            title={`${MONTHS[item.monthIndex]}: receitas ${formatCurrency(item.receitas)} · despesas ${formatCurrency(item.despesas)}`}
            type="button"
          >
            <div className="bar-pair">
              <span className="year-bar income" style={{ height: `${barHeight(item.receitas, maxValue)}%` }} />
              <span className="year-bar expense" style={{ height: `${barHeight(item.despesas, maxValue)}%` }} />
            </div>
            <strong>{MONTHS[item.monthIndex].slice(0, 3)}</strong>
            <small className="money-positive">{shortCurrency(item.receitas)}</small>
            <small className="money-negative">{shortCurrency(item.despesas)}</small>
          </button>
        ))}
      </div>
      <div className="chart-summary">
        <strong>{MONTHS[selected.monthIndex]}</strong>
        <span>Receitas {formatCurrency(selected.receitas)}</span>
        <span>Despesas {formatCurrency(selected.despesas)}</span>
        <span>Saldo {formatCurrency(selected.saldo)}</span>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot income" /> Receitas</span>
        <span><i className="legend-dot expense" /> Despesas</span>
      </div>
    </div>
  );
}

function CategoryDonut({ items, total }) {
  if (!items.length || !total) return <EmptyState title="Sem gastos para montar a rosca." />;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-layout">
      <div className="donut-chart">
        <svg viewBox="0 0 120 120" role="img" aria-label="Distribuicao de gastos por categoria">
          <circle className="donut-track" cx="60" cy="60" r={radius} />
          {items.map(({ category, total: value }) => {
            const length = (value / total) * circumference;
            const segment = (
              <circle
                className="donut-segment"
                cx="60"
                cy="60"
                key={category.id}
                r={radius}
                stroke={category.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              >
                <title>{category.name}: {formatCurrency(value)}</title>
              </circle>
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="donut-center">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
      <div className="donut-legend">
        {items.map(({ category, total: value }) => (
          <div key={category.id}>
            <span><i style={{ background: category.color }} /> {category.name}</span>
            <strong>{((value / total) * 100).toFixed(0)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function barHeight(value, maxValue) {
  if (!value) return 4;
  return Math.max(8, (value / maxValue) * 100);
}

function shortCurrency(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000) return `R$ ${(amount / 1000).toFixed(1).replace('.', ',')}k`;
  return formatCurrency(amount).replace(',00', '');
}
