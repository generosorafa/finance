import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryIcon, Field } from '../components/ui.jsx';
import { makeId } from '../utils/finance.js';

export function CategoriesPage({ data, actions }) {
  const [form, setForm] = useState({ name: '', color: '#4b9cd3' });

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await actions.save('categories', {
      id: makeId('cat'),
      name: form.name,
      color: form.color,
      emoji: 'Package',
      createdAt: Date.now(),
    });
    setForm({ name: '', color: '#4b9cd3' });
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>Nova categoria</h2></div>
        <form className="form-grid one-col" onSubmit={submit}>
          <Field label="Nome"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Cor"><input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
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
                <button className="icon-button danger" onClick={() => actions.remove('categories', item.id)} title="Excluir" type="button">
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

