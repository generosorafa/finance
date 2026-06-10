import { useEffect, useState } from 'react';
import { Check, Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { EmptyState, Field, paymentLabel } from '../components/ui.jsx';
import { downloadText } from '../utils/download.js';
import {
  TRANSACTION_COLUMN_FIELDS,
  buildFinanceBackup,
  parseCsv,
  prepareTransactionImport,
  suggestTransactionColumnMap,
} from '../utils/importExport.js';
import { exportTransactionsCsv, formatCurrency, makeId, today } from '../utils/finance.js';

export function SettingsPage({ data, actions, paymentMethods }) {
  const [newMethod, setNewMethod] = useState('');
  const [importDraft, setImportDraft] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
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

  function exportBackup() {
    const backup = buildFinanceBackup(data);
    downloadText(`finance-backup-${today()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
  }

  function exportTransactions() {
    const csv = exportTransactionsCsv(data.transactions, data.categories);
    downloadText(`finance-transacoes-${today()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  function downloadTemplate() {
    const csv = [
      'Data;Descricao;Tipo;Categoria;Pagamento;Valor;Observacao',
      '2026-06-10;Mercado;Despesa;Alimentacao;PIX;123,45;Compra semanal',
      '2026-06-10;Salario;Receita;Salario / Receita;Transferencia;3000,00;',
    ].join('\r\n');
    downloadText('modelo-importacao-transacoes.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  async function previewImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      setImportDraft(null);
      setImportResult(null);
      setImportMessage('Arquivo vazio ou sem linhas validas.');
      event.target.value = '';
      return;
    }

    const headers = rows[0];
    setImportDraft({
      fileName: file.name,
      text,
      headers,
      totalRows: Math.max(0, rows.length - 1),
      columnMap: suggestTransactionColumnMap(headers),
    });
    setImportFileName(file.name);
    setImportResult(null);
    setImportMessage('');
    event.target.value = '';
  }

  function updateColumnMapping(fieldId, value) {
    setImportDraft((current) => current
      ? { ...current, columnMap: { ...current.columnMap, [fieldId]: value } }
      : current);
    setImportResult(null);
  }

  function buildImportPreview() {
    if (!importDraft) return;

    const result = prepareTransactionImport(importDraft.text, {
      categories: data.categories,
      paymentMethods,
      cards: data.cards,
      automationRules: data.automationRules,
      existingTransactions: data.transactions,
      columnMap: importDraft.columnMap,
    });

    setImportFileName(importDraft.fileName);
    setImportResult(result);
    setImportMessage('');
  }

  async function saveImportedTransactions() {
    if (!importResult?.items.length) return;

    setImporting(true);
    setImportMessage('');
    try {
      for (const item of importResult.items) {
        await actions.saveTransaction(item);
      }
      setImportMessage(`${importResult.items.length} transacao(oes) importada(s).`);
      setImportResult(null);
      setImportDraft(null);
      setImportFileName('');
    } catch (error) {
      setImportMessage(error.message || 'Nao foi possivel importar as transacoes.');
    } finally {
      setImporting(false);
    }
  }

  const selectedImportColumns = importDraft
    ? Object.values(importDraft.columnMap).filter((value) => value !== '' && value !== undefined)
    : [];
  const repeatedImportColumns = selectedImportColumns.length !== new Set(selectedImportColumns).size;
  const missingImportFields = importDraft
    ? TRANSACTION_COLUMN_FIELDS
      .filter((field) => field.required && !importDraft.columnMap[field.id])
      .map((field) => field.label)
    : [];
  const canReviewImport = !!importDraft && !missingImportFields.length && !repeatedImportColumns;

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Dados e backup</h2>
            <p>Exporte seus dados e importe transacoes por CSV com revisao antes de salvar.</p>
          </div>
        </div>
        <div className="data-actions">
          <button className="primary-button" onClick={exportBackup} type="button"><Download size={17} /> Backup JSON</button>
          <button className="secondary-button" onClick={exportTransactions} type="button"><FileText size={17} /> Transacoes CSV</button>
          <button className="secondary-button" onClick={downloadTemplate} type="button"><Download size={17} /> Modelo CSV</button>
        </div>
        <div className="import-box spacing-top">
          <Field label="Importar CSV de transacoes">
            <input accept=".csv,text/csv" onChange={previewImport} type="file" />
          </Field>
          <p>Depois de escolher o arquivo, confira qual coluna vira Data, Descricao, Valor e demais campos.</p>
        </div>
        {importDraft && (
          <div className="column-map spacing-top">
            <div className="panel-header compact-header">
              <div>
                <h2>Mapear colunas</h2>
                <p>{importDraft.fileName} · {importDraft.totalRows} linha(s) encontrada(s)</p>
              </div>
              <button className="primary-button" disabled={!canReviewImport} onClick={buildImportPreview} type="button">
                <FileText size={17} /> Revisar importacao
              </button>
            </div>
            <div className="mapping-grid spacing-top">
              {TRANSACTION_COLUMN_FIELDS.map((field) => (
                <Field label={`${field.label}${field.required ? ' *' : ''}`} key={field.id}>
                  <select value={importDraft.columnMap[field.id] ?? ''} onChange={(event) => updateColumnMapping(field.id, event.target.value)}>
                    <option value="">Nao importar</option>
                    {importDraft.headers.map((header, index) => (
                      <option key={`${field.id}_${index}`} value={String(index)}>
                        Coluna {index + 1}: {header || 'Sem nome'}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            {!!missingImportFields.length && (
              <div className="notice compact error spacing-top">Mapeie os campos obrigatorios: {missingImportFields.join(', ')}.</div>
            )}
            {repeatedImportColumns && (
              <div className="notice compact error spacing-top">Cada campo precisa apontar para uma coluna diferente.</div>
            )}
          </div>
        )}
        {importMessage && <div className="notice compact spacing-top">{importMessage}</div>}
        {importResult && (
          <div className="import-review spacing-top">
            <div className="panel-header compact-header">
              <div>
                <h2>Revisao da importacao</h2>
                <p>{importFileName} · {importResult.totalRows} linha(s) lida(s)</p>
              </div>
              <button className="primary-button" disabled={!importResult.items.length || importing} onClick={saveImportedTransactions} type="button">
                <Upload size={17} /> Importar {importResult.items.length}
              </button>
            </div>
            <div className="import-stats">
              <span><strong>{importResult.items.length}</strong> prontas</span>
              <span><strong>{importResult.duplicates.length}</strong> duplicadas</span>
              <span><strong>{importResult.rejected.length}</strong> recusadas</span>
            </div>
            <div className="list spacing-top">
              {importResult.items.slice(0, 8).map((item) => (
                <div className="list-row" key={item.id}>
                  <div className="row-main">
                    <strong>{item.date} · {item.desc}</strong>
                    <span>{item.type === 'receita' ? 'Receita' : 'Despesa'} · {categoryName(data.categories, item.category)} · {paymentLabel(item.payment, data.cards)}</span>
                  </div>
                  <strong className={item.type === 'receita' ? 'money-positive' : 'money-negative'}>{formatCurrency(item.amount)}</strong>
                </div>
              ))}
              {!importResult.items.length && <EmptyState title="Nenhuma transacao pronta para importar." />}
            </div>
            {(importResult.duplicates.length > 0 || importResult.rejected.length > 0) && (
              <div className="key-list spacing-top">
                {importResult.duplicates.slice(0, 3).map((item) => (
                  <span key={`duplicate_${item.rowNumber}`}>Linha {item.rowNumber}: possivel duplicada de {item.item.desc}</span>
                ))}
                {importResult.rejected.slice(0, 3).map((item) => (
                  <span key={`rejected_${item.rowNumber}`}>Linha {item.rowNumber}: {item.reason}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
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
