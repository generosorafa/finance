import { useEffect, useState } from 'react';
import { LoginScreen, SetupScreen, SplashScreen } from './auth/AuthScreens.jsx';
import { isFirebaseConfigured, subscribeToAuth } from './firebase/client.js';
import { useFinanceData } from './hooks/useFinanceData.js';
import { AppShell } from './layout/AppShell.jsx';
import { PageRenderer } from './pages/PageRenderer.jsx';
import { applyRecurrentTransactions } from './services/recurrences.js';

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
    void applyRecurrentTransactions(finance.data, finance.actions);
  }, [user, finance.loading, finance.data.transactions.length, finance.actions, finance.data]);

  function moveMonth(delta) {
    const next = new Date(currentYear, currentMonth + delta, 1);
    setCurrentMonth(next.getMonth());
    setCurrentYear(next.getFullYear());
  }

  if (!isFirebaseConfigured) return <SetupScreen />;
  if (!authReady) return <SplashScreen />;
  if (!user) return <LoginScreen />;

  return (
    <AppShell
      currentMonth={currentMonth}
      currentYear={currentYear}
      finance={finance}
      moveMonth={moveMonth}
      page={page}
      setPage={setPage}
      user={user}
    >
      <PageRenderer
        actions={finance.actions}
        currentMonth={currentMonth}
        currentYear={currentYear}
        data={finance.data}
        page={page}
        paymentMethods={finance.paymentMethods}
        setPage={setPage}
      />
    </AppShell>
  );
}

