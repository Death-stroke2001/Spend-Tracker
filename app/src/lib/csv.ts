import type { Transaction, Account, Category } from '../types';

export function exportTransactionsCSV(
  transactions: Transaction[],
  getAccount: (id: string) => Account | undefined,
  getCategory: (id: string) => Category | undefined
): void {
  const header = 'Date,Type,Amount,Category,Merchant,Note,Account,Tags\n';
  const rows = transactions
    .map((t) => {
      const cat = getCategory(t.categoryId);
      const acct = getAccount(t.fromAccountId);
      return `${t.date},${t.type},${t.amount},"${cat?.name || ''}","${t.merchant || ''}","${t.note || ''}","${acct?.name || ''}","${(t.tags || []).join(';')}"`;
    })
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}
