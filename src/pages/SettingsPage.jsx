import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function SettingsPage({ data, actions, paymentMethods }) {
  const [newMethod, setNewMethod] = useState('');

  async function addMethod(event) {
    event.preventDefault();
    if (!newMethod.trim() || paymentMethods.includes(newMethod.trim())) return;
    await actions.saveSettings({ paymentMethods: [...paymentMethods, newMethod.trim()] });
    setNewMethod('');
  }

  async function removeMethod(method) {
    await actions.saveSettings({ paymentMethods: paymentMethods.filter((item) => item !== method) });
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Formas de pagamento</h2>
            <p>Usadas nos lancamentos de transacoes.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={addMethod}>
          <input value={newMethod} onChange={(event) => setNewMethod(event.target.value)} placeholder="Nova forma" />
          <button className="primary-button" type="submit"><Plus size={17} /> Adicionar</button>
        </form>
        <div className="chip-grid spacing-top">
          {paymentMethods.map((item) => (
            <div className="category-chip" key={item}>
              <strong>{item}</strong>
              <button className="icon-button danger" onClick={() => removeMethod(item)} title="Remover" type="button"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Firebase</h2>
            <p>Dados em Firestore por usuario autenticado.</p>
          </div>
        </div>
        <div className="key-list">
          <span>Colecoes: {Object.keys(data).filter((key) => Array.isArray(data[key])).length}</span>
          <span>Regras: users/userId/document</span>
          <span>Auth: Google</span>
        </div>
      </section>
    </div>
  );
}

