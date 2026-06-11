import { Download } from 'lucide-react';
import { StatCard } from '../components/ui.jsx';
import { downloadText } from '../utils/download.js';
import {
  cardInvoiceSummaries,
  categoryBudgetForMonth,
  categorySpendingForMonth,
  exportFinanceCsv,
  fixedItemsForMonth,
  formatCurrency,
  monthKeyFromParts,
  monthLabel,
  summarizeMonth,
  transactionForFixedItemMonth,
} from '../utils/finance.js';

export function ReportsPage({ data, currentMonth, currentYear }) {
  const summary = summarizeMonth(data, currentMonth, currentYear);
  const invoiceMonth = monthKeyFromParts(currentYear, currentMonth);

  function downloadCsv() {
    const csv = exportFinanceCsv(data, currentMonth, currentYear);
    downloadText(`finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  function downloadReport() {
    const fixedRows = fixedItemsForMonth(data.fixedItems || [], currentMonth, currentYear)
      .map((item) => `<li>${item.dueDate} - ${item.name} - ${formatCurrency(item.amount)} (${transactionForFixedItemMonth(data.transactions, item.id, invoiceMonth) ? 'lancado' : 'pendente'})</li>`)
      .join('');
    const budgetRows = categorySpendingForMonth(data, currentMonth, currentYear)
      .filter((item) => item.total > 0 || categoryBudgetForMonth(data.categoryBudgets || [], item.category.id, invoiceMonth))
      .map((item) => {
        const budget = categoryBudgetForMonth(data.categoryBudgets || [], item.category.id, invoiceMonth);
        const amount = Number(budget?.amount || 0);
        const percent = amount > 0 ? ` - ${(item.total / amount * 100).toFixed(0)}%` : '';
        return `<li>${item.category.name}: ${formatCurrency(item.total)} de ${amount ? formatCurrency(amount) : 'sem alvo'}${percent}</li>`;
      })
      .join('');
    const cardRows = cardInvoiceSummaries(data, currentMonth, currentYear)
      .map((item) => `<li>${item.card.name}: ${formatCurrency(item.total)} (${invoiceStatusLabel(item.status)}; pago ${formatCurrency(item.paidTotal)}; restante ${formatCurrency(item.remaining)})</li>`)
      .join('');
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatorio Finance</title><body style="font-family:Arial,sans-serif;padding:32px"><h1>Relatorio ${monthLabel(currentYear, currentMonth)}</h1><p>Receitas: ${formatCurrency(summary.receitas)}</p><p>Despesas: ${formatCurrency(summary.despesas + summary.parcelas)}</p><p>Saldo: ${formatCurrency(summary.saldo)}</p><h2>Transacoes</h2><ul>${summary.monthTransactions.map((item) => `<li>${item.date} - ${item.desc} - ${formatCurrency(item.amount)}</li>`).join('')}</ul><h2>Alvos por categoria</h2><ul>${budgetRows}</ul><h2>Fixos e assinaturas</h2><ul>${fixedRows}</ul><h2>Parcelamentos</h2><ul>${summary.installments.map((item) => `<li>${item.desc} - parcela ${item.paidCount}/${item.parcels} - ${formatCurrency(item.parcelValue)}</li>`).join('')}</ul><h2>Cartoes</h2><ul>${cardRows}</ul></body></html>`;
    downloadText(`relatorio-finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.html`, html, 'text/html;charset=utf-8');
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Exportacao CSV</h2>
            <p>Compativel com Excel, Google Sheets e Numbers.</p>
          </div>
        </div>
        <button className="primary-button" onClick={downloadCsv} type="button"><Download size={17} /> Baixar CSV</button>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Relatorio mensal</h2>
            <p>HTML pronto para imprimir ou salvar como PDF.</p>
          </div>
        </div>
        <button className="secondary-button" onClick={downloadReport} type="button"><Download size={17} /> Baixar relatorio</button>
      </section>
      <section className="stat-grid span-2">
        <StatCard label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(summary.despesas + summary.parcelas)} tone="negative" />
        <StatCard label="Saldo" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
      </section>
    </div>
  );
}

function invoiceStatusLabel(status) {
  if (status === 'paid') return 'paga';
  if (status === 'partial') return 'parcial';
  if (status === 'divergent' || status === 'overpaid') return 'divergente';
  if (status === 'open') return 'aberta';
  return 'sem valor';
}
