/**
 * Sheets Setup — Connect to Google Sheets for cloud sync
 * This is embedded in the Settings/More page, not a standalone login gate.
 */

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function SheetsSetup() {
  const { isConfigured, sheetsUrl, syncStatus, lastSyncedAt, connectSheets, disconnectSheets, forceSync, forcePull } = useAuth();
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleConnect = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setMessage({ text: 'Please enter the Apps Script URL', type: 'error' });
      return;
    }

    if (!trimmed.startsWith('https://script.google.com/')) {
      setMessage({ text: 'URL must start with https://script.google.com/', type: 'error' });
      return;
    }

    setConnecting(true);
    setMessage(null);

    const result = await connectSheets(trimmed);
    setConnecting(false);

    if (result.success) {
      setMessage({ text: 'Connected and synced!', type: 'success' });
      setUrl('');
    } else {
      setMessage({ text: `Connection failed: ${result.message}`, type: 'error' });
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const statusLabel: Record<string, { text: string; color: string }> = {
    idle: { text: 'Idle', color: 'var(--text-muted)' },
    syncing: { text: 'Syncing...', color: 'var(--accent)' },
    success: { text: 'Synced', color: 'var(--green)' },
    error: { text: 'Sync Error', color: 'var(--red)' },
    offline: { text: 'Offline', color: 'var(--amber)' },
    not_configured: { text: 'Not Connected', color: 'var(--text-muted)' },
  };

  const currentStatus = statusLabel[syncStatus] || statusLabel.idle;

  if (isConfigured) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--green)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
          }}>
            <span style={{ filter: 'brightness(10)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Google Sheets Connected
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {sheetsUrl?.substring(0, 50)}...
            </div>
          </div>
        </div>

        {/* Status row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: currentStatus.color }}>
              {syncStatus === 'syncing' && (
                <span style={{
                  display: 'inline-block', width: 10, height: 10, border: '2px solid var(--accent)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle',
                }} />
              )}
              {currentStatus.text}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Synced</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatLastSync(lastSyncedAt)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={forceSync}
            disabled={syncStatus === 'syncing'}
            style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
          >
            Push to Cloud
          </button>
          <button
            className="btn"
            onClick={forcePull}
            disabled={syncStatus === 'syncing'}
            style={{
              flex: 1, padding: '10px', fontSize: '0.8rem',
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            Pull from Cloud
          </button>
        </div>

        <button
          onClick={disconnectSheets}
          style={{
            marginTop: 12, width: '100%', padding: '10px',
            background: 'none', border: '1px solid var(--red)',
            borderRadius: 12, color: 'var(--red)',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Disconnect
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not configured — show setup form
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: '#fff',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Cloud Sync
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Sync data to Google Sheets
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: 'var(--bg-hover)', borderRadius: 12, padding: '14px',
        fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16,
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Quick Setup:</div>
        1. Create a new Google Sheet<br />
        2. Go to <b>Extensions &gt; Apps Script</b><br />
        3. Paste the script from <code>google-apps-script.js</code><br />
        4. Click <b>Deploy &gt; New deployment &gt; Web app</b><br />
        5. Set access to <b>"Anyone"</b> and deploy<br />
        6. Paste the URL below
      </div>

      {/* URL Input */}
      <input
        type="url"
        placeholder="https://script.google.com/macros/s/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-primary)',
          outline: 'none', fontFamily: 'inherit', marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {message && (
        <div style={{
          fontSize: '0.78rem', marginBottom: 12, textAlign: 'center',
          color: message.type === 'error' ? 'var(--red)' : 'var(--green)',
          fontWeight: 600,
        }}>
          {message.text}
        </div>
      )}

      <button
        className="btn btn-primary w-full"
        onClick={handleConnect}
        disabled={connecting}
        style={{ padding: '12px', fontSize: '0.85rem' }}
      >
        {connecting ? 'Connecting...' : 'Connect & Sync'}
      </button>
    </div>
  );
}
