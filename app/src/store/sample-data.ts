import type { AppData } from '../types';
import { uuid } from '../lib/utils';

export function loadSampleData(): Partial<AppData> {
  const daysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const cats = [
    { icon: '🏠', name: 'Rent & Housing', type: 'expense' as const },
    { icon: '🍔', name: 'Food & Dining', type: 'expense' as const },
    { icon: '🛒', name: 'Groceries', type: 'expense' as const },
    { icon: '🚗', name: 'Transport', type: 'expense' as const },
    { icon: '⛽', name: 'Fuel', type: 'expense' as const },
    { icon: '💊', name: 'Health & Medical', type: 'expense' as const },
    { icon: '🎬', name: 'Entertainment', type: 'expense' as const },
    { icon: '🛍️', name: 'Shopping', type: 'expense' as const },
    { icon: '📱', name: 'Subscriptions', type: 'expense' as const },
    { icon: '✈️', name: 'Travel', type: 'expense' as const },
    { icon: '📚', name: 'Education', type: 'expense' as const },
    { icon: '💪', name: 'Fitness', type: 'expense' as const },
    { icon: '🐾', name: 'Pets', type: 'expense' as const },
    { icon: '👶', name: 'Family & Kids', type: 'expense' as const },
    { icon: '🔧', name: 'Utilities & Bills', type: 'expense' as const },
    { icon: '💰', name: 'EMI & Loan', type: 'expense' as const },
    { icon: '🎁', name: 'Gifts & Donations', type: 'expense' as const },
    { icon: '🏢', name: 'Business', type: 'expense' as const },
    { icon: '🔮', name: 'Miscellaneous', type: 'expense' as const },
    { icon: '💼', name: 'Salary', type: 'income' as const },
    { icon: '🏠', name: 'Rent Received', type: 'income' as const },
    { icon: '💹', name: 'Investment Return', type: 'income' as const },
    { icon: '🎁', name: 'Gift Received', type: 'income' as const },
    { icon: '💰', name: 'Freelance', type: 'income' as const },
    { icon: '🔄', name: 'Reimbursement Received', type: 'income' as const },
    { icon: '🏦', name: 'Interest', type: 'income' as const },
  ].map((c) => ({ ...c, id: uuid() }));

  const catId = (name: string) => cats.find((c) => c.name === name)?.id || '';

  const accounts = [
    { name: 'HDFC Savings', type: 'bank' as const, initialBalance: 85000 },
    { name: 'SBI Salary', type: 'bank' as const, initialBalance: 120000 },
    { name: 'Axis Flipkart CC', type: 'credit_card' as const, initialBalance: 0, creditLimit: 200000, billingDate: 5, dueDate: 20 },
    { name: 'Paytm Wallet', type: 'wallet' as const, initialBalance: 2500 },
    { name: 'Cash', type: 'cash' as const, initialBalance: 5000 },
  ].map((a) => ({ ...a, id: uuid(), balance: a.initialBalance, currency: 'INR' }));

  const acctId = (name: string) => accounts.find((a) => a.name === name)?.id || '';

  const people = [
    { id: uuid(), name: 'Rahul' },
    { id: uuid(), name: 'Priya' },
    { id: uuid(), name: 'Amit' },
  ];
  const personId = (name: string) => people.find((p) => p.name === name)?.id || '';

  const baseTxn = {
    toAccountId: null, subCategory: '', isRecurring: false, recurringConfig: null,
    isReimbursable: false, settlementStatus: null as null, settledAmount: 0,
    personId: null as string | null, splitDetails: null, tags: [] as string[],
  };

  const transactions = [
    { ...baseTxn, id: uuid(), type: 'income' as const, date: daysAgo(25), amount: 95000, fromAccountId: acctId('SBI Salary'), categoryId: catId('Salary'), merchant: 'Employer Inc', note: 'March salary', tags: ['salary'], isRecurring: true, recurringConfig: { frequency: 'monthly' as const, endDate: null } },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(1), amount: 450, fromAccountId: acctId('Paytm Wallet'), categoryId: catId('Food & Dining'), merchant: 'Swiggy', note: 'Dinner order', tags: ['food', 'delivery'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(2), amount: 2340, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Groceries'), merchant: 'BigBasket', note: 'Weekly groceries', tags: ['groceries'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(3), amount: 799, fromAccountId: acctId('Axis Flipkart CC'), categoryId: catId('Subscriptions'), merchant: 'Netflix', note: 'Monthly subscription', tags: ['subscription'], isRecurring: true, recurringConfig: { frequency: 'monthly' as const, endDate: null } },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(4), amount: 1500, fromAccountId: acctId('Cash'), categoryId: catId('Transport'), merchant: 'Uber', note: 'Airport cab', tags: ['travel'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(5), amount: 25000, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Rent & Housing'), merchant: '', note: 'March rent', tags: ['rent'], isRecurring: true, recurringConfig: { frequency: 'monthly' as const, endDate: null } },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(6), amount: 3200, fromAccountId: acctId('Axis Flipkart CC'), categoryId: catId('Shopping'), merchant: 'Flipkart', note: 'New headphones', tags: ['electronics'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(8), amount: 500, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Fitness'), merchant: 'Cult.fit', note: 'Monthly gym', tags: ['fitness'], isRecurring: true, recurringConfig: { frequency: 'monthly' as const, endDate: null } },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(10), amount: 850, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Health & Medical'), merchant: 'Apollo Pharmacy', note: 'Medicines' },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(12), amount: 350, fromAccountId: acctId('Paytm Wallet'), categoryId: catId('Entertainment'), merchant: 'PVR Cinemas', note: 'Movie night', tags: ['movie'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(14), amount: 2200, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Utilities & Bills'), merchant: 'Tata Power', note: 'Electricity bill', tags: ['bills'] },
    { ...baseTxn, id: uuid(), type: 'expense' as const, date: daysAgo(16), amount: 680, fromAccountId: acctId('Cash'), categoryId: catId('Food & Dining'), merchant: 'Chai Point', note: 'Team snacks', tags: ['food'] },
    { ...baseTxn, id: uuid(), type: 'transfer' as const, date: daysAgo(7), amount: 3000, fromAccountId: acctId('HDFC Savings'), toAccountId: acctId('Paytm Wallet'), categoryId: catId('Miscellaneous'), merchant: '', note: 'Wallet topup' },
    { ...baseTxn, id: uuid(), type: 'transfer' as const, date: daysAgo(9), amount: 15000, fromAccountId: acctId('HDFC Savings'), toAccountId: acctId('Axis Flipkart CC'), categoryId: catId('Miscellaneous'), merchant: '', note: 'CC bill payment' },
    { ...baseTxn, id: uuid(), type: 'lent' as const, date: daysAgo(3), amount: 1200, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Food & Dining'), merchant: '', note: "Paid for Rahul's dinner", isReimbursable: true, settlementStatus: 'pending' as const, personId: personId('Rahul') },
    { ...baseTxn, id: uuid(), type: 'borrowed' as const, date: daysAgo(11), amount: 500, fromAccountId: acctId('Cash'), categoryId: catId('Transport'), merchant: '', note: 'Priya paid my cab', settlementStatus: 'pending' as const, personId: personId('Priya') },
    {
      ...baseTxn, id: uuid(), type: 'group_split' as const, date: daysAgo(2), amount: 4500, fromAccountId: acctId('HDFC Savings'), categoryId: catId('Food & Dining'), merchant: 'Barbeque Nation', note: 'Team dinner', tags: ['team', 'dinner'], isReimbursable: true,
      splitDetails: {
        totalAmount: 4500, myShare: 1125,
        splits: [
          { personId: personId('Rahul'), amount: 1125, settled: false, settledAmount: 0 },
          { personId: personId('Priya'), amount: 1125, settled: false, settledAmount: 0 },
          { personId: personId('Amit'), amount: 1125, settled: false, settledAmount: 0 },
        ],
      },
    },
  ];

  const budgets = [
    { categoryId: catId('Food & Dining'), monthlyLimit: 8000 },
    { categoryId: catId('Shopping'), monthlyLimit: 5000 },
    { categoryId: catId('Transport'), monthlyLimit: 3000 },
    { categoryId: catId('Entertainment'), monthlyLimit: 2000 },
    { categoryId: catId('Subscriptions'), monthlyLimit: 1500 },
  ];

  const sips = [
    { id: uuid(), name: 'Nifty 50 Index Fund', amount: 5000, frequency: 'monthly', sipDate: 5, type: 'sip' as const, accountId: acctId('HDFC Savings'), active: true },
    { id: uuid(), name: 'ELSS Tax Saver', amount: 3000, frequency: 'monthly', sipDate: 10, type: 'sip' as const, accountId: acctId('SBI Salary'), active: true },
    { id: uuid(), name: 'PPF Contribution', amount: 2000, frequency: 'monthly', sipDate: 1, type: 'investment' as const, accountId: acctId('SBI Salary'), active: true },
    { id: uuid(), name: 'Gold ETF', amount: 1000, frequency: 'monthly', sipDate: 15, type: 'sip' as const, accountId: acctId('HDFC Savings'), active: true },
  ];

  const emis = [
    { id: uuid(), name: 'Home Loan', lender: 'HDFC Bank', totalAmount: 3500000, interestRate: 8.5, emiAmount: 35000, emiDate: 5, tenureMonths: 240, remainingMonths: 192, startDate: '2022-06-01', accountId: acctId('HDFC Savings'), active: true },
    { id: uuid(), name: 'Car Loan', lender: 'SBI', totalAmount: 800000, interestRate: 9.0, emiAmount: 16500, emiDate: 10, tenureMonths: 60, remainingMonths: 36, startDate: '2024-01-01', accountId: acctId('SBI Salary'), active: true },
    { id: uuid(), name: 'Personal Loan', lender: 'Bajaj Finance', totalAmount: 200000, interestRate: 14.0, emiAmount: 4800, emiDate: 15, tenureMonths: 48, remainingMonths: 6, startDate: '2022-09-01', accountId: acctId('HDFC Savings'), active: true },
  ];

  return {
    categories: cats,
    accounts,
    people,
    transactions: transactions as AppData['transactions'],
    budgets,
    monthlyBudget: 60000,
    sips,
    emis,
    settlements: [],
    recurringLog: {},
    splitwise: { apiKey: '', lastSync: null, expenses: [] },
    settings: { theme: 'dark' as const, currency: '₹', defaultAccountId: acctId('HDFC Savings') },
  };
}
