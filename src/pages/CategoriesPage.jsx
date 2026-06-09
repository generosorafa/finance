import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CategoryIcon, Field } from '../components/ui.jsx';
import {
  categoryBudgetForMonth,
  categoryBudgetId,
  categorySpendingForMonth,
  formatCurrency,
  makeId,
  monthKeyFromParts,
} from '../utils/finance.js';

export function CategoriesPage({ data, actions, currentMonth, currentYear }) {
  const [form, setForm] = useState({ name: '', color: '#4b9cd3' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const budgetMonth = monthKeyFromParts(currentYear, currentMonth);
  const spendingRows = categorySpendingForMonth(data, currentMonth, currentYear);
  const budgetCategories = data.categories.filter((item) => !item.special && item.id !== 'cat_salario');

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await actions.save('categories', {
      ...editingCategory,
      id: editingCategory?.id || makeId('cat'),
      name: form.name,
      color: form.color,
      emoji: editingCategory?.emoji || 'Package',
      createdAt: editingCategory?.createdAt || Date.now(),
    });
    setEditingCategory(null);
    setForm({ name: '', color: '#4b9cd3' });
  }

  function editCategory(item) {
    setEditingCategory(item);
    setForm({ name: item.name || '', color: item.color || '#4b9cd3' });
  }

  function cancelEdit() {
    setEditingCategory(null);
    setForm({ name: '', color: '#4b9cd3' });
  }

  async function removeCategory(item) {
    const hasTransactions = data.transactions.some((entry) => entry.category === item.id);
    const hasInstallments = data.installments.some((entry) => entry.categoryId === item.id);
    const hasFixedItems = data.fixedItems.some((entry) => entry.category === item.id);
    if (hasTransactions || hasInstallments || hasFixedItems) {
      window.alert('Esta categoria tem transacoes, parcelamentos ou fixos/assinaturas vinculados. Edite/remova esses itens antes de excluir.');
      return;
    }
    if (!window.confirm(`Excluir a categoria "${item.name}"?`)) return;
    await actions.remove('categories', item.id);
  }

  function budgetValue(categoryId) {
    const draftKey = `${budgetMonth}:${categoryId}`;
    if (budgetDrafts[draftKey] !== undefined) return budgetDrafts[draftKey];
    const budget = categoryBudgetForMonth(data.categoryBudgets, categoryId, budgetMonth);
    return budget?.amount ? String(budget.amount) : '';
  }

  async function saveBudget(category) {
    const amount = Number(budgetValue(category.id) || 0);
    const existing = data.categoryBudgets.find((item) => item.id === categoryBudgetId(category.id, budgetMonth));
    await actions.save('categoryBudgets', {
      id: categoryBudgetId(category.id, budgetMonth),
      categoryId: category.id,
      month: budgetMonth,
      amount,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    setBudgetDrafts((current) => ({ ...current, [`${budgetMonth}:${category.id}`]: String(amount || '') }));
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</h2></div>
        <form className="form-grid one-col" onSubmit={submit}>
          <Field label="Nome"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Cor"><input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">{editingCategory ? <Check size={17} /> : <Plus size={17} />} {editingCategory ? 'Atualizar' : 'Salvar'}</button>
            {editingCategory && <button className="secondary-button" onClick={cancelEdit} type="button"><X size={17} /> Cancelar</button>}
          </div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Alvos por categoria</h2>
            <p>O alvo salvo em {budgetMonth} vale para este mes e para os proximos, ate voce mudar novamente.</p>
          </div>
        </div>
        <div className="budget-list">
          {budgetCategories.map((item) => {
            const spent = spendingRows.find((row) => row.category.id === item.id)?.total || 0;
            const budget = Number(budgetValue(item.id) || 0);
            const percent = budget > 0 ? (spent / budget) * 100 : 0;
            return (
              <div className="budget-row" key={item.id}>
                <div className="row-icon" style={{ color: item.color }}>
                  <CategoryIcon category={item} />
                </div>
                <div className="budget-main">
                  <div className="bar-label">
                    <span>{item.name}</span>
                    <strong>{budget > 0 ? `${formatCurrency(spent)} de ${formatCurrency(budget)} · ${percent.toFixed(0)}%` : `${formatCurrency(spent)} · sem alvo`}</strong>
                  </div>
                  <div className="meter">
                    <span className={percent > 100 ? 'over-budget' : ''} style={{ width: `${Math.min(100, percent)}%`, background: item.color }} />
                  </div>
                </div>
                <input
                  aria-label={`Alvo de ${item.name}`}
                  className="budget-input"
                  min="0"
                  step="0.01"
                  type="number"
                  value={budgetValue(item.id)}
                  onChange={(event) => setBudgetDrafts((current) => ({ ...current, [`${budgetMonth}:${item.id}`]: event.target.value }))}
                  placeholder="Alvo"
                />
                <button className="icon-button" onClick={() => saveBudget(item)} title="Salvar alvo" type="button">
                  <Check size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>Categorias</h2></div>
        <div className="chip-grid">
          {data.categories.map((item) => (
            <div className="category-chip" key={item.id}>
              <span style={{ color: item.color }}><CategoryIcon category={item} /></span>
              <strong>{item.name}</strong>
              {item.special && <small>{item.special}</small>}
              {!item.special && (
                <button className="icon-button" onClick={() => editCategory(item)} title="Editar" type="button">
                  <Pencil size={15} />
                </button>
              )}
              {!item.special && (
                <button className="icon-button danger" onClick={() => removeCategory(item)} title="Excluir" type="button">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
