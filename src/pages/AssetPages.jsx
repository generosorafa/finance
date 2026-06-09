import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, Field } from '../components/ui.jsx';
import { formatCurrency, makeId, today } from '../utils/finance.js';

export function InvestmentsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Investimentos"
      collection="investments"
      items={data.investments}
      actions={actions}
      fields={[
        ['name', 'Nome / ticker'],
        ['type', 'Tipo'],
        ['qty', 'Quantidade'],
        ['avgPrice', 'Preco medio'],
      ]}
      derive={(form) => ({
        value: Number(form.qty || 0) * Number(form.avgPrice || 0),
        updated: today(),
      })}
      valueLabel={(item) => formatCurrency(item.value)}
    />
  );
}

export function GoalsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Metas"
      collection="goals"
      items={data.goals}
      actions={actions}
      fields={[
        ['name', 'Nome'],
        ['target', 'Valor alvo'],
        ['current', 'Valor atual'],
        ['deadline', 'Prazo'],
      ]}
      valueLabel={(item) => `${formatCurrency(item.current)} de ${formatCurrency(item.target)}`}
    />
  );
}

export function DebtsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Dividas"
      collection="debts"
      items={data.debts}
      actions={actions}
      fields={[
        ['name', 'Nome'],
        ['creditor', 'Credor'],
        ['total', 'Valor total'],
        ['paid', 'Pago'],
        ['deadline', 'Vencimento'],
      ]}
      valueLabel={(item) => `${formatCurrency(Number(item.total || 0) - Number(item.paid || 0))} em aberto`}
    />
  );
}

function GenericAssetPage({ title, collection, items, actions, fields, derive = () => ({}), valueLabel }) {
  const initial = Object.fromEntries(fields.map(([name]) => [name, '']));
  const [form, setForm] = useState(initial);
  const [editingItem, setEditingItem] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!form.name?.trim()) return;
    const numeric = {};
    Object.entries(form).forEach(([key, value]) => {
      numeric[key] = ['qty', 'avgPrice', 'target', 'current', 'total', 'paid'].includes(key) ? Number(value || 0) : value;
    });
    await actions.save(collection, {
      ...editingItem,
      ...numeric,
      ...derive(numeric),
      id: editingItem?.id || makeId(collection.slice(0, -1) || collection),
      createdAt: editingItem?.createdAt || Date.now(),
    });
    setEditingItem(null);
    setForm(initial);
  }

  function edit(item) {
    setEditingItem(item);
    setForm(Object.fromEntries(fields.map(([name]) => [name, String(item[name] ?? '')])));
  }

  function cancelEdit() {
    setEditingItem(null);
    setForm(initial);
  }

  async function remove(item) {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    await actions.remove(collection, item.id);
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>{editingItem ? 'Editar registro' : 'Novo registro'}</h2></div>
        <form className="form-grid one-col" onSubmit={submit}>
          {fields.map(([name, label]) => (
            <Field label={label} key={name}>
              <input
                type={['qty', 'avgPrice', 'target', 'current', 'total', 'paid'].includes(name) ? 'number' : name.includes('date') || name === 'deadline' ? 'date' : 'text'}
                min="0"
                step="0.01"
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              />
            </Field>
          ))}
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingItem ? <Check size={17} /> : <Plus size={17} />} {editingItem ? 'Atualizar' : 'Salvar'}</button>
            {editingItem && <button className="secondary-button" onClick={cancelEdit} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>{title}</h2></div>
        <div className="list">
          {items.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.type || item.creditor || item.deadline || 'registro'}</span>
              </div>
              <strong>{valueLabel(item)}</strong>
              <button className="icon-button" onClick={() => edit(item)} title="Editar" type="button"><Pencil size={16} /></button>
              <button className="icon-button danger" onClick={() => remove(item)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
          {!items.length && <EmptyState title={`Nenhum item em ${title.toLowerCase()}.`} />}
        </div>
      </section>
    </div>
  );
}
