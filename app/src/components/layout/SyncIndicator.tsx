/**
 * Sync Status Indicator — Shows cloud sync state in the header
 *
 * States:
 * - idle: dimmed cloud icon
 * - syncing: spinning cloud with arrows
 * - success: green cloud with checkmark
 * - error: red cloud with X
 * - offline: gray cloud with slash
 */

import { useAuth } from '../../auth/AuthProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function SyncIndicator() {
  const { syncStatus, forceSync } = useAuth();
  const isOnline = useOnlineStatus();

  const effectiveStatus = !isOnline ? 'offline' : syncStatus;

  const getIcon = () => {
    switch (effectiveStatus) {
      case 'syncing':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6" />
            <path d="M2.5 11.5a10 10 0 0 1 18.8-4.3M21.5 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        );
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        );
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <line x1="15" y1="13" x2="11" y2="17" />
            <line x1="11" y1="13" x2="15" y2="17" />
          </svg>
        );
      case 'offline':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <line x1="4" y1="4" x2="20" y2="20" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={() => forceSync()}
      title={
        effectiveStatus === 'offline'
          ? 'Offline'
          : effectiveStatus === 'syncing'
          ? 'Syncing...'
          : effectiveStatus === 'error'
          ? 'Sync error — tap to retry'
          : 'Synced'
      }
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {getIcon()}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
