import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Field, StatCard } from '../components/ui.jsx';
import { formatCurrency, makeId, today, walletBalance } from '../utils/finance.js';

export function WalletPage({ data, actions }) {
  const [initialBalance, setInitialBalance] = useState(data.settings.initialBalance || '');
  const [entry, setEntry] = useState({ type: 'entrada', desc: '', amount: '', date: today() });
  const balance = walletBalance(data);

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
      ...entry,
      id: makeId('wallet'),
      amount: Number(entry.amount),
      createdAt: Date.now(),
    });
    setEntry((current) => ({ ...current, desc: '', amount: '' }));
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Saldo em carteira" value={formatCurrency(balance)} tone={balance >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Entradas" value={formatCurrency(data.wallet.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + Number(item.amount || 0), 0))} tone="positive" />
        <StatCard label="Saidas" value={formatCurrency(data.wallet.filter((item) => item.type === 'saida').reduce((sum, item) => sum + Number(item.amount || 0), 0))} tone="negative" />
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Saldo inicial</h2></div>
        <form className="form-grid one-col" onSubmit={saveInitial}>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={initialBalance} onChange={(event) => setInitialBalance(event.target.value)} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Check size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Movimentacao</h2></div>
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
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>Historico</h2></div>
        <div className="list">
          {[...data.wallet].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>{item.date} · {item.type}</span>
              </div>
              <strong className={item.type === 'entrada' ? 'money-positive' : 'money-negative'}>{formatCurrency(item.amount)}</strong>
              <button className="icon-button danger" onClick={() => actions.remove('wallet', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

