import { Package } from 'lucide-react';
import { CATEGORY_ICON_MAP } from '../navigation.js';
import { formatCurrency, getCardIdFromPayment } from '../utils/finance.js';

export function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map(([id, label]) => (
        <button className={value === id ? 'active' : ''} key={id} onClick={() => onChange(id)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}

export function CategoryBars({ items, total }) {
  if (!items.length) return <EmptyState title="Sem gastos categorizados neste mes." />;

  return (
    <div className="bar-list">
      {items.map(({ category, total: value }) => (
        <div key={category.id}>
          <div className="bar-label">
            <span>{category.name}</span>
            <strong>{formatCurrency(value)}</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${Math.min(100, (value / total) * 100)}%`, background: category.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryIcon({ category }) {
  const Icon = CATEGORY_ICON_MAP[category.emoji] || Package;
  return <Icon size={18} />;
}

export function paymentLabel(payment, cards) {
  const cardId = getCardIdFromPayment(payment);
  if (!cardId) return payment || '-';
  const card = cards.find((item) => item.id === cardId);
  return card ? `Cartao ${card.name}` : 'Cartao';
}

export function EmptyState({ title }) {
  return <div className="empty-state">{title}</div>;
}

