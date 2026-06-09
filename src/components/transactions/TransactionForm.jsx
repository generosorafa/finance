import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Field } from '../ui.jsx';
import { getCardIdFromPayment, getCardInvoiceMonth, makeId, today } from '../../utils/finance.js';

const blankTransaction = (categories, paymentMethods) => ({
    type: 'despesa',
    desc: '',
    amount: '',
    date: today(),
    category: categories[0]?.id || '',
    payment: paymentMethods[0] || 'PIX',
    necessity: 'necessario',
    nature: 'variavel',
    linkedCardId: '',
    invoiceMonth: '',
    note: '',
});

export function TransactionForm({
  actions,
  categories,
  cards,
  editingTransaction = null,
  onCancelEdit,
  onSaved,
  paymentMethods,
  compact = false,
}) {
  const [form, setForm] = useState(() => blankTransaction(categories, paymentMethods));

  useEffect(() => {
    if (!form.category && categories[0]) setForm((current) => ({ ...current, category: categories[0].id }));
  }, [categories, form.category]);

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        ...blankTransaction(categories, paymentMethods),
        ...editingTransaction,
        amount: String(editingTransaction.amount || ''),
      });
      return;
    }

    setForm(blankTransaction(categories, paymentMethods));
  }, [editingTransaction, categories, paymentMethods]);

  async function submit(event) {
    event.preventDefault();
    if (!form.desc.trim() || !Number(form.amount)) return;

    const linkedCardId = getCardIdFromPayment(form.payment);
    const card = cards.find((item) => item.id === linkedCardId);
    const item = {
      ...form,
      id: editingTransaction?.id || makeId('tx'),
      amount: Number(form.amount),
      nature: 'variavel',
      linkedCardId,
      invoiceMonth: linkedCardId ? getCardInvoiceMonth(card, form.date) : '',
      createdAt: editingTransaction?.createdAt || Date.now(),
    };

    await actions.saveTransaction(item, editingTransaction);
    setForm(blankTransaction(categories, paymentMethods));
    onSaved?.();
  }

  return (
    <form className={`form-grid ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <Field label="Tipo">
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </Field>
      <Field label="Descricao">
        <input value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} placeholder="Mercado, salario, aluguel..." />
      </Field>
      <Field label="Valor">
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Data">
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
      </Field>
      <Field label="Categoria">
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </Field>
      <Field label="Pagamento">
        <select value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}>
          {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
          {cards.map((card) => <option key={card.id} value={`CC::${card.id}`}>Cartao {card.name}</option>)}
        </select>
      </Field>
      <Field label="Necessidade">
        <select value={form.necessity} onChange={(event) => setForm({ ...form, necessity: event.target.value })}>
          <option value="necessario">Necessario</option>
          <option value="eventual">Eventual</option>
          <option value="nao_necessario">Nao necessario</option>
        </select>
      </Field>
      <Field label="Observacao">
        <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opcional" />
      </Field>
      <div className="form-actions">
        <button className="primary-button" type="submit">
          {editingTransaction ? <Check size={17} /> : <Plus size={17} />}
          {editingTransaction ? 'Atualizar' : 'Salvar'}
        </button>
        {editingTransaction && (
          <button className="secondary-button" onClick={onCancelEdit} type="button"><X size={17} /> Cancelar</button>
        )}
      </div>
    </form>
  );
}
