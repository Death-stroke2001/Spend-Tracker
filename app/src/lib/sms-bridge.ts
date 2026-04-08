/**
 * SMS Bridge
 *
 * Connects the native Android SMS receiver plugin to the web layer.
 * When a bank SMS arrives:
 * 1. Native plugin fires "smsReceived" event
 * 2. This bridge parses it using sms-parser
 * 3. Auto-categorizes using auto-categorizer
 * 4. Stores as a pending transaction
 * 5. Shows a local notification: "Swiggy ₹450 — Tap to add"
 * 6. User taps notification → app opens to confirm screen
 */

import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { parseSms, type ParsedSms } from './sms-parser';
import { categorize, categorizeIncome } from './auto-categorizer';
import { formatCurrency } from './format';
import type { Category } from '../types';

// Define the plugin interface
export interface SmsReceiverPlugin {
  startListening(): Promise<{ status: string }>;
  stopListening(): Promise<{ status: string }>;
  isListening(): Promise<{ listening: boolean }>;
  addListener(
    event: 'smsReceived',
    handler: (data: { message: string; sender: string; timestamp: number }) => void,
  ): Promise<{ remove: () => void }>;
}

// Register the native plugin
const SmsReceiver = registerPlugin<SmsReceiverPlugin>('SmsReceiver');

export { SmsReceiver };

// Pending transaction from SMS (stored in memory + localStorage)
export interface PendingSmsTxn {
  id: string;
  parsed: ParsedSms;
  categoryId: string;
  categoryName: string;
  timestamp: number;
  sender: string;
}

const PENDING_KEY = 'spendtracker_pending_sms';

/**
 * Get all pending SMS transactions from localStorage
 */
export function getPendingSmsTxns(): PendingSmsTxn[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save pending SMS transactions to localStorage
 */
function savePendingSmsTxns(txns: PendingSmsTxn[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(txns));
}

/**
 * Add a pending SMS transaction
 */
export function addPendingSmsTxn(txn: PendingSmsTxn) {
  const existing = getPendingSmsTxns();
  existing.unshift(txn);
  // Keep last 50 max
  savePendingSmsTxns(existing.slice(0, 50));
}

/**
 * Remove a pending SMS transaction by id
 */
export function removePendingSmsTxn(id: string) {
  const existing = getPendingSmsTxns();
  savePendingSmsTxns(existing.filter(t => t.id !== id));
}

/**
 * Clear all pending SMS transactions
 */
export function clearPendingSmsTxns() {
  localStorage.removeItem(PENDING_KEY);
}

let listenerRemove: (() => void) | null = null;

/**
 * Initialize the SMS bridge. Call this once on app startup.
 * Requests permissions, starts listening, and sets up the notification handler.
 */
export async function initSmsBridge(categories: Category[]) {
  // Check if we're running in Capacitor (native) or browser
  if (!(window as any).Capacitor?.isNativePlatform()) {
    console.log('[SMS Bridge] Not running in native app, skipping SMS listener');
    return;
  }

  try {
    // Request notification permissions
    const notifPerm = await LocalNotifications.requestPermissions();
    console.log('[SMS Bridge] Notification permission:', notifPerm.display);

    // Request SMS permissions (handled by Capacitor's plugin permission system)
    const smsPerm = await SmsReceiver.startListening();
    console.log('[SMS Bridge] SMS listener:', smsPerm.status);

    // Listen for incoming SMS
    const listener = await SmsReceiver.addListener('smsReceived', async (data) => {
      console.log('[SMS Bridge] SMS received from:', data.sender);

      // Parse the SMS
      const parsed = parseSms(data.message);

      if (!parsed.isValid) {
        console.log('[SMS Bridge] SMS not valid, ignoring:', parsed.filterReason);
        return;
      }

      // Auto-categorize
      const isCredit = parsed.type === 'credit';
      const cat = isCredit
        ? categorizeIncome(parsed.merchant, categories)
        : categorize(parsed.merchant, categories);

      // Create pending transaction
      const pending: PendingSmsTxn = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        parsed,
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        timestamp: data.timestamp,
        sender: data.sender,
      };

      // Store it
      addPendingSmsTxn(pending);

      // Show local notification
      const typeLabel = isCredit ? 'Received' : 'Spent';
      const amountStr = formatCurrency(parsed.amount);
      const merchant = parsed.merchant || parsed.bankIdentifier || 'Unknown';

      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title: `${merchant} — ${amountStr}`,
          body: `${typeLabel} · ${cat.categoryName} · Tap to add`,
          smallIcon: 'ic_stat_notify',
          largeIcon: 'ic_launcher',
          extra: { pendingId: pending.id },
          actionTypeId: 'SMS_TRANSACTION',
        }],
      });

      console.log('[SMS Bridge] Notification shown for:', merchant, amountStr);
    });

    listenerRemove = listener.remove;

    // Handle notification tap → navigate to pending review
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const pendingId = action.notification.extra?.pendingId;
      if (pendingId) {
        // Navigate to smart import page with pending review
        window.location.hash = '#/smart-import?pending=' + pendingId;
      }
    });

    console.log('[SMS Bridge] Fully initialized');
  } catch (err) {
    console.error('[SMS Bridge] Error initializing:', err);
  }
}

/**
 * Cleanup SMS bridge on app close
 */
export async function destroySmsBridge() {
  if (listenerRemove) {
    listenerRemove();
    listenerRemove = null;
  }
  try {
    await SmsReceiver.stopListening();
  } catch {
    // Ignore if not native
  }
}
