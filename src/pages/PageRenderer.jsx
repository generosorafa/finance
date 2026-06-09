import { DebtsPage, GoalsPage, InvestmentsPage } from './AssetPages.jsx';
import { CardsPage } from './CardsPage.jsx';
import { CategoriesPage } from './CategoriesPage.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { FixedItemsPage } from './FixedItemsPage.jsx';
import { ReportsPage } from './ReportsPage.jsx';
import { SettingsPage } from './SettingsPage.jsx';
import { TransactionsPage } from './TransactionsPage.jsx';
import { WalletPage } from './WalletPage.jsx';

export function PageRenderer(props) {
  if (props.page === 'transactions') return <TransactionsPage {...props} />;
  if (props.page === 'fixed') return <FixedItemsPage {...props} />;
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
