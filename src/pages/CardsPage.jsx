import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { EmptyState, Field } from '../components/ui.jsx';
import {
  formatCurrency,
  getCardIdFromPayment,
  getInvoiceDueDate,
  getInvoiceKey,
  invoicePaymentEntry,
  installmentsForMonth,
  makeId,
  monthKey,
  monthKeyFromParts,
  monthLabel,
  today,
  transactionsForCardInvoice,
} from '../utils/finance.js';

export function CardsPage({ data, actions, currentMonth, currentYear }) {
  const [card, setCard] = useState({ name: '', limit: '', closeDay: '10', dueDay: '20', color: '#3f7dd8' });
  const [editingCard, setEditingCard] = useState(null);
  const [installment, setInstallment] = useState({
    desc: '',
    total: '',
    parcels: '2',
    purchaseDate: today(),
    firstMonth: monthKey(),
    cardId: '',
    categoryId: data.categories[0]?.id || '',
  });
  const invoiceMonth = monthKeyFromParts(currentYear, currentMonth);
  const monthInstallments = installmentsForMonth(data.installments, currentMonth, currentYear);
  const directCardTransactions = data.cards.flatMap((cardItem) => (
    transactionsForCardInvoice(data.transactions, cardItem, invoiceMonth)
      .map((item) => ({ ...item, cardName: cardItem.name }))
  ));

  useEffect(() => {
    setInstallment((current) => ({
      ...current,
      cardId: current.cardId || data.cards[0]?.id || '',
      categoryId: current.categoryId || data.categories[0]?.id || '',
    }));
  }, [data.cards, data.categories]);

  async function saveCard(event) {
    event.preventDefault();
    if (!card.name.trim()) return;
    await actions.save('cards', {
      ...card,
      id: editingCard?.id || makeId('card'),
      limit: Number(card.limit || 0),
      closeDay: Number(card.closeDay || 1),
      dueDay: Number(card.dueDay || 1),
      createdAt: editingCard?.createdAt || Date.now(),
    });
    setEditingCard(null);
    setCard({ name: '', limit: '', closeDay: '10', dueDay: '20', color: '#3f7dd8' });
  }

  function editCard(item) {
    setEditingCard(item);
    setCard({
      name: item.name || '',
      limit: String(item.limit || ''),
      closeDay: String(item.closeDay || '10'),
      dueDay: String(item.dueDay || '20'),
      color: item.color || '#3f7dd8',
    });
  }

  function cancelEditCard() {
    setEditingCard(null);
    setCard({ name: '', limit: '', closeDay: '10', dueDay: '20', color: '#3f7dd8' });
  }

  async function removeCard(item) {
    const hasInstallments = data.installments.some((entry) => entry.cardId === item.id);
    const hasTransactions = data.transactions.some((entry) => entry.linkedCardId === item.id || entry.payment === `CC::${item.id}`);
    const hasFixedItems = data.fixedItems.some((entry) => entry.linkedCardId === item.id || getCardIdFromPayment(entry.payment) === item.id);
    const hasWalletEntries = data.wallet.some((entry) => entry.cardId === item.id);
    if (hasInstallments || hasTransactions || hasFixedItems || hasWalletEntries) {
      window.alert('Este cartao tem transacoes, parcelamentos, fixos/assinaturas ou pagamentos vinculados. Edite/remova esses itens antes de excluir.');
      return;
    }
    if (!window.confirm(`Excluir o cartao "${item.name}"?`)) return;
    await actions.remove('cards', item.id);
  }

  async function removeDirectTransaction(item) {
    if (!window.confirm(`Excluir "${item.desc}"?`)) return;
    await actions.removeTransaction(item);
  }

  async function saveInstallment(event) {
    event.preventDefault();
    if (!installment.desc.trim() || !Number(installment.total) || !installment.cardId) return;
    const parcels = Number(installment.parcels || 1);
    await actions.save('installments', {
      ...installment,
      id: makeId('inst'),
      parcels,
      total: Number(installment.total),
      parcelValue: Number(installment.total) / parcels,
      createdAt: Date.now(),
    });
    setInstallment((current) => ({ ...current, desc: '', total: '' }));
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>{editingCard ? 'Editar cartao' : 'Novo cartao'}</h2></div>
        <form className="form-grid one-col" onSubmit={saveCard}>
          <Field label="Nome"><input value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} placeholder="Nubank, Sofisa..." /></Field>
          <Field label="Limite"><input type="number" min="0" step="0.01" value={card.limit} onChange={(event) => setCard({ ...card, limit: event.target.value })} /></Field>
          <Field label="Fechamento"><input type="number" min="1" max="31" value={card.closeDay} onChange={(event) => setCard({ ...card, closeDay: event.target.value })} /></Field>
          <Field label="Vencimento"><input type="number" min="1" max="31" value={card.dueDay} onChange={(event) => setCard({ ...card, dueDay: event.target.value })} /></Field>
          <Field label="Cor"><input type="color" value={card.color} onChange={(event) => setCard({ ...card, color: event.target.value })} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingCard ? <Check size={17} /> : <Plus size={17} />} {editingCard ? 'Atualizar' : 'Salvar'}</button>
            {editingCard && <button className="secondary-button" onClick={cancelEditCard} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Novo parcelamento</h2></div>
        <form className="form-grid one-col" onSubmit={saveInstallment}>
          <Field label="Descricao"><input value={installment.desc} onChange={(event) => setInstallment({ ...installment, desc: event.target.value })} /></Field>
          <Field label="Cartao">
            <select value={installment.cardId} onChange={(event) => setInstallment({ ...installment, cardId: event.target.value })}>
              <option value="">Selecione</option>
              {data.cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={installment.categoryId} onChange={(event) => setInstallment({ ...installment, categoryId: event.target.value })}>
              {data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Total"><input type="number" min="0" step="0.01" value={installment.total} onChange={(event) => setInstallment({ ...installment, total: event.target.value })} /></Field>
          <Field label="Parcelas"><input type="number" min="1" value={installment.parcels} onChange={(event) => setInstallment({ ...installment, parcels: event.target.value })} /></Field>
          <Field label="Primeira parcela"><input type="month" value={installment.firstMonth} onChange={(event) => setInstallment({ ...installment, firstMonth: event.target.value })} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Cartoes e faturas</h2>
            <p>Faturas calculadas por fechamento para {monthLabel(currentYear, currentMonth)}.</p>
          </div>
        </div>
        <div className="card-grid">
          {data.cards.map((item) => {
            const installmentTotal = monthInstallments
              .filter((entry) => entry.cardId === item.id)
              .reduce((sum, entry) => sum + Number(entry.parcelValue || 0), 0);
            const transactionTotal = transactionsForCardInvoice(data.transactions, item, invoiceMonth)
              .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
            const total = installmentTotal + transactionTotal;
            const invoiceKey = getInvoiceKey(item.id, invoiceMonth);
            const paidEntry = data.wallet.find((entry) => entry.source === 'invoice' && entry.invoiceKey === invoiceKey);
            const paymentMatchesInvoice = paidEntry && Math.abs(Number(paidEntry.amount || 0) - total) < 0.01;
            return (
              <div className="credit-card" key={item.id} style={{ borderColor: item.color }}>
                <div>
                  <strong>{item.name}</strong>
                  <span>Fecha dia {item.closeDay} · Vence dia {item.dueDay}</span>
                </div>
                <b>{formatCurrency(total)}</b>
                <small>Compras {formatCurrency(transactionTotal)} · Parcelas {formatCurrency(installmentTotal)}</small>
                <small>Vencimento {getInvoiceDueDate(item, invoiceMonth)} · {paidEntry ? (paymentMatchesInvoice ? 'Paga' : 'Pagamento divergente') : 'Aberta'}</small>
                <div className="card-actions">
                  <button className="icon-button" onClick={() => editCard(item)} title="Editar" type="button"><Pencil size={16} /></button>
                  <button className="icon-button danger" onClick={() => removeCard(item)} title="Excluir" type="button"><Trash2 size={16} /></button>
                </div>
                {total > 0 && (
                  paidEntry
                    ? (
                      <>
                        {!paymentMatchesInvoice && <button className="primary-button" onClick={() => actions.save('wallet', invoicePaymentEntry(item, invoiceMonth, total))} type="button"><Check size={16} /> Atualizar pagamento</button>}
                        <button className="secondary-button" onClick={() => actions.remove('wallet', paidEntry.id)} type="button"><RotateCcw size={16} /> Desfazer pagamento</button>
                      </>
                    )
                    : <button className="primary-button" onClick={() => actions.save('wallet', invoicePaymentEntry(item, invoiceMonth, total))} type="button"><Check size={16} /> Pagar fatura</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="list spacing-top">
          {monthInstallments.map((item) => (
            <div className="list-row" key={`${item.id}-${item.paidCount}`}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>Parcela {item.paidCount}/{item.parcels}</span>
              </div>
              <strong>{formatCurrency(item.parcelValue)}</strong>
              <button className="icon-button danger" onClick={() => actions.remove('installments', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="panel-subtitle spacing-top">Compras diretas no cartão</div>
        <div className="list spacing-top">
          {directCardTransactions.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>{item.date} · {item.cardName}</span>
              </div>
              <strong className="money-negative">{formatCurrency(item.amount)}</strong>
              <button className="icon-button danger" onClick={() => removeDirectTransaction(item)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
          {!directCardTransactions.length && <EmptyState title="Nenhuma compra direta em cartao neste mes." />}
        </div>
      </section>
    </div>
  );
}
