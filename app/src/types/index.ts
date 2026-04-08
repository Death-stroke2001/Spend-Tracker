export type AccountType = 'bank' | 'credit_card' | 'wallet' | 'cash' | 'loan';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
  currency?: string;
  creditLimit?: number;
  billingDate?: number;
  dueDate?: number;
}

export interface Category {
  id: string;
  icon: string;
  name: string;
  type: 'expense' | 'income';
}

export interface SplitEntry {
  personId: string;
  amount: number;
  settled: boolean;
  settledAmount: number;
}

export interface SplitDetails {
  totalAmount: number;
  myShare: number;
  splits: SplitEntry[];
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  endDate: string | null;
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'lent' | 'borrowed' | 'group_split';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string | null;
  categoryId: string;
  merchant: string;
  note: string;
  tags: string[];
  subCategory: string;
  isRecurring: boolean;
  recurringConfig: RecurringConfig | null;
  isReimbursable: boolean;
  settlementStatus: 'pending' | 'partial' | 'settled' | null;
  settledAmount: number;
  personId: string | null;
  splitDetails: SplitDetails | null;
}

export interface Person {
  id: string;
  name: string;
}

export interface Budget {
  categoryId: string;
  monthlyLimit: number;
}

export interface Sip {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  sipDate: number;
  type: 'sip' | 'investment';
  accountId: string;
  active: boolean;
}

export interface Emi {
  id: string;
  name: string;
  lender: string;
  totalAmount: number;
  interestRate: number;
  emiAmount: number;
  emiDate: number;
  tenureMonths: number;
  remainingMonths: number;
  startDate: string;
  accountId: string | null;
  active: boolean;
}

export interface Settlement {
  id: string;
  personId: string;
  amount: number;
  date: string;
  fromAccountId: string | null;
  toAccountId: string | null;
}

export interface SplitwiseExpense {
  id: string;
  description: string;
  cost: number;
  date: string;
  groupId: number;
  groupName: string;
  myBalance: number;
  myPaid: number;
  myOwed: number;
  paidBy: { name: string; amount: number }[];
  splitWith: { name: string; amount: number }[];
  category: string;
  currencyCode: string;
}

export interface SplitwiseData {
  apiKey: string;
  lastSync: string | null;
  expenses: SplitwiseExpense[];
}

export interface Settings {
  theme: 'dark' | 'light';
  currency: string;
  defaultAccountId: string | null;
}

export interface SmartImportData {
  learnedMappings: { pattern: string; categoryId: string }[];
  accountAliases: Record<string, string>;
}

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  people: Person[];
  categories: Category[];
  budgets: Budget[];
  sips: Sip[];
  emis: Emi[];
  monthlyBudget: number;
  settlements: Settlement[];
  recurringLog: Record<string, boolean>;
  splitwise: SplitwiseData;
  settings: Settings;
  smartImport: SmartImportData;
}
