import { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, getPersonById, getPersonBalance } from '../store';
import { formatCurrency } from '../lib/format';
import { useModal } from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionItem from '../components/transactions/TransactionItem';
import type { Transaction } from '../types';
import toast from 'react-hot-toast';

export default function PersonDetailPage() {
  const { id: personId } = useParams<{ id: string }>();
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();

  const person = personId ? getPersonById(state, personId) : undefined;
  const balance = personId ? getPersonBalance(state, personId) : 0;

  const transactions = useMemo(() => {
    if (!personId) return [];
    return [...state.transactions]
      .filter(t => {
        if (t.personId === personId) return true;
        if (t.splitDetails?.splits?.some(s => s.personId === personId)) return true;
        return false;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, personId]);

  const editTxn = useCallback((txn: Transaction) => {
    openModal(<TransactionForm editTxn={txn} />);
  }, [openModal]);

  const openSettleModal = () => {
    openModal(
      <SettleUpForm
        personId={personId!}
        balance={balance}
        onClose={closeModal}
      />
    );
  };

  if (!person) {
    return (
      <div className="screen active">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>Person not found</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/people')}>Back to People</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/people')}>&larr; Back</button>
        {balance !== 0 && (
          <button className="btn btn-sm btn-primary" onClick={openSettleModal}>Settle Up</button>
        )}
      </div>

      <div className="card mb-4 text-center p-6">
        <div className="person-avatar mx-auto mb-3" style={{ width: 64, height: 64, borderRadius: 20, fontSize: '1.5rem' }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-lg font-bold">{person.name}</div>
        <div className={`text-2xl font-extrabold mt-2 ${balance > 0 ? 'text-[var(--green)]' : balance < 0 ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}>
          {balance > 0 ? `Owes you ${formatCurrency(balance)}` :
           balance < 0 ? `You owe ${formatCurrency(Math.abs(balance))}` :
           'All settled'}
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">Transaction History</div>
      </div>

      {transactions.map(txn => (
        <TransactionItem key={txn.id} txn={txn} onClick={editTxn} />
      ))}

      {transactions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No transactions with {person.name}</p>
        </div>
      )}
    </div>
  );
}

// Settle Up Form sub-component
function SettleUpForm({ personId, balance, onClose }: { personId: string; balance: number; onClose: () => void }) {
  const state = useStore();
  const [amount, setAmount] = useState(Math.abs(balance).toString());
  const [accountId, setAccountId] = useState(state.settings.defaultAccountId || state.accounts[0]?.id || '');

  const handleSettle = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!accountId) {
      toast.error('Select an account');
      return;
    }
    state.settleUpPerson(personId, amt, accountId);
    toast.success('Settlement recorded');
    onClose();
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">Settle Up</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="text-center mb-4 text-sm text-[var(--text-secondary)]">
        {balance > 0 ? 'They owe you' : 'You owe'}: {formatCurrency(Math.abs(balance))}
      </div>
      <div className="form-group">
        <label className="form-label">Settlement Amount</label>
        <input type="number" className="form-control" placeholder="0.00" value={amount}
          onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
      </div>
      <div className="form-group">
        <label className="form-label">Account</label>
        <select className="form-control" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button className="btn btn-primary w-full" onClick={handleSettle}>Settle</button>
    </div>
  );
}
