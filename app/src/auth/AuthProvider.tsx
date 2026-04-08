/**
 * Sync Provider — Manages Google Sheets cloud sync
 *
 * No authentication needed — the Apps Script URL acts as the "key".
 * Responsibilities:
 * 1. Check if Sheets URL is configured
 * 2. Pull data from Sheets on first load
 * 3. Auto-push changes periodically
 * 4. Expose sync methods to the app
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  getSheetsUrl,
  setSheetsUrl as saveSheetsUrl,
  clearSheetsUrl,
  pingSheets,
  fullSync,
  pullAndMerge,
  startSyncTimer,
  getSyncMeta,
  type SyncStatus,
  type SyncResult,
} from '../lib/sync-engine';
import { useStore } from '../store';
import type { AppData } from '../types';

interface SyncContextValue {
  isConfigured: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  sheetsUrl: string | null;
  connectSheets: (url: string) => Promise<{ success: boolean; message: string }>;
  disconnectSheets: () => void;
  forceSync: () => Promise<void>;
  forcePull: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useAuth must be used within SyncProvider');
  return ctx;
}

// Also export as useSync for clarity
export const useSync = useAuth;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sheetsUrl, setSheetsUrlState] = useState<string | null>(getSheetsUrl());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    getSheetsUrl() ? 'idle' : 'not_configured'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    getSyncMeta().lastSyncedAt
  );
  const syncCleanup = useRef<(() => void) | null>(null);
  const initialPullDone = useRef(false);

  const isConfigured = !!sheetsUrl;

  // Get store methods for sync
  const getStoreState = useCallback((): AppData => {
    const s = useStore.getState();
    const dataKeys: (keyof AppData)[] = [
      'accounts', 'transactions', 'people', 'categories', 'budgets',
      'sips', 'emis', 'monthlyBudget', 'settlements', 'recurringLog',
      'splitwise', 'settings', 'smartImport',
    ];
    const data: Partial<AppData> = {};
    dataKeys.forEach((key) => {
      (data as Record<string, unknown>)[key] = s[key];
    });
    return data as AppData;
  }, []);

  const mergeRemoteData = useCallback((remoteData: Partial<AppData>) => {
    useStore.getState().mergeRemoteData(remoteData);
  }, []);

  // Handle sync completion
  const handleSyncComplete = useCallback((result: SyncResult) => {
    setSyncStatus(result.status);
    if (result.status === 'success') {
      setLastSyncedAt(new Date().toISOString());
    }
  }, []);

  // Start sync timer
  const startSync = useCallback(() => {
    syncCleanup.current?.();
    syncCleanup.current = startSyncTimer(
      getStoreState,
      mergeRemoteData,
      handleSyncComplete,
      60000 // 1 minute
    ) || null;
  }, [getStoreState, mergeRemoteData, handleSyncComplete]);

  // Initial pull on mount (if configured)
  useEffect(() => {
    if (!sheetsUrl || initialPullDone.current) return;
    initialPullDone.current = true;

    const doPull = async () => {
      setSyncStatus('syncing');
      const result = await pullAndMerge(getStoreState, mergeRemoteData);
      handleSyncComplete(result);

      // Start periodic sync after initial pull
      if (result.status === 'success' || result.status === 'error') {
        startSync();
      }
    };

    doPull();

    return () => {
      syncCleanup.current?.();
    };
  }, [sheetsUrl, getStoreState, mergeRemoteData, handleSyncComplete, startSync]);

  // Connect to a Google Sheet
  const connectSheets = useCallback(async (url: string) => {
    const pingResult = await pingSheets(url);
    if (!pingResult.success) {
      return pingResult;
    }

    // Save URL
    saveSheetsUrl(url);
    setSheetsUrlState(url);
    setSyncStatus('syncing');

    // Push current local data to sheets
    const result = await fullSync(getStoreState, mergeRemoteData);
    handleSyncComplete(result);

    // Start sync timer
    initialPullDone.current = true;
    startSync();

    return { success: true, message: 'Connected and synced!' };
  }, [getStoreState, mergeRemoteData, handleSyncComplete, startSync]);

  // Disconnect
  const disconnectSheets = useCallback(() => {
    clearSheetsUrl();
    setSheetsUrlState(null);
    setSyncStatus('not_configured');
    setLastSyncedAt(null);
    syncCleanup.current?.();
    syncCleanup.current = null;
    initialPullDone.current = false;
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!sheetsUrl) return;
    setSyncStatus('syncing');
    const result = await fullSync(getStoreState, mergeRemoteData);
    handleSyncComplete(result);
  }, [sheetsUrl, getStoreState, mergeRemoteData, handleSyncComplete]);

  // Force pull (download from sheets, overwrite local)
  const forcePull = useCallback(async () => {
    if (!sheetsUrl) return;
    setSyncStatus('syncing');
    const result = await pullAndMerge(getStoreState, mergeRemoteData);
    handleSyncComplete(result);
  }, [sheetsUrl, getStoreState, mergeRemoteData, handleSyncComplete]);

  return (
    <SyncContext.Provider
      value={{
        isConfigured,
        syncStatus,
        lastSyncedAt,
        sheetsUrl,
        connectSheets,
        disconnectSheets,
        forceSync,
        forcePull,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
