import { useEffect, useMemo, useState } from 'react';
import {
  BadgeAlert,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Gamepad2,
  HeartPulse,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  PieChart,
  Plus,
  Settings,
  Shirt,
  Smartphone,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { isFirebaseConfigured, loginWithGoogle, logout, subscribeToAuth } from './firebase/client.js';
import { useFinanceData } from './hooks/useFinanceData.js';
import {
  exportTransactionsCsv,
  formatCurrency,
  getCategory,
  installmentsForMonth,
  isSameMonth,
  makeId,
  monthKey,
  monthLabel,
  summarizeMonth,
  today,
  walletBalance,
} from './utils/finance.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transacoes', icon: ListChecks },
  { id: 'cards', label: 'Cartoes', icon: CreditCard },
  { id: 'categories', label: 'Categorias', icon: PieChart },
  { id: 'wallet', label: 'Carteira', icon: Wallet },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'debts', label: 'Dividas', icon: BadgeAlert },
  { id: 'reports', label: 'Relatorios', icon: Download },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

const ICONS = {
  BadgeAlert,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Gamepad2,
  HeartPulse,
  Home,
  Package,
  Shirt,
  Smartphone,
  Target,
  TrendingUp,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady(true);
      return undefined;
    }

    return subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  const finance = useFinanceData(user);

  useEffect(() => {
    if (!user || finance.loading || !finance.data.transactions.length) return;
    applyRecurrentTransactions(finance.data, finance.actions);
  }, [user, finance.loading, finance.data.transactions.length]);

  function moveMonth(delta) {
    const next = new Date(currentYear, currentMonth + delta, 1);
    setCurrentMonth(next.getMonth());
    setCurrentYear(next.getFullYear());
  }

  if (!isFirebaseConfigured) return <SetupScreen />;
  if (!authReady) return <SplashScreen />;
  if (!user) return <LoginScreen />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><CircleDollarSign size={22} /></div>
          <div>
            <strong>Finance</strong>
            <span>controle pessoal</span>
          </div>
        </div>

        <div className="user-card">
          <img src={user.photoURL || ''} alt="" />
          <div>
            <strong>{user.displayName || 'Usuario'}</strong>
            <span>{user.email}</span>
          </div>
          <button className="icon-button" onClick={logout} title="Sair" type="button">
            <LogOut size={17} />
          </button>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => setPage(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Financas pessoais</span>
            <h1>{NAV_ITEMS.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="month-switcher">
            <button className="icon-button" onClick={() => moveMonth(-1)} title="Mes anterior" type="button">
              <ChevronLeft size={18} />
            </button>
            <strong>{monthLabel(currentYear, currentMonth)}</strong>
            <button className="icon-button" onClick={() => moveMonth(1)} title="Proximo mes" type="button">
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        {finance.error && <div className="notice error">{finance.error}</div>}
        {finance.loading && <div className="notice">Carregando dados...</div>}

        <PageRenderer
          data={finance.data}
          actions={finance.actions}
          page={page}
          paymentMethods={finance.paymentMethods}
          currentMonth={currentMonth}
          currentYear={currentYear}
          setPage={setPage}
        />
      </main>
    </div>
  );
}

function PageRenderer(props) {
  if (props.page === 'transactions') return <TransactionsPage {...props} />;
  if (props.page === 'cards') return <CardsPage {...props} />;
  if (props.page === 'categories') return <CategoriesPage {...props} />;
  if (props.page === 'wallet') return <WalletPage {...props} />;
  if (props.page === 'investments') return <InvestmentsPage {...props} />;
  if (props.page === 'goals') return <GoalsPage {...props} />;
  if (props.page === 'debts') return <DebtsPage {...props} />;
  if (props.page === 'reports') return <ReportsPage {...props} />;
  if (props.page === 'settings') return <SettingsPage {...props} />;
  return <DashboardPage {...props} />;
}

function DashboardPage({ data, actions, paymentMethods, currentMonth, currentYear, setPage }) {
  const summary = summarizeMonth(data, currentMonth, currentYear);
  const balance = walletBalance(data);
  const recent = [...summary.monthTransactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  const categoryTotals = data.categories.map((category) => ({
    category,
    total: summary.monthTransactions
      .filter((item) => item.type === 'despesa' && item.category === category.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="content-grid">
      <section className="stat-grid">
        <StatCard label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(summary.despesas + summary.parcelas)} tone="negative" />
        <StatCard label="Saldo do mes" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Carteira" value={formatCurrency(balance)} tone="info" />
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Lancar transacao</h2>
            <p>Receitas, despesas, recorrencias e categorias continuam no mesmo fluxo.</p>
          </div>
        </div>
        <TransactionForm
          actions={actions}
          categories={data.categories}
          cards={data.cards}
          paymentMethods={paymentMethods}
          compact
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recentes</h2>
            <p>{summary.transactionCount} lancamentos no mes.</p>
          </div>
          <button className="text-button" onClick={() => setPage('transactions')} type="button">Ver tudo</button>
        </div>
        <TransactionList data={data} items={recent} actions={actions} compact />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Gastos por categoria</h2>
            <p>Top categorias do mes atual.</p>
          </div>
        </div>
        <CategoryBars items={categoryTotals} total={summary.despesas || 1} />
      </section>
    </div>
  );
}

function TransactionsPage({ data, actions, paymentMethods, currentMonth, currentYear }) {
  const [filter, setFilter] = useState('all');
  const monthly = data.transactions
    .filter((item) => isSameMonth(item.date, currentMonth, currentYear))
    .filter((item) => filter === 'all' || item.type === filter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Nova transacao</h2>
            <p>Use recorrente para automatizar lancamentos mensais.</p>
          </div>
        </div>
        <TransactionForm
          actions={actions}
          categories={data.categories}
          cards={data.cards}
          paymentMethods={paymentMethods}
        />
      </section>
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Transacoes do mes</h2>
            <p>{monthly.length} registros encontrados.</p>
          </div>
          <SegmentedControl value={filter} onChange={setFilter} options={[
            ['all', 'Todas'],
            ['receita', 'Receitas'],
            ['despesa', 'Despesas'],
          ]} />
        </div>
        <TransactionList data={data} items={monthly} actions={actions} />
      </section>
    </div>
  );
}

function TransactionForm({ actions, categories, cards, paymentMethods, compact = false }) {
  const [form, setForm] = useState({
    type: 'despesa',
    desc: '',
    amount: '',
    date: today(),
    category: categories[0]?.id || '',
    payment: paymentMethods[0] || 'PIX',
    necessity: 'necessario',
    nature: 'variavel',
    recurrent: 'nao',
    linkedCardId: '',
    note: '',
  });

  useEffect(() => {
    if (!form.category && categories[0]) setForm((current) => ({ ...current, category: categories[0].id }));
  }, [categories, form.category]);

  async function submit(event) {
    event.preventDefault();
    if (!form.desc.trim() || !Number(form.amount)) return;
    const item = {
      ...form,
      id: makeId('tx'),
      amount: Number(form.amount),
      createdAt: Date.now(),
    };
    await actions.save('transactions', item);
    setForm((current) => ({ ...current, desc: '', amount: '', note: '' }));
  }

  return (
    <form className={`form-grid ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <Field label="Tipo">
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </Field>
      <Field label="Descricao">
        <input value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} placeholder="Mercado, salario, aluguel..." />
      </Field>
      <Field label="Valor">
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Data">
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
      </Field>
      <Field label="Categoria">
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </Field>
      <Field label="Pagamento">
        <select value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}>
          {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
          {cards.map((card) => <option key={card.id} value={`CC::${card.id}`}>Cartao {card.name}</option>)}
        </select>
      </Field>
      <Field label="Necessidade">
        <select value={form.necessity} onChange={(event) => setForm({ ...form, necessity: event.target.value })}>
          <option value="necessario">Necessario</option>
          <option value="eventual">Eventual</option>
          <option value="nao_necessario">Nao necessario</option>
        </select>
      </Field>
      <Field label="Natureza">
        <select value={form.nature} onChange={(event) => setForm({ ...form, nature: event.target.value })}>
          <option value="variavel">Variavel</option>
          <option value="fixo">Fixo</option>
        </select>
      </Field>
      <Field label="Recorrente">
        <select value={form.recurrent} onChange={(event) => setForm({ ...form, recurrent: event.target.value })}>
          <option value="nao">Nao</option>
          <option value="sim">Sim</option>
        </select>
      </Field>
      <Field label="Observacao">
        <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opcional" />
      </Field>
      <div className="form-actions">
        <button className="primary-button" type="submit"><Plus size={17} /> Salvar</button>
      </div>
    </form>
  );
}

function TransactionList({ data, items, actions, compact = false }) {
  if (!items.length) return <EmptyState title="Nenhuma transacao por aqui." />;

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
              <span>{item.date || '-'} · {category.name} · {item.payment || '-'}</span>
            </div>
            {!compact && item.recurrent === 'sim' && <span className="pill">recorrente</span>}
            <strong className={item.type === 'receita' ? 'money-positive' : 'money-negative'}>
              {item.type === 'receita' ? '+' : '-'}{formatCurrency(item.amount)}
            </strong>
            <button className="icon-button danger" onClick={() => actions.remove('transactions', item.id)} title="Excluir" type="button">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CardsPage({ data, actions, currentMonth, currentYear }) {
  const [card, setCard] = useState({ name: '', limit: '', closeDay: '10', dueDay: '20', color: '#3f7dd8' });
  const [installment, setInstallment] = useState({
    desc: '',
    total: '',
    parcels: '2',
    purchaseDate: today(),
    firstMonth: monthKey(),
    cardId: '',
    categoryId: data.categories[0]?.id || '',
  });
  const monthInstallments = installmentsForMonth(data.installments, currentMonth, currentYear);

  useEffect(() => {
    setInstallment((current) => ({
      ...current,
      cardId: current.cardId || data.cards[0]?.id || '',
      categoryId: current.categoryId || data.categories[0]?.id || '',
    }));
  }, [data.cards, data.categories]);

  async function saveCard(event) {
    event.preventDefault();
    if (!card.name.trim()) return;
    await actions.save('cards', {
      ...card,
      id: makeId('card'),
      limit: Number(card.limit || 0),
      closeDay: Number(card.closeDay || 1),
      dueDay: Number(card.dueDay || 1),
      createdAt: Date.now(),
    });
    setCard({ name: '', limit: '', closeDay: '10', dueDay: '20', color: '#3f7dd8' });
  }

  async function saveInstallment(event) {
    event.preventDefault();
    if (!installment.desc.trim() || !Number(installment.total) || !installment.cardId) return;
    const parcels = Number(installment.parcels || 1);
    await actions.save('installments', {
      ...installment,
      id: makeId('inst'),
      parcels,
      total: Number(installment.total),
      parcelValue: Number(installment.total) / parcels,
      createdAt: Date.now(),
    });
    setInstallment((current) => ({ ...current, desc: '', total: '' }));
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>Novo cartao</h2></div>
        <form className="form-grid one-col" onSubmit={saveCard}>
          <Field label="Nome"><input value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} placeholder="Nubank, Sofisa..." /></Field>
          <Field label="Limite"><input type="number" min="0" step="0.01" value={card.limit} onChange={(event) => setCard({ ...card, limit: event.target.value })} /></Field>
          <Field label="Fechamento"><input type="number" min="1" max="31" value={card.closeDay} onChange={(event) => setCard({ ...card, closeDay: event.target.value })} /></Field>
          <Field label="Vencimento"><input type="number" min="1" max="31" value={card.dueDay} onChange={(event) => setCard({ ...card, dueDay: event.target.value })} /></Field>
          <Field label="Cor"><input type="color" value={card.color} onChange={(event) => setCard({ ...card, color: event.target.value })} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Novo parcelamento</h2></div>
        <form className="form-grid one-col" onSubmit={saveInstallment}>
          <Field label="Descricao"><input value={installment.desc} onChange={(event) => setInstallment({ ...installment, desc: event.target.value })} /></Field>
          <Field label="Cartao">
            <select value={installment.cardId} onChange={(event) => setInstallment({ ...installment, cardId: event.target.value })}>
              <option value="">Selecione</option>
              {data.cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={installment.categoryId} onChange={(event) => setInstallment({ ...installment, categoryId: event.target.value })}>
              {data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Total"><input type="number" min="0" step="0.01" value={installment.total} onChange={(event) => setInstallment({ ...installment, total: event.target.value })} /></Field>
          <Field label="Parcelas"><input type="number" min="1" value={installment.parcels} onChange={(event) => setInstallment({ ...installment, parcels: event.target.value })} /></Field>
          <Field label="Primeira parcela"><input type="month" value={installment.firstMonth} onChange={(event) => setInstallment({ ...installment, firstMonth: event.target.value })} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Cartoes e faturas</h2>
            <p>Parcelamentos calculados para {monthLabel(currentYear, currentMonth)}.</p>
          </div>
        </div>
        <div className="card-grid">
          {data.cards.map((item) => {
            const total = monthInstallments
              .filter((entry) => entry.cardId === item.id)
              .reduce((sum, entry) => sum + Number(entry.parcelValue || 0), 0);
            return (
              <div className="credit-card" key={item.id} style={{ borderColor: item.color }}>
                <div>
                  <strong>{item.name}</strong>
                  <span>Fecha dia {item.closeDay} · Vence dia {item.dueDay}</span>
                </div>
                <b>{formatCurrency(total)}</b>
                <button className="icon-button danger" onClick={() => actions.remove('cards', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
        <div className="list spacing-top">
          {monthInstallments.map((item) => (
            <div className="list-row" key={`${item.id}-${item.paidCount}`}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>Parcela {item.paidCount}/{item.parcels}</span>
              </div>
              <strong>{formatCurrency(item.parcelValue)}</strong>
              <button className="icon-button danger" onClick={() => actions.remove('installments', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoriesPage({ data, actions }) {
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

function WalletPage({ data, actions }) {
  const [initialBalance, setInitialBalance] = useState(data.settings.initialBalance || '');
  const [entry, setEntry] = useState({ type: 'entrada', desc: '', amount: '', date: today() });
  const balance = walletBalance(data);

  useEffect(() => {
    setInitialBalance(data.settings.initialBalance || '');
  }, [data.settings.initialBalance]);

  async function saveInitial(event) {
    event.preventDefault();
    await actions.saveSettings({ initialBalance: Number(initialBalance || 0), initialDate: today() });
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!entry.desc.trim() || !Number(entry.amount)) return;
    await actions.save('wallet', {
      ...entry,
      id: makeId('wallet'),
      amount: Number(entry.amount),
      createdAt: Date.now(),
    });
    setEntry((current) => ({ ...current, desc: '', amount: '' }));
  }

  return (
    <div className="content-grid">
      <section className="stat-grid span-2">
        <StatCard label="Saldo em carteira" value={formatCurrency(balance)} tone={balance >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Entradas" value={formatCurrency(data.wallet.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + Number(item.amount || 0), 0))} tone="positive" />
        <StatCard label="Saidas" value={formatCurrency(data.wallet.filter((item) => item.type === 'saida').reduce((sum, item) => sum + Number(item.amount || 0), 0))} tone="negative" />
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Saldo inicial</h2></div>
        <form className="form-grid one-col" onSubmit={saveInitial}>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={initialBalance} onChange={(event) => setInitialBalance(event.target.value)} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Check size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Movimentacao</h2></div>
        <form className="form-grid one-col" onSubmit={saveEntry}>
          <Field label="Tipo">
            <select value={entry.type} onChange={(event) => setEntry({ ...entry, type: event.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Field>
          <Field label="Descricao"><input value={entry.desc} onChange={(event) => setEntry({ ...entry, desc: event.target.value })} /></Field>
          <Field label="Valor"><input type="number" min="0" step="0.01" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} /></Field>
          <Field label="Data"><input type="date" value={entry.date} onChange={(event) => setEntry({ ...entry, date: event.target.value })} /></Field>
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>Historico</h2></div>
        <div className="list">
          {[...data.wallet].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.desc}</strong>
                <span>{item.date} · {item.type}</span>
              </div>
              <strong className={item.type === 'entrada' ? 'money-positive' : 'money-negative'}>{formatCurrency(item.amount)}</strong>
              <button className="icon-button danger" onClick={() => actions.remove('wallet', item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InvestmentsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Investimentos"
      collection="investments"
      items={data.investments}
      actions={actions}
      fields={[
        ['name', 'Nome / ticker'],
        ['type', 'Tipo'],
        ['qty', 'Quantidade'],
        ['avgPrice', 'Preco medio'],
      ]}
      derive={(form) => ({
        value: Number(form.qty || 0) * Number(form.avgPrice || 0),
        updated: today(),
      })}
      valueLabel={(item) => formatCurrency(item.value)}
    />
  );
}

function GoalsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Metas"
      collection="goals"
      items={data.goals}
      actions={actions}
      fields={[
        ['name', 'Nome'],
        ['target', 'Valor alvo'],
        ['current', 'Valor atual'],
        ['deadline', 'Prazo'],
      ]}
      valueLabel={(item) => `${formatCurrency(item.current)} de ${formatCurrency(item.target)}`}
    />
  );
}

function DebtsPage({ data, actions }) {
  return (
    <GenericAssetPage
      title="Dividas"
      collection="debts"
      items={data.debts}
      actions={actions}
      fields={[
        ['name', 'Nome'],
        ['creditor', 'Credor'],
        ['total', 'Valor total'],
        ['paid', 'Pago'],
        ['deadline', 'Vencimento'],
      ]}
      valueLabel={(item) => `${formatCurrency(Number(item.total || 0) - Number(item.paid || 0))} em aberto`}
    />
  );
}

function GenericAssetPage({ title, collection, items, actions, fields, derive = () => ({}), valueLabel }) {
  const initial = Object.fromEntries(fields.map(([name]) => [name, '']));
  const [form, setForm] = useState(initial);

  async function submit(event) {
    event.preventDefault();
    if (!form.name?.trim()) return;
    const numeric = {};
    Object.entries(form).forEach(([key, value]) => {
      numeric[key] = ['qty', 'avgPrice', 'target', 'current', 'total', 'paid'].includes(key) ? Number(value || 0) : value;
    });
    await actions.save(collection, {
      ...numeric,
      ...derive(numeric),
      id: makeId(collection.slice(0, -1) || collection),
      createdAt: Date.now(),
    });
    setForm(initial);
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header"><h2>Novo registro</h2></div>
        <form className="form-grid one-col" onSubmit={submit}>
          {fields.map(([name, label]) => (
            <Field label={label} key={name}>
              <input
                type={['qty', 'avgPrice', 'target', 'current', 'total', 'paid'].includes(name) ? 'number' : name.includes('date') || name === 'deadline' ? 'date' : 'text'}
                min="0"
                step="0.01"
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              />
            </Field>
          ))}
          <div className="form-actions"><button className="primary-button" type="submit"><Plus size={17} /> Salvar</button></div>
        </form>
      </section>
      <section className="panel span-2">
        <div className="panel-header"><h2>{title}</h2></div>
        <div className="list">
          {items.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <strong>{item.name}</strong>
                <span>{item.type || item.creditor || item.deadline || 'registro'}</span>
              </div>
              <strong>{valueLabel(item)}</strong>
              <button className="icon-button danger" onClick={() => actions.remove(collection, item.id)} title="Excluir" type="button"><Trash2 size={16} /></button>
            </div>
          ))}
          {!items.length && <EmptyState title={`Nenhum item em ${title.toLowerCase()}.`} />}
        </div>
      </section>
    </div>
  );
}

function ReportsPage({ data, currentMonth, currentYear }) {
  const summary = summarizeMonth(data, currentMonth, currentYear);

  function downloadCsv() {
    const csv = exportTransactionsCsv(summary.monthTransactions, data.categories);
    downloadText(`finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  function downloadReport() {
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatorio Finance</title><body style="font-family:Arial,sans-serif;padding:32px"><h1>Relatorio ${monthLabel(currentYear, currentMonth)}</h1><p>Receitas: ${formatCurrency(summary.receitas)}</p><p>Despesas: ${formatCurrency(summary.despesas + summary.parcelas)}</p><p>Saldo: ${formatCurrency(summary.saldo)}</p><h2>Transacoes</h2><ul>${summary.monthTransactions.map((item) => `<li>${item.date} - ${item.desc} - ${formatCurrency(item.amount)}</li>`).join('')}</ul></body></html>`;
    downloadText(`relatorio-finance-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.html`, html, 'text/html;charset=utf-8');
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Exportacao CSV</h2>
            <p>Compativel com Excel, Google Sheets e Numbers.</p>
          </div>
        </div>
        <button className="primary-button" onClick={downloadCsv} type="button"><Download size={17} /> Baixar CSV</button>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Relatorio mensal</h2>
            <p>HTML pronto para imprimir ou salvar como PDF.</p>
          </div>
        </div>
        <button className="secondary-button" onClick={downloadReport} type="button"><Download size={17} /> Baixar relatorio</button>
      </section>
      <section className="stat-grid span-2">
        <StatCard label="Receitas" value={formatCurrency(summary.receitas)} tone="positive" />
        <StatCard label="Despesas" value={formatCurrency(summary.despesas + summary.parcelas)} tone="negative" />
        <StatCard label="Saldo" value={formatCurrency(summary.saldo)} tone={summary.saldo >= 0 ? 'positive' : 'negative'} />
      </section>
    </div>
  );
}

function SettingsPage({ data, actions, paymentMethods }) {
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

function SetupScreen() {
  return (
    <main className="center-screen">
      <section className="setup-box">
        <div className="brand-mark large"><Settings size={28} /></div>
        <h1>Configure o Firebase</h1>
        <p>Crie um `.env.local` baseado no `.env.example`, preencha as chaves do app Web e rode o projeto novamente.</p>
        <code>VITE_FIREBASE_PROJECT_ID=seu-projeto</code>
      </section>
    </main>
  );
}

function SplashScreen() {
  return <main className="center-screen"><div className="loader" /></main>;
}

function LoginScreen() {
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleLogin() {
    setAuthError('');
    setIsSigningIn(true);

    try {
      await loginWithGoogle();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="center-screen login-screen">
      <section className="login-panel">
        <div className="brand-mark large"><CircleDollarSign size={30} /></div>
        <h1>Finance</h1>
        <p>Entre com sua conta Google para acessar seu controle financeiro.</p>
        {authError && <div className="notice error compact" role="alert">{authError}</div>}
        <button className="primary-button wide" disabled={isSigningIn} onClick={handleLogin} type="button">
          {isSigningIn ? 'Conectando...' : 'Entrar com Google'}
        </button>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map(([id, label]) => (
        <button className={value === id ? 'active' : ''} key={id} onClick={() => onChange(id)} type="button">{label}</button>
      ))}
    </div>
  );
}

function CategoryBars({ items, total }) {
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

function CategoryIcon({ category }) {
  const Icon = ICONS[category.emoji] || Package;
  return <Icon size={18} />;
}

function EmptyState({ title }) {
  return <div className="empty-state">{title}</div>;
}

function getAuthErrorMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/unauthorized-domain') {
    return 'Este dominio ainda nao esta autorizado no Firebase Authentication. Adicione localhost, 127.0.0.1 ou o dominio publicado em Authorized domains.';
  }

  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Login cancelado antes de concluir.';
  }

  return error?.message || 'Nao foi possivel entrar com Google agora.';
}

async function applyRecurrentTransactions(data, actions) {
  const key = monthKey();
  const [year, month] = key.split('-').map(Number);
  const recurrent = data.transactions.filter((item) => item.recurrent === 'sim' && item.generatedMonth !== key);

  for (const item of recurrent) {
    const rootId = item.recurrentRootId || item.id;
    const exists = data.transactions.some((entry) => entry.recurrentRootId === rootId && entry.generatedMonth === key);
    const sourceIsCurrentMonth = item.date?.startsWith(key);
    if (exists || sourceIsCurrentMonth) continue;

    const sourceDay = Number(item.date?.slice(8, 10) || 1);
    const lastDay = new Date(year, month, 0).getDate();
    const date = `${key}-${String(Math.min(sourceDay, lastDay)).padStart(2, '0')}`;

    await actions.save('transactions', {
      ...item,
      id: makeId('tx'),
      date,
      recurrentRootId: rootId,
      generatedMonth: key,
      createdAt: Date.now(),
    });
  }
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
