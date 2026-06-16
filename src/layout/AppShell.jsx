import { ChevronLeft, ChevronRight, CircleDollarSign, LogOut } from 'lucide-react';
import { logout } from '../firebase/client.js';
import { NAV_ITEMS } from '../navigation.js';
import { monthLabel } from '../utils/finance.js';

export function AppShell({
  actionsSlot,
  children,
  currentMonth,
  currentYear,
  finance,
  moveMonth,
  page,
  setPage,
  user,
}) {
  const pageTitle = NAV_ITEMS.find((item) => item.id === page)?.label || 'Dashboard';
  const displayName = user.displayName || 'Usuario';
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

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
          {user.photoURL
            ? <img src={user.photoURL} alt="" />
            : <div className="user-avatar" aria-hidden="true">{userInitial}</div>}
          <div className="user-card-info">
            <strong>{displayName}</strong>
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
            <h1>{pageTitle}</h1>
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
        {actionsSlot}
        {children}
      </main>
    </div>
  );
}
