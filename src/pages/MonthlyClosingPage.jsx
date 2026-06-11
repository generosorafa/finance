import { AlertTriangle, CheckCircle2, ClipboardCheck, RotateCcw, Save } from 'lucide-react';
import { EmptyState, Field, StatCard } from '../components/ui.jsx';
import {
  buildMonthlyClosingSnapshot,
  formatCurrency,
  monthlyClosingId,
  monthlyClosingInsights,
} from '../utils/finance.js';
import { useEffect, useMemo, useState } from 'react';

export function MonthlyClosingPage({ data, actions, currentMonth, currentYear, setPage }) {
  const insights = useMemo(
    () => monthlyClosingInsights(data, currentMonth, currentYear),
    [data, currentMonth, currentYear],
  );
  const closing = data.monthlyClosings.find((item) => item.id === monthlyClosingId(insights.month));
  const [note, setNote] = useState(closing?.note || '');
  const totalExpenses = insights.summary.despesas + insights.summary.parcelas;

  useEffect(() => {
    setNote(closing?.note || '');
  }, [closing?.id, closing?.note]);

  async function saveClosing() {
    const snapshot = buildMonthlyClosingSnapshot(data, currentMonth, currentYear, note);
    await actions.save('monthlyClosings', {
      ...snapshot,
      closedAt: closing?.closedAt || snapshot.closedAt,
    });
  }

  async function reopenClosing() {
    if (!closing) return;
    if (!window.confirm(`Reabrir o fechamento de ${insights.label}?`)) return;
    await actions.remove('monthlyClosings', closing.id);
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Receitas" value={formatCurrency(insights.summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(totalExpenses)} tone="negative" />
        <StatCard label="Saldo do mes" value={formatCurrency(insights.summary.saldo)} tone={insights.summary.saldo >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Carteira" value={formatCurrency(insights.wallet)} tone="info" />
      </section>

      <section className="panel span-2 closing-hero">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Fechamento mensal</span>
            <h2>{insights.label}</h2>
            <p>Conferencia do mes antes de virar a pagina: fixos, faturas, alvos, caixa reservado e saldo.</p>
          </div>
          <span className={`pill ${closing ? 'positive' : insights.readyToClose ? 'warning' : 'muted'}`}>
            {closing ? 'Fechado' : insights.readyToClose ? 'Pronto para fechar' : 'Com pontos de atencao'}
          </span>
        </div>

        <div className="closing-actions">
          <Field label="Observacao do fechamento">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: mes com viagem, bonus, compra pontual..."
            />
          </Field>
          <button className="primary-button" onClick={saveClosing} type="button">
            {closing ? <ClipboardCheck size={17} /> : <Save size={17} />}
            {closing ? 'Atualizar fechamento' : 'Salvar fechamento'}
          </button>
          {closing && (
            <button className="secondary-button" onClick={reopenClosing} type="button">
              <RotateCcw size={17} /> Reabrir mes
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Checklist</h2>
            <p>Itens que deixam o fechamento mais confiavel.</p>
          </div>
        </div>
        <div className="checklist">
          {insights.checklist.map((item) => (
            <div className="check-row" key={item.id}>
              {item.done ? <CheckCircle2 className="money-positive" size={20} /> : <AlertTriangle className="money-negative" size={20} />}
              <div className="row-main">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pendencias</h2>
            <p>O que merece acao antes de fechar.</p>
          </div>
        </div>
        <div className="closing-stack">
          <PendingBlock
            actionLabel="Ver fixos"
            items={insights.pendingFixed}
            onAction={() => setPage('fixed')}
            title="Fixos e assinaturas"
          />
          <PendingBlock
            actionLabel="Ver cartoes"
            items={insights.openInvoices}
            onAction={() => setPage('cards')}
            title="Faturas abertas ou divergentes"
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Alvos por categoria</h2>
            <p>Categoria perto ou acima do limite do mes.</p>
          </div>
          <button className="text-button" onClick={() => setPage('categories')} type="button">Ajustar</button>
        </div>
        <div className="list">
          {[...insights.overBudget, ...insights.warningBudget].map((item) => (
            <div className="list-row" key={item.category.id}>
              <div className="row-main">
                <strong>{item.category.name}</strong>
                <span>{formatCurrency(item.total)} de {formatCurrency(item.target)} · {item.percent.toFixed(0)}%</span>
              </div>
              <span className={`pill ${item.status === 'over' ? 'warning' : 'muted'}`}>
                {item.status === 'over' ? 'Acima' : 'Atencao'}
              </span>
            </div>
          ))}
          {!insights.overBudget.length && !insights.warningBudget.length && <EmptyState title="Nenhum alvo em zona de atencao." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Faturas do mes</h2>
            <p>Compras diretas e parcelas por cartao.</p>
          </div>
          <button className="text-button" onClick={() => setPage('cards')} type="button">Conferir</button>
        </div>
        <div className="list">
          {insights.cardInvoices.filter((item) => item.total > 0).map((item) => (
            <div className="list-row" key={item.card.id}>
              <div className="row-main">
                <strong>{item.card.name}</strong>
                <span>Vence {item.dueDate} · pago {formatCurrency(item.paidTotal)} · restante {formatCurrency(item.remaining)}</span>
              </div>
              <strong>{formatCurrency(item.total)}</strong>
              <span className={`pill ${invoiceStatusTone(item.status)}`}>
                {invoiceStatusLabel(item.status)}
              </span>
            </div>
          ))}
          {!insights.cardInvoices.some((item) => item.total > 0) && <EmptyState title="Nenhuma fatura com valor neste mes." />}
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Caixa reservado</h2>
            <p>Dinheiro separado para metas e dividas que ainda pode precisar de destino.</p>
          </div>
        </div>
        <div className="closing-cash-grid">
          <CashBox
            allocated={insights.goalsCash.allocatedTotal}
            available={insights.goalsCash.available}
            monthAmount={insights.goalsAllocated}
            source={insights.goalsCash.sourceTotal}
            title="Metas"
          />
          <CashBox
            allocated={insights.debtsCash.allocatedTotal}
            available={insights.debtsCash.available}
            monthAmount={insights.debtsAllocated}
            source={insights.debtsCash.sourceTotal}
            title="Dividas"
          />
        </div>
      </section>
    </div>
  );
}

function PendingBlock({ title, items, actionLabel, onAction }) {
  return (
    <div className="pending-block">
      <div className="panel-header compact-header">
        <strong>{title}</strong>
        {!!items.length && <button className="text-button" onClick={onAction} type="button">{actionLabel}</button>}
      </div>
      <div className="list">
        {items.slice(0, 4).map((item) => (
          <div className="list-row" key={item.id || item.invoiceKey}>
            <div className="row-main">
              <strong>{item.name || item.card?.name}</strong>
              <span>{item.dueDate ? `Vence ${item.dueDate}` : item.detail || ''}</span>
            </div>
            <strong className="money-negative">{formatCurrency(item.remaining ?? item.amount ?? item.total)}</strong>
          </div>
        ))}
        {!items.length && <EmptyState title="Nada pendente aqui." />}
      </div>
    </div>
  );
}

function CashBox({ title, source, allocated, available, monthAmount }) {
  return (
    <div className="cash-box">
      <div>
        <strong>{title}</strong>
        <span>Caixa criado por transacoes especiais.</span>
      </div>
      <div className="cash-metrics">
        <span>Fonte <strong>{formatCurrency(source)}</strong></span>
        <span>Distribuido <strong>{formatCurrency(allocated)}</strong></span>
        <span>Disponivel <strong className={available > 0 ? 'money-positive' : ''}>{formatCurrency(available)}</strong></span>
        <span>No mes <strong>{formatCurrency(monthAmount)}</strong></span>
      </div>
    </div>
  );
}

function invoiceStatusLabel(status) {
  if (status === 'paid') return 'Paga';
  if (status === 'partial') return 'Parcial';
  if (status === 'divergent' || status === 'overpaid') return 'Divergente';
  if (status === 'open') return 'Aberta';
  return 'Sem valor';
}

function invoiceStatusTone(status) {
  if (status === 'paid') return 'positive';
  if (status === 'partial' || status === 'divergent' || status === 'overpaid') return 'warning';
  return 'muted';
}
