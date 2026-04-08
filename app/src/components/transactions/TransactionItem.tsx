import { useStore, getCategoryById, getAccountById, getPersonById } from '../../store';
import { formatCurrency, formatDateShort } from '../../lib/format';
import type { Transaction } from '../../types';

interface TransactionItemProps {
  txn: Transaction;
  onClick: (txn: Transaction) => void;
  contextAccountId?: string; // The account page we're viewing from (for transfer direction)
}

export default function TransactionItem({ txn, onClick, contextAccountId }: TransactionItemProps) {
  const state = useStore();
  const category = getCategoryById(state, txn.categoryId);
  const account = getAccountById(state, txn.fromAccountId);
  const person = txn.personId ? getPersonById(state, txn.personId) : null;

  const isTransfer = txn.type === 'transfer';
  // For transfers: if we're viewing from the destination account, treat it as incoming
  const isTransferIncoming = isTransfer && contextAccountId && txn.toAccountId === contextAccountId;
  const isIncome = txn.type === 'income' || txn.type === 'borrowed' || isTransferIncoming;

  const icon = category?.icon || '💸';
  const title = txn.merchant || category?.name || txn.type;

  const amountColor = isIncome
    ? 'text-[var(--green)]'
    : isTransfer
    ? 'text-[var(--blue)]'
    : 'text-[var(--red)]';

  const prefix = isIncome ? '+' : isTransfer ? '' : '-';

  const displayAmount = txn.type === 'group_split' && txn.splitDetails
    ? txn.splitDetails.myShare
    : txn.amount;

  const dirClass = isIncome ? 'txn-dir-in' : 'txn-dir-out';
  const dirArrow = isIncome ? '\u2191' : '\u2193';

  const iconBg = isIncome
    ? 'bg-[var(--green-bg)]'
    : isTransfer
    ? 'bg-[var(--accent-bg)]'
    : 'bg-[var(--red-bg)]';

  const toAccount = isTransfer && txn.toAccountId ? getAccountById(state, txn.toAccountId) : null;

  const metaParts: string[] = [formatDateShort(txn.date)];
  if (isTransfer) {
    const fromName = account?.name || 'Unknown';
    const toName = toAccount?.name || 'Unknown';
    metaParts.push(`${fromName} → ${toName}`);
  }
  if (txn.type === 'group_split' && txn.splitDetails) {
    metaParts.push(`Paid ${formatCurrency(txn.splitDetails.totalAmount)}`);
  }
  if (person) {
    metaParts.push(person.name);
  }
  if (txn.note) {
    metaParts.push(txn.note);
  }
  if (txn.isRecurring) {
    metaParts.push('\uD83D\uDD01');
  }

  return (
    <div className="txn-row" onClick={() => onClick(txn)}>
      <div className={`txn-row-icon ${iconBg}`}>
        <span>{icon}</span>
        <span className={`txn-dir ${dirClass}`}>{dirArrow}</span>
      </div>
      <div className="txn-row-info">
        <div className="txn-row-title truncate">{title}</div>
        <div className="txn-row-meta">
          {metaParts.map((p, i) => (
            <span key={i}>{i > 0 && <span className="mx-1">&middot;</span>}{p}</span>
          ))}
        </div>
      </div>
      <div className="txn-row-amt">
        <div className={`amt-val ${amountColor}`}>
          {prefix}{formatCurrency(displayAmount)}
        </div>
        {txn.type === 'group_split' && (
          <div className="amt-sub">My share</div>
        )}
        {account && (
          <div className="amt-sub">{account.name}</div>
        )}
      </div>
    </div>
  );
}
