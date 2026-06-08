import { Download } from 'lucide-react';
import { StatCard } from '../components/ui.jsx';
import { downloadText } from '../utils/download.js';
import { exportTransactionsCsv, formatCurrency, monthLabel, summarizeMonth } from '../utils/finance.js';

export function ReportsPage({ data, currentMonth, currentYear }) {
  const summary = summarizeMonth(data, currentMonth, currentYear);

  function downloadCsv() {
    const csv = exportTransactionsCsv(summary.monthTransactions, data.categories);
    downloadText(`finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  function downloadReport() {
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatorio Finance</title><body style="font-family:Arial,sans-serif;padding:32px"><h1>Relatorio ${monthLabel(currentYear, currentMonth)}</h1><p>Receitas: ${formatCurrency(summary.receitas)}</p><p>Despesas: ${formatCurrency(summary.despesas + summary.parcelas)}</p><p>Saldo: ${formatCurrency(summary.saldo)}</p><h2>Transacoes</h2><ul>${summary.monthTransactions.map((item) => `<li>${item.date} - ${item.desc} - ${formatCurrency(item.amount)}</li>`).join('')}</ul></body></html>`;
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

