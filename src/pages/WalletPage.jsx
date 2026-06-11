import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, Field, StatCard } from '../components/ui.jsx';
import { formatCurrency, makeId, smartCashSummary, today, walletBalance } from '../utils/finance.js';

export function WalletPage({ data, actions, currentMonth, currentYear, setPage }) {
  const [initialBalance, setInitialBalance] = useState(data.settings.initialBalance || '');
  const [entry, setEntry] = useState({ type: 'entrada', desc: '', amount: '', date: today() });
  const [editingEntry, setEditingEntry] = useState(null);
  const balance = walletBalance(data);
  const cash = smartCashSummary(data, currentMonth, currentYear);
  const entriesTotal = data.wallet.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const exitsTotal = data.wallet.filter((item) => item.type === 'saida').reduce((sum, item) => sum + Number(item.amount || 0), 0);

  useEffect(() => {
    setInitialBalance(data.settings.initialBalance || '');
  }, [data.settings.initialBalance]);

  async function saveInitial(event) {
    event.preventDefault();
    await actions.saveSettings({ initialBalance: Number(initialBalance || 0), initialDate: today() });
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!entry.desc.trim() || !Number(entry.amount)) return;
    await actions.save('wallet', {
      ...editingEntry,
      ...entry,
      id: editingEntry?.id || makeId('wallet'),
      amount: Number(entry.amount),
      createdAt: editingEntry?.createdAt || Date.now(),
    });
    setEditingEntry(null);
    setEntry((current) => ({ ...current, desc: '', amount: '' }));
  }

  function editEntry(item) {
    if (item.source) {
      window.alert('Lancamentos automáticos devem ser editados na origem: transacao ou fatura.');
      return;
    }
    setEditingEntry(item);
    setEntry({
      type: item.type || 'entrada',
      desc: item.desc || '',
      amount: String(item.amount || ''),
      date: item.date || today(),
    });
  }

  async function removeEntry(item) {
    if (item.source) {
      window.alert('Lancamentos automáticos devem ser removidos pela transacao ou fatura de origem.');
      return;
    }
    if (!window.confirm(`Excluir "${item.desc}" da carteira?`)) return;
    await actions.remove('wallet', item.id);
  }

  function cancelEdit() {
    setEditingEntry(null);
    setEntry({ type: 'entrada', desc: '', amount: '', date: today() });
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Saldo em carteira" value={formatCurrency(balance)} tone={balance >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Comprometido" value={formatCurrency(cash.committedTotal)} tone={cash.committedTotal > 0 ? 'negative' : 'info'} />
        <StatCard label="Reservado" value={formatCurrency(cash.reservedTotal)} tone="info" />
        <StatCard label="Livre estimado" value={formatCurrency(cash.freeEstimated)} tone={cash.freeEstimated >= 0 ? 'positive' : 'negative'} />
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Caixa inteligente</h2>
            <p>Saldo atual menos faturas abertas e fixos pendentes do mes.</p>
          </div>
          <span className={`pill ${cash.status === 'negative' ? 'warning' : cash.status === 'attention' ? 'muted' : 'positive'}`}>
            {cash.status === 'negative' ? 'Falta caixa' : cash.status === 'attention' ? 'Com compromissos' : 'Livre'}
          </span>
        </div>
        <div className="cash-flow-grid">
          <CashFlowCard label="Saldo atual" value={cash.wallet} tone="info" />
          <CashFlowCard label="Faturas restantes" value={cash.openInvoiceTotal} tone="negative" action="Cartoes" onClick={() => setPage('cards')} />
          <CashFlowCard label="Fixos pendentes" value={cash.pendingFixedTotal} tone="negative" action="Fixos" onClick={() => setPage('fixed')} />
          <CashFlowCard label="Livre estimado" value={cash.freeEstimated} tone={cash.freeEstimated >= 0 ? 'positive' : 'negative'} />
        </div>
        <div className="cash-equation">
          <span>{formatCurrency(cash.wallet)}</span>
          <b>-</b>
          <span>{formatCurrency(cash.openInvoiceTotal)}</span>
          <b>-</b>
          <span>{formatCurrency(cash.pendingFixedTotal)}</span>
          <b>=</b>
          <strong className={cash.freeEstimated >= 0 ? 'money-positive' : 'money-negative'}>{formatCurrency(cash.freeEstimated)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Compromissos do mes</h2>
            <p>O que ainda pode bater na carteira.</p>
          </div>
        </div>
        <div className="list">
          {cash.openInvoices.map((item) => (
            <div className="list-row" key={item.invoiceKey}>
              <div className="row-main">
                <strong>{item.card.name}</strong>
                <span>Fatura {invoiceStatusLabel(item.status)} · vence {item.dueDate} · pago {formatCurrency(item.paidTotal)}</span>
              </div>
              <strong className="money-negative">{formatCurrency(item.remaining)}</strong>
            </div>
          ))}
          {cash.pendingFixed.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.kind === 'assinatura' ? 'Assinatura' : 'Fixo'} · vence {item.dueDate}</span>
              </div>
              <strong className="money-negative">{formatCurrency(item.amount)}</strong>
            </div>
          ))}
          {!cash.openInvoices.length && !cash.pendingFixed.length && <EmptyState title="Nenhum compromisso pendente neste mes." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Caixa reservado</h2>
            <p>Valores separados para metas e dividas.</p>
          </div>
        </div>
        <div className="reserve-grid">
          <ReserveCard title="Metas" summary={cash.goalsCash} onClick={() => setPage('goals')} />
          <ReserveCard title="Dividas" summary={cash.debtsCash} onClick={() => setPage('debts')} />
        </div>
        <div className="cash-equation compact">
          <span>Separado {formatCurrency(cash.reservedTotal)}</span>
          <span>Distribuido {formatCurrency(cash.reservedAllocated)}</span>
          <strong>Disponivel {formatCurrency(cash.reservedAvailable)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Saldo inicial</h2></div>
        <form className="form-grid one-col" onSubmit={saveInitial}>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={initialBalance} onChange={(event) => setInitialBalance(event.target.value)} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Check size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>{editingEntry ? 'Editar movimentacao' : 'Movimentacao'}</h2></div>
        <form className="form-grid one-col" onSubmit={saveEntry}>
          <Field label="Tipo">
            <select value={entry.type} onChange={(event) => setEntry({ ...entry, type: event.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Field>
          <Field label="Descricao"><input value={entry.desc} onChange={(event) => setEntry({ ...entry, desc: event.target.value })} /></Field>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} /></Field>
          <Field label="Data"><input type="date" value={entry.date} onChange={(event) => setEntry({ ...entry, date: event.target.value })} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingEntry ? <Check size={17} /> : <Plus size={17} />} {editingEntry ? 'Atualizar' : 'Salvar'}</button>
            {editingEntry && <button className="secondary-button" onClick={cancelEdit} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>Historico</h2></div>
        <div className="wallet-totals">
          <span>Entradas <strong className="money-positive">{formatCurrency(entriesTotal)}</strong></span>
          <span>Saidas <strong className="money-negative">{formatCurrency(exitsTotal)}</strong></span>
        </div>
        <div className="list">
          {[...data.wallet].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>{item.date} · {item.type}{item.source ? ` · ${item.source}` : ''}</span>
              </div>
              <strong className={item.type === 'entrada' ? 'money-positive' : 'money-negative'}>{formatCurrency(item.amount)}</strong>
              {!item.source && <button className="icon-button" onClick={() => editEntry(item)} title="Editar" type="button"><Pencil size={16} /></button>}
              {!item.source && <button className="icon-button danger" onClick={() => removeEntry(item)} title="Excluir" type="button"><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CashFlowCard({ label, value, tone, action, onClick }) {
  return (
    <div className={`cash-flow-card ${tone}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      {action && <button className="text-button" onClick={onClick} type="button">Ver {action}</button>}
    </div>
  );
}

function ReserveCard({ title, summary, onClick }) {
  return (
    <button className="reserve-card" onClick={onClick} type="button">
      <strong>{title}</strong>
      <span>Separado {formatCurrency(summary.sourceTotal)}</span>
      <span>Distribuido {formatCurrency(summary.allocatedTotal)}</span>
      <b>Disponivel {formatCurrency(summary.available)}</b>
    </button>
  );
}

function invoiceStatusLabel(status) {
  if (status === 'partial') return 'parcial';
  if (status === 'paid') return 'paga';
  if (status === 'overpaid' || status === 'divergent') return 'divergente';
  return 'aberta';
}
