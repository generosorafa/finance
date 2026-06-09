import { Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon, EmptyState, paymentLabel } from '../ui.jsx';
import { formatCurrency, getCategory } from '../../utils/finance.js';

export function TransactionList({ data, items, actions, compact = false, onEdit }) {
  if (!items.length) return <EmptyState title="Nenhuma transacao por aqui." />;

  async function remove(item) {
    if (!window.confirm(`Excluir "${item.desc}"?`)) return;
    await actions.removeTransaction(item);
  }

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
            <strong className={item.type === 'receita' ? 'money-positive' : 'money-negative'}>
              {item.type === 'receita' ? '+' : '-'}{formatCurrency(item.amount)}
            </strong>
            {onEdit && (
              <button className="icon-button" onClick={() => onEdit(item)} title="Editar" type="button">
                <Pencil size={16} />
              </button>
            )}
            <button className="icon-button danger" onClick={() => remove(item)} title="Excluir" type="button">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
