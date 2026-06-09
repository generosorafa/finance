import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Field, paymentLabel } from '../components/ui.jsx';
import { makeId } from '../utils/finance.js';

export function SettingsPage({ data, actions, paymentMethods }) {
  const [newMethod, setNewMethod] = useState('');
  const [rule, setRule] = useState({
    name: '',
    matchText: '',
    type: 'despesa',
    category: data.categories[0]?.id || '',
    payment: paymentMethods[0] || 'PIX',
    necessity: 'necessario',
  });

  useEffect(() => {
    setRule((current) => ({
      ...current,
      category: current.category || data.categories[0]?.id || '',
      payment: current.payment || paymentMethods[0] || 'PIX',
    }));
  }, [data.categories, paymentMethods]);

  async function addMethod(event) {
    event.preventDefault();
    if (!newMethod.trim() || paymentMethods.includes(newMethod.trim())) return;
    await actions.saveSettings({ paymentMethods: [...paymentMethods, newMethod.trim()] });
    setNewMethod('');
  }

  async function removeMethod(method) {
    await actions.saveSettings({ paymentMethods: paymentMethods.filter((item) => item !== method) });
  }

  async function saveRule(event) {
    event.preventDefault();
    if (!rule.matchText.trim()) return;
    await actions.save('automationRules', {
      ...rule,
      id: makeId('rule'),
      name: rule.name.trim() || rule.matchText.trim(),
      matchText: rule.matchText.trim(),
      active: true,
      createdAt: Date.now(),
    });
    setRule((current) => ({ ...current, name: '', matchText: '' }));
  }

  async function toggleRule(item) {
    await actions.save('automationRules', {
      ...item,
      active: item.active === false,
    });
  }

  async function removeRule(item) {
    if (!window.confirm(`Excluir a regra "${item.name || item.matchText}"?`)) return;
    await actions.remove('automationRules', item.id);
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
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Regras automaticas</h2>
            <p>Preencha transacoes pelo texto da descricao.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={saveRule}>
          <Field label="Nome">
            <input value={rule.name} onChange={(event) => setRule({ ...rule, name: event.target.value })} placeholder="Mercado, Uber, salario..." />
          </Field>
          <Field label="Quando descricao contem">
            <input value={rule.matchText} onChange={(event) => setRule({ ...rule, matchText: event.target.value })} placeholder="Ex.: ifood, netflix, pix salario" />
          </Field>
          <Field label="Tipo">
            <select value={rule.type} onChange={(event) => setRule({ ...rule, type: event.target.value })}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </Field>
          <Field label="Categoria">
            <select value={rule.category} onChange={(event) => setRule({ ...rule, category: event.target.value })}>
              {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Pagamento">
            <select value={rule.payment} onChange={(event) => setRule({ ...rule, payment: event.target.value })}>
              {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
              {data.cards.map((card) => <option key={card.id} value={`CC::${card.id}`}>Cartao {card.name}</option>)}
            </select>
          </Field>
          <Field label="Necessidade">
            <select value={rule.necessity} onChange={(event) => setRule({ ...rule, necessity: event.target.value })}>
              <option value="necessario">Necessario</option>
              <option value="eventual">Eventual</option>
              <option value="nao_necessario">Nao necessario</option>
            </select>
          </Field>
          <div className="form-actions">
            <button className="primary-button" type="submit"><Plus size={17} /> Criar regra</button>
          </div>
        </form>
        <div className="list spacing-top">
          {data.automationRules.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name || item.matchText}</strong>
                <span>
                  contem "{item.matchText}" · {item.type === 'receita' ? 'Receita' : 'Despesa'} · {categoryName(data.categories, item.category)} · {paymentLabel(item.payment, data.cards)}
                </span>
              </div>
              <span className={`pill ${item.active === false ? 'muted' : 'positive'}`}>{item.active === false ? 'Inativa' : 'Ativa'}</span>
              <button className="icon-button" onClick={() => toggleRule(item)} title={item.active === false ? 'Ativar' : 'Desativar'} type="button"><Check size={15} /></button>
              <button className="icon-button danger" onClick={() => removeRule(item)} title="Remover" type="button"><Trash2 size={15} /></button>
            </div>
          ))}
          {!data.automationRules.length && (
            <div className="empty-state">Nenhuma regra automatica criada.</div>
          )}
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
          <span>Regras automaticas: {data.automationRules.length}</span>
        </div>
      </section>
    </div>
  );
}

function categoryName(categories, categoryId) {
  return categories.find((item) => item.id === categoryId)?.name || 'Sem categoria';
}
