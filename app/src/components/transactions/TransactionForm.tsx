import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { useModal } from '../ui/Modal';
import { formatCurrency } from '../../lib/format';
import { todayStr } from '../../lib/utils';
// typeIcons available in constants if needed
import type { Transaction, TransactionType, SplitEntry, SplitDetails, RecurringConfig } from '../../types';
import toast from 'react-hot-toast';

interface TransactionFormProps {
  editTxn?: Transaction | null;
  defaultType?: TransactionType;
}

interface SplitRow {
  personName: string;
  amount: number;
}

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: string; color: string }[] = [
  { value: 'expense', label: 'Expense', icon: '💸', color: 'var(--red)' },
  { value: 'income', label: 'Income', icon: '💰', color: 'var(--green)' },
  { value: 'transfer', label: 'Transfer', icon: '🔄', color: 'var(--blue)' },
  { value: 'lent', label: 'Lent', icon: '🤝', color: 'var(--amber)' },
  { value: 'borrowed', label: 'Borrowed', icon: '🫴', color: 'var(--accent)' },
  { value: 'group_split', label: 'Split', icon: '👥', color: '#a855f7' },
];

export default function TransactionForm({ editTxn, defaultType }: TransactionFormProps) {
  const state = useStore();
  const { closeModal, confirmModal } = useModal();

  const [type, setType] = useState<TransactionType>(editTxn?.type || defaultType || 'expense');
  const [date, setDate] = useState(editTxn?.date || todayStr());
  const [amount, setAmount] = useState(editTxn?.amount?.toString() || '');
  const [fromAccountId, setFromAccountId] = useState(editTxn?.fromAccountId || state.settings.defaultAccountId || '');
  const [toAccountId, setToAccountId] = useState(editTxn?.toAccountId || '');
  const [categoryId, setCategoryId] = useState(editTxn?.categoryId || '');
  const [merchant, setMerchant] = useState(editTxn?.merchant || '');
  const [note, setNote] = useState(editTxn?.note || '');
  const [tagsStr, setTagsStr] = useState(editTxn?.tags?.join(', ') || '');
  const [personName, setPersonName] = useState('');
  const [isRecurring, setIsRecurring] = useState(editTxn?.isRecurring || false);
  const [frequency, setFrequency] = useState<RecurringConfig['frequency']>(editTxn?.recurringConfig?.frequency || 'monthly');
  const [endDate, setEndDate] = useState(editTxn?.recurringConfig?.endDate || '');

  // Group split state
  const [splitTotal, setSplitTotal] = useState(editTxn?.splitDetails?.totalAmount?.toString() || '');
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [equalSplit, setEqualSplit] = useState(true);
  const [myShare, setMyShare] = useState(editTxn?.splitDetails?.myShare?.toString() || '');

  useEffect(() => {
    if (editTxn?.personId) {
      const person = state.people.find(p => p.id === editTxn.personId);
      if (person) setPersonName(person.name);
    }
  }, [editTxn, state.people]);

  useEffect(() => {
    if (editTxn?.splitDetails?.splits) {
      const rows = editTxn.splitDetails.splits.map(s => {
        const person = state.people.find(p => p.id === s.personId);
        return { personName: person?.name || '', amount: s.amount };
      });
      setSplitRows(rows);
    }
  }, [editTxn, state.people]);

  useEffect(() => {
    if (!editTxn) {
      const cats = state.categories.filter(c => {
        if (type === 'income') return c.type === 'income';
        return c.type === 'expense';
      });
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      else if (cats.length > 0 && !cats.find(c => c.id === categoryId)) setCategoryId(cats[0].id);
    }
  }, [type, state.categories, editTxn, categoryId]);

  useEffect(() => {
    if (type === 'group_split' && equalSplit && splitTotal) {
      const total = parseFloat(splitTotal) || 0;
      const people = splitRows.length + 1;
      if (people > 0) {
        const share = Math.round((total / people) * 100) / 100;
        setMyShare(share.toString());
        setSplitRows(prev => prev.map(r => ({ ...r, amount: share })));
      }
    }
  }, [splitTotal, splitRows.length, equalSplit, type]);

  const addSplitRow = useCallback(() => {
    setSplitRows(prev => [...prev, { personName: '', amount: 0 }]);
  }, []);

  const removeSplitRow = useCallback((idx: number) => {
    setSplitRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateSplitRow = useCallback((idx: number, field: keyof SplitRow, value: string | number) => {
    setSplitRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }, []);

  const filteredCategories = state.categories.filter(c => {
    if (type === 'income') return c.type === 'income';
    return c.type === 'expense';
  });

  const currentType = TYPE_OPTIONS.find(t => t.value === type);

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (!fromAccountId) { toast.error('Select an account'); return; }
    if (type === 'transfer' && !toAccountId) { toast.error('Select destination account'); return; }
    if ((type === 'lent' || type === 'borrowed') && !personName.trim()) { toast.error('Enter person name'); return; }

    let personId: string | null = null;
    if ((type === 'lent' || type === 'borrowed') && personName.trim()) {
      const person = state.getOrCreatePerson(personName.trim());
      personId = person?.id || null;
    }

    let splitDetails: SplitDetails | null = null;
    if (type === 'group_split') {
      const total = parseFloat(splitTotal) || amt;
      const myAmt = parseFloat(myShare) || 0;
      const splits: SplitEntry[] = splitRows
        .filter(r => r.personName.trim())
        .map(r => {
          const person = state.getOrCreatePerson(r.personName.trim());
          return { personId: person?.id || '', amount: r.amount, settled: false, settledAmount: 0 };
        });
      splitDetails = { totalAmount: total, myShare: myAmt, splits };
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const recurringConfig: RecurringConfig | null = isRecurring ? { frequency, endDate: endDate || null } : null;

    const txnData: Omit<Transaction, 'id'> = {
      type, date, amount: amt, fromAccountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      categoryId, merchant, note, tags, subCategory: '',
      isRecurring, recurringConfig,
      isReimbursable: type === 'lent' || type === 'group_split',
      settlementStatus: (type === 'lent' || type === 'borrowed') ? 'pending' : null,
      settledAmount: 0, personId, splitDetails,
    };

    if (editTxn) {
      state.updateTransaction(editTxn.id, { ...txnData, id: editTxn.id });
      toast.success('Transaction updated');
    } else {
      state.addTransaction(txnData);
      toast.success('Transaction added');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editTxn) return;
    confirmModal({
      title: 'Delete Transaction',
      message: `Delete this ${formatCurrency(editTxn.amount)} transaction?`,
      confirmLabel: 'Delete', danger: true,
      onConfirm: () => { state.deleteTransaction(editTxn.id); toast.success('Transaction deleted'); },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="modal-header">
        <div className="modal-title">{editTxn ? 'Edit Transaction' : 'Add Transaction'}</div>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>

      {/* Type selector - pill chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            style={{
              padding: '8px 14px', borderRadius: 50, border: 'none',
              background: type === opt.value ? opt.color : 'var(--bg-input)',
              color: type === opt.value ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Amount - Big prominent input */}
      <div style={{
        textAlign: 'center', marginBottom: 24, padding: '20px 0',
        borderBottom: `2px solid var(--border)`,
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {currentType?.icon} {currentType?.label} Amount
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{state.settings.currency}</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            autoFocus
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-primary)',
              width: '60%', textAlign: 'center', letterSpacing: '-0.03em',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Date + Account row */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{type === 'transfer' ? 'From' : 'Account'}</label>
          <select className="form-control" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
            <option value="">Select</option>
            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {type === 'transfer' && (
        <div className="form-group">
          <label className="form-label">To Account</label>
          <select className="form-control" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            <option value="">Select</option>
            {state.accounts.filter(a => a.id !== fromAccountId).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Person for lent/borrowed */}
      {(type === 'lent' || type === 'borrowed') && (
        <div className="form-group">
          <label className="form-label">Person</label>
          <input type="text" className="form-control" placeholder="Person name" value={personName}
            onChange={e => setPersonName(e.target.value)} list="people-list" />
          <datalist id="people-list">
            {state.people.map(p => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>
      )}

      {/* Category - Icon grid */}
      <div className="form-group">
        <label className="form-label">Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filteredCategories.slice(0, 12).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              style={{
                width: 48, height: 48, borderRadius: 14, border: 'none',
                background: categoryId === c.id ? 'var(--accent)' : 'var(--bg-input)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: categoryId === c.id ? '0 2px 12px var(--accent-glow)' : 'none',
              }}
              title={c.name}
            >
              {c.icon}
            </button>
          ))}
          {filteredCategories.length > 12 && (
            <select
              className="form-control"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            >
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          )}
        </div>
        {categoryId && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {filteredCategories.find(c => c.id === categoryId)?.icon}{' '}
            {filteredCategories.find(c => c.id === categoryId)?.name}
          </div>
        )}
      </div>

      {/* Merchant & Note */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Merchant</label>
          <input type="text" className="form-control" placeholder="e.g. Swiggy" value={merchant}
            onChange={e => setMerchant(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <input type="text" className="form-control" placeholder="Optional" value={note}
            onChange={e => setNote(e.target.value)} />
        </div>
      </div>

      {/* Tags */}
      <div className="form-group">
        <label className="form-label">Tags</label>
        <input type="text" className="form-control" placeholder="food, delivery" value={tagsStr}
          onChange={e => setTagsStr(e.target.value)} />
      </div>

      {/* Group Split fields */}
      {type === 'group_split' && (
        <div className="card p-4 mb-4">
          <div className="font-semibold text-sm mb-3">Split Details</div>
          <div className="form-group">
            <label className="form-label">Total Bill</label>
            <input type="number" className="form-control" placeholder="Total bill amount" value={splitTotal}
              onChange={e => setSplitTotal(e.target.value)} step="0.01" min="0" />
          </div>

          <div className="flex items-center gap-2.5 mb-3 cursor-pointer" onClick={() => setEqualSplit(!equalSplit)}>
            <button className={`toggle ${equalSplit ? 'active' : ''}`} type="button" />
            <span className="text-sm">Split equally</span>
          </div>

          {splitRows.map((row, i) => (
            <div key={i} className="split-row">
              <input type="text" className="form-control" placeholder="Person name" value={row.personName}
                onChange={e => updateSplitRow(i, 'personName', e.target.value)} list="people-list" />
              {!equalSplit && (
                <input type="number" className="form-control" placeholder="Amount" value={row.amount || ''}
                  onChange={e => updateSplitRow(i, 'amount', parseFloat(e.target.value) || 0)}
                  style={{ maxWidth: 100 }} step="0.01" min="0" />
              )}
              <button className="btn btn-icon btn-secondary" onClick={() => removeSplitRow(i)}>&times;</button>
            </div>
          ))}

          <button className="btn btn-secondary btn-sm w-full mt-2" onClick={addSplitRow}>+ Add Person</button>

          <div className="form-group mt-3">
            <label className="form-label">My Share</label>
            <input type="number" className="form-control" placeholder="Your share" value={myShare}
              onChange={e => setMyShare(e.target.value)} step="0.01" min="0" readOnly={equalSplit} />
          </div>
        </div>
      )}

      {/* Recurring toggle */}
      <div className="form-group">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>
          <button className={`toggle ${isRecurring ? 'active' : ''}`} type="button" />
          <span className="text-sm font-medium">Recurring</span>
        </div>
      </div>

      {isRecurring && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select className="form-control" value={frequency} onChange={e => setFrequency(e.target.value as RecurringConfig['frequency'])}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 mt-4">
        {editTxn && (
          <button className="btn btn-danger flex-1" onClick={handleDelete}>Delete</button>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave} style={{ padding: '14px 20px', fontSize: '0.95rem' }}>
          {editTxn ? 'Update' : 'Save Transaction'}
        </button>
      </div>
    </div>
  );
}
