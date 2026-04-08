import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BottomNav from './BottomNav';
import FAB from './FAB';
import ThemeToggle from './ThemeToggle';
import SyncIndicator from './SyncIndicator';
import { useModal } from '../ui/Modal';
import TransactionForm from '../transactions/TransactionForm';

export default function AppShell() {
  const { openModal } = useModal();

  return (
    <>
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo">S</div>
          <span className="app-header-title">SpendTracker</span>
        </div>
        <div className="app-header-actions">
          <SyncIndicator />
          <ThemeToggle />
        </div>
      </header>
      <Outlet />
      <BottomNav />
      <FAB onClick={() => openModal(<TransactionForm />)} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            padding: '12px 24px',
            borderRadius: '50px',
            fontSize: '0.84rem',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            maxWidth: '340px',
          },
          success: {
            style: {
              background: 'rgba(0,184,148,0.9)',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: 'rgba(225,112,85,0.9)',
              color: '#fff',
            },
          },
        }}
      />
    </>
  );
}
