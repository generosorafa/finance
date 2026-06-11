import { COLLECTIONS } from '../data/defaults.js';
import {
  applyAutomationRule,
  findAutomationRule,
  getCardIdFromPayment,
  getCardInvoiceMonth,
  makeId,
  normalizeText,
} from './finance.js';

export const TRANSACTION_COLUMN_FIELDS = [
  { id: 'data', label: 'Data', required: true },
  { id: 'descricao', label: 'Descricao', required: true },
  { id: 'valor', label: 'Valor', required: true },
  { id: 'tipo', label: 'Tipo', required: false },
  { id: 'categoria', label: 'Categoria', required: false },
  { id: 'pagamento', label: 'Pagamento', required: false },
  { id: 'necessidade', label: 'Necessidade', required: false },
  { id: 'observacao', label: 'Observacao', required: false },
];

const TRANSACTION_REQUIRED_HEADERS = TRANSACTION_COLUMN_FIELDS
  .filter((field) => field.required)
  .map((field) => field.id);

export function buildFinanceBackup(data, exportedAt = new Date().toISOString()) {
  const { settings = {}, ...collections } = data || {};

  return {
    app: 'finance',
    version: 1,
    exportedAt,
    settings,
    collections: Object.fromEntries(
      Object.entries(collections)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, value]),
    ),
  };
}

export function prepareBackupRestore(jsonText, currentData = {}) {
  const parsed = parseBackupJson(jsonText);
  if (parsed.error) return { ok: false, error: parsed.error };

  const backup = parsed.backup;
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    return { ok: false, error: 'Arquivo de backup precisa ser um objeto JSON.' };
  }

  if (backup.app !== 'finance') {
    return { ok: false, error: 'Este arquivo nao parece ser um backup do Finance.' };
  }

  if (Number(backup.version || 0) !== 1) {
    return { ok: false, error: 'Versao de backup nao suportada.' };
  }

  if (!backup.collections || typeof backup.collections !== 'object' || Array.isArray(backup.collections)) {
    return { ok: false, error: 'Backup sem colecoes validas.' };
  }

  const unknownCollections = Object.keys(backup.collections)
    .filter((name) => !COLLECTIONS.includes(name));
  const invalidDocs = [];
  const collections = {};
  const summary = [];

  COLLECTIONS.forEach((name) => {
    const source = backup.collections[name] || [];
    if (!Array.isArray(source)) {
      invalidDocs.push({ collection: name, id: '-', reason: 'colecao nao e uma lista' });
      return;
    }

    const docs = source.filter((item) => {
      const valid = item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string' && item.id.trim();
      if (!valid) invalidDocs.push({ collection: name, id: item?.id || '-', reason: 'documento sem id valido' });
      return valid;
    });
    const current = Array.isArray(currentData[name]) ? currentData[name] : [];
    const backupIds = new Set(docs.map((item) => item.id));
    const currentIds = new Set(current.map((item) => item.id));
    const creates = docs.filter((item) => !currentIds.has(item.id)).length;
    const updates = docs.length - creates;
    const removes = current.filter((item) => !backupIds.has(item.id)).length;

    collections[name] = docs;
    summary.push({
      name,
      count: docs.length,
      creates,
      updates,
      removes,
    });
  });

  if (invalidDocs.length) {
    const first = invalidDocs[0];
    return {
      ok: false,
      error: `Backup com documento invalido em ${first.collection}.`,
      invalidDocs,
    };
  }

  const settings = sanitizeSettings(backup.settings);
  const totalDocs = summary.reduce((sum, item) => sum + item.count, 0);

  return {
    ok: true,
    backup: {
      app: backup.app,
      version: backup.version,
      exportedAt: backup.exportedAt || '',
      settings,
      collections,
    },
    summary,
    totalDocs,
    settingsKeys: Object.keys(settings),
    unknownCollections,
  };
}

export function prepareTransactionImport(csvText, {
  categories = [],
  paymentMethods = [],
  cards = [],
  automationRules = [],
  existingTransactions = [],
  columnMap = null,
  now = Date.now(),
} = {}) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    return { items: [], rejected: [], duplicates: [], headers: [], totalRows: 0 };
  }

  const headers = columnMap
    ? headersFromColumnMap(rows[0], columnMap)
    : rows[0].map(normalizeHeader);
  const missing = TRANSACTION_REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    return {
      items: [],
      rejected: [{
        rowNumber: 1,
        reason: `Cabecalhos obrigatorios ausentes: ${missing.join(', ')}`,
        raw: rows[0],
      }],
      duplicates: [],
      headers,
      totalRows: Math.max(0, rows.length - 1),
    };
  }

  const seenKeys = new Set(existingTransactions.map(transactionImportKey));
  const duplicates = [];
  const rejected = [];
  const items = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some((cell) => String(cell || '').trim())) return;

    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex] || '']));
    const parsed = transactionFromImportRecord(record, {
      categories,
      paymentMethods,
      cards,
      automationRules,
      now: now + index,
    });

    if (parsed.error) {
      rejected.push({ rowNumber, reason: parsed.error, raw: row });
      return;
    }

    const key = transactionImportKey(parsed.item);
    if (seenKeys.has(key)) {
      duplicates.push({ rowNumber, item: parsed.item });
      return;
    }

    seenKeys.add(key);
    items.push(parsed.item);
  });

  return {
    items,
    rejected,
    duplicates,
    headers,
    totalRows: Math.max(0, rows.length - 1),
  };
}

export function parseCsv(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(cleanText);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const next = cleanText[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((item) => item.map((cellValue) => String(cellValue || '').trim()))
    .filter((item) => item.some((cellValue) => cellValue));
}

export function suggestTransactionColumnMap(headers) {
  return (headers || []).reduce((mapping, header, index) => {
    const normalized = normalizeHeader(header);
    const field = TRANSACTION_COLUMN_FIELDS.find((item) => item.id === normalized);
    if (field && mapping[field.id] === undefined) {
      return { ...mapping, [field.id]: String(index) };
    }
    return mapping;
  }, {});
}

export function buildTransactionImportTemplate({ id, name, headers, columnMap, now = Date.now() }) {
  const cleanColumnMap = cleanTemplateColumnMap(columnMap);

  return {
    id,
    name: String(name || '').trim(),
    columnMap: cleanColumnMap,
    headerMap: Object.fromEntries(
      Object.entries(cleanColumnMap).map(([fieldId, rawIndex]) => {
        const index = Number(rawIndex);
        return [fieldId, headers[index] || ''];
      }),
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyTransactionImportTemplate(headers, template) {
  const sourceHeaders = headers || [];
  const usedIndexes = new Set();
  const mapping = {};

  TRANSACTION_COLUMN_FIELDS.forEach((field) => {
    const storedHeader = template?.headerMap?.[field.id];
    const storedIndex = template?.columnMap?.[field.id];
    const indexByHeader = findHeaderIndex(sourceHeaders, storedHeader, usedIndexes);
    const fallbackIndex = Number(storedIndex);
    const finalIndex = indexByHeader >= 0
      ? indexByHeader
      : Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < sourceHeaders.length && !usedIndexes.has(fallbackIndex)
        ? fallbackIndex
        : -1;

    if (finalIndex >= 0) {
      mapping[field.id] = String(finalIndex);
      usedIndexes.add(finalIndex);
    }
  });

  return mapping;
}

function transactionFromImportRecord(record, context) {
  const desc = stringValue(record.descricao || record.description);
  const date = parseImportDate(record.data || record.date);
  const amount = parseImportAmount(record.valor || record.amount);

  if (!date) return { error: 'Data invalida ou vazia.' };
  if (!desc) return { error: 'Descricao vazia.' };
  if (!Number.isFinite(amount) || amount === 0) return { error: 'Valor invalido ou zerado.' };

  const inferredType = parseImportType(record.tipo || record.type, amount);
  const category = findCategoryId(context.categories, record.categoria || record.category);
  const payment = findPaymentValue(context.paymentMethods, context.cards, record.pagamento || record.payment);
  const base = {
    id: makeId('tx_import'),
    type: inferredType,
    desc,
    amount: Math.abs(amount),
    date,
    category: category || context.categories[0]?.id || '',
    payment: payment || context.paymentMethods[0] || 'PIX',
    necessity: parseNecessity(record.necessidade || record.necessity),
    nature: 'variavel',
    linkedCardId: '',
    invoiceMonth: '',
    note: stringValue(record.observacao || record.observation || record.note),
    createdAt: context.now,
  };

  const rule = findAutomationRule(context.automationRules, base.desc);
  const itemWithRule = applyAutomationRule(base, rule);
  const linkedCardId = getCardIdFromPayment(itemWithRule.payment);
  const card = context.cards.find((entry) => entry.id === linkedCardId);

  return {
    item: {
      ...itemWithRule,
      linkedCardId,
      invoiceMonth: linkedCardId ? getCardInvoiceMonth(card, itemWithRule.date) : '',
    },
  };
}

function headersFromColumnMap(sourceHeaders, columnMap) {
  const headers = sourceHeaders.map((_, index) => `__ignore_${index}`);

  Object.entries(columnMap || {}).forEach(([fieldId, rawIndex]) => {
    if (rawIndex === '' || rawIndex === null || rawIndex === undefined) return;
    const index = Number(rawIndex);
    if (Number.isInteger(index) && index >= 0 && index < headers.length) {
      headers[index] = fieldId;
    }
  });

  return headers;
}

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount >= commaCount ? ';' : ',';
}

function normalizeHeader(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const aliases = {
    data_da_transacao: 'data',
    date: 'data',
    descricao: 'descricao',
    descri_o: 'descricao',
    description: 'descricao',
    historico: 'descricao',
    tipo: 'tipo',
    type: 'tipo',
    categoria: 'categoria',
    category: 'categoria',
    forma_de_pagamento: 'pagamento',
    pagamento: 'pagamento',
    payment: 'pagamento',
    necessidade: 'necessidade',
    necessity: 'necessidade',
    natureza: 'natureza',
    valor: 'valor',
    amount: 'valor',
    observacao: 'observacao',
    observa_o: 'observacao',
    note: 'observacao',
  };

  return aliases[normalized] || normalized;
}

function parseImportDate(value) {
  const text = stringValue(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return '';

  const [, day, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return '';
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseImportAmount(value) {
  const text = stringValue(value)
    .replace(/\s/g, '')
    .replace(/R\$/i, '');
  if (!text) return Number.NaN;

  if (text.includes(',')) {
    return Number(text.replace(/\./g, '').replace(',', '.'));
  }

  return Number(text);
}

function parseImportType(value) {
  const text = normalizeText(value);
  if (['receita', 'entrada', 'credito', 'credit'].includes(text)) return 'receita';
  if (['despesa', 'saida', 'debito', 'debit'].includes(text)) return 'despesa';
  return 'despesa';
}

function parseNecessity(value) {
  const text = normalizeText(value);
  if (['eventual', 'variavel'].includes(text)) return 'eventual';
  if (['nao_necessario', 'nao necessario', 'superfluo'].includes(text)) return 'nao_necessario';
  return 'necessario';
}

function findCategoryId(categories, value) {
  const text = normalizeText(value);
  if (!text) return '';
  const found = categories.find((item) => normalizeText(item.id) === text || normalizeText(item.name) === text);
  return found?.id || '';
}

function findPaymentValue(paymentMethods, cards, value) {
  const text = normalizeText(value);
  if (!text) return '';

  const payment = paymentMethods.find((item) => normalizeText(item) === text);
  if (payment) return payment;

  const card = cards.find((item) => (
    normalizeText(item.id) === text
    || normalizeText(item.name) === text
    || normalizeText(`cartao ${item.name}`) === text
  ));

  return card ? `CC::${card.id}` : '';
}

function transactionImportKey(item) {
  return [
    item.date,
    normalizeText(item.desc),
    item.type,
    Number(item.amount || 0).toFixed(2),
  ].join('|');
}

function stringValue(value) {
  return String(value || '').trim();
}

function cleanTemplateColumnMap(columnMap) {
  return Object.fromEntries(
    Object.entries(columnMap || {})
      .filter(([fieldId, rawIndex]) => (
        TRANSACTION_COLUMN_FIELDS.some((field) => field.id === fieldId)
        && rawIndex !== ''
        && rawIndex !== null
        && rawIndex !== undefined
        && Number.isInteger(Number(rawIndex))
      ))
      .map(([fieldId, rawIndex]) => [fieldId, String(Number(rawIndex))]),
  );
}

function findHeaderIndex(headers, storedHeader, usedIndexes) {
  const normalized = normalizeText(storedHeader);
  if (!normalized) return -1;

  return headers.findIndex((header, index) => (
    !usedIndexes.has(index)
    && normalizeText(header) === normalized
  ));
}

function parseBackupJson(jsonText) {
  try {
    return { backup: JSON.parse(jsonText) };
  } catch {
    return { error: 'Arquivo JSON invalido.' };
  }
}

function sanitizeSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};

  const sanitized = {};

  if (Array.isArray(settings.paymentMethods)) {
    sanitized.paymentMethods = settings.paymentMethods
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  }

  if (settings.initialBalance !== undefined && settings.initialBalance !== null && Number.isFinite(Number(settings.initialBalance))) {
    sanitized.initialBalance = Number(settings.initialBalance);
  }

  if (typeof settings.initialDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(settings.initialDate)) {
    sanitized.initialDate = settings.initialDate;
  }

  return sanitized;
}
