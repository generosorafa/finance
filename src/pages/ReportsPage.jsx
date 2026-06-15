import { ClipboardCheck, Download, FileText, History } from 'lucide-react';
import { EmptyState, StatCard } from '../components/ui.jsx';
import { downloadText } from '../utils/download.js';
import {
  exportFinanceCsv,
  exportMonthlyReportHtml,
  formatCurrency,
  monthLabelFromKey,
  monthlyClosingId,
  monthlyClosingInsights,
} from '../utils/finance.js';

export function ReportsPage({ data, currentMonth, currentYear, setPage }) {
  const insights = monthlyClosingInsights(data, currentMonth, currentYear);
  const closing = (data.monthlyClosings || []).find((item) => item.id === monthlyClosingId(insights.month));
  const closedMonths = [...(data.monthlyClosings || [])]
    .sort((a, b) => (b.month || '').localeCompare(a.month || ''))
    .slice(0, 6);

  function downloadCsv() {
    const csv = exportFinanceCsv(data, currentMonth, currentYear);
    downloadText(`finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  function downloadReport() {
    const html = exportMonthlyReportHtml(data, currentMonth, currentYear, closing);
    downloadText(`relatorio-finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.html`, html, 'text/html;charset=utf-8');
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Exportacao CSV</h2>
            <p>Planilha com resumo, fechamento, pendencias, transacoes, faturas, fixos e alvos.</p>
          </div>
        </div>
        <button className="primary-button" onClick={downloadCsv} type="button"><Download size={17} /> Baixar CSV</button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Relatorio mensal</h2>
            <p>HTML pronto para imprimir ou salvar como PDF, usando o fechamento do mes.</p>
          </div>
        </div>
        <button className="secondary-button" onClick={downloadReport} type="button"><FileText size={17} /> Baixar relatorio</button>
      </section>

      <section className="stat-grid span-2">
        <StatCard label="Receitas" value={formatCurrency(insights.summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(insights.totalExpenses)} tone="negative" />
        <StatCard label="Prontidao" value={`${insights.readyScore}%`} tone={insights.readyScore === 100 ? 'positive' : 'info'} />
        <StatCard label="Pontos de atencao" value={String(insights.issueCount)} tone={insights.issueCount ? 'negative' : 'positive'} />
      </section>

      <section className="panel span-2 report-summary">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Resumo do relatorio</span>
            <h2>{insights.label}</h2>
            <p>{closing ? 'Este mes ja tem fechamento salvo.' : insights.readyToClose ? 'O mes esta pronto para ser fechado.' : 'Resolva os pontos abaixo antes de fechar.'}</p>
          </div>
          <span className={`pill ${closing ? 'positive' : insights.readyToClose ? 'warning' : 'muted'}`}>
            {closing ? 'Fechado' : insights.readyToClose ? 'Pronto' : 'Em revisao'}
          </span>
        </div>
        <div className="report-kpi-grid">
          <ReportKpi label="Saldo do mes" value={formatCurrency(insights.summary.saldo)} tone={insights.summary.saldo >= 0 ? 'positive' : 'negative'} />
          <ReportKpi label="Carteira" value={formatCurrency(insights.wallet)} />
          <ReportKpi label="Livre estimado" value={formatCurrency(insights.cashFreeEstimated)} tone={insights.cashFreeEstimated >= 0 ? 'positive' : 'negative'} />
          <ReportKpi label="Faturas restantes" value={formatCurrency(insights.openInvoiceTotal)} tone={insights.openInvoiceTotal > 0 ? 'negative' : 'positive'} />
          <ReportKpi label="Fixos pendentes" value={formatCurrency(insights.pendingFixedTotal)} tone={insights.pendingFixedTotal > 0 ? 'negative' : 'positive'} />
          <ReportKpi label="Caixa sem destino" value={formatCurrency(insights.reservedAvailable)} tone={insights.reservedAvailable > 0 ? 'info' : 'positive'} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pendencias principais</h2>
            <p>Entram no fechamento e no relatorio do mes.</p>
          </div>
          <button className="text-button" onClick={() => setPage('closing')} type="button">Ver fechamento</button>
        </div>
        <div className="list">
          {insights.actionItems.slice(0, 5).map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <strong className={item.severity === 'high' ? 'money-negative' : ''}>{formatCurrency(item.amount)}</strong>
              <button className="text-button" onClick={() => setPage(item.page)} type="button">Abrir</button>
            </div>
          ))}
          {!insights.actionItems.length && <EmptyState title="Nenhuma pendencia para o relatorio deste mes." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Faturas no relatorio</h2>
            <p>Total, pago e restante por cartao.</p>
          </div>
          <button className="text-button" onClick={() => setPage('cards')} type="button">Conferir</button>
        </div>
        <div className="list">
          {insights.cardInvoices.filter((item) => item.total > 0 || item.paidTotal > 0).map((item) => (
            <div className="list-row" key={item.invoiceKey}>
              <div className="row-main">
                <strong>{item.card.name}</strong>
                <span>Total {formatCurrency(item.total)} · pago {formatCurrency(item.paidTotal)} · vence {item.dueDate}</span>
              </div>
              <strong className={item.remaining > 0 ? 'money-negative' : 'money-positive'}>{formatCurrency(item.remaining)}</strong>
            </div>
          ))}
          {!insights.cardInvoices.some((item) => item.total > 0 || item.paidTotal > 0) && <EmptyState title="Nenhuma fatura para este mes." />}
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Historico de fechamentos</h2>
            <p>Ultimos meses salvos para comparar rapidamente.</p>
          </div>
          <History size={18} />
        </div>
        <div className="list">
          {closedMonths.map((item) => (
            <div className="list-row" key={item.id}>
              <ClipboardCheck className={item.status === 'ok' ? 'money-positive' : 'money-negative'} size={18} />
              <div className="row-main">
                <strong>{monthLabelFromKey(item.month)}</strong>
                <span>Prontidao {item.readyScore ?? '-'}% · saldo {formatCurrency(item.saldo)} · carteira {formatCurrency(item.carteira)}</span>
              </div>
              <strong>{formatCurrency(item.despesas)}</strong>
            </div>
          ))}
          {!closedMonths.length && <EmptyState title="Nenhum fechamento salvo ainda." />}
        </div>
      </section>
    </div>
  );
}

function ReportKpi({ label, value, tone = 'info' }) {
  const className = tone === 'positive'
    ? 'money-positive'
    : tone === 'negative'
      ? 'money-negative'
      : '';

  return (
    <div className="report-kpi">
      <span>{label}</span>
      <strong className={className}>{value}</strong>
    </div>
  );
}
