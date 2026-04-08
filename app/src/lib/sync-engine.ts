/**
 * Sync Engine — Cloud sync via Google Sheets (Apps Script Web App)
 *
 * Strategy:
 * 1. All mutations happen locally first (Zustand + localStorage)
 * 2. On each change, debounced push to Google Sheets
 * 3. On app load, pull from Sheets and merge
 * 4. Last-write-wins via timestamp comparison
 *
 * The Apps Script stores the full AppData JSON in Script Properties
 * and also writes human-readable tabs to the spreadsheet.
 */

import type { AppData } from '../types';

// ---- Sheets URL Management ----

const SHEETS_URL_KEY = 'spendtracker_sheets_url';
const SYNC_META_KEY = 'spendtracker_sync_meta';

export function getSheetsUrl(): string | null {
  return localStorage.getItem(SHEETS_URL_KEY);
}

export function setSheetsUrl(url: string) {
  localStorage.setItem(SHEETS_URL_KEY, url);
}

export function clearSheetsUrl() {
  localStorage.removeItem(SHEETS_URL_KEY);
}

// ---- Sync Metadata ----

interface SyncMeta {
  lastSyncedAt: string | null;
  lastPushedAt: string | null;
}

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : { lastSyncedAt: null, lastPushedAt: null };
  } catch {
    return { lastSyncedAt: null, lastPushedAt: null };
  }
}

function saveSyncMeta(meta: Partial<SyncMeta>) {
  const current = getSyncMeta();
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...current, ...meta }));
}

// ---- Ping / Validate URL ----

export async function pingSheets(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const resp = await fetch(`${url}?action=ping`, { method: 'GET' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { success: data.success, message: data.message || 'Connected' };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}

// ---- Push Data to Sheets ----

export async function pushToSheets(
  url: string,
  state: AppData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain for CORS
      body: JSON.stringify({
        action: 'saveData',
        data: state,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();

    if (result.success) {
      saveSyncMeta({ lastPushedAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString() });
    }

    return { success: result.success, error: result.error };
  } catch (err) {
    console.error('[Sync] Push to Sheets failed:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ---- Pull Data from Sheets ----

export async function pullFromSheets(
  url: string
): Promise<{ success: boolean; data: AppData | null; error?: string }> {
  try {
    const resp = await fetch(`${url}?action=getData`, { method: 'GET' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();

    if (result.success) {
      saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
    }

    return { success: result.success, data: result.data || null, error: result.error };
  } catch (err) {
    console.error('[Sync] Pull from Sheets failed:', err);
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ---- Full Sync ----

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'not_configured';

export interface SyncResult {
  status: SyncStatus;
  error?: string;
}

export async function fullSync(
  getState: () => AppData,
  _mergeRemoteData: (data: Partial<AppData>) => void
): Promise<SyncResult> {
  const url = getSheetsUrl();
  if (!url) return { status: 'not_configured' };
  if (!navigator.onLine) return { status: 'offline' };

  try {
    // 1. Push local state to Sheets
    const pushResult = await pushToSheets(url, getState());
    if (!pushResult.success) {
      return { status: 'error', error: pushResult.error };
    }

    return { status: 'success' };
  } catch (err) {
    console.error('[Sync] Full sync failed:', err);
    return { status: 'error', error: (err as Error).message };
  }
}

export async function pullAndMerge(
  _getState: () => AppData,
  mergeRemoteData: (data: Partial<AppData>) => void
): Promise<SyncResult> {
  const url = getSheetsUrl();
  if (!url) return { status: 'not_configured' };
  if (!navigator.onLine) return { status: 'offline' };

  try {
    const pullResult = await pullFromSheets(url);
    if (!pullResult.success) {
      return { status: 'error', error: pullResult.error };
    }

    if (pullResult.data) {
      mergeRemoteData(pullResult.data);
    }

    return { status: 'success' };
  } catch (err) {
    return { status: 'error', error: (err as Error).message };
  }
}

// ---- Debounced Auto-Push ----

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function debouncedPush(
  getState: () => AppData,
  delayMs = 5000
) {
  const url = getSheetsUrl();
  if (!url || !navigator.onLine) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    await pushToSheets(url, getState());
    pushTimer = null;
  }, delayMs);
}

// ---- Sync Timer (periodic push) ----

export function startSyncTimer(
  getState: () => AppData,
  mergeRemoteData: (data: Partial<AppData>) => void,
  onSyncComplete?: (result: SyncResult) => void,
  intervalMs = 60000 // 1 minute (Sheets API is slower, so less frequent)
) {
  stopSyncTimer();

  const doSync = async () => {
    if (!navigator.onLine || !getSheetsUrl()) return;
    const result = await fullSync(getState, mergeRemoteData);
    onSyncComplete?.(result);
  };

  // Initial sync after a short delay
  setTimeout(doSync, 2000);

  // Periodic sync
  syncInterval = setInterval(doSync, intervalMs);

  // Sync on reconnect
  const handleOnline = () => {
    console.log('[Sync] Back online, syncing...');
    doSync();
  };
  window.addEventListener('online', handleOnline);

  return () => {
    stopSyncTimer();
    window.removeEventListener('online', handleOnline);
  };
}

export function stopSyncTimer() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

// Legacy export for store compatibility (no-op now, sync happens via debounced push)
export function addPendingChange(_change: unknown) {
  // No-op: with Google Sheets sync, we push the full state
  // instead of tracking individual changes
}
