import { Trash2 } from 'lucide-react';
import { CategoryIcon, EmptyState, paymentLabel } from '../ui.jsx';
import { formatCurrency, getCategory } from '../../utils/finance.js';

export function TransactionList({ data, items, actions, compact = false }) {
  if (!items.length) return <EmptyState title="Nenhuma transacao por aqui." />;

  return (
    <div className="list">
      {items.map((item) => {
        const category = getCategory(data.categories, item.category);
        return (
          <div className="list-row" key={item.id}>
            <div className="row-icon" style={{ color: category.color }}>
              <CategoryIcon category={category} />
            </div>
            <div className="row-main">
              <strong>{item.desc}</strong>
              <span>{item.date || '-'} · {category.name} · {paymentLabel(item.payment, data.cards)}</span>
            </div>
            {!compact && item.recurrent === 'sim' && <span className="pill">recorrente</span>}
            <strong className={item.type === 'receita' ? 'money-positive' : 'money-negative'}>
              {item.type === 'receita' ? '+' : '-'}{formatCurrency(item.amount)}
            </strong>
            <button className="icon-button danger" onClick={() => actions.remove('transactions', item.id)} title="Excluir" type="button">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

