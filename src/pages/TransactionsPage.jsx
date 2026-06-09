import { useState } from 'react';
import { SegmentedControl } from '../components/ui.jsx';
import { TransactionForm } from '../components/transactions/TransactionForm.jsx';
import { TransactionList } from '../components/transactions/TransactionList.jsx';
import { isSameMonth } from '../utils/finance.js';

export function TransactionsPage({ data, actions, paymentMethods, currentMonth, currentYear }) {
  const [filter, setFilter] = useState('all');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const monthly = data.transactions
    .filter((item) => isSameMonth(item.date, currentMonth, currentYear))
    .filter((item) => filter === 'all' || item.type === filter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>{editingTransaction ? 'Editar transacao' : 'Nova transacao'}</h2>
            <p>Receitas, despesas, gastos fixos e pagamentos em cartao ficam sincronizados com carteira e faturas.</p>
          </div>
        </div>
        <TransactionForm
          actions={actions}
          categories={data.categories}
          cards={data.cards}
          editingTransaction={editingTransaction}
          onCancelEdit={() => setEditingTransaction(null)}
          onSaved={() => setEditingTransaction(null)}
          paymentMethods={paymentMethods}
        />
      </section>
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Transacoes do mes</h2>
            <p>{monthly.length} registros encontrados.</p>
          </div>
          <SegmentedControl value={filter} onChange={setFilter} options={[
            ['all', 'Todas'],
            ['receita', 'Receitas'],
            ['despesa', 'Despesas'],
          ]} />
        </div>
        <TransactionList data={data} items={monthly} actions={actions} onEdit={setEditingTransaction} />
      </section>
    </div>
  );
}
