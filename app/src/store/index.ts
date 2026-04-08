import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData, Account, Transaction, Person, Category, Budget,
  Sip, Emi, Settlement, Settings, SplitwiseData, SmartImportData,
} from '../types';
import { uuid, todayStr } from '../lib/utils';
import { loadSampleData } from './sample-data';
import { addPendingChange } from '../lib/sync-engine';

function defaultData(): AppData {
  return {
    accounts: [],
    transactions: [],
    people: [],
    categories: [],
    budgets: [],
    sips: [],
    emis: [],
    monthlyBudget: 0,
    settlements: [],
    recurringLog: {},
    splitwise: { apiKey: '', lastSync: null, expenses: [] },
    settings: { theme: 'dark', currency: '₹', defaultAccountId: null },
    smartImport: { learnedMappings: [], accountAliases: {} },
  };
}

interface AppStore extends AppData {
  // Account actions
  addAccount: (data: Omit<Account, 'id' | 'balance'>) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Transaction actions
  addTransaction: (txn: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, txn: Transaction) => void;
  deleteTransaction: (id: string) => void;

  // People
  getOrCreatePerson: (name: string) => Person | null;
  addPerson: (name: string) => void;

  // Budgets
  addBudget: (budget: Budget) => void;
  updateBudget: (categoryId: string, limit: number) => void;
  deleteBudget: (categoryId: string) => void;
  setMonthlyBudget: (amount: number) => void;

  // SIPs
  addSip: (sip: Omit<Sip, 'id'>) => void;
  updateSip: (id: string, data: Partial<Sip>) => void;
  deleteSip: (id: string) => void;
  toggleSip: (id: string) => void;

  // EMIs
  addEmi: (emi: Omit<Emi, 'id'>) => void;
  updateEmi: (id: string, data: Partial<Emi>) => void;
  deleteEmi: (id: string) => void;
  toggleEmi: (id: string) => void;

  // Settlements
  addSettlement: (settlement: Omit<Settlement, 'id'>) => void;

  // Categories
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Settings
  updateSettings: (s: Partial<Settings>) => void;

  // Splitwise
  updateSplitwise: (data: Partial<SplitwiseData>) => void;

  // Smart Import
  updateSmartImport: (data: Partial<SmartImportData>) => void;
  addTransactionsBatch: (txns: Omit<Transaction, 'id'>[]) => void;

  // Recurring
  confirmRecurring: (txnId: string) => void;
  skipRecurring: (txnId: string) => void;

  // Balance computation
  recomputeBalances: () => void;

  // Data management
  importData: (json: string) => void;
  exportData: () => string;
  resetData: () => void;
  initSampleData: () => void;

  // Settlement logic
  settleUpPerson: (personId: string, amount: number, accountId: string) => void;

  // Sync
  mergeRemoteData: (data: Partial<AppData>) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultData(),

      // === ACCOUNTS ===
      addAccount: (data) => {
        const acct: Account = { ...data, id: uuid(), balance: data.initialBalance };
        set((s) => {
          const defaultAccountId = s.settings.defaultAccountId || acct.id;
          return {
            accounts: [...s.accounts, acct],
            settings: { ...s.settings, defaultAccountId },
          };
        });
        addPendingChange({ table: 'accounts', id: acct.id, action: 'upsert', data: acct as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      updateAccount: (id, data) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
        }));
        const updated = get().accounts.find((a) => a.id === id);
        if (updated) addPendingChange({ table: 'accounts', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      deleteAccount: (id) => {
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
        addPendingChange({ table: 'accounts', id, action: 'delete', data: {}, timestamp: Date.now() });
      },

      // === TRANSACTIONS ===
      addTransaction: (txn) => {
        const newTxn = { ...txn, id: uuid() };
        set((s) => ({
          transactions: [...s.transactions, newTxn],
        }));
        get().recomputeBalances();
        addPendingChange({ table: 'transactions', id: newTxn.id, action: 'upsert', data: newTxn as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      updateTransaction: (id, txn) => {
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? txn : t)),
        }));
        get().recomputeBalances();
        addPendingChange({ table: 'transactions', id, action: 'upsert', data: txn as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
        get().recomputeBalances();
        addPendingChange({ table: 'transactions', id, action: 'delete', data: {}, timestamp: Date.now() });
      },

      // === PEOPLE ===
      getOrCreatePerson: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const state = get();
        let person = state.people.find(
          (p) => p.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (!person) {
          person = { id: uuid(), name: trimmed };
          set((s) => ({ people: [...s.people, person!] }));
          addPendingChange({ table: 'people', id: person.id, action: 'upsert', data: person as unknown as Record<string, unknown>, timestamp: Date.now() });
        }
        return person;
      },

      addPerson: (name) => {
        get().getOrCreatePerson(name);
      },

      // === BUDGETS ===
      addBudget: (budget) =>
        set((s) => ({ budgets: [...s.budgets, budget] })),

      updateBudget: (categoryId, limit) =>
        set((s) => ({
          budgets: s.budgets.map((b) =>
            b.categoryId === categoryId ? { ...b, monthlyLimit: limit } : b
          ),
        })),

      deleteBudget: (categoryId) =>
        set((s) => ({
          budgets: s.budgets.filter((b) => b.categoryId !== categoryId),
        })),

      setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),

      // === SIPS ===
      addSip: (sip) => {
        const newSip = { ...sip, id: uuid() };
        set((s) => ({ sips: [...s.sips, newSip] }));
        addPendingChange({ table: 'sips', id: newSip.id, action: 'upsert', data: newSip as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      updateSip: (id, data) => {
        set((s) => ({
          sips: s.sips.map((sip) => (sip.id === id ? { ...sip, ...data } : sip)),
        }));
        const updated = get().sips.find((s) => s.id === id);
        if (updated) addPendingChange({ table: 'sips', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      deleteSip: (id) => {
        set((s) => ({ sips: s.sips.filter((sip) => sip.id !== id) }));
        addPendingChange({ table: 'sips', id, action: 'delete', data: {}, timestamp: Date.now() });
      },

      toggleSip: (id) => {
        set((s) => ({
          sips: s.sips.map((sip) =>
            sip.id === id ? { ...sip, active: !sip.active } : sip
          ),
        }));
        const updated = get().sips.find((s) => s.id === id);
        if (updated) addPendingChange({ table: 'sips', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      // === EMIS ===
      addEmi: (emi) => {
        const newEmi = { ...emi, id: uuid() };
        set((s) => ({ emis: [...s.emis, newEmi] }));
        addPendingChange({ table: 'emis', id: newEmi.id, action: 'upsert', data: newEmi as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      updateEmi: (id, data) => {
        set((s) => ({
          emis: s.emis.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
        const updated = get().emis.find((e) => e.id === id);
        if (updated) addPendingChange({ table: 'emis', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      deleteEmi: (id) => {
        set((s) => ({ emis: s.emis.filter((e) => e.id !== id) }));
        addPendingChange({ table: 'emis', id, action: 'delete', data: {}, timestamp: Date.now() });
      },

      toggleEmi: (id) => {
        set((s) => ({
          emis: s.emis.map((e) =>
            e.id === id ? { ...e, active: !e.active } : e
          ),
        }));
        const updated = get().emis.find((e) => e.id === id);
        if (updated) addPendingChange({ table: 'emis', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      // === SETTLEMENTS ===
      addSettlement: (settlement) => {
        const newSettlement = { ...settlement, id: uuid() };
        set((s) => ({
          settlements: [...s.settlements, newSettlement],
        }));
        addPendingChange({ table: 'settlements', id: newSettlement.id, action: 'upsert', data: newSettlement as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      // === CATEGORIES ===
      addCategory: (cat) => {
        const newCat = { ...cat, id: uuid() };
        set((s) => ({
          categories: [...s.categories, newCat],
        }));
        addPendingChange({ table: 'categories', id: newCat.id, action: 'upsert', data: newCat as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      updateCategory: (id, data) => {
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
        const updated = get().categories.find((c) => c.id === id);
        if (updated) addPendingChange({ table: 'categories', id, action: 'upsert', data: updated as unknown as Record<string, unknown>, timestamp: Date.now() });
      },

      deleteCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
        }));
        addPendingChange({ table: 'categories', id, action: 'delete', data: {}, timestamp: Date.now() });
      },

      // === SETTINGS ===
      updateSettings: (s) =>
        set((state) => ({
          settings: { ...state.settings, ...s },
        })),

      // === SPLITWISE ===
      updateSplitwise: (data) =>
        set((s) => ({
          splitwise: { ...s.splitwise, ...data },
        })),

      // === SMART IMPORT ===
      updateSmartImport: (data) =>
        set((s) => ({
          smartImport: { ...s.smartImport, ...data },
        })),

      addTransactionsBatch: (txns) => {
        const newTxns = txns.map((t) => ({ ...t, id: uuid() }));
        set((s) => ({
          transactions: [...s.transactions, ...newTxns],
        }));
        get().recomputeBalances();
        // Record pending changes for each new transaction
        for (const txn of newTxns) {
          addPendingChange({ table: 'transactions', id: txn.id, action: 'upsert', data: txn as unknown as Record<string, unknown>, timestamp: Date.now() });
        }
      },

      // === RECURRING ===
      confirmRecurring: (txnId) => {
        const state = get();
        const orig = state.transactions.find((t) => t.id === txnId);
        if (!orig) return;
        const today = todayStr();
        const newTxn: Transaction = {
          ...orig,
          id: uuid(),
          date: today,
          isRecurring: false,
          recurringConfig: null,
        };
        set((s) => ({
          transactions: [...s.transactions, newTxn],
          recurringLog: { ...s.recurringLog, [txnId + '_' + today]: true },
        }));
        get().recomputeBalances();
      },

      skipRecurring: (txnId) => {
        const today = todayStr();
        set((s) => ({
          recurringLog: { ...s.recurringLog, [txnId + '_' + today]: true },
        }));
      },

      // === BALANCE RECOMPUTATION ===
      recomputeBalances: () => {
        const state = get();
        const balances: Record<string, number> = {};
        state.accounts.forEach((a) => {
          balances[a.id] = 0;
        });

        const sorted = [...state.transactions].sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        sorted.forEach((t) => {
          const amt = t.amount;
          switch (t.type) {
            case 'expense':
              if (balances[t.fromAccountId] !== undefined) balances[t.fromAccountId] -= amt;
              break;
            case 'income':
              if (balances[t.fromAccountId] !== undefined) balances[t.fromAccountId] += amt;
              break;
            case 'transfer':
              if (balances[t.fromAccountId] !== undefined) balances[t.fromAccountId] -= amt;
              if (t.toAccountId && balances[t.toAccountId] !== undefined) balances[t.toAccountId] += amt;
              break;
            case 'lent':
              if (balances[t.fromAccountId] !== undefined) balances[t.fromAccountId] -= amt;
              break;
            case 'borrowed':
              if (balances[t.fromAccountId] !== undefined) balances[t.fromAccountId] += amt;
              break;
            case 'group_split':
              if (balances[t.fromAccountId] !== undefined)
                balances[t.fromAccountId] -= t.splitDetails?.totalAmount || amt;
              break;
          }
        });

        (state.settlements || []).forEach((s) => {
          if (s.fromAccountId && balances[s.fromAccountId] !== undefined)
            balances[s.fromAccountId] -= s.amount;
          if (s.toAccountId && balances[s.toAccountId] !== undefined)
            balances[s.toAccountId] += s.amount;
        });

        set((s) => ({
          accounts: s.accounts.map((a) => ({
            ...a,
            balance: (a.initialBalance || 0) + (balances[a.id] || 0),
          })),
        }));
      },

      // === SETTLE UP ===
      settleUpPerson: (personId, amount, accountId) => {
        const state = get();
        const balance = getPersonBalance(state, personId);

        const settlement: Settlement = {
          id: uuid(),
          personId,
          amount,
          date: todayStr(),
          fromAccountId: balance < 0 ? accountId : null,
          toAccountId: balance > 0 ? accountId : null,
        };

        let remaining = amount;
        const updatedTransactions = state.transactions.map((t) => {
          if (remaining <= 0) return t;

          if (
            t.personId === personId &&
            ['lent', 'borrowed'].includes(t.type) &&
            t.settlementStatus !== 'settled'
          ) {
            const owed = t.amount - (t.settledAmount || 0);
            const settle = Math.min(remaining, owed);
            remaining -= settle;
            const newSettled = (t.settledAmount || 0) + settle;
            return {
              ...t,
              settledAmount: newSettled,
              settlementStatus: newSettled >= t.amount ? 'settled' as const : 'partial' as const,
            };
          }

          if (t.type === 'group_split' && t.splitDetails) {
            const updatedSplits = t.splitDetails.splits.map((s) => {
              if (remaining <= 0 || s.personId !== personId || s.settled) return s;
              const owed = s.amount - (s.settledAmount || 0);
              const settle = Math.min(remaining, owed);
              remaining -= settle;
              const newSettled = (s.settledAmount || 0) + settle;
              return { ...s, settledAmount: newSettled, settled: newSettled >= s.amount };
            });
            return { ...t, splitDetails: { ...t.splitDetails, splits: updatedSplits } };
          }

          return t;
        });

        set({
          transactions: updatedTransactions,
          settlements: [...state.settlements, settlement],
        });
        get().recomputeBalances();
      },

      // === DATA MANAGEMENT ===
      importData: (json) => {
        const parsed = JSON.parse(json);
        if (!parsed.accounts || !parsed.transactions || !parsed.categories) {
          throw new Error('Invalid data format');
        }
        set({ ...defaultData(), ...parsed });
        get().recomputeBalances();
      },

      exportData: () => {
        const state = get();
        const { ...data } = state;
        // Remove action functions
        const cleanData: Record<string, unknown> = {};
        const dataKeys: (keyof AppData)[] = [
          'accounts', 'transactions', 'people', 'categories', 'budgets',
          'sips', 'emis', 'monthlyBudget', 'settlements', 'recurringLog',
          'splitwise', 'settings', 'smartImport',
        ];
        dataKeys.forEach((key) => {
          cleanData[key] = data[key];
        });
        return JSON.stringify(cleanData, null, 2);
      },

      resetData: () => {
        set(defaultData());
      },

      initSampleData: () => {
        const state = get();
        if (state.categories.length > 0) return;
        const data = loadSampleData();
        set(data);
        get().recomputeBalances();
      },

      // === SYNC: MERGE REMOTE DATA ===
      mergeRemoteData: (remoteData) => {
        set((s) => {
          const merged: Record<string, unknown> = {};

          // Merge array tables: replace existing records by ID, add new ones
          const arrayKeys: (keyof AppData)[] = [
            'accounts', 'transactions', 'people', 'categories',
            'budgets', 'sips', 'emis', 'settlements',
          ];

          for (const key of arrayKeys) {
            const remoteItems = (remoteData as Record<string, unknown>)[key];
            if (!Array.isArray(remoteItems)) continue;

            const localItems = (s as unknown as Record<string, unknown>)[key] as { id?: string; categoryId?: string }[];
            const localMap = new Map<string, unknown>();

            for (const item of localItems) {
              const itemId = item.id || (item as { categoryId?: string }).categoryId;
              if (itemId) localMap.set(itemId, item);
            }

            // Replace/add remote items
            for (const remote of remoteItems) {
              const remoteItem = remote as { id?: string; categoryId?: string };
              const remoteId = remoteItem.id || remoteItem.categoryId;
              if (remoteId) localMap.set(remoteId, remote);
            }

            merged[key] = Array.from(localMap.values());
          }

          // Merge singleton fields
          if (remoteData.settings) {
            merged.settings = { ...s.settings, ...remoteData.settings };
          }
          if (remoteData.monthlyBudget !== undefined) {
            merged.monthlyBudget = remoteData.monthlyBudget;
          }
          if (remoteData.recurringLog) {
            merged.recurringLog = { ...s.recurringLog, ...remoteData.recurringLog };
          }
          if (remoteData.splitwise) {
            merged.splitwise = { ...s.splitwise, ...remoteData.splitwise };
          }
          if (remoteData.smartImport) {
            merged.smartImport = { ...s.smartImport, ...remoteData.smartImport };
          }

          return merged as Partial<AppStore>;
        });

        // Recompute balances after merge
        get().recomputeBalances();
      },
    }),
    {
      name: 'spendtracker_data',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const data = persisted as Partial<AppData>;
        if (version === 0 || !version) {
          return {
            ...defaultData(),
            ...data,
            settlements: data.settlements || [],
            recurringLog: data.recurringLog || {},
            budgets: data.budgets || [],
            sips: data.sips || [],
            emis: data.emis || [],
            splitwise: data.splitwise || { apiKey: '', lastSync: null, expenses: [] },
            smartImport: data.smartImport || { learnedMappings: [], accountAliases: {} },
          };
        }
        if (version === 1) {
          return {
            ...data,
            smartImport: data.smartImport || { learnedMappings: [], accountAliases: {} },
          };
        }
        return persisted as AppStore;
      },
    }
  )
);

// === SELECTORS ===
export function getAccountById(state: AppData, id: string) {
  return state.accounts.find((a) => a.id === id);
}

export function getCategoryById(state: AppData, id: string) {
  return state.categories.find((c) => c.id === id);
}

export function getPersonById(state: AppData, id: string) {
  return state.people.find((p) => p.id === id);
}

export function getNetWorth(state: AppData) {
  let assets = 0;
  let liabilities = 0;
  state.accounts.forEach((a) => {
    if (a.type === 'credit_card' || a.type === 'loan') {
      liabilities += Math.abs(a.balance);
    } else {
      assets += a.balance;
    }
  });
  return { assets, liabilities, net: assets - liabilities };
}

export function getMonthStats(state: AppData, monthStr: string) {
  const txns = state.transactions.filter(
    (t) => t.date.substring(0, 7) === monthStr
  );
  let income = 0;
  let expenses = 0;
  txns.forEach((t) => {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += t.amount;
    else if (t.type === 'group_split' && t.splitDetails)
      expenses += t.splitDetails.myShare || 0;
  });
  return {
    income,
    expenses,
    savings: income - expenses,
    rate: income > 0 ? ((income - expenses) / income) * 100 : 0,
  };
}

export function getPendingAmounts(state: AppData) {
  let toReceive = 0;
  let toPay = 0;
  state.transactions.forEach((t) => {
    if (t.type === 'lent' && t.settlementStatus !== 'settled') {
      toReceive += t.amount - (t.settledAmount || 0);
    } else if (t.type === 'borrowed' && t.settlementStatus !== 'settled') {
      toPay += t.amount - (t.settledAmount || 0);
    } else if (t.type === 'group_split' && t.splitDetails) {
      t.splitDetails.splits?.forEach((s) => {
        if (!s.settled) toReceive += s.amount;
        else if (s.settledAmount && s.settledAmount < s.amount)
          toReceive += s.amount - s.settledAmount;
      });
    }
  });
  return { toReceive, toPay };
}

export function getPersonBalance(state: AppData, personId: string) {
  let balance = 0;
  state.transactions.forEach((t) => {
    if (t.type === 'lent' && t.personId === personId) {
      balance += t.amount - (t.settledAmount || 0);
    } else if (t.type === 'borrowed' && t.personId === personId) {
      balance -= t.amount - (t.settledAmount || 0);
    } else if (t.type === 'group_split' && t.splitDetails) {
      t.splitDetails.splits?.forEach((s) => {
        if (s.personId === personId && !s.settled) {
          balance += s.amount - (s.settledAmount || 0);
        }
      });
    }
  });
  return balance;
}

export function getCategorySpending(state: AppData, monthStr: string) {
  const spending: Record<string, number> = {};
  state.transactions.forEach((t) => {
    if (t.date.substring(0, 7) !== monthStr) return;
    if (t.type === 'expense') {
      spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
    } else if (t.type === 'group_split' && t.splitDetails) {
      spending[t.categoryId] =
        (spending[t.categoryId] || 0) + (t.splitDetails.myShare || 0);
    }
  });
  return spending;
}

export function isDue(
  txn: Transaction,
  dateStr: string,
  recurringLog: Record<string, boolean>
): boolean {
  if (!txn.isRecurring || !txn.recurringConfig) return false;
  if (recurringLog[txn.id + '_' + dateStr]) return false;
  const conf = txn.recurringConfig;
  if (conf.endDate && dateStr > conf.endDate) return false;
  const txDate = new Date(txn.date + 'T00:00:00');
  const checkDate = new Date(dateStr + 'T00:00:00');
  if (checkDate < txDate) return false;

  switch (conf.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return txDate.getDay() === checkDate.getDay();
    case 'monthly':
      return txDate.getDate() === checkDate.getDate();
    case 'yearly':
      return (
        txDate.getDate() === checkDate.getDate() &&
        txDate.getMonth() === checkDate.getMonth()
      );
  }
  return false;
}
