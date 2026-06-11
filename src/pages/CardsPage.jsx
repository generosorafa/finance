import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { EmptyState, Field } from '../components/ui.jsx';
import {
  cardInvoiceSummaries,
  formatCurrency,
  getCardIdFromPayment,
  getCategory,
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
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState({});
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
  const invoiceSummaries = cardInvoiceSummaries(data, currentMonth, currentYear);
  const selectedInvoice = invoiceSummaries.find((item) => item.invoiceKey === selectedInvoiceKey)
    || invoiceSummaries.find((item) => item.total > 0)
    || invoiceSummaries[0]
    || null;
  const selectedDirectTransactions = selectedInvoice
    ? transactionsForCardInvoice(data.transactions, selectedInvoice.card, invoiceMonth)
    : [];
  const selectedInstallments = selectedInvoice
    ? monthInstallments.filter((item) => item.cardId === selectedInvoice.card.id)
    : [];

  useEffect(() => {
    setInstallment((current) => ({
      ...current,
      cardId: current.cardId || data.cards[0]?.id || '',
      categoryId: current.categoryId || data.categories[0]?.id || '',
    }));
  }, [data.cards, data.categories]);

  useEffect(() => {
    if (!selectedInvoiceKey && selectedInvoice) {
      setSelectedInvoiceKey(selectedInvoice.invoiceKey);
    }
  }, [selectedInvoice, selectedInvoiceKey]);

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

  async function removeInvoicePayment(item) {
    if (!window.confirm(`Remover pagamento de ${formatCurrency(item.amount)}?`)) return;
    await actions.remove('wallet', item.id);
  }

  function paymentValueFor(invoice) {
    if (!invoice) return '';
    if (Object.prototype.hasOwnProperty.call(paymentAmounts, invoice.invoiceKey)) {
      return paymentAmounts[invoice.invoiceKey];
    }
    return invoice.remaining > 0 ? invoice.remaining.toFixed(2) : '';
  }

  function setPaymentValue(invoiceKey, value) {
    setPaymentAmounts((current) => ({ ...current, [invoiceKey]: value }));
  }

  async function saveInvoicePayment(invoice, rawAmount) {
    const amount = Number(String(rawAmount || '').replace(',', '.'));
    if (!invoice || !Number.isFinite(amount) || amount <= 0) return;
    if (invoice.remaining > 0 && amount - invoice.remaining > 0.01) {
      const confirmed = window.confirm('Este valor e maior que o restante da fatura. Registrar mesmo assim?');
      if (!confirmed) return;
    }
    await actions.save('wallet', invoicePaymentEntry(invoice.card, invoiceMonth, amount, makeId('invoicepay')));
    setPaymentAmounts((current) => {
      const next = { ...current };
      delete next[invoice.invoiceKey];
      return next;
    });
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
          {invoiceSummaries.map((invoice) => (
            <div
              className={`credit-card invoice-card ${selectedInvoice?.invoiceKey === invoice.invoiceKey ? 'selected' : ''}`}
              key={invoice.card.id}
              style={{ borderColor: invoice.card.color }}
            >
              <div className="invoice-card-header">
                <div>
                  <strong>{invoice.card.name}</strong>
                  <span>Fecha dia {invoice.card.closeDay} · Vence dia {invoice.card.dueDay}</span>
                </div>
                <span className={`pill ${invoiceStatusTone(invoice.status)}`}>{invoiceStatusLabel(invoice.status)}</span>
              </div>
              <b>{formatCurrency(invoice.total)}</b>
              <div className="invoice-mini-grid">
                <span>Compras <strong>{formatCurrency(invoice.direct)}</strong></span>
                <span>Parcelas <strong>{formatCurrency(invoice.installments)}</strong></span>
                <span>Pago <strong>{formatCurrency(invoice.paidTotal)}</strong></span>
                <span>Restante <strong>{formatCurrency(invoice.remaining)}</strong></span>
              </div>
              <small>Vencimento {invoice.dueDate}</small>
              <div className="card-actions">
                <button className="icon-button" onClick={() => editCard(invoice.card)} title="Editar cartao" type="button"><Pencil size={16} /></button>
                <button className="icon-button danger" onClick={() => removeCard(invoice.card)} title="Excluir cartao" type="button"><Trash2 size={16} /></button>
              </div>
              <div className="invoice-actions">
                <button className="secondary-button" onClick={() => setSelectedInvoiceKey(invoice.invoiceKey)} type="button">Detalhes</button>
                {invoice.remaining > 0 && (
                  <button className="primary-button" onClick={() => saveInvoicePayment(invoice, invoice.remaining)} type="button">
                    <Check size={16} /> Quitar restante
                  </button>
                )}
                {!!invoice.paidEntries.length && (
                  <button className="secondary-button" onClick={() => removeInvoicePayment(invoice.paidEntries[0])} type="button">
                    <RotateCcw size={16} /> Desfazer ultimo
                  </button>
                )}
              </div>
            </div>
          ))}
          {!invoiceSummaries.length && <EmptyState title="Nenhum cartao cadastrado." />}
        </div>

        {selectedInvoice ? (
          <div className="invoice-detail spacing-top">
            <div className="panel-header compact-header">
              <div>
                <span className="eyebrow">Detalhe da fatura</span>
                <h3>{selectedInvoice.card.name} · {monthLabel(currentYear, currentMonth)}</h3>
                <p>Composicao por compras diretas, parcelas e pagamentos registrados.</p>
              </div>
              <span className={`pill ${invoiceStatusTone(selectedInvoice.status)}`}>{invoiceStatusLabel(selectedInvoice.status)}</span>
            </div>

            <div className="invoice-metric-grid">
              <InvoiceMetric label="Total da fatura" value={selectedInvoice.total} />
              <InvoiceMetric label="Compras diretas" value={selectedInvoice.direct} />
              <InvoiceMetric label="Parcelas" value={selectedInvoice.installments} />
              <InvoiceMetric label="Pago" value={selectedInvoice.paidTotal} />
              <InvoiceMetric label="Restante" value={selectedInvoice.remaining} tone={selectedInvoice.remaining > 0 ? 'negative' : 'positive'} />
              <InvoiceMetric label="Diferenca" value={selectedInvoice.difference} tone={selectedInvoice.difference > 0 ? 'warning' : 'muted'} />
            </div>

            <form
              className="invoice-payment-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveInvoicePayment(selectedInvoice, paymentValueFor(selectedInvoice));
              }}
            >
              <Field label="Registrar pagamento">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentValueFor(selectedInvoice)}
                  onChange={(event) => setPaymentValue(selectedInvoice.invoiceKey, event.target.value)}
                  placeholder="Valor pago"
                />
              </Field>
              <button className="primary-button" type="submit"><Plus size={17} /> Adicionar pagamento</button>
            </form>

            <div className="invoice-detail-grid">
              <InvoiceList title="Compras diretas">
                {selectedDirectTransactions.map((item) => (
                  <div className="list-row" key={item.id}>
                    <div className="row-main">
                      <strong>{item.desc}</strong>
                      <span>{item.date} · {getCategory(data.categories, item.category).name}</span>
                    </div>
                    <strong className="money-negative">{formatCurrency(item.amount)}</strong>
                    <button className="icon-button danger" onClick={() => removeDirectTransaction(item)} title="Excluir" type="button"><Trash2 size={16} /></button>
                  </div>
                ))}
                {!selectedDirectTransactions.length && <EmptyState title="Nenhuma compra direta nesta fatura." />}
              </InvoiceList>

              <InvoiceList title="Parcelas">
                {selectedInstallments.map((item) => (
                  <div className="list-row" key={`${item.id}-${item.paidCount}`}>
                    <div className="row-main">
                      <strong>{item.desc}</strong>
                      <span>Parcela {item.paidCount}/{item.parcels} · compra em {item.purchaseDate || '-'}</span>
                    </div>
                    <strong className="money-negative">{formatCurrency(item.parcelValue)}</strong>
                    <button className="icon-button danger" onClick={() => actions.remove('installments', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
                  </div>
                ))}
                {!selectedInstallments.length && <EmptyState title="Nenhuma parcela nesta fatura." />}
              </InvoiceList>

              <InvoiceList title="Pagamentos registrados">
                {(selectedInvoice.paidEntries || []).map((item) => (
                  <div className="list-row" key={item.id}>
                    <div className="row-main">
                      <strong>{item.desc}</strong>
                      <span>{item.date} · carteira</span>
                    </div>
                    <strong>{formatCurrency(item.amount)}</strong>
                    <button className="icon-button danger" onClick={() => removeInvoicePayment(item)} title="Remover pagamento" type="button"><Trash2 size={16} /></button>
                  </div>
                ))}
                {!selectedInvoice.paidEntries.length && <EmptyState title="Nenhum pagamento registrado." />}
              </InvoiceList>
            </div>
          </div>
        ) : (
          <div className="spacing-top">
            <EmptyState title="Cadastre um cartao para acompanhar faturas." />
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceMetric({ label, value, tone = 'muted' }) {
  const className = tone === 'positive'
    ? 'money-positive'
    : tone === 'negative' || tone === 'warning'
      ? 'money-negative'
      : '';

  return (
    <div className="invoice-metric">
      <span>{label}</span>
      <strong className={className}>{formatCurrency(value)}</strong>
    </div>
  );
}

function InvoiceList({ title, children }) {
  return (
    <div className="invoice-list-block">
      <div className="panel-subtitle">{title}</div>
      <div className="list">{children}</div>
    </div>
  );
}

function invoiceStatusLabel(status) {
  if (status === 'paid') return 'Paga';
  if (status === 'partial') return 'Parcial';
  if (status === 'overpaid' || status === 'divergent') return 'Divergente';
  if (status === 'open') return 'Aberta';
  return 'Sem valor';
}

function invoiceStatusTone(status) {
  if (status === 'paid') return 'positive';
  if (status === 'partial' || status === 'overpaid' || status === 'divergent') return 'warning';
  return 'muted';
}
