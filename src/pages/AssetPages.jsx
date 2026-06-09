import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, Field, StatCard } from '../components/ui.jsx';
import {
  allocatedToTarget,
  allocationCashSummary,
  formatCurrency,
  makeId,
  specialCategoryForType,
  targetAllocations,
  today,
} from '../utils/finance.js';

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
    <ManagedAllocationPage
      title="Metas"
      collection="goals"
      type="goals"
      items={data.goals}
      data={data}
      actions={actions}
      amountKey="target"
      amountLabel="Valor alvo"
      allocatedLabel="Reservado"
      remainingLabel="Falta"
      sourceName="Caixa de metas"
      sourceHint="Lance uma despesa na categoria Metas para alimentar este caixa."
      fields={[
        ['name', 'Nome'],
        ['target', 'Valor alvo'],
        ['startDate', 'Data inicial'],
        ['deadline', 'Prazo'],
      ]}
      buildItem={(form, editingItem) => ({
        ...editingItem,
        name: form.name,
        target: Number(form.target || 0),
        startDate: form.startDate || today(),
        deadline: form.deadline || '',
        note: form.note || '',
        current: Number(editingItem?.current || 0),
      })}
      detailLabel={(item) => item.deadline ? `Prazo ${item.deadline}` : 'Sem prazo definido'}
    />
  );
}

export function DebtsPage({ data, actions }) {
  return (
    <ManagedAllocationPage
      title="Dividas"
      collection="debts"
      type="debts"
      items={data.debts}
      data={data}
      actions={actions}
      amountKey="total"
      amountLabel="Valor total"
      allocatedLabel="Pago"
      remainingLabel="Em aberto"
      sourceName="Caixa de dividas"
      sourceHint="Lance uma despesa na categoria Dividas para alimentar este caixa."
      fields={[
        ['name', 'Nome'],
        ['creditor', 'Credor'],
        ['total', 'Valor total'],
        ['incurredDate', 'Data da divida'],
        ['deadline', 'Vencimento'],
      ]}
      buildItem={(form, editingItem) => ({
        ...editingItem,
        name: form.name,
        creditor: form.creditor || '',
        total: Number(form.total || 0),
        incurredDate: form.incurredDate || today(),
        deadline: form.deadline || '',
        note: form.note || '',
        paid: Number(editingItem?.paid || 0),
      })}
      detailLabel={(item) => `${item.creditor || 'Credor nao informado'} · ${item.incurredDate || 'sem data'}`}
    />
  );
}

function ManagedAllocationPage({
  title,
  collection,
  type,
  items,
  data,
  actions,
  fields,
  amountKey,
  amountLabel,
  allocatedLabel,
  remainingLabel,
  sourceName,
  sourceHint,
  buildItem,
  detailLabel,
}) {
  const initial = { ...Object.fromEntries(fields.map(([name]) => [name, ''])), note: '' };
  const [form, setForm] = useState(initial);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [allocationTarget, setAllocationTarget] = useState(null);
  const [allocation, setAllocation] = useState({ amount: '', date: today(), note: '' });
  const cash = allocationCashSummary(data, type);
  const sourceCategory = specialCategoryForType(data.categories, type);

  async function submit(event) {
    event.preventDefault();
    if (!form.name?.trim()) return;

    const item = {
      ...buildItem(form, editingItem),
      id: editingItem?.id || makeId(collection.slice(0, -1) || collection),
      createdAt: editingItem?.createdAt || Date.now(),
    };

    await actions.save(collection, item);
    setEditingItem(null);
    setForm(initial);
  }

  function edit(item) {
    setEditingItem(item);
    setForm({
      ...Object.fromEntries(fields.map(([name]) => [name, String(item[name] ?? '')])),
      note: item.note || '',
    });
  }

  function cancelEdit() {
    setEditingItem(null);
    setForm(initial);
  }

  function openAllocation(item) {
    setSelectedId(item.id);
    setAllocationTarget(item);
    setAllocation({ amount: '', date: today(), note: '' });
  }

  async function saveAllocation(event) {
    event.preventDefault();
    if (!allocationTarget) return;
    const amount = Number(allocation.amount || 0);
    const remaining = remainingFor(allocationTarget);
    const max = Math.min(cash.available, remaining);

    if (amount <= 0 || amount > max) {
      window.alert(`Informe um valor entre R$ 0,01 e ${formatCurrency(max)}.`);
      return;
    }

    await actions.save('allocations', {
      id: makeId('alloc'),
      type,
      targetId: allocationTarget.id,
      amount,
      date: allocation.date || today(),
      note: allocation.note || '',
      createdAt: Date.now(),
    });
    setAllocationTarget(null);
    setAllocation({ amount: '', date: today(), note: '' });
  }

  async function removeAllocation(item) {
    if (!window.confirm(`Remover este lancamento de ${formatCurrency(item.amount)}?`)) return;
    await actions.remove('allocations', item.id);
  }

  async function remove(item) {
    if (targetAllocations(data, type, item.id).length) {
      window.alert('Este registro tem historico. Remova os lancamentos antes de excluir.');
      return;
    }
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    await actions.remove(collection, item.id);
  }

  function targetAmount(item) {
    return Number(item[amountKey] || 0);
  }

  function allocatedFor(item) {
    return allocatedToTarget(data, type, item.id);
  }

  function remainingFor(item) {
    return Math.max(0, targetAmount(item) - allocatedFor(item));
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label={sourceName} value={formatCurrency(cash.available)} tone={cash.available > 0 ? 'positive' : 'info'} />
        <StatCard label="Lancado na categoria" value={formatCurrency(cash.sourceTotal)} tone="info" />
        <StatCard label="Ja alocado" value={formatCurrency(cash.allocatedTotal)} tone="positive" />
        <StatCard label="Registros" value={String(items.length)} tone="info" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{editingItem ? 'Editar registro' : 'Novo registro'}</h2>
            <p>{sourceHint}</p>
          </div>
        </div>
        <form className="form-grid one-col" onSubmit={submit}>
          {fields.map(([name, label]) => (
            <Field label={label} key={name}>
              <input
                type={[amountKey].includes(name) ? 'number' : name.includes('Date') || name === 'deadline' ? 'date' : 'text'}
                min="0"
                step="0.01"
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              />
            </Field>
          ))}
          <Field label="Observacao">
            <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opcional" />
          </Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingItem ? <Check size={17} /> : <Plus size={17} />} {editingItem ? 'Atualizar' : 'Salvar'}</button>
            {editingItem && <button className="secondary-button" onClick={cancelEdit} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Como alimentar o caixa</h2>
            <p>Use uma transacao de despesa na categoria especial.</p>
          </div>
        </div>
        <div className="notice compact">
          Categoria: <strong>{sourceCategory?.name || title}</strong>. Depois, use o botao + no registro escolhido para alocar o valor disponivel.
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header"><h2>{title}</h2></div>
        <div className="list">
          {items.map((item) => {
            const target = targetAmount(item);
            const allocated = allocatedFor(item);
            const remaining = remainingFor(item);
            const percent = target > 0 ? Math.min(100, (allocated / target) * 100) : 0;
            const history = targetAllocations(data, type, item.id);
            const maxAllocation = Math.min(cash.available, remaining);
            return (
              <div className="asset-item" key={item.id}>
                <div
                  className="asset-row"
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedId(selectedId === item.id ? null : item.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="row-main">
                    <strong>{item.name}</strong>
                    <span>{detailLabel(item)}</span>
                    <div className="asset-progress">
                      <div className="meter"><span style={{ width: `${percent}%` }} /></div>
                      <small>{allocatedLabel}: {formatCurrency(allocated)} · {remainingLabel}: {formatCurrency(remaining)} · {percent.toFixed(0)}%</small>
                    </div>
                  </div>
                  <strong>{formatCurrency(target)}</strong>
                  <button className="icon-button" disabled={maxAllocation <= 0} onClick={(event) => { event.stopPropagation(); openAllocation(item); }} title="Adicionar valor" type="button"><Plus size={16} /></button>
                  <button className="icon-button" onClick={(event) => { event.stopPropagation(); edit(item); }} title="Editar" type="button"><Pencil size={16} /></button>
                  <button className="icon-button danger" onClick={(event) => { event.stopPropagation(); remove(item); }} title="Excluir" type="button"><Trash2 size={16} /></button>
                </div>

                {allocationTarget?.id === item.id && (
                  <form className="allocation-form" onSubmit={saveAllocation}>
                    <Field label={`Valor ate ${formatCurrency(maxAllocation)}`}>
                      <input type="number" min="0" max={maxAllocation} step="0.01" value={allocation.amount} onChange={(event) => setAllocation({ ...allocation, amount: event.target.value })} />
                    </Field>
                    <Field label="Data">
                      <input type="date" value={allocation.date} onChange={(event) => setAllocation({ ...allocation, date: event.target.value })} />
                    </Field>
                    <Field label="Observacao">
                      <input value={allocation.note} onChange={(event) => setAllocation({ ...allocation, note: event.target.value })} placeholder="Opcional" />
                    </Field>
                    <div className="form-actions">
                      <button className="primary-button" type="submit"><Check size={17} /> Alocar</button>
                      <button className="secondary-button" onClick={() => setAllocationTarget(null)} type="button"><X size={17} /> Cancelar</button>
                    </div>
                  </form>
                )}

                {selectedId === item.id && (
                  <div className="allocation-history">
                    <div className="panel-subtitle">Historico</div>
                    {history.map((entry) => (
                      <div className="list-row" key={entry.id}>
                        <div className="row-main">
                          <strong>{formatCurrency(entry.amount)}</strong>
                          <span>{entry.date || '-'}{entry.note ? ` · ${entry.note}` : ''}</span>
                        </div>
                        <button className="icon-button danger" onClick={() => removeAllocation(entry)} title="Remover lancamento" type="button"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {!history.length && <EmptyState title="Nenhum lancamento alocado ainda." />}
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && <EmptyState title={`Nenhum item em ${title.toLowerCase()}.`} />}
        </div>
      </section>
    </div>
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
