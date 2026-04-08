import type { TransactionType, AccountType } from '../types';

export const typeIcons: Record<TransactionType, string> = {
  expense: '💸',
  income: '💰',
  transfer: '🔄',
  lent: '🤝',
  borrowed: '🫴',
  group_split: '👥',
};

export const accountTypeIcons: Record<AccountType, string> = {
  bank: '🏦',
  credit_card: '💳',
  wallet: '📱',
  cash: '💵',
  loan: '🏠',
};

export const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Bank Account',
  credit_card: 'Credit Card',
  wallet: 'Wallet',
  cash: 'Cash',
  loan: 'Loan',
};

export const acctGradMap: Record<AccountType, string> = {
  bank: 'acct-grad-bank',
  credit_card: 'acct-grad-cc',
  wallet: 'acct-grad-wallet',
  cash: 'acct-grad-cash',
  loan: 'acct-grad-loan',
};

export const CHART_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#74b9ff', '#fdcb6e',
  '#a855f7', '#fd79a8', '#55efc4', '#fab1a0', '#81ecec',
  '#dfe6e9', '#636e72',
];
