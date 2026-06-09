import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CategoryIcon, Field } from '../components/ui.jsx';
import { makeId } from '../utils/finance.js';

export function CategoriesPage({ data, actions }) {
  const [form, setForm] = useState({ name: '', color: '#4b9cd3' });
  const [editingCategory, setEditingCategory] = useState(null);

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
