import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  Info,
  Plus,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';
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
  const totalExpenses = summary.despesas + summary.parcelas;
  const expenseRatio = summary.receitas > 0 ? Math.min(999, (totalExpenses / summary.receitas) * 100) : 0;
  const monthName = MONTHS[currentMonth];
  const hasHighAlert = alerts.some((item) => item.severity === 'high');
  const dashboardTone = hasHighAlert ? 'warning' : summary.saldo >= 0 ? 'positive' : 'negative';
  const heroTitle = hasHighAlert
    ? 'Atencao no mes'
    : summary.saldo >= 0
      ? 'Mes no azul'
      : 'Mes pede atencao';

  useEffect(() => {
    setSelectedChartMonth(currentMonth);
  }, [currentMonth, currentYear]);

  return (
    <div className="content-grid dashboard-grid">
      <section className={`dashboard-hero span-2 ${dashboardTone}`}>
        <div className="dashboard-hero-copy">
          <span className="eyebrow">{monthName} {currentYear}</span>
          <h2>{heroTitle}</h2>
          <p>
            {formatCurrency(summary.saldo)} de saldo no mes, com {formatCurrency(balance)} em carteira
            {alerts.length ? ` e ${alerts.length} ponto(s) para acompanhar.` : '.'}
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <span className={`pill ${hasHighAlert ? 'warning' : summary.saldo >= 0 ? 'positive' : 'muted'}`}>
            {hasHighAlert ? 'Prioridade alta' : summary.saldo >= 0 ? 'Saudavel' : 'Revisar'}
          </span>
          <button className="primary-button" onClick={() => setQuickEntryOpen(true)} type="button">
            <Plus size={17} /> Lancar
          </button>
        </div>
        <div className="dashboard-metrics">
          <DashboardMetric icon={ArrowUpRight} label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
          <DashboardMetric icon={ArrowDownRight} label="Despesas" value={formatCurrency(totalExpenses)} tone="negative" />
          <DashboardMetric icon={TrendingUp} label="Saldo" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
          <DashboardMetric icon={WalletCards} label="Carteira" value={formatCurrency(balance)} tone="info" />
        </div>
      </section>

      <section className="panel span-2 dashboard-year-panel">
        <div className="panel-header">
          <div>
            <h2>Receitas x despesas em {currentYear}</h2>
            <p>Comparativo de 6 meses com parcelas consideradas nas despesas.</p>
          </div>
          <div className="dashboard-ratio">
            <span>Uso da renda</span>
            <strong>{expenseRatio.toFixed(0)}%</strong>
          </div>
        </div>
        <AnnualBars
          currentMonth={currentMonth}
          items={yearlyTotals}
          onSelect={setSelectedChartMonth}
          selectedMonth={selectedChartMonth}
        />
      </section>

      <section className="panel span-2 dashboard-category-overview">
        <div className="panel-header">
          <div>
            <h2>Despesas por categoria</h2>
            <p>Tabela e distribuicao do mes atual no mesmo lugar.</p>
          </div>
          <span className="pill muted">{categoryTotals.length} categoria(s)</span>
        </div>
        <CategoryOverview items={categoryTotals} total={categoryTotal} />
      </section>

      <section className="panel dashboard-list-panel">
        <div className="panel-header">
          <div>
            <h2>Recentes</h2>
            <p>{ledgerEntries.length} movimentos no mes, incluindo parcelas.</p>
          </div>
          <button className="text-button" onClick={() => setPage('transactions')} type="button">Ver tudo</button>
        </div>
        <TransactionList data={data} items={recent} actions={actions} compact />
      </section>

      <section className="panel dashboard-list-panel">
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
              <CalendarCheck size={18} />
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.dueDate} · {item.kind === 'subscription' || item.kind === 'assinatura' ? 'Assinatura' : 'Fixo'}</span>
              </div>
              <strong className="money-negative">{formatCurrency(item.amount)}</strong>
            </div>
          ))}
          {!pendingFixed.length && <EmptyState title="Nada pendente em fixos e assinaturas." />}
        </div>
      </section>

      <section className="panel dashboard-projection-panel">
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

      <section className="panel dashboard-alert-panel">
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

function DashboardMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className={`dashboard-metric ${tone}`}>
      <div className="dashboard-metric-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
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
  const visibleItems = sixMonthWindow(items, currentMonth);
  const maxValue = Math.max(...visibleItems.flatMap((item) => [item.receitas, item.despesas]), 1);
  const selected = visibleItems.find((item) => item.monthIndex === selectedMonth)
    || visibleItems.find((item) => item.monthIndex === currentMonth)
    || visibleItems.at(-1);
  const activeMonth = selected.monthIndex;
  const axisMax = niceAxisMax(maxValue);
  const axisLabels = [axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0];

  return (
    <div className="annual-chart annual-chart-clean">
      <div className="annual-compact">
        <div className="annual-axis" aria-hidden="true">
          {axisLabels.map((value) => <span key={value}>{shortCurrency(value)}</span>)}
        </div>
        <div className="annual-plot">
          <div className="annual-grid-lines" aria-hidden="true">
            {axisLabels.map((value) => <span key={value} />)}
          </div>
          <div className="annual-groups">
            {visibleItems.map((item, index) => {
              const isActive = item.monthIndex === activeMonth;
              const edge = index <= 1 ? 'edge-start' : index >= visibleItems.length - 2 ? 'edge-end' : '';
              return (
                <button
                  aria-label={`${MONTHS[item.monthIndex]}: receitas ${formatCurrency(item.receitas)}, despesas ${formatCurrency(item.despesas)}`}
                  className={`annual-group ${isActive ? 'active' : ''} ${edge} ${item.monthIndex === currentMonth ? 'current' : ''}`}
                  key={item.monthIndex}
                  onClick={() => onSelect(item.monthIndex)}
                  title={`${MONTHS[item.monthIndex]}: receitas ${formatCurrency(item.receitas)} · despesas ${formatCurrency(item.despesas)}`}
                  type="button"
                >
                  {isActive && (
                    <div className="annual-tooltip">
                      <strong className="annual-tooltip-month">{MONTHS[item.monthIndex]}</strong>
                      <div className="annual-tooltip-row">
                        <span><i className="legend-dot income" />Receita</span>
                        <strong>{formatCurrency(item.receitas)}</strong>
                      </div>
                      <div className="annual-tooltip-row">
                        <span><i className="legend-dot expense" />Despesa</span>
                        <strong>{formatCurrency(item.despesas)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="annual-bar-pair">
                    <span className="annual-bar income" style={{ height: `${barHeight(item.receitas, axisMax)}%` }} />
                    <span className="annual-bar expense" style={{ height: `${barHeight(item.despesas, axisMax)}%` }} />
                  </div>
                  <strong>{MONTHS[item.monthIndex].slice(0, 3)}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="annual-footer">
        <div className="chart-legend">
          <span><i className="legend-dot income" /> Receita</span>
          <span><i className="legend-dot expense" /> Despesa</span>
        </div>
        <div className={`annual-selected-chip ${selected.saldo >= 0 ? 'positive' : 'negative'}`}>
          <span>Saldo em {MONTHS[selected.monthIndex].slice(0, 3)}</span>
          <strong>{formatCurrency(selected.saldo)}</strong>
        </div>
      </div>
    </div>
  );
}

function CategoryOverview({ items, total }) {
  if (!items.length || !total) return <EmptyState title="Sem gastos categorizados neste mes." />;

  return (
    <div className="category-overview">
      <div className="category-table">
        {items.slice(0, 7).map(({ category, total: value }) => {
          const percent = (value / total) * 100;
          return (
            <div className="category-table-row" key={category.id}>
              <div className="category-table-main">
                <span className="category-dot" style={{ background: category.color }} />
                <strong>{category.name}</strong>
                <small>{percent.toFixed(0)}%</small>
              </div>
              <div className="category-table-value">
                <strong>{formatCurrency(value)}</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${Math.min(100, percent)}%`, background: category.color }} />
              </div>
            </div>
          );
        })}
      </div>
      <CategoryDonut items={items} total={total} />
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
  if (!value) return 0;
  return Math.max(7, (value / maxValue) * 100);
}

function niceAxisMax(value) {
  const amount = Math.max(1, Number(value || 0));
  const magnitude = 10 ** Math.floor(Math.log10(amount));
  const normalized = amount / magnitude;
  const rounded = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return rounded * magnitude;
}

function sixMonthWindow(items, currentMonth) {
  const start = Math.min(Math.max(currentMonth - 5, 0), Math.max(0, items.length - 6));
  return items.slice(start, start + 6);
}

function shortCurrency(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000) return `R$ ${(amount / 1000).toFixed(1).replace('.', ',')}k`;
  return formatCurrency(amount).replace(',00', '');
}
