import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModalProvider } from './components/ui/Modal';
import AppShell from './components/layout/AppShell';
import { useStore } from './store';
import { initSmsBridge } from './lib/sms-bridge';
import { AuthProvider } from './auth/AuthProvider';
import AuthGuard from './auth/AuthGuard';

/* ------------------------------------------------------------------ */
/*  Lazy-loaded page components                                        */
/* ------------------------------------------------------------------ */
const Dashboard = lazy(() => import('./pages/DashboardPage'));
const Transactions = lazy(() => import('./pages/TransactionsPage'));
const Accounts = lazy(() => import('./pages/AccountsPage'));
const AccountDetail = lazy(() => import('./pages/AccountDetailPage'));
const People = lazy(() => import('./pages/PeoplePage'));
const PersonDetail = lazy(() => import('./pages/PersonDetailPage'));
const More = lazy(() => import('./pages/MorePage'));
const Budgets = lazy(() => import('./pages/BudgetsPage'));
const Reports = lazy(() => import('./pages/ReportsPage'));
const Settings = lazy(() => import('./pages/SettingsPage'));
const Emis = lazy(() => import('./pages/EmisPage'));
const Splitwise = lazy(() => import('./pages/SplitwisePage'));
const SmartImport = lazy(() => import('./pages/SmartImportPage'));

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const theme = useStore((s) => s.settings.theme);
  const smsBridgeInit = useRef(false);

  useEffect(() => {
    useStore.getState().initSampleData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initialize SMS background listener (only on native Android)
  useEffect(() => {
    if (smsBridgeInit.current) return;
    smsBridgeInit.current = true;
    const categories = useStore.getState().categories;
    initSmsBridge(categories);
  }, []);

  return (
    <AuthProvider>
      <AuthGuard>
        <BrowserRouter>
          <ModalProvider>
            <Suspense fallback={null}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="accounts/:id" element={<AccountDetail />} />
                  <Route path="people" element={<People />} />
                  <Route path="people/:id" element={<PersonDetail />} />
                  <Route path="more" element={<More />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="emis" element={<Emis />} />
                  <Route path="splitwise" element={<Splitwise />} />
                  <Route path="smart-import" element={<SmartImport />} />
                </Route>
              </Routes>
            </Suspense>
          </ModalProvider>
        </BrowserRouter>
      </AuthGuard>
    </AuthProvider>
  );
}
