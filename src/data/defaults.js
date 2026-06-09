export const DEFAULT_CATEGORIES = [
  { id: 'cat_alim', name: 'Alimentacao', emoji: 'Basket', color: '#2fbf8f' },
  { id: 'cat_trans', name: 'Transporte', emoji: 'Car', color: '#4b9cd3' },
  { id: 'cat_saude', name: 'Saude', emoji: 'HeartPulse', color: '#ef6f6c' },
  { id: 'cat_lazer', name: 'Lazer', emoji: 'Gamepad2', color: '#d8a31a' },
  { id: 'cat_edu', name: 'Educacao', emoji: 'BookOpen', color: '#8d7cf6' },
  { id: 'cat_casa', name: 'Casa / Moradia', emoji: 'Home', color: '#5fb3a5' },
  { id: 'cat_roupas', name: 'Roupas', emoji: 'Shirt', color: '#d97862' },
  { id: 'cat_serv', name: 'Servicos / Assinaturas', emoji: 'Smartphone', color: '#66a6ff' },
  { id: 'cat_salario', name: 'Salario / Receita', emoji: 'BriefcaseBusiness', color: '#31b66f' },
  { id: 'cat_outros', name: 'Outros', emoji: 'Package', color: '#8a92a6' },
  { id: 'cat_invest', name: 'Investimento', emoji: 'TrendingUp', color: '#35a76d', special: 'investments' },
  { id: 'cat_metas', name: 'Metas', emoji: 'Target', color: '#7467df', special: 'goals' },
  { id: 'cat_dividas', name: 'Dividas', emoji: 'BadgeAlert', color: '#e15f5f', special: 'debts' },
];

export const DEFAULT_PAYMENT_METHODS = [
  'PIX',
  'Debito',
  'Dinheiro',
  'Transferencia',
];

export const COLLECTIONS = [
  'transactions',
  'installments',
  'fixedItems',
  'categoryBudgets',
  'cards',
  'categories',
  'wallet',
  'investments',
  'goals',
  'debts',
  'allocations',
];

export const SPECIAL_CATEGORIES = {
  cat_invest: 'investments',
  cat_metas: 'goals',
  cat_dividas: 'debts',
};

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
