import { useEffect, useState } from 'react';
import { Check, Pencil, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { EmptyState, Field, SegmentedControl, StatCard, paymentLabel } from '../components/ui.jsx';
import {
  fixedItemToTransaction,
  fixedItemsForMonth,
  formatCurrency,
  getCardIdFromPayment,
  getCategory,
  makeId,
  monthKeyFromParts,
  transactionForFixedItemMonth,
} from '../utils/finance.js';

function blankFixedItem(categories, paymentMethods, currentMonth, currentYear) {
  return {
    kind: 'fixo',
    name: '',
    amount: '',
    dueDay: '10',
    category: categories[0]?.id || '',
    payment: paymentMethods[0] || 'PIX',
    startMonth: monthKeyFromParts(currentYear, currentMonth),
    endMonth: '',
    active: 'true',
    note: '',
  };
}

export function FixedItemsPage({ data, actions, paymentMethods, currentMonth, currentYear }) {
  const fixedMonth = monthKeyFromParts(currentYear, currentMonth);
  const [filter, setFilter] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(() => blankFixedItem(data.categories, paymentMethods, currentMonth, currentYear));

  const monthlyRows = fixedItemsForMonth(data.fixedItems, currentMonth, currentYear)
    .map((item) => {
      const launchedTransaction = transactionForFixedItemMonth(data.transactions, item.id, fixedMonth);
      const expectedTransaction = fixedItemToTransaction(item, data.cards, fixedMonth);
      return {
        ...item,
        launchedTransaction,
        expectedTransaction,
        launchMatches: !launchedTransaction || transactionMatchesFixedItem(launchedTransaction, expectedTransaction),
        categoryInfo: getCategory(data.categories, item.category),
      };
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const filteredRows = monthlyRows.filter((item) => {
    if (filter === 'pending') return !item.launchedTransaction;
    if (filter === 'launched') return Boolean(item.launchedTransaction);
    if (filter === 'fixo' || filter === 'assinatura') return item.kind === filter;
    return true;
  });

  const expectedTotal = monthlyRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const launchedTotal = monthlyRows
    .filter((item) => item.launchedTransaction)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingTotal = expectedTotal - launchedTotal;

  useEffect(() => {
    if (!form.category && data.categories[0]) {
      setForm((current) => ({ ...current, category: data.categories[0].id }));
    }
  }, [data.categories, form.category]);

  useEffect(() => {
    if (!form.payment && paymentMethods[0]) {
      setForm((current) => ({ ...current, payment: paymentMethods[0] }));
    }
  }, [form.payment, paymentMethods]);

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !Number(form.amount)) return;

    const linkedCardId = getCardIdFromPayment(form.payment);
    await actions.save('fixedItems', {
      ...editingItem,
      ...form,
      id: editingItem?.id || makeId('fixed'),
      amount: Number(form.amount),
      dueDay: Number(form.dueDay || 1),
      active: form.active === 'true',
      linkedCardId,
      createdAt: editingItem?.createdAt || Date.now(),
    });

    setEditingItem(null);
    setForm(blankFixedItem(data.categories, paymentMethods, currentMonth, currentYear));
  }

  function editItem(item) {
    setEditingItem(item);
    setForm({
      kind: item.kind || 'fixo',
      name: item.name || '',
      amount: String(item.amount || ''),
      dueDay: String(item.dueDay || '10'),
      category: item.category || data.categories[0]?.id || '',
      payment: item.payment || paymentMethods[0] || 'PIX',
      startMonth: item.startMonth || fixedMonth,
      endMonth: item.endMonth || '',
      active: item.active === false ? 'false' : 'true',
      note: item.note || '',
    });
  }

  function cancelEdit() {
    setEditingItem(null);
    setForm(blankFixedItem(data.categories, paymentMethods, currentMonth, currentYear));
  }

  async function launchMonth(item) {
    const existing = transactionForFixedItemMonth(data.transactions, item.id, fixedMonth);
    if (existing) return;

    await actions.saveTransaction(item.expectedTransaction);
  }

  async function updateLaunch(item) {
    if (!item.launchedTransaction) return;
    await actions.saveTransaction({
      ...item.expectedTransaction,
      id: item.launchedTransaction.id,
      walletEntryId: item.launchedTransaction.walletEntryId || '',
      createdAt: item.launchedTransaction.createdAt || Date.now(),
    }, item.launchedTransaction);
  }

  async function undoLaunch(item) {
    if (!item.launchedTransaction) return;
    if (!window.confirm(`Desfazer lancamento de "${item.name}" em ${fixedMonth}?`)) return;
    await actions.removeTransaction(item.launchedTransaction);
  }

  async function removeItem(item) {
    const hasTransactions = data.transactions.some((transaction) => transaction.fixedItemId === item.id);
    if (hasTransactions) {
      window.alert('Este cadastro ja tem lancamentos mensais. Desative para manter o historico financeiro.');
      return;
    }
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    await actions.remove('fixedItems', item.id);
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Previsto no mes" value={formatCurrency(expectedTotal)} tone="info" />
        <StatCard label="Ja lancado" value={formatCurrency(launchedTotal)} tone="positive" />
        <StatCard label="Pendente" value={formatCurrency(pendingTotal)} tone={pendingTotal > 0 ? 'negative' : 'positive'} />
        <StatCard label="Itens ativos" value={String(monthlyRows.length)} tone="info" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{editingItem ? 'Editar cadastro' : 'Novo fixo ou assinatura'}</h2>
            <p>Cadastre o compromisso uma vez e lance apenas o mes que estiver conferindo.</p>
          </div>
        </div>
        <form className="form-grid one-col" onSubmit={submit}>
          <Field label="Tipo">
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="fixo">Gasto fixo</option>
              <option value="assinatura">Assinatura</option>
            </select>
          </Field>
          <Field label="Nome"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Aluguel, internet, Spotify..." /></Field>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
          <Field label="Vencimento"><input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} /></Field>
          <Field label="Categoria">
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Pagamento">
            <select value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}>
              {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
              {data.cards.map((card) => <option key={card.id} value={`CC::${card.id}`}>Cartao {card.name}</option>)}
            </select>
          </Field>
          <Field label="Inicio"><input type="month" value={form.startMonth} onChange={(event) => setForm({ ...form, startMonth: event.target.value })} /></Field>
          <Field label="Fim opcional"><input type="month" value={form.endMonth} onChange={(event) => setForm({ ...form, endMonth: event.target.value })} /></Field>
          <Field label="Status">
            <select value={form.active} onChange={(event) => setForm({ ...form, active: event.target.value })}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </Field>
          <Field label="Observacao"><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opcional" /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingItem ? <Check size={17} /> : <Plus size={17} />} {editingItem ? 'Atualizar' : 'Salvar'}</button>
            {editingItem && <button className="secondary-button" onClick={cancelEdit} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Fila do mes</h2>
            <p>{filteredRows.length} itens para {fixedMonth}.</p>
          </div>
          <SegmentedControl value={filter} onChange={setFilter} options={[
            ['all', 'Todos'],
            ['pending', 'Pendentes'],
            ['launched', 'Lancados'],
            ['fixo', 'Fixos'],
            ['assinatura', 'Assinaturas'],
          ]} />
        </div>
        <div className="list">
          {filteredRows.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.dueDate} · {item.categoryInfo.name} · {paymentLabel(item.payment, data.cards)}</span>
              </div>
              <span className={`pill ${item.launchedTransaction ? (item.launchMatches ? 'positive' : 'warning') : 'warning'}`}>{item.launchedTransaction ? (item.launchMatches ? 'Lancado' : 'Divergente') : 'Pendente'}</span>
              <strong className="money-negative">{formatCurrency(item.amount)}</strong>
              {item.launchedTransaction
                ? (
                  <>
                    {!item.launchMatches && <button className="icon-button" onClick={() => updateLaunch(item)} title="Atualizar lancamento" type="button"><Check size={16} /></button>}
                    <button className="icon-button" onClick={() => undoLaunch(item)} title="Desfazer lancamento" type="button"><RotateCcw size={16} /></button>
                  </>
                )
                : <button className="icon-button" onClick={() => launchMonth(item)} title="Lancar mes" type="button"><Play size={16} /></button>}
              <button className="icon-button" onClick={() => editItem(item)} title="Editar" type="button"><Pencil size={16} /></button>
            </div>
          ))}
          {!filteredRows.length && <EmptyState title="Nenhum fixo ou assinatura neste filtro." />}
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Cadastros</h2>
            <p>Itens inativos ficam guardados sem aparecer na fila mensal.</p>
          </div>
        </div>
        <div className="list">
          {data.fixedItems.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.kind === 'assinatura' ? 'Assinatura' : 'Fixo'} · Dia {item.dueDay} · desde {item.startMonth || '-'}</span>
              </div>
              <span className={`pill ${item.active === false ? 'muted' : 'positive'}`}>{item.active === false ? 'Inativo' : 'Ativo'}</span>
              <strong>{formatCurrency(item.amount)}</strong>
              <button className="icon-button" onClick={() => editItem(item)} title="Editar" type="button"><Pencil size={16} /></button>
              <button className="icon-button danger" onClick={() => removeItem(item)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
          {!data.fixedItems.length && <EmptyState title="Nenhum gasto fixo ou assinatura cadastrado." />}
        </div>
      </section>
    </div>
  );
}

function transactionMatchesFixedItem(transaction, expected) {
  return transaction.desc === expected.desc
    && Math.abs(Number(transaction.amount || 0) - Number(expected.amount || 0)) < 0.01
    && transaction.date === expected.date
    && transaction.category === expected.category
    && transaction.payment === expected.payment
    && transaction.nature === expected.nature;
}
