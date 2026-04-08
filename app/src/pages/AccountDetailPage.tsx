import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, getAccountById } from '../store';
import { formatCurrency } from '../lib/format';
import { useModal } from '../components/ui/Modal';
import AccountForm from '../components/accounts/AccountForm';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionItem from '../components/transactions/TransactionItem';
import type { Transaction } from '../types';

export default function AccountDetailPage() {
  const { id: accountId } = useParams<{ id: string }>();
  const state = useStore();
  const navigate = useNavigate();
  const { openModal } = useModal();

  const account = accountId ? getAccountById(state, accountId) : undefined;

  const transactions = useMemo(() => {
    if (!accountId) return [];
    return [...state.transactions]
      .filter(t => t.fromAccountId === accountId || t.toAccountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, accountId]);

  const editTxn = useCallback((txn: Transaction) => {
    openModal(<TransactionForm editTxn={txn} />);
  }, [openModal]);

  if (!account) {
    return (
      <div className="screen active">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>Account not found</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/accounts')}>Back to Accounts</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/accounts')}>&larr; Back</button>
        <button className="btn btn-sm btn-secondary" onClick={() => openModal(<AccountForm editAccount={account} />)}>
          Edit
        </button>
      </div>

      <div className="card mb-4 text-center p-6">
        <div className="text-sm text-[var(--text-muted)] uppercase font-semibold tracking-wider">{account.name}</div>
        <div className="text-3xl font-extrabold mt-2 tracking-tight">{formatCurrency(account.balance)}</div>
      </div>

      <div className="section-header">
        <div className="section-title">Transactions</div>
        <span className="text-xs text-[var(--text-muted)]">{transactions.length} total</span>
      </div>

      {transactions.length > 0 ? (
        transactions.map(txn => (
          <TransactionItem key={txn.id} txn={txn} onClick={editTxn} contextAccountId={accountId} />
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No transactions for this account</p>
        </div>
      )}
    </div>
  );
}
