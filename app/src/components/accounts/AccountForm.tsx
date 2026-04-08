import { useState } from 'react';
import { useStore } from '../../store';
import { useModal } from '../ui/Modal';
import type { Account, AccountType } from '../../types';
import toast from 'react-hot-toast';

interface AccountFormProps {
  editAccount?: Account | null;
}

export default function AccountForm({ editAccount }: AccountFormProps) {
  const state = useStore();
  const { closeModal, confirmModal } = useModal();

  const [name, setName] = useState(editAccount?.name || '');
  const [type, setType] = useState<AccountType>(editAccount?.type || 'bank');
  const [initialBalance, setInitialBalance] = useState(editAccount?.initialBalance?.toString() || '0');
  const [creditLimit, setCreditLimit] = useState(editAccount?.creditLimit?.toString() || '');
  const [billingDate, setBillingDate] = useState(editAccount?.billingDate?.toString() || '');
  const [dueDate, setDueDate] = useState(editAccount?.dueDate?.toString() || '');

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Enter account name');
      return;
    }

    const data: Omit<Account, 'id' | 'balance'> = {
      name: name.trim(),
      type,
      initialBalance: parseFloat(initialBalance) || 0,
      ...(type === 'credit_card' && {
        creditLimit: parseFloat(creditLimit) || 0,
        billingDate: parseInt(billingDate) || undefined,
        dueDate: parseInt(dueDate) || undefined,
      }),
    };

    if (editAccount) {
      state.updateAccount(editAccount.id, { ...data, balance: editAccount.balance });
      toast.success('Account updated');
    } else {
      state.addAccount(data);
      toast.success('Account added');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editAccount) return;
    confirmModal({
      title: 'Delete Account',
      message: `Delete "${editAccount.name}"? Transactions won't be deleted.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        state.deleteAccount(editAccount.id);
        toast.success('Account deleted');
      },
    });
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">{editAccount ? 'Edit Account' : 'Add Account'}</div>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>

      <div className="form-group">
        <label className="form-label">Account Name</label>
        <input type="text" className="form-control" placeholder="e.g. HDFC Savings" value={name}
          onChange={e => setName(e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-control" value={type} onChange={e => setType(e.target.value as AccountType)}>
          <option value="bank">Bank Account</option>
          <option value="credit_card">Credit Card</option>
          <option value="wallet">Wallet</option>
          <option value="cash">Cash</option>
          <option value="loan">Loan</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Initial Balance</label>
        <input type="number" className="form-control" placeholder="0" value={initialBalance}
          onChange={e => setInitialBalance(e.target.value)} step="0.01" />
      </div>

      {type === 'credit_card' && (
        <>
          <div className="form-group">
            <label className="form-label">Credit Limit</label>
            <input type="number" className="form-control" placeholder="e.g. 200000" value={creditLimit}
              onChange={e => setCreditLimit(e.target.value)} step="1" min="0" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Billing Date</label>
              <input type="number" className="form-control" placeholder="e.g. 5" value={billingDate}
                onChange={e => setBillingDate(e.target.value)} min="1" max="31" />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="number" className="form-control" placeholder="e.g. 20" value={dueDate}
                onChange={e => setDueDate(e.target.value)} min="1" max="31" />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2.5 mt-4">
        {editAccount && (
          <button className="btn btn-danger flex-1" onClick={handleDelete}>Delete</button>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave}>
          {editAccount ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
}
