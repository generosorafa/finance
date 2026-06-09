import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Field, StatCard } from '../components/ui.jsx';
import { formatCurrency, makeId, today, walletBalance } from '../utils/finance.js';

export function WalletPage({ data, actions }) {
  const [initialBalance, setInitialBalance] = useState(data.settings.initialBalance || '');
  const [entry, setEntry] = useState({ type: 'entrada', desc: '', amount: '', date: today() });
  const [editingEntry, setEditingEntry] = useState(null);
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
